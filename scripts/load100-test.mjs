import { execFile as execFileCallback } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const base = process.env.CBT_LOAD_BASE || 'https://localhost:8443';
const projectRoot = process.cwd();
const apiContainer = process.env.CBT_LOAD_API_CONTAINER || 'cbt-imbs-api';
const dbContainer = process.env.CBT_LOAD_DB_CONTAINER || 'cbt-imbs-db';
const execFile = promisify(execFileCallback);
const manifestDir = path.join(projectRoot, 'docs', 'load-test-runs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const runId = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomBytes(4).toString('hex').toUpperCase()}`;
let className = '';
const examTitle = `Load Test 100 ${runId}`;
const manifestPath = path.join(manifestDir, `load100-${runId}.json`);
const manifest = {
  version: 1,
  runId,
  createdAt: new Date().toISOString(),
  className,
  examTitle,
  fixtureIds: { users: [], exams: [], sessions: [], examQuestions: [], responses: [] },
};
let manifestWrite = Promise.resolve();

const ipFor = (seed) => {
  const baseOctet = 20 + (seed % 200);
  return `10.10.${Math.floor(baseOctet / 255)}.${baseOctet % 255 || 254}`;
};

const parseCookieHeader = (headerValue) => {
  const values = Array.isArray(headerValue) ? headerValue : [headerValue].filter(Boolean);
  const cookies = values.flatMap((value) => String(value).split(',')).map((piece) => piece.trim()).filter(Boolean);
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
};

async function persistManifest() {
  manifestWrite = manifestWrite.then(async () => {
    await mkdir(manifestDir, { recursive: true });
    const temporaryPath = `${manifestPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, manifestPath);
  });
  return manifestWrite;
}

async function api(route, { method = 'GET', body, cookie, headers = {} } = {}) {
  const started = performance.now();
  try {
    const res = await fetch(`${base}${route}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text.slice(0, 200) };
    }
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : res.headers.get('set-cookie');
    const nextCookie = parseCookieHeader(setCookie);
    return { status: res.status, data, cookie: nextCookie || cookie || null, latencyMs: performance.now() - started };
  } catch (error) {
    return { status: 0, data: { error: error.message }, cookie: cookie || null, latencyMs: performance.now() - started };
  }
}

async function docker(args) {
  const { stdout } = await execFile('docker', args, { cwd: projectRoot, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return stdout.trim();
}

async function examFixtureIds(examId) {
  if (!Number.isSafeInteger(examId) || examId < 1) throw new Error('Refusing fixture lookup: invalid exam ID.');
  const sql = `SELECT json_build_object(
    'sessions', COALESCE((SELECT json_agg(json_build_object('id', es.id, 'studentId', es.student_id)) FROM exam_sessions es WHERE es.exam_id = ${examId}), '[]'::json),
    'examQuestions', COALESCE((SELECT json_agg(json_build_object('sessionId', eq.session_id, 'questionId', eq.question_id)) FROM exam_questions eq JOIN exam_sessions es ON es.id = eq.session_id WHERE es.exam_id = ${examId}), '[]'::json)
  )::text`;
  const output = await docker(['exec', dbContainer, 'psql', '-U', 'cbt', '-d', 'cbt_imbs', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  return JSON.parse(output);
}

async function verifyLoadTestMode() {
  const containers = JSON.parse(await docker(['inspect', apiContainer]));
  const environment = Object.fromEntries((containers[0]?.Config?.Env || []).map((entry) => {
    const separator = entry.indexOf('=');
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
  if (environment.NODE_ENV !== 'development' || environment.LOCAL_LOAD_TEST_MODE !== 'true') {
    throw new Error('Refusing to run unless the local API explicitly has NODE_ENV=development and LOCAL_LOAD_TEST_MODE=true.');
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function responseError(data) {
  if (typeof data?.error === 'string') return data.error;
  return data?.error ? JSON.stringify(data.error) : 'Request failed';
}

async function loginAdmin() {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username: process.env.CBT_LOAD_ADMIN_USERNAME || 'admin', password: process.env.CBT_LOAD_ADMIN_PASSWORD || 'admin123' },
    headers: { 'X-Forwarded-For': ipFor(1) },
  });
  if (login.status !== 200 || !login.cookie) throw new Error(`Admin login failed (HTTP ${login.status}).`);
  return login.cookie;
}

async function chooseEmptyConfiguredClass(adminCookie) {
  const [settings, students] = await Promise.all([
    api('/api/settings', { cookie: adminCookie }),
    api('/api/students', { cookie: adminCookie }),
  ]);
  if (settings.status !== 200 || !Array.isArray(settings.data?.classes) || students.status !== 200 || !Array.isArray(students.data)) {
    throw new Error('Could not inspect configured classes before creating fixtures.');
  }
  const occupied = new Set(students.data.map((student) => student.className).filter(Boolean));
  className = settings.data.classes.find((candidate) => !occupied.has(candidate));
  if (!className) throw new Error('No empty configured class is available; no load-test users were created.');
  manifest.className = className;
  await persistManifest();
}

async function findQuestionBank(adminCookie) {
  const bankList = await api('/api/banks', { cookie: adminCookie });
  if (bankList.status !== 200 || !Array.isArray(bankList.data)) {
    throw new Error(`Question bank lookup failed (HTTP ${bankList.status}).`);
  }
  const bank = bankList.data.find((item) => Number(item.mc || 0) > 0);
  if (!bank) throw new Error('No existing question bank has a multiple-choice question; no fixture was created.');
  return Number(bank.id);
}

async function createStudentSet(adminCookie, total = 100) {
  const students = [];
  for (let index = 1; index <= total; index += 1) {
    const name = `Load User ${runId} ${index}`;
    const created = await api('/api/students', {
      method: 'POST',
      body: { name, className },
      cookie: adminCookie,
    });
    const id = Number(created.data?.id);
    if (created.status !== 201 || !Number.isSafeInteger(id) || id < 1 || !created.data?.username || !created.data?.token) {
      throw new Error(`Synthetic student ${index} creation failed (HTTP ${created.status}).`);
    }
    students.push({ id, username: created.data.username, token: created.data.token });
    manifest.fixtureIds.users.push({ id, username: created.data.username });
    await persistManifest();
  }
  return students;
}

async function createExam(adminCookie, students, bankId) {
  const created = await api('/api/exams', {
    method: 'POST',
    body: { title: examTitle, bankId, className, mcCount: 1, essayCount: 0, durationMinutes: 30 },
    cookie: adminCookie,
  });
  const examId = Number(created.data?.id);
  if (created.status !== 201 || !Number.isSafeInteger(examId) || examId < 1) {
    throw new Error(`Exam creation failed (HTTP ${created.status}).`);
  }
  manifest.fixtureIds.exams.push({ id: examId });
  await persistManifest();

  const fixtureIds = await examFixtureIds(examId);
  const sessions = fixtureIds.sessions.map((session) => ({ id: Number(session.id), studentId: Number(session.studentId) }));
  manifest.fixtureIds.sessions = sessions;
  manifest.fixtureIds.examQuestions = fixtureIds.examQuestions.map((item) => ({ sessionId: Number(item.sessionId), questionId: Number(item.questionId) }));
  await persistManifest();

  const expectedUserIds = students.map((student) => student.id).sort((a, b) => a - b);
  const actualUserIds = sessions.map((session) => session.studentId).sort((a, b) => a - b);
  if (sessions.length !== students.length || actualUserIds.some((id, index) => id !== expectedUserIds[index])) {
    throw new Error(`Exam enrolled ${sessions.length} users; expected only the ${students.length} manifest-listed synthetic users.`);
  }

  const activation = await api(`/api/exams/${examId}/status`, {
    method: 'PATCH',
    body: { status: 'active' },
    cookie: adminCookie,
  });
  if (activation.status !== 200) throw new Error(`Exam activation failed (HTTP ${activation.status}).`);

  const pin = await api(`/api/exams/${examId}/pin`, {
    method: 'POST',
    body: { validityMinutes: 10 },
    cookie: adminCookie,
  });
  if (pin.status !== 201 || !pin.data?.pin) throw new Error(`PIN issue failed (HTTP ${pin.status}).`);
  return { examId, pin: String(pin.data.pin), sessions };
}

async function runCohort(students, examId, pin, sessionsByStudentId) {
  const results = [];
  const failures = [];
  const startedAt = performance.now();

  await Promise.all(students.map(async (student, index) => {
    const sourceIp = ipFor(1000 + index);
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { username: student.username, password: student.token },
      headers: { 'X-Forwarded-For': sourceIp },
    });
    results.push({ phase: 'login', student: student.username, status: login.status, latencyMs: login.latencyMs });
    if (login.status !== 200 || !login.cookie) {
      failures.push({ student: student.username, phase: 'login', status: login.status, error: responseError(login.data) });
      return;
    }

    const start = await api(`/api/student/exams/${examId}/start`, {
      method: 'POST',
      body: { pin },
      cookie: login.cookie,
    });
    results.push({ phase: 'start', student: student.username, status: start.status, latencyMs: start.latencyMs });
    if (start.status !== 200 || !start.data?.questions?.length) {
      failures.push({ student: student.username, phase: 'start', status: start.status, error: responseError(start.data) });
      return;
    }

    const sessionId = Number(start.data.id);
    const expectedSession = sessionsByStudentId.get(student.id);
    if (!expectedSession || expectedSession.id !== sessionId) {
      failures.push({ student: student.username, phase: 'start', status: start.status, error: 'Started session did not match its manifest-listed session ID.' });
      return;
    }
    const questionId = Number(start.data.questions[0].id);
    const questionKey = `${sessionId}:${questionId}`;
    if (!manifest.fixtureIds.examQuestions.some((item) => `${item.sessionId}:${item.questionId}` === questionKey)) {
      manifest.fixtureIds.examQuestions.push({ sessionId, questionId });
      await persistManifest();
    }

    const save = await api(`/api/student/sessions/${sessionId}/responses/${questionId}`, {
      method: 'PUT',
      body: { answer: `LOAD-${index + 1}` },
      cookie: login.cookie,
    });
    results.push({ phase: 'save', student: student.username, status: save.status, latencyMs: save.latencyMs });
    if (save.status !== 200) {
      failures.push({ student: student.username, phase: 'save', status: save.status, error: responseError(save.data) });
    } else {
      manifest.fixtureIds.responses.push({ sessionId, questionId });
      await persistManifest();
    }

    const submit = await api(`/api/student/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: {},
      cookie: login.cookie,
    });
    results.push({ phase: 'submit', student: student.username, status: submit.status, latencyMs: submit.latencyMs });
    if (submit.status !== 200) {
      failures.push({ student: student.username, phase: 'submit', status: submit.status, error: responseError(submit.data) });
    }
  }));

  const phases = {};
  for (const phase of ['login', 'start', 'save', 'submit']) {
    const phaseResults = results.filter((item) => item.phase === phase);
    const latencies = phaseResults.map((item) => item.latencyMs);
    const statuses = {};
    for (const result of phaseResults) {
      const status = result.status === 0 ? 'NETWORK_ERROR' : String(result.status);
      statuses[status] = (statuses[status] || 0) + 1;
    }
    phases[phase] = {
      requests: phaseResults.length,
      successes: phaseResults.filter((item) => item.status >= 200 && item.status < 300).length,
      errors: phaseResults.filter((item) => item.status < 200 || item.status >= 300).length,
      statuses,
      p50Ms: percentile(latencies, 50),
      p95Ms: percentile(latencies, 95),
      p99Ms: percentile(latencies, 99),
      maxMs: Number(Math.max(...latencies, 0).toFixed(2)),
    };
  }

  return {
    elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    totalRequests: results.length,
    successfulRequests: results.filter((item) => item.status >= 200 && item.status < 300).length,
    failedRequests: results.filter((item) => item.status < 200 || item.status >= 300).length,
    totalFailures: failures.length,
    failures: failures.slice(0, 25),
    phases,
  };
}

function sqlIdArray(records) {
  const ids = records.map((record) => Number(record.id));
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error('Refusing cleanup: manifest contains an invalid database ID.');
  return `ARRAY[${ids.join(',')}]::bigint[]`;
}

function sqlTextArray(records) {
  const ids = records.map((record) => String(Number(record.id)));
  if (ids.some((id) => !/^\d+$/.test(id))) throw new Error('Refusing cleanup: manifest contains an invalid database ID.');
  return `ARRAY[${ids.map((id) => `'${id}'`).join(',')}]::text[]`;
}

async function cleanupManifest() {
  const { users, exams, sessions } = manifest.fixtureIds;
  const userIds = sqlIdArray(users);
  const userTextIds = sqlTextArray(users);
  const examIds = sqlIdArray(exams);
  const examTextIds = sqlTextArray(exams);
  const sessionIds = sqlIdArray(sessions);
  const sql = `BEGIN;
WITH deleted AS (DELETE FROM audit_logs WHERE user_id = ANY(${userIds}) OR (action = 'student.create' AND detail->>'studentId' = ANY(${userTextIds})) OR (action IN ('exam.create','exam.pin_issue') AND detail->>'examId' = ANY(${examTextIds})) RETURNING 1) SELECT 'audit_logs=' || count(*) FROM deleted;
WITH deleted AS (DELETE FROM user_sessions WHERE sess->'user'->>'id' = ANY(${userTextIds}) RETURNING 1) SELECT 'user_sessions=' || count(*) FROM deleted;
WITH deleted AS (DELETE FROM exam_sessions WHERE id = ANY(${sessionIds}) RETURNING 1) SELECT 'sessions=' || count(*) FROM deleted;
WITH deleted AS (DELETE FROM exams WHERE id = ANY(${examIds}) RETURNING 1) SELECT 'exams=' || count(*) FROM deleted;
WITH deleted AS (DELETE FROM users WHERE id = ANY(${userIds}) AND role = 'student' RETURNING 1) SELECT 'users=' || count(*) FROM deleted;
COMMIT;`;
  const output = await docker(['exec', dbContainer, 'psql', '-U', 'cbt', '-d', 'cbt_imbs', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  return output.split(/\r?\n/).filter(Boolean);
}

let summary = null;
let runError = null;
let cleanup = null;
let cleanupError = null;

try {
  await persistManifest();
  await verifyLoadTestMode();
  const adminCookie = await loginAdmin();
  const bankId = await findQuestionBank(adminCookie);
  await chooseEmptyConfiguredClass(adminCookie);
  const students = await createStudentSet(adminCookie, 100);
  const fixture = await createExam(adminCookie, students, bankId);
  const sessionsByStudentId = new Map(fixture.sessions.map((session) => [session.studentId, session]));
  summary = await runCohort(students, fixture.examId, fixture.pin, sessionsByStudentId);
} catch (error) {
  runError = error.message;
} finally {
  try {
    cleanup = await cleanupManifest();
  } catch (error) {
    cleanupError = error.message;
  }
  manifest.finishedAt = new Date().toISOString();
  manifest.summary = summary;
  manifest.error = runError || cleanupError || (summary?.totalFailures ? `${summary.totalFailures} requests failed.` : null);
  manifest.outcome = manifest.error ? 'failed' : 'completed';
  manifest.cleanup = cleanup ? { completed: true, counts: cleanup } : { completed: false, error: cleanupError };
  try {
    await persistManifest();
  } catch (error) {
    cleanupError = cleanupError || `Manifest finalization failed: ${error.message}`;
  }
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  scenario: '100-user simultaneous exam load',
  runId,
  manifest: path.relative(projectRoot, manifestPath),
  outcome: manifest.outcome,
  error: manifest.error,
  cleanup: cleanup ? { completed: true, counts: cleanup } : { completed: false, error: cleanupError },
  ...(summary || {}),
}, null, 2));

if (manifest.error) process.exitCode = 1;
