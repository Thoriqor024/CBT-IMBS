import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createControlPlaneRuntime } from './controlPlaneRuntime.js';
import { initializeDatabase, getPoolConfig } from './db.js';
import { TenantProvisioner } from './tenantProvisioner.js';

const { Pool } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const image = 'postgres:17-alpine';
const validPngBuffer = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.from([0, 0, 0, 13]),
  Buffer.from('IHDR'),
  Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
  Buffer.from([0x90, 0x77, 0x53, 0xde]),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('IEND'),
  Buffer.from([0xae, 0x42, 0x60, 0x82]),
]);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || result.error?.message || '').trim()}`);
  }
  return result.stdout.trim();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForPostgres(pool) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Disposable PostgreSQL did not become ready: ${lastError?.message || 'timeout'}`);
}

async function waitForApi(child, baseUrl) {
  let output = '';
  child.stdout.on('data', chunk => { output = (output + chunk.toString()).slice(-2000); });
  child.stderr.on('data', chunk => { output = (output + chunk.toString()).slice(-2000); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Tenant API exited during startup: ${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      if (response.ok && body.controlPlane === 'connected') return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Tenant API did not become ready: ${output}`);
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function request(baseUrl, route, { method = 'GET', body, cookie, schoolCode } = {}) {
  const response = await fetch(`${baseUrl}/api${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(schoolCode ? { 'X-School-Code': schoolCode } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  const setCookies = response.headers.getSetCookie?.() || [];
  const cookieHeader = setCookies.find(value => value.startsWith('connect.sid=')) || response.headers.get('set-cookie');
  return {
    status: response.status,
    data,
    cookie: cookieHeader?.split(';', 1)[0] || cookie || null,
  };
}

async function stopContainer(name) {
  const result = spawnSync('docker', ['stop', name], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0 && !String(result.stderr || '').includes('No such container')) {
    throw new Error('Could not remove the disposable PostgreSQL container.');
  }
}

test('tenant API isolates two provisioned schools and enforces quotas under concurrent requests', { timeout: 180_000 }, async () => {
  const suffix = randomBytes(5).toString('hex');
  const databasePassword = randomBytes(32).toString('hex');
  const controlPassword = randomBytes(32).toString('hex');
  const masterKey = randomBytes(32);
  const containerName = `cbt-tenant-test-${suffix}`;
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), `cbt-tenant-test-${suffix}-`));
  const keyPath = path.join(temporaryDirectory, 'tenant_master.key');
  const mediaDirectory = path.join(temporaryDirectory, 'question-media');
  const schoolA = {
    schoolCode: `it-${suffix}-a`,
    displayName: `Integration ${suffix} A`,
    adminName: 'Integration Admin A',
    adminEmail: `admin-a-${suffix}@example.invalid`,
  };
  const schoolB = {
    schoolCode: `it-${suffix}-b`,
    displayName: `Integration ${suffix} B`,
    adminName: 'Integration Admin B',
    adminEmail: `admin-b-${suffix}@example.invalid`,
  };

  let apiProcess;
  let adminPool;
  let controlRuntime;
  let postgresPool;
  const tenants = [];

  try {
    run('docker', ['image', 'inspect', image]);
    run('docker', [
      'run', '--detach', '--rm', '--name', containerName,
      '--publish', '127.0.0.1::5432',
      '--env', 'POSTGRES_USER=cbt',
      '--env', `POSTGRES_PASSWORD=${databasePassword}`,
      '--env', 'POSTGRES_DB=cbt_imbs',
      image,
    ]);
    const binding = run('docker', ['port', containerName, '5432/tcp']).split(/\r?\n/)[0];
    const databasePort = Number(binding?.split(':').at(-1));
    assert.ok(Number.isInteger(databasePort) && databasePort > 0, 'Disposable PostgreSQL must bind to a loopback port.');

    postgresPool = new Pool({ host: '127.0.0.1', port: databasePort, database: 'cbt_imbs', user: 'cbt', password: databasePassword, max: 10 });
    await waitForPostgres(postgresPool);
    await postgresPool.query(`CREATE ROLE cbt_control_app LOGIN PASSWORD '${controlPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    await postgresPool.query('CREATE DATABASE cbt_control_plane OWNER cbt_control_app');

    await writeFile(keyPath, masterKey, { flag: 'wx', mode: 0o600 });
    await mkdir(mediaDirectory, { recursive: true });

    const runtimeEnv = {
      NODE_ENV: 'test',
      DB_HOST: '127.0.0.1',
      DB_PORT: String(databasePort),
      DB_NAME: 'cbt_imbs',
      DB_USER: 'cbt',
      DB_PASSWORD: databasePassword,
      DB_POOL_MAX: '10',
      CONTROL_DB_HOST: '127.0.0.1',
      CONTROL_DB_PORT: String(databasePort),
      CONTROL_DB_NAME: 'cbt_control_plane',
      CONTROL_DB_USER: 'cbt_control_app',
      CONTROL_DB_PASSWORD: controlPassword,
      CONTROL_DB_POOL_MAX: '5',
      TENANT_MASTER_KEY_FILE: keyPath,
      TENANCY_ENABLED: 'false',
    };
    controlRuntime = createControlPlaneRuntime({ env: runtimeEnv, PoolClass: Pool, masterKey });
    await controlRuntime.initializeControlPlane();
    await controlRuntime.verifyControlPlane();

    adminPool = new Pool({ host: '127.0.0.1', port: databasePort, database: 'cbt_imbs', user: 'cbt', password: databasePassword, max: 10 });
    const emailMigration = await readFile(path.join(projectRoot, 'server', 'migrations', 'tenant', '002_user_email.sql'), 'utf8');
    const provisioner = new TenantProvisioner({
      adminPool,
      controlPool: controlRuntime.controlPool,
      secretStore: controlRuntime.secretStore,
      createTenantPool: async ({ database, user, password }) => new Pool({
        host: '127.0.0.1', port: databasePort, database, user, password, max: 5,
      }),
      initializeTenantDatabase: targetPool => initializeDatabase(targetPool),
      applyEmailMigration: targetPool => targetPool.query(emailMigration),
    });

    const trialEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const school of [schoolA, schoolB]) {
      tenants.push(await provisioner.provision({ ...school, trialEndsAt, maxStudents: 1, maxTeachers: 1 }));
    }

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    apiProcess = spawn(process.execPath, ['server/index.js'], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...runtimeEnv,
        PORT: String(port),
        TENANCY_ENABLED: 'true',
        TENANT_MAX_POOLS: '4',
        TENANT_POOL_MAX: '2',
        TENANT_POOL_TOTAL_MAX: '8',
        SESSION_SECRET: randomBytes(48).toString('base64url'),
        COOKIE_SECURE: 'false',
        CORS_ORIGINS: baseUrl,
        PUBLIC_BASE_URL: baseUrl,
        QUESTION_MEDIA_DIR: mediaDirectory,
      },
    });
    await waitForApi(apiProcess, baseUrl);

    const unauthenticated = await request(baseUrl, '/students');
    assert.equal(unauthenticated.status, 401);
    const missingSchool = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: schoolA.adminEmail, password: tenants[0].initialPassword },
    });
    assert.equal(missingSchool.status, 400);

    const sessions = [];
    for (let index = 0; index < tenants.length; index++) {
      const school = index === 0 ? schoolA : schoolB;
      const tenant = tenants[index];
      const login = await request(baseUrl, '/auth/login', {
        method: 'POST',
        body: { schoolCode: school.schoolCode, email: school.adminEmail, password: tenant.initialPassword },
        schoolCode: school.schoolCode,
      });
      assert.equal(login.status, 200, `Tenant ${index + 1} admin login should succeed.`);
      sessions.push(login.cookie);
    }

    const invalidLogin = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { schoolCode: schoolA.schoolCode, email: schoolA.adminEmail, password: 'invalid-password' },
    });
    assert.equal(invalidLogin.status, 401);

    const subjects = [];
    for (let index = 0; index < tenants.length; index++) {
      const name = `Integration Subject ${suffix} ${index}`;
      const response = await request(baseUrl, '/subjects', {
        method: 'POST', cookie: sessions[index],
        body: { name, languageCode: 'id', textDirection: 'ltr' },
      });
      assert.equal(response.status, 201);
      subjects.push({ id: response.data.id, name });
    }

    async function createStudents(index) {
      const attempts = await Promise.all([0, 1].map(attempt => request(baseUrl, '/students', {
        method: 'POST', cookie: sessions[index], schoolCode: index === 0 ? schoolB.schoolCode : schoolA.schoolCode,
        body: {
          name: `Integration Student ${suffix} ${index} ${attempt}`,
          email: `student-${suffix}-${index}-${attempt}@example.invalid`,
          className: 'VII A',
        },
      })));
      assert.deepEqual(attempts.map(result => result.status).sort(), [201, 403]);
      return attempts.find(result => result.status === 201).data;
    }

    const studentNames = await Promise.all([createStudents(0), createStudents(1)]);
    async function createTeachers(index) {
      const attempts = await Promise.all([0, 1].map(attempt => request(baseUrl, '/teachers', {
        method: 'POST', cookie: sessions[index], schoolCode: index === 0 ? schoolB.schoolCode : schoolA.schoolCode,
        body: {
          name: `Integration Teacher ${suffix} ${index} ${attempt}`,
          username: `it-${suffix}-${index}-${attempt}`,
          email: `teacher-${suffix}-${index}-${attempt}@example.invalid`,
          password: 'Integration-Pass-123!',
          classes: ['VII A'],
          subjectIds: [subjects[index].id],
        },
      })));
      assert.deepEqual(attempts.map(result => result.status).sort(), [201, 403]);
    }
    await Promise.all([createTeachers(0), createTeachers(1)]);

    const bank = await request(baseUrl, '/banks', {
      method: 'POST', cookie: sessions[0],
      body: {
        subjectId: subjects[0].id,
        grade: 'VII',
        topic: `Integration Bank ${suffix}`,
        questions: [{ type: 'mc', prompt: `Integration question ${suffix}`, options: ['A', 'B', 'C', 'D'], answerKey: 'A', points: 1 }],
      },
    });
    assert.equal(bank.status, 201);

    const imageForm = new FormData();
    imageForm.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'integration.png');
    imageForm.append('altText', 'Temporary integration image');
    const imageUpload = await fetch(`${baseUrl}/api/questions/${bank.data.questionIds[0]}/media`, {
      method: 'POST',
      headers: { Cookie: sessions[0] },
      body: imageForm,
    });
    const media = await imageUpload.json();
    assert.equal(imageUpload.status, 201);

    const examResponse = await request(baseUrl, '/exams', {
      method: 'POST', cookie: sessions[0],
      body: { title: `Integration Exam ${suffix}`, bankId: bank.data.id, className: 'VII A', mcCount: 1, essayCount: 0, durationMinutes: 30 },
    });
    assert.equal(examResponse.status, 201);
    const exam = examResponse.data;
    assert.equal((await request(baseUrl, `/exams/${exam.id}/status`, { method: 'PATCH', cookie: sessions[0], body: { status: 'active' } })).status, 200);
    const pin = await request(baseUrl, `/exams/${exam.id}/pin`, { method: 'POST', cookie: sessions[0], body: { validityMinutes: 10 } });
    assert.equal(pin.status, 201);

    const studentLogins = await Promise.all(studentNames.map(async student => {
      const login = await request(baseUrl, '/auth/login', {
        method: 'POST',
        body: { schoolCode: student === studentNames[0] ? schoolA.schoolCode : schoolB.schoolCode, email: student.email, password: student.token },
      });
      assert.equal(login.status, 200);
      return login.cookie;
    }));
    const start = await request(baseUrl, `/student/exams/${exam.id}/start`, {
      method: 'POST', cookie: studentLogins[0], body: { pin: pin.data.pin },
    });
    assert.equal(start.status, 200);
    assert.equal(start.data.questions.length, 1);
    assert.equal(Object.hasOwn(start.data.questions[0], 'answerKey'), false);

    const studentMedia = await fetch(`${baseUrl}/api/question-media/${media.id}`, { headers: { Cookie: studentLogins[0] } });
    assert.equal(studentMedia.status, 200);
    assert.deepEqual(Buffer.from(await studentMedia.arrayBuffer()), validPngBuffer);
    const crossTenantMedia = await request(baseUrl, `/question-media/${media.id}`, { cookie: sessions[1] });
    assert.equal(crossTenantMedia.status, 404);
    const crossTenantExam = await request(baseUrl, `/student/exams/${exam.id}/start`, {
      method: 'POST', cookie: studentLogins[1], body: { pin: pin.data.pin },
    });
    assert.equal(crossTenantExam.status, 404);

    const saved = await request(baseUrl, `/student/sessions/${start.data.id}/responses/${start.data.questions[0].id}`, {
      method: 'PUT', cookie: studentLogins[0], body: { answer: 'A' },
    });
    assert.equal(saved.status, 200);
    const submitted = await request(baseUrl, `/student/sessions/${start.data.id}/submit`, {
      method: 'POST', cookie: studentLogins[0], body: {},
    });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.status, 'completed');

    const otherTenantExams = await request(baseUrl, '/student/exams', { cookie: studentLogins[1] });
    assert.deepEqual(otherTenantExams.data, []);

    const schoolAStudents = await request(baseUrl, '/students', { cookie: sessions[0], schoolCode: schoolB.schoolCode });
    const schoolBStudents = await request(baseUrl, '/students', { cookie: sessions[1], schoolCode: schoolA.schoolCode });
    assert.equal(schoolAStudents.status, 200);
    assert.equal(schoolBStudents.status, 200);
    assert.deepEqual(schoolAStudents.data.map(student => student.name), [studentNames[0].name]);
    assert.deepEqual(schoolBStudents.data.map(student => student.name), [studentNames[1].name]);

    const schoolASubjects = await request(baseUrl, '/subjects', { cookie: sessions[0], schoolCode: schoolB.schoolCode });
    const schoolBSubjects = await request(baseUrl, '/subjects', { cookie: sessions[1], schoolCode: schoolA.schoolCode });
    assert.deepEqual(schoolASubjects.data.map(subject => subject.name), [subjects[0].name]);
    assert.deepEqual(schoolBSubjects.data.map(subject => subject.name), [subjects[1].name]);
  } finally {
    await stopApi(apiProcess);
    await controlRuntime?.close().catch(() => {});
    await adminPool?.end().catch(() => {});
    await postgresPool?.end().catch(() => {});
    await stopContainer(containerName);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});