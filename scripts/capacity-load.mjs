import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import bcrypt from 'bcryptjs';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const baseUrl = 'https://localhost:8443';
const project = 'cbtimbs';
const containerNames = ['cbt-imbs', 'cbt-imbs-api', 'cbt-imbs-db'];
const stages = [10, 50, 150];
const tables = ['users', 'subjects', 'question_banks', 'questions', 'exams', 'exam_sessions', 'exam_questions', 'responses', 'violation_events', 'audit_logs', 'user_sessions'];
const evidenceDir = path.join(root, 'docs', 'plan', '2026-10-06-platform-continuation');
const args = process.argv.slice(2);

if (baseUrl.startsWith('https://localhost')) process.env.NODE_TLS_REJECT_UNAUTHORIZED ||= '0';

function argument(name) {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? null;
}

function hasArgument(name) {
  return args.includes(name);
}

function quoteSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function safeIds(values) {
  if (!Array.isArray(values) || values.some(value => !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
    throw new Error('Fixture manifest contains invalid database IDs.');
  }
  return values.map(Number);
}

async function docker(commandArgs) {
  const { stdout } = await execFile('docker', commandArgs, { cwd: root, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
  return stdout.trim();
}

async function psql(sql) {
  return docker(['exec', 'cbt-imbs-db', 'psql', '-U', 'cbt', '-d', 'cbt_imbs', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

async function databaseSnapshot() {
  const fields = tables.map(table => `${quoteSql(table)}, (SELECT count(*)::int FROM ${table})`).join(', ');
  return JSON.parse(await psql(`SELECT json_build_object(${fields})::text`));
}

async function inspectContainer(name) {
  const [container] = JSON.parse(await docker(['inspect', name]));
  return {
    name: container.Name.replace(/^\//, ''),
    state: container.State.Status,
    health: container.State.Health?.Status ?? null,
    project: container.Config.Labels?.['com.docker.compose.project'] ?? null,
    service: container.Config.Labels?.['com.docker.compose.service'] ?? null,
    configFiles: container.Config.Labels?.['com.docker.compose.project.config_files'] ?? '',
    mounts: container.Mounts.filter(mount => mount.Type === 'volume').map(mount => ({ name: mount.Name, destination: mount.Destination })).sort((a, b) => a.destination.localeCompare(b.destination)),
    poolMax: name === 'cbt-imbs-api'
      ? Number((container.Config.Env ?? []).find(value => value.startsWith('DB_POOL_MAX='))?.split('=')[1] ?? 50)
      : null,
  };
}

async function preflight(marker) {
  const containers = [];
  for (const name of containerNames) containers.push(await inspectContainer(name));
  const validStack = containers.every(container => container.state === 'running' && container.project === project)
    && containers.find(container => container.name === 'cbt-imbs-db')?.health === 'healthy'
    && containers.every(container => container.configFiles.toLowerCase().includes('cbt imbs'));
  if (!validStack) throw new Error('Refusing to run: expected local Compose project, container identities, or healthy database were not verified.');

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || !health.ok || health.database !== 'connected') throw new Error('Refusing to run: local API health check failed.');

  const markerSql = `SELECT json_build_object(
    'users', (SELECT count(*)::int FROM users WHERE username LIKE ${quoteSql(`${marker}%`)} OR class_name LIKE ${quoteSql(`${marker}%`)} OR full_name LIKE ${quoteSql(`${marker}%`)}),
    'exams', (SELECT count(*)::int FROM exams WHERE title LIKE ${quoteSql(`${marker}%`)})
  )::text`;
  const collisions = JSON.parse(await psql(markerSql));
  if (collisions.users || collisions.exams) throw new Error(`Refusing to run: marker ${marker} already exists.`);

  return {
    target: baseUrl,
    composeProject: project,
    apiHealth: health,
    marker,
    markerCollisionCounts: collisions,
    baseline: await databaseSnapshot(),
    containers,
  };
}

function cookieFrom(response) {
  const cookie = response.headers.getSetCookie?.().find(value => value.startsWith('connect.sid='));
  return cookie?.split(';', 1)[0] ?? null;
}

async function request(route, { method = 'GET', body, cookie } = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    return { status: response.status, data, cookie: cookieFrom(response), latencyMs: performance.now() - started };
  } catch (error) {
    return { status: null, data: { error: String(error) }, cookie: null, latencyMs: performance.now() - started };
  }
}

function percentile(samples, fraction) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return Number(sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)].toFixed(2));
}

function summarizeActions(records) {
  const summarizeGroup = entries => Object.fromEntries([...entries.reduce((groups, record) => {
    const group = groups.get(record.action) ?? [];
    group.push(record);
    groups.set(record.action, group);
    return groups;
  }, new Map())].map(([action, group]) => {
    const latencies = group.map(record => record.latencyMs);
    return [action, {
      requests: group.length,
      successes: group.filter(record => record.status >= 200 && record.status < 300).length,
      errors: group.filter(record => record.status === null || record.status < 200 || record.status >= 300).length,
      rateLimited429: group.filter(record => record.status === 429).length,
      p50Ms: percentile(latencies, 0.50),
      p95Ms: percentile(latencies, 0.95),
      p99Ms: percentile(latencies, 0.99),
      maxMs: latencies.length ? Number(Math.max(...latencies).toFixed(2)) : null,
    }];
  }));
  return {
    overall: summarizeGroup(records),
    byStage: Object.fromEntries(stages.map(size => [`S${size}`, summarizeGroup(records.filter(record => record.stage === size))])),
  };
}

function parseBytes(value) {
  const match = String(value).trim().match(/^([\d.]+)\s*(B|KiB|MiB|GiB|KB|MB|GB)$/i);
  if (!match) return null;
  const unit = match[2].toLowerCase();
  const scale = unit === 'b' ? 1 : unit === 'kib' ? 1024 : unit === 'mib' ? 1024 ** 2 : unit === 'gib' ? 1024 ** 3 : unit === 'kb' ? 1000 : unit === 'mb' ? 1000 ** 2 : 1000 ** 3;
  return Number(match[1]) * scale;
}

async function resourceSample(apiPoolMax, stage) {
  const statsText = await docker(['stats', '--no-stream', '--format', '{{json .}}', ...containerNames.slice(1)]);
  const resources = statsText.split(/\r?\n/).filter(Boolean).map(line => {
    const item = JSON.parse(line);
    return {
      container: item.Name,
      cpuPercent: Number(String(item.CPUPerc).replace('%', '')),
      memoryBytes: parseBytes(String(item.MemUsage).split('/')[0]),
    };
  });
  const pool = JSON.parse(await psql(`SELECT json_build_object(
    'openConnections', count(*)::int,
    'activeConnections', count(*) FILTER (WHERE state = 'active')::int,
    'idleConnections', count(*) FILTER (WHERE state = 'idle')::int,
    'databaseMaxConnections', current_setting('max_connections')::int
  )::text FROM pg_stat_activity WHERE datname = current_database() AND usename = current_user AND pid <> pg_backend_pid()`));
  return { at: new Date().toISOString(), stage, resources, pool: { ...pool, apiPoolMax } };
}

function summarizeResources(samples, apiPoolMax) {
  const summarize = selected => {
    const output = {};
    for (const name of containerNames.slice(1)) {
      const rows = selected.flatMap(sample => sample.resources.filter(resource => resource.container === name));
      const cpu = rows.map(row => row.cpuPercent).filter(Number.isFinite);
      const memory = rows.map(row => row.memoryBytes).filter(Number.isFinite);
      output[name] = {
        samples: rows.length,
        averageCpuPercent: cpu.length ? Number((cpu.reduce((sum, value) => sum + value, 0) / cpu.length).toFixed(2)) : null,
        peakCpuPercent: cpu.length ? Number(Math.max(...cpu).toFixed(2)) : null,
        averageMemoryMiB: memory.length ? Number((memory.reduce((sum, value) => sum + value, 0) / memory.length / 1024 ** 2).toFixed(2)) : null,
        peakMemoryMiB: memory.length ? Number((Math.max(...memory) / 1024 ** 2).toFixed(2)) : null,
      };
    }
    const pools = selected.map(sample => sample.pool);
    return {
      containers: output,
      postgresPoolProxy: {
        apiPoolMax,
        peakOpenConnections: pools.length ? Math.max(...pools.map(pool => pool.openConnections)) : null,
        peakActiveConnections: pools.length ? Math.max(...pools.map(pool => pool.activeConnections)) : null,
        peakIdleConnections: pools.length ? Math.max(...pools.map(pool => pool.idleConnections)) : null,
        peakPoolOccupancyPercent: pools.length ? Number((Math.max(...pools.map(pool => pool.openConnections)) / apiPoolMax * 100).toFixed(2)) : null,
        postgresMaxConnections: pools.length ? pools[0].databaseMaxConnections : null,
        samples: pools.length,
        directNodePoolWaitingCountAvailable: false,
        limitation: 'pg.Pool waitingCount is not exposed by the current API; pg_stat_activity open/active/idle connections are a pressure proxy, not a direct wait-queue measurement.',
      },
    };
  };
  return {
    ...summarize(samples),
    byStage: Object.fromEntries(stages.map(size => [`S${size}`, summarize(samples.filter(sample => sample.stage === size))])),
  };
}

async function createFixtures(marker, password, pin) {
  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = await bcrypt.hash(pin, 10);
  const cohorts = stages.map(size => `(${quoteSql(`S${size}`)}, ${size})`).join(',');
  const sql = `
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username LIKE ${quoteSql(`${marker}%`)} OR class_name LIKE ${quoteSql(`${marker}%`)} OR full_name LIKE ${quoteSql(`${marker}%`)})
     OR EXISTS (SELECT 1 FROM exams WHERE title LIKE ${quoteSql(`${marker}%`)}) THEN
    RAISE EXCEPTION 'load marker already exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE type='mc') THEN RAISE EXCEPTION 'no existing MC question is available'; END IF;
END $$;
INSERT INTO users(username, full_name, role, password_hash, class_name)
VALUES (${quoteSql(`${marker}-ADMIN`)}, ${quoteSql(`Synthetic load Admin ${marker}`)}, 'admin', ${quoteSql(passwordHash)}, NULL);
WITH cohort(stage, participant_count) AS (VALUES ${cohorts})
INSERT INTO users(username, full_name, role, password_hash, class_name)
SELECT ${quoteSql(marker)} || '-' || cohort.stage || '-' || lpad(series.participant::text, 3, '0'),
       ${quoteSql(`Synthetic participant ${marker}`)} || ' ' || cohort.stage || '-' || series.participant,
       'student', ${quoteSql(passwordHash)}, ${quoteSql(marker)} || '-' || cohort.stage
FROM cohort CROSS JOIN LATERAL generate_series(1, cohort.participant_count) AS series(participant);
WITH cohort(stage, participant_count) AS (VALUES ${cohorts}), question AS (
  SELECT id, bank_id FROM questions WHERE type='mc' ORDER BY id LIMIT 1
)
INSERT INTO exams(title, bank_id, class_name, mc_count, essay_count, duration_minutes, status,
                  entry_pin_hash, entry_pin_updated_at, entry_pin_expires_at, entry_pin_issued_by, created_by)
SELECT ${quoteSql(marker)} || '-EXAM-' || cohort.stage, question.bank_id,
       ${quoteSql(marker)} || '-' || cohort.stage, 1, 0, 120, 'active', ${quoteSql(pinHash)},
       clock_timestamp(), clock_timestamp() + INTERVAL '60 minutes',
       (SELECT id FROM users WHERE username=${quoteSql(`${marker}-ADMIN`)}),
       (SELECT id FROM users WHERE username=${quoteSql(`${marker}-ADMIN`)})
FROM cohort CROSS JOIN question;
INSERT INTO exam_sessions(exam_id, student_id)
SELECT exam.id, student.id FROM exams exam JOIN users student ON student.class_name=exam.class_name
WHERE exam.title LIKE ${quoteSql(`${marker}-EXAM-%`)};
INSERT INTO exam_questions(session_id, question_id, position)
SELECT es.id, question.id, 1 FROM exam_sessions es
JOIN exams exam ON exam.id=es.exam_id
JOIN LATERAL (SELECT id FROM questions WHERE bank_id=exam.bank_id AND type='mc' ORDER BY id LIMIT 1) question ON TRUE
WHERE exam.title LIKE ${quoteSql(`${marker}-EXAM-%`)};
DO $$ BEGIN
  IF (SELECT count(*) FROM users WHERE username LIKE ${quoteSql(`${marker}%`)}) <> 211
     OR (SELECT count(*) FROM exams WHERE title LIKE ${quoteSql(`${marker}-EXAM-%`)}) <> 3
     OR (SELECT count(*) FROM exam_sessions s JOIN exams e ON e.id=s.exam_id WHERE e.title LIKE ${quoteSql(`${marker}-EXAM-%`)}) <> 210
     OR (SELECT count(*) FROM exam_questions q JOIN exam_sessions s ON s.id=q.session_id JOIN exams e ON e.id=s.exam_id WHERE e.title LIKE ${quoteSql(`${marker}-EXAM-%`)}) <> 210 THEN
    RAISE EXCEPTION 'fixture row-count assertion failed';
  END IF;
END $$;
SELECT json_build_object(
  'adminId', (SELECT id FROM users WHERE username=${quoteSql(`${marker}-ADMIN`)}),
  'users', (SELECT json_agg(json_build_object('id',id,'username',username,'className',class_name) ORDER BY id) FROM users WHERE username LIKE ${quoteSql(`${marker}%`)}),
  'exams', (SELECT json_agg(json_build_object('id',id,'title',title,'className',class_name) ORDER BY title) FROM exams WHERE title LIKE ${quoteSql(`${marker}-EXAM-%`)}),
  'sessions', (SELECT json_agg(json_build_object('id',s.id,'examId',s.exam_id,'studentId',s.student_id,'username',u.username,'className',u.class_name,'questionId',q.question_id) ORDER BY e.title,u.username)
               FROM exam_sessions s JOIN exams e ON e.id=s.exam_id JOIN users u ON u.id=s.student_id JOIN exam_questions q ON q.session_id=s.id
               WHERE e.title LIKE ${quoteSql(`${marker}-EXAM-%`)})
)::text;
COMMIT;`;
  const output = await psql(sql);
  const jsonLine = output.split(/\r?\n/).find(line => line.startsWith('{'));
  if (!jsonLine) throw new Error(`Fixture setup committed but did not return its ID manifest: ${output.slice(-1000)}`);
  const fixture = JSON.parse(jsonLine);
  fixture.marker = marker;
  fixture.userIds = fixture.users.map(user => Number(user.id));
  fixture.examIds = fixture.exams.map(exam => Number(exam.id));
  fixture.sessionIds = fixture.sessions.map(session => Number(session.id));
  return fixture;
}

async function cleanupFixtures(fixture) {
  const userIds = safeIds(fixture.userIds);
  const examIds = safeIds(fixture.examIds);
  const sessionIds = safeIds(fixture.sessionIds);
  if (userIds.length !== 211 || examIds.length !== 3 || sessionIds.length !== 210) throw new Error('Cleanup refused: fixture ID manifest has unexpected counts.');
  const userArray = `ARRAY[${userIds.join(',')}]::bigint[]`;
  const examArray = `ARRAY[${examIds.join(',')}]::bigint[]`;
  const sessionArray = `ARRAY[${sessionIds.join(',')}]::bigint[]`;
  const marker = quoteSql(fixture.marker);
  const sql = `
BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM users WHERE id = ANY(${userArray}) AND username LIKE ${marker} || '%') <> 211
     OR (SELECT count(*) FROM exams WHERE id = ANY(${examArray}) AND title LIKE ${marker} || '-EXAM-%') <> 3
     OR (SELECT count(*) FROM exam_sessions s JOIN exams e ON e.id=s.exam_id WHERE s.id = ANY(${sessionArray}) AND e.title LIKE ${marker} || '-EXAM-%') <> 210 THEN
    RAISE EXCEPTION 'cleanup refused: IDs do not exactly match marker-scoped fixtures';
  END IF;
END $$;
DELETE FROM user_sessions WHERE sess->'user'->>'id' = ANY(ARRAY[${userIds.map(id => quoteSql(String(id))).join(',')}]::text[]);
DELETE FROM audit_logs WHERE user_id = ANY(${userArray})
  OR detail->>'examId' = ANY(ARRAY[${examIds.map(id => quoteSql(String(id))).join(',')}]::text[])
  OR detail->>'sessionId' = ANY(ARRAY[${sessionIds.map(id => quoteSql(String(id))).join(',')}]::text[]);
DELETE FROM exams WHERE id = ANY(${examArray}) AND title LIKE ${marker} || '-EXAM-%';
DELETE FROM users WHERE id = ANY(${userArray}) AND username LIKE ${marker} || '%' AND role IN ('admin','student');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username LIKE ${marker} || '%')
     OR EXISTS (SELECT 1 FROM exams WHERE title LIKE ${marker} || '-EXAM-%') THEN
    RAISE EXCEPTION 'cleanup assertion failed: marker records remain';
  END IF;
END $$;
COMMIT;
SELECT 'clean';`;
  await psql(sql);
}

async function databaseResult(fixture) {
  const examIds = safeIds(fixture.examIds);
  const sessionIds = safeIds(fixture.sessionIds);
  const sql = `SELECT json_build_object(
    'sessionCount', count(DISTINCT s.id)::int,
    'completedCount', count(DISTINCT s.id) FILTER (WHERE s.status='completed')::int,
    'responseCount', count(r.session_id)::int,
    'emptyAnswerCount', count(r.session_id) FILTER (WHERE r.answer='')::int,
    'responses', COALESCE(json_agg(json_build_object('sessionId',r.session_id,'questionId',r.question_id,'answer',r.answer)) FILTER (WHERE r.session_id IS NOT NULL),'[]'::json)
  )::text FROM exam_sessions s LEFT JOIN responses r ON r.session_id=s.id
  WHERE s.id = ANY(ARRAY[${sessionIds.join(',')}]::bigint[]) AND s.exam_id = ANY(ARRAY[${examIds.join(',')}]::bigint[])`;
  return JSON.parse(await psql(sql));
}

async function runCohort(size, fixture, password, pin, records, inconsistencies, expectedAnswers) {
  const cohort = fixture.sessions.filter(session => session.className === `${fixture.marker}-S${size}`);
  const exam = fixture.exams.find(item => item.className === `${fixture.marker}-S${size}`);
  const examId = Number(exam.id);
  const adminLogin = await request('/api/auth/login', { method: 'POST', body: { username: `${fixture.marker}-ADMIN`, password } });
  if (adminLogin.status !== 200 || !adminLogin.cookie) throw new Error(`Synthetic Admin login failed for stage ${size}: HTTP ${adminLogin.status}`);
  const adminCookie = adminLogin.cookie;

  const measured = async (action, callback) => {
    const result = await callback();
    records.push({ stage: size, action, status: result.status, latencyMs: result.latencyMs });
    return result;
  };
  const actorWork = async (session, index) => {
    const login = await measured('login', () => request('/api/auth/login', { method: 'POST', body: { username: session.username, password } }));
    if (login.status !== 200 || !login.cookie) return;
    const cookie = login.cookie;
    const start = await measured('start', () => request(`/api/student/exams/${examId}/start`, { method: 'POST', body: { pin }, cookie }));
    if (start.status !== 200 || start.data?.questions?.length !== 1) {
      inconsistencies.push({ stage: size, sessionId: Number(session.id), kind: 'start-response', status: start.status, questionCount: start.data?.questions?.length ?? null });
      return;
    }
    const heartbeat = await measured('heartbeat', () => request(`/api/student/sessions/${session.id}/heartbeat`, { method: 'POST', body: {}, cookie }));
    const expectedAnswer = `ans-${fixture.marker}-${size}-${index}`;
    expectedAnswers.set(Number(session.id), expectedAnswer);
    const save = await measured('answer_save', () => request(`/api/student/sessions/${session.id}/responses/${session.questionId}`, { method: 'PUT', body: { answer: expectedAnswer }, cookie }));
    const reconnect = await measured('reconnect', () => request(`/api/student/sessions/${session.id}`, { cookie }));
    const savedAnswer = reconnect.data?.questions?.find(question => Number(question.id) === Number(session.questionId))?.answer;
    if (heartbeat.status !== 200) inconsistencies.push({ stage: size, sessionId: Number(session.id), kind: 'heartbeat-response', status: heartbeat.status });
    if (save.status !== 200 || savedAnswer !== expectedAnswer) inconsistencies.push({ stage: size, sessionId: Number(session.id), kind: 'answer-roundtrip', saveStatus: save.status, expectedAnswer, actualAnswer: savedAnswer ?? null });
    const submit = await measured('submit', () => request(`/api/student/sessions/${session.id}/submit`, { method: 'POST', body: {}, cookie }));
    if (submit.status !== 200 || submit.data?.status !== 'completed') inconsistencies.push({ stage: size, sessionId: Number(session.id), kind: 'submit-response', status: submit.status, returnedStatus: submit.data?.status ?? null });
  };

  const monitorPolls = async () => {
    for (let poll = 0; poll < 8; poll++) {
      const result = await measured('monitor_poll', () => request(`/api/exams/${examId}/monitor`, { cookie: adminCookie }));
      if (result.status !== 200 || result.data?.students?.length !== size) {
        inconsistencies.push({ stage: size, kind: 'monitor-response', poll, status: result.status, studentCount: result.data?.students?.length ?? null, expected: size });
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  await Promise.all([Promise.all(cohort.map(actorWork)), monitorPolls()]);
  return { participants: cohort.length, examId };
}

async function runLoad(marker) {
  const password = `Load-${randomBytes(18).toString('hex')}`;
  const pin = String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
  const initial = await preflight(marker);
  const target = {
    target: initial.target,
    composeProject: initial.composeProject,
    containers: initial.containers.map(({ name, state, health, project, service, mounts }) => ({ name, state, health, project, service, mounts })),
    marker: initial.marker,
    markerCollisionCounts: initial.markerCollisionCounts,
    baseline: initial.baseline,
    cleanupScope: 'Recorded IDs only: 211 marker-prefixed users (synthetic admin plus participants), 3 marker-titled exams, their 210 recorded sessions and cascading child rows, audit rows owned/referencing those IDs, and PostgreSQL session-store rows for those synthetic users. No truncate, volume operation, or pre-existing fixture deletion.',
  };
  console.log(JSON.stringify({ safetyPreflight: target }));
  if (!hasArgument('--confirm-local-stack')) throw new Error('Mutation gate not satisfied. Re-run with --confirm-local-stack after reviewing the target and cleanup scope.');

  const fixture = await createFixtures(marker, password, pin);
  fixture.baseline = initial.baseline;
  fixture.target = target;
  fixture.createdAt = new Date().toISOString();
  const evidencePath = path.join(evidenceDir, `capacity-150-${marker}.json`);
  await writeFile(evidencePath, `${JSON.stringify({ status: 'fixture-created', ...fixture }, null, 2)}\n`, 'utf8');

  const records = [];
  const inconsistencies = [];
  const resourceSamples = [];
  const expectedAnswers = new Map();
  const poolMax = initial.containers.find(container => container.name === 'cbt-imbs-api')?.poolMax ?? 50;
  let sampling = true;
  let samplerError = null;
  let activeStage = 0;
  const sampleLoop = async () => {
    while (sampling) {
      try { resourceSamples.push(await resourceSample(poolMax, activeStage)); }
      catch (error) { samplerError ??= String(error); }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };
  const sampler = sampleLoop();
  const stagesRun = [];
  let runFailure = null;
  let databaseMeasurements = null;
  try {
    for (const size of stages) {
      activeStage = size;
      stagesRun.push({ participants: size, ...await runCohort(size, fixture, password, pin, records, inconsistencies, expectedAnswers) });
    }
    databaseMeasurements = await databaseResult(fixture);
    if (databaseMeasurements.sessionCount !== 210 || databaseMeasurements.completedCount !== 210 || databaseMeasurements.responseCount !== 210 || databaseMeasurements.emptyAnswerCount !== 0) {
      inconsistencies.push({ kind: 'database-lifecycle-counts', ...databaseMeasurements, expectedSessions: 210, expectedCompleted: 210, expectedResponses: 210 });
    }
    const responseBySession = new Map(databaseMeasurements.responses.map(row => [Number(row.sessionId), row.answer]));
    for (const session of fixture.sessions) {
      const answer = responseBySession.get(Number(session.id));
      if (answer !== expectedAnswers.get(Number(session.id))) inconsistencies.push({ kind: 'database-answer-missing-or-mismatched', sessionId: Number(session.id), expected: expectedAnswers.get(Number(session.id)) ?? null, answer: answer ?? null });
    }
  } catch (error) {
    runFailure = String(error);
  } finally {
    sampling = false;
    await sampler;
    fixture.measurements = {
      stagesRun,
      latencyAndCounts: summarizeActions(records),
      inconsistencies,
      resources: summarizeResources(resourceSamples, poolMax),
      resourceSamples,
      databaseLifecycle: databaseMeasurements ?? await databaseResult(fixture).catch(error => ({ error: String(error) })),
      runFailure,
      samplerError,
    };
    try {
      await cleanupFixtures(fixture);
      fixture.cleanup = { completedAt: new Date().toISOString(), exactIdsDeleted: true };
      fixture.postCleanupBaseline = await databaseSnapshot();
      fixture.baselineMatches = JSON.stringify(fixture.baseline) === JSON.stringify(fixture.postCleanupBaseline);
      const current = await Promise.all(containerNames.map(inspectContainer));
      fixture.volumeIdentityPreserved = JSON.stringify(initial.containers.map(item => item.mounts)) === JSON.stringify(current.map(item => item.mounts));
      fixture.cleanup.noMarkerRows = JSON.parse(await psql(`SELECT json_build_object(
        'users',(SELECT count(*)::int FROM users WHERE username LIKE ${quoteSql(`${marker}%`)} OR class_name LIKE ${quoteSql(`${marker}%`)} OR full_name LIKE ${quoteSql(`${marker}%`)}),
        'exams',(SELECT count(*)::int FROM exams WHERE title LIKE ${quoteSql(`${marker}%`)})
      )::text`));
    } catch (error) {
      fixture.cleanup = { completedAt: new Date().toISOString(), exactIdsDeleted: false, error: String(error) };
    }
    fixture.resultStatus = fixture.cleanup.exactIdsDeleted && fixture.baselineMatches && fixture.volumeIdentityPreserved && !runFailure && !inconsistencies.length ? 'completed' : 'failed';
    fixture.evidencePath = evidencePath;
    fixture.limits = [
      'Local Docker hardware and loopback TLS only; not a production capacity estimate.',
      'No school-agreed latency/error thresholds were provided, so no pass/go/readiness conclusion is made.',
      'No device, kiosk, location-proof, or anti-cheat compatibility inference.',
      'PostgreSQL pg_stat_activity is a connection-pressure proxy; the running API does not expose node-postgres Pool waitingCount.',
    ];
    await writeFile(evidencePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  }
  return fixture;
}

async function main() {
  const marker = argument('--marker') ?? `CBTLOAD-20261006-${randomBytes(4).toString('hex').toUpperCase()}`;
  if (!/^CBTLOAD-[A-Z0-9-]{10,50}$/.test(marker)) throw new Error('Marker must match CBTLOAD-[A-Z0-9-]{10,50}.');
  if (hasArgument('--preflight')) {
    console.log(JSON.stringify(await preflight(marker), null, 2));
    return;
  }
  if (hasArgument('--cleanup')) {
    const evidencePath = path.resolve(root, argument('--cleanup'));
    const fixture = JSON.parse(await readFile(evidencePath, 'utf8'));
    await cleanupFixtures(fixture);
    const baseline = await databaseSnapshot();
    console.log(JSON.stringify({ status: 'cleaned', marker: fixture.marker, baseline, evidencePath }, null, 2));
    return;
  }
  if (!hasArgument('--run')) throw new Error('Choose --preflight, --run --confirm-local-stack, or --cleanup <evidence.json>.');
  const result = await runLoad(marker);
  console.log(JSON.stringify({ status: result.resultStatus, marker: result.marker, evidencePath: result.evidencePath, latencyAndCounts: result.measurements?.latencyAndCounts, cleanup: result.cleanup, baselineMatches: result.baselineMatches, volumeIdentityPreserved: result.volumeIdentityPreserved }, null, 2));
  if (result.resultStatus !== 'completed') process.exitCode = 1;
}

main().catch(error => {
  console.error(JSON.stringify({ status: hasArgument('--preflight') ? 'blocked' : 'failed', reason: String(error) }));
  process.exitCode = 1;
});