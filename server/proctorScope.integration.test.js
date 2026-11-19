import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { initializeDatabase } from './db.js';

const { Pool } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dockerImage = 'postgres:17-alpine';
const databaseName = 'cbt_proctor_test';
const accountPassword = 'Proctor-Test-Password-123!';

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
  child.stdout.on('data', chunk => { output = (output + chunk.toString()).slice(-3000); });
  child.stderr.on('data', chunk => { output = (output + chunk.toString()).slice(-3000); });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`API exited during startup: ${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`API did not become ready: ${output}`);
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

async function request(baseUrl, route, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${baseUrl}/api${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
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

// TEST_DATABASE_URL memungkinkan menjalankan test tanpa Docker (mis. PostgreSQL lokal).
// Test ini menghapus schema public, jadi database harus sekali pakai dan berisi "test".
async function startDatabase() {
  if (process.env.TEST_DATABASE_URL) {
    const url = new URL(process.env.TEST_DATABASE_URL);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    assert.match(database, /test/i, 'TEST_DATABASE_URL harus menunjuk database uji sekali pakai.');
    const config = {
      host: url.hostname,
      port: Number(url.port || 5432),
      database,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      max: 5,
    };
    const pool = new Pool(config);
    await waitForPostgres(pool);
    return {
      pool,
      env: {
        DB_HOST: config.host,
        DB_PORT: String(config.port),
        DB_NAME: config.database,
        DB_USER: config.user,
        DB_PASSWORD: config.password,
      },
      async cleanup() {
        await pool.end().catch(() => {});
      },
    };
  }

  const suffix = randomBytes(5).toString('hex');
  const containerName = `cbt-proctor-test-${suffix}`;
  const databasePassword = randomBytes(24).toString('hex');
  let pool;
  try {
    run('docker', ['image', 'inspect', dockerImage]);
    run('docker', [
      'run', '--detach', '--rm', '--name', containerName,
      '--publish', '127.0.0.1::5432',
      '--env', 'POSTGRES_USER=cbt',
      '--env', `POSTGRES_PASSWORD=${databasePassword}`,
      '--env', `POSTGRES_DB=${databaseName}`,
      dockerImage,
    ]);
    const binding = run('docker', ['port', containerName, '5432/tcp']).split(/\r?\n/)[0];
    const databasePort = Number(binding?.split(':').at(-1));
    assert.ok(Number.isInteger(databasePort) && databasePort > 0, 'Disposable PostgreSQL must bind to a loopback port.');
    pool = new Pool({ host: '127.0.0.1', port: databasePort, database: databaseName, user: 'cbt', password: databasePassword, max: 5 });
    await waitForPostgres(pool);
    return {
      pool,
      env: {
        DB_HOST: '127.0.0.1',
        DB_PORT: String(databasePort),
        DB_NAME: databaseName,
        DB_USER: 'cbt',
        DB_PASSWORD: databasePassword,
      },
      async cleanup() {
        await pool.end().catch(() => {});
        await stopContainer(containerName);
      },
    };
  } catch (error) {
    await pool?.end().catch(() => {});
    await stopContainer(containerName).catch(() => {});
    throw error;
  }
}

test('migrasi 006 diterapkan dan pengawas hanya menerima ujian yang di-assign', { timeout: 180_000 }, async () => {
  const database = await startDatabase();
  const pool = database.pool;
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'cbt-proctor-test-'));
  let apiProcess;

  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await initializeDatabase(pool);

    // Simulasikan database lama yang belum pernah menerima migrasi 006.
    await pool.query('DROP TABLE exam_proctors');
    await pool.query('DELETE FROM schema_migrations WHERE version=6');
    const beforeMigration = await pool.query("SELECT to_regclass('public.exam_proctors') AS \"relation\"");
    assert.equal(beforeMigration.rows[0].relation, null, 'exam_proctors harus belum ada sebelum migrasi dijalankan.');

    // Jalur startup (initializeDatabase) harus menerapkan 006 ke database yang sudah ada.
    await initializeDatabase(pool);
    const afterMigration = await pool.query("SELECT to_regclass('public.exam_proctors') AS \"relation\"");
    assert.equal(afterMigration.rows[0].relation, 'exam_proctors');
    const ledger = await pool.query('SELECT version,name FROM schema_migrations WHERE version=6');
    assert.deepEqual(ledger.rows, [{ version: 6, name: 'exam-proctors' }]);
    const roomTables = await pool.query(`SELECT to_regclass('public.exam_rooms') AS rooms,
      to_regclass('public.exam_room_students') AS students,to_regclass('public.exam_room_links') AS links,
      to_regclass('public.exam_subjects') AS subjects`);
    assert.deepEqual(roomTables.rows[0], {
      rooms: 'exam_rooms', students: 'exam_room_students', links: 'exam_room_links', subjects: 'exam_subjects',
    });
    const ledger7 = await pool.query('SELECT version,name FROM schema_migrations WHERE version=7');
    assert.deepEqual(ledger7.rows, [{ version: 7, name: 'exam-rooms' }]);

    const passwordHash = await bcrypt.hash(accountPassword, 10);
    const accounts = await pool.query(`INSERT INTO users(username,full_name,role,password_hash,active,class_name) VALUES
      ('it-admin','Integration Admin','admin',$1,TRUE,NULL),
      ('it-pengawas-a','Pengawas A','pengawas',$1,TRUE,NULL),
      ('it-pengawas-b','Pengawas B','pengawas',$1,TRUE,NULL),
      ('it-teacher','Teacher A','teacher',$1,TRUE,'VII A'),
      ('it-student-a','Student A','student',$1,TRUE,'VII A'),
      ('it-student-b','Student B','student',$1,TRUE,'VII B')
      RETURNING id,username`,[passwordHash]);
    const accountId = username => accounts.rows.find(row => row.username === username).id;
    const subject = await pool.query("INSERT INTO subjects(name) VALUES('Bahasa Arab') RETURNING id");
    const bank = await pool.query('INSERT INTO question_banks(subject_id,grade,topic) VALUES($1,$2,$3) RETURNING id',[
      subject.rows[0].id, 'VII', 'Integration Proctor Bank',
    ]);
    await pool.query(`INSERT INTO questions(bank_id,type,prompt,options,answer_key,points) VALUES
      ($1,'mc','Soal 1','["A","B","C","D"]','A',1),
      ($1,'mc','Soal 2','["A","B","C","D"]','B',1),
      ($1,'essay','Soal 3','[]','Rubrik',1)`,[bank.rows[0].id]);
    const exams = await pool.query(`INSERT INTO exams(title,bank_id,class_name,mc_count,essay_count,duration_minutes,status) VALUES
      ('Ujian Terawasi A',$1,'VII A',0,1,60,'active'),
      ('Ujian Bukan Tugas B',$1,'VII B',0,1,60,'active')
      RETURNING id,title`,[bank.rows[0].id]);
    const assignedExamId = exams.rows.find(row => row.title === 'Ujian Terawasi A').id;
    const unassignedExamId = exams.rows.find(row => row.title === 'Ujian Bukan Tugas B').id;
    await pool.query(`INSERT INTO exam_sessions(exam_id,student_id,status,started_at) VALUES
      ($1,$2,'in_progress',NOW()),
      ($3,$4,'in_progress',NOW())`,
    [assignedExamId, accountId('it-student-a'), unassignedExamId, accountId('it-student-b')]);
    await pool.query('INSERT INTO exam_proctors(exam_id,proctor_id) VALUES($1,$2)',[
      assignedExamId, accountId('it-pengawas-a'),
    ]);

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    apiProcess = spawn(process.execPath, ['server/index.js'], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...database.env,
        PORT: String(port),
        TENANCY_ENABLED: 'false',
        LEGACY_BOOTSTRAP_SEED_ENABLED: 'false',
        SESSION_SECRET: randomBytes(48).toString('base64url'),
        COOKIE_SECURE: 'false',
        CORS_ORIGINS: baseUrl,
        PUBLIC_BASE_URL: baseUrl,
        QUESTION_MEDIA_DIR: temporaryDirectory,
      },
    });
    await waitForApi(apiProcess, baseUrl);

    const login = async username => {
      const response = await request(baseUrl, '/auth/login', {
        method: 'POST',
        body: { username, password: accountPassword },
      });
      assert.equal(response.status, 200, `Login ${username} harus berhasil.`);
      return response.cookie;
    };
    const adminCookie = await login('it-admin');
    const proctorCookie = await login('it-pengawas-a');
    const otherProctorCookie = await login('it-pengawas-b');
    const teacherCookie = await login('it-teacher');

    const adminExams = await request(baseUrl, '/exams', { cookie: adminCookie });
    assert.equal(adminExams.status, 200);
    assert.deepEqual(adminExams.data.map(exam => exam.id).sort(), [assignedExamId, unassignedExamId].sort());
    assert.equal(adminExams.data.length, 2, 'Admin harus tetap melihat semua sesi ujian.');

    const proctorExams = await request(baseUrl, '/exams', { cookie: proctorCookie });
    assert.equal(proctorExams.status, 200);
    assert.deepEqual(proctorExams.data.map(exam => exam.id), [assignedExamId], 'Pengawas hanya melihat ujian yang di-assign.');

    const unassignedExams = await request(baseUrl, '/exams', { cookie: otherProctorCookie });
    assert.equal(unassignedExams.status, 200);
    assert.deepEqual(unassignedExams.data, [], 'Pengawas tanpa assignment tidak melihat sesi apa pun.');

    const adminMonitor = await request(baseUrl, '/monitor', { cookie: adminCookie });
    assert.equal(adminMonitor.status, 200);
    assert.deepEqual([...new Set(adminMonitor.data.map(row => row.examId))].sort(), [assignedExamId, unassignedExamId].sort());

    const proctorMonitor = await request(baseUrl, '/monitor', { cookie: proctorCookie });
    assert.equal(proctorMonitor.status, 200);
    assert.deepEqual([...new Set(proctorMonitor.data.map(row => row.examId))], [assignedExamId], 'Peserta hanya berasal dari ujian yang di-assign.');
    assert.deepEqual(proctorMonitor.data.map(row => row.name), ['Student A']);

    const unassignedMonitor = await request(baseUrl, '/monitor', { cookie: otherProctorCookie });
    assert.equal(unassignedMonitor.status, 200);
    assert.deepEqual(unassignedMonitor.data, []);

    const assignedDetail = await request(baseUrl, `/exams/${assignedExamId}/monitor`, { cookie: proctorCookie });
    assert.equal(assignedDetail.status, 200);
    assert.deepEqual(assignedDetail.data.students.map(row => row.name), ['Student A']);
    const unassignedDetail = await request(baseUrl, `/exams/${unassignedExamId}/monitor`, { cookie: proctorCookie });
    assert.equal(unassignedDetail.status, 404, 'Pengawas tidak boleh membuka monitor ujian yang tidak di-assign.');

    // Bank soal ↔ guru: tautan otomatis dan pengecualian manual.
    const teacherAccess = await request(baseUrl, `/teachers/${accountId('it-teacher')}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VII A'], subjectIds: [subject.rows[0].id], bankIds: [bank.rows[0].id] },
    });
    assert.equal(teacherAccess.status, 200, JSON.stringify(teacherAccess.data));
    assert.deepEqual(teacherAccess.data.banks.map(item => String(item.id)), [String(bank.rows[0].id)]);
    const teacherId = accountId('it-teacher');
    const autoLink = await pool.query('SELECT source FROM question_bank_teachers WHERE bank_id=$1 AND teacher_id=$2', [bank.rows[0].id, teacherId]);
    assert.deepEqual(autoLink.rows, [{ source: 'auto' }], 'Tautan awal harus tercatat otomatis.');

    const teacherBanks = await request(baseUrl, '/banks', { cookie: teacherCookie });
    assert.equal(teacherBanks.status, 200);
    assert.deepEqual(teacherBanks.data.map(item => String(item.id)), [String(bank.rows[0].id)]);
    assert.deepEqual(teacherBanks.data[0].teachers.map(item => item.name), ['Teacher A']);

    const createdBank = await request(baseUrl, '/banks', {
      method: 'POST', cookie: adminCookie,
      body: { subjectId: subject.rows[0].id, grade: 'VII', topic: 'Bank Baru Guru', questions: [{ type: 'mc', prompt: 'Pertanyaan baru', options: ['A', 'B', 'C', 'D'], answerKey: 'A', points: 1 }] },
    });
    assert.equal(createdBank.status, 201, JSON.stringify(createdBank.data));

    const adminBanks = await request(baseUrl, '/banks', { cookie: adminCookie });
    const newBankRow = adminBanks.data.find(item => String(item.id) === String(createdBank.data.id));
    assert.deepEqual(newBankRow.teachers.map(item => item.name), ['Teacher A'], 'Bank admin otomatis terhubung ke guru mapel/tingkat.');
    const teacherBanksAfterCreate = await request(baseUrl, '/banks', { cookie: teacherCookie });
    assert.equal(teacherBanksAfterCreate.data.length, 2, 'Guru harus melihat bank baru yang sesuai aksesnya.');

    const clearedBanks = await request(baseUrl, `/teachers/${accountId('it-teacher')}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VII A'], subjectIds: [subject.rows[0].id], bankIds: [] },
    });
    assert.equal(clearedBanks.status, 200);
    assert.deepEqual(clearedBanks.data.banks, []);
    const hiddenBanks = await request(baseUrl, '/banks', { cookie: teacherCookie });
    assert.deepEqual(hiddenBanks.data, [], 'Bank yang dilepas tidak boleh terlihat walau akses mapel masih ada.');

    const restoredBanks = await request(baseUrl, `/teachers/${accountId('it-teacher')}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VII A'], subjectIds: [subject.rows[0].id], bankIds: [bank.rows[0].id] },
    });
    assert.deepEqual(restoredBanks.data.banks.map(item => String(item.id)), [String(bank.rows[0].id)]);

    const savedAgain = await request(baseUrl, `/teachers/${teacherId}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VII A'], subjectIds: [subject.rows[0].id], bankIds: [bank.rows[0].id] },
    });
    assert.equal(savedAgain.status, 200);
    const autoAfterSave = await pool.query('SELECT source FROM question_bank_teachers WHERE bank_id=$1 AND teacher_id=$2', [bank.rows[0].id, teacherId]);
    assert.deepEqual(autoAfterSave.rows, [{ source: 'auto' }], 'Menyimpan akses tidak boleh mengubah tautan otomatis menjadi manual.');

    const movedClass = await request(baseUrl, `/teachers/${teacherId}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VIII A'], subjectIds: [subject.rows[0].id], bankIds: [] },
    });
    assert.equal(movedClass.status, 200);
    const linksAfterMove = await pool.query('SELECT source FROM question_bank_teachers WHERE teacher_id=$1 AND bank_id=$2', [teacherId, bank.rows[0].id]);
    assert.deepEqual(linksAfterMove.rows, [], 'Perubahan kelas harus melepas tautan otomatis tingkat lama.');
    const banksAfterMove = await request(baseUrl, '/banks', { cookie: teacherCookie });
    assert.deepEqual(banksAfterMove.data, [], 'Bank tingkat lama tidak boleh terlihat setelah kelas berubah.');

    const returnedClass = await request(baseUrl, `/teachers/${teacherId}/access`, {
      method: 'PUT', cookie: adminCookie,
      body: { role: 'teacher', classes: ['VII A'], subjectIds: [subject.rows[0].id], bankIds: [bank.rows[0].id] },
    });
    assert.equal(returnedClass.status, 200);
    const autoReturned = await pool.query('SELECT source FROM question_bank_teachers WHERE bank_id=$1 AND teacher_id=$2', [bank.rows[0].id, teacherId]);
    assert.deepEqual(autoReturned.rows, [{ source: 'auto' }], 'Saat kelas kembali cocok, tautan otomatis harus pulih sebagai auto.');

    // Ruang ujian: plotting kuota per kelas, ujian berbasis ruang, dan akses pengawas per ruang.
    const roomOne = await request(baseUrl, '/rooms', {
      method: 'POST', cookie: adminCookie, body: { name: 'Ruang 01', quotas: [{ className: 'VII A', count: 1 }] },
    });
    assert.equal(roomOne.status, 201, JSON.stringify(roomOne.data));
    assert.equal(roomOne.data.totalAllocated, 1, 'Kuota VII A harus mengambil Student A.');
    const roomTwo = await request(baseUrl, '/rooms', {
      method: 'POST', cookie: adminCookie, body: { name: 'Ruang 02', quotas: [{ className: 'VII B', count: 1 }] },
    });
    assert.equal(roomTwo.status, 201);
    assert.equal(roomTwo.data.totalAllocated, 1, 'Kuota VII B harus mengambil Student B.');

    const roomList = await request(baseUrl, '/rooms', { cookie: adminCookie });
    assert.equal(roomList.status, 200);
    assert.equal(roomList.data.rooms.length, 2);
    const roomOneRow = roomList.data.rooms.find(room => room.name === 'Ruang 01');
    assert.equal(roomOneRow.studentCount, 1);
    assert.deepEqual(roomOneRow.classCounts, [{ className: 'VII A', count: 1 }]);
    assert.deepEqual(roomList.data.unassigned, [], 'Semua siswa harus sudah terplotting.');

    const roomOneDetail = await request(baseUrl, `/rooms/${roomOne.data.id}`, { cookie: adminCookie });
    assert.equal(roomOneDetail.status, 200);
    assert.deepEqual(roomOneDetail.data.students.map(student => student.name), ['Student A']);

    const roomExam = await request(baseUrl, '/exams', {
      method: 'POST', cookie: adminCookie,
      body: { title: 'Ujian Ruang', subjectIds: [subject.rows[0].id], roomIds: [roomOne.data.id], mcCount: 1, essayCount: 0, durationMinutes: 30 },
    });
    assert.equal(roomExam.status, 201, JSON.stringify(roomExam.data));
    assert.equal(roomExam.data.participants, 1);
    assert.equal(roomExam.data.rooms, 1);

    const examsAfterRoom = await request(baseUrl, '/exams', { cookie: adminCookie });
    const roomExamRow = examsAfterRoom.data.find(exam => exam.id === roomExam.data.id);
    assert.deepEqual(roomExamRow.rooms.map(room => room.name), ['Ruang 01']);
    assert.deepEqual(roomExamRow.subjects.map(row => row.name), ['Bahasa Arab']);

    const proctorRoomAccess = await request(baseUrl, `/teachers/${accountId('it-pengawas-b')}/access`, {
      method: 'PUT', cookie: adminCookie, body: { role: 'pengawas', roomIds: [roomOne.data.id], examIds: [] },
    });
    assert.equal(proctorRoomAccess.status, 200);
    assert.deepEqual(proctorRoomAccess.data.rooms.map(room => room.name), ['Ruang 01']);

    const roomProctorExams = await request(baseUrl, '/exams', { cookie: otherProctorCookie });
    assert.deepEqual(roomProctorExams.data.map(exam => exam.id), [roomExam.data.id], 'Pengawas ruang hanya melihat ujian yang memakai ruangnya.');

    const roomMonitorAllowed = await request(baseUrl, `/exams/${roomExam.data.id}/monitor`, { cookie: otherProctorCookie });
    assert.equal(roomMonitorAllowed.status, 200);
    assert.deepEqual(roomMonitorAllowed.data.students.map(row => row.name), ['Student A']);
    const roomMonitorForbidden = await request(baseUrl, `/exams/${roomExam.data.id}/monitor`, { cookie: proctorCookie });
    assert.equal(roomMonitorForbidden.status, 404, 'Pengawas tanpa ruang tersebut tidak boleh membuka monitor.');

    const teacherList = await request(baseUrl, '/teachers', { cookie: adminCookie });
    const proctorBRooms = teacherList.data.find(teacher => teacher.username === 'it-pengawas-b').rooms;
    assert.deepEqual(proctorBRooms.map(room => room.name), ['Ruang 01']);

    const deletedRoom = await request(baseUrl, `/rooms/${roomTwo.data.id}`, { method: 'DELETE', cookie: adminCookie });
    assert.equal(deletedRoom.status, 200);
    const roomsAfterDelete = await request(baseUrl, '/rooms', { cookie: adminCookie });
    assert.deepEqual(roomsAfterDelete.data.unassigned, [{ className: 'VII B', count: 1 }], 'Siswa ruang yang dihapus harus kembali belum terplotting.');
  } finally {
    await stopApi(apiProcess);
    await database.cleanup().catch(() => {});
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
