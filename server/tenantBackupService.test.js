import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTenantBackupService } from './tenantBackupService.js';

function createMockControlPool(initialTenants = [], auditLogs = []) {
  const tenants = [...initialTenants];
  return {
    tenants,
    auditLogs,
    async query(sql, params = []) {
      if (sql.includes('SELECT * FROM control_plane.tenants WHERE id = $1')) {
        const found = tenants.find(t => t.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      if (sql.includes('SELECT school_code FROM control_plane.tenants WHERE id = $1')) {
        const found = tenants.find(t => t.id === params[0]);
        return { rows: found ? [{ school_code: found.school_code }] : [], rowCount: found ? 1 : 0 };
      }
      if (sql.includes('UPDATE control_plane.tenants SET database_name = $1')) {
        const found = tenants.find(t => t.id === params[1]);
        if (found) found.database_name = params[0];
        return { rowCount: found ? 1 : 0 };
      }
      if (sql.includes('INSERT INTO control_plane.platform_audit_logs')) {
        const actionMatch = sql.match(/'(tenant\.[^']+)'/);
        const action = actionMatch ? actionMatch[1] : (params[2] || 'audit');
        const detailStr = params[2] && typeof params[2] === 'string' && params[2].startsWith('{') ? params[2] : params[3];
        auditLogs.push({ actorId: params[0], tenantId: params[1], action, detail: detailStr ? JSON.parse(detailStr) : {} });
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function createMockTenantPool(customData = {}) {
  const data = {
    school_settings: [{ id: 1, school_name: 'Sekolah Demo', academic_year: '2026/2027', semester: 'Ganjil', violation_threshold: 2 }],
    users: [
      { id: 1, username: 'admin1', full_name: 'Admin Test', role: 'admin', email: 'admin@demo.id', password_hash: '$2a$12$abcdefghijklmnopqrstuv', active: true },
      { id: 2, username: 'student1', full_name: 'Siswa Test', role: 'student', email: 'siswa@demo.id', password_hash: '$2a$12$abcdefghijklmnopqrstuv', active: true },
    ],
    subjects: [{ id: 1, name: 'Matematika' }],
    teacher_access: [],
    question_banks: [{ id: 1, subject_id: 1, grade: 'VII', topic: 'Aljabar' }],
    question_stimuli: [],
    questions: [{ id: 1, bank_id: 1, type: 'mc', prompt: '1+1=?', options: '["A","B","C","D"]', answer_key: 'A', points: 1 }],
    question_media: [{ id: 1, question_id: 1, file_key: 'test-image.png', mime_type: 'image/png', file_size: 100, alt_text: 'Test Image' }],
    exams: [{ id: 1, title: 'Ujian Harian 1', bank_id: 1, class_name: 'VII A', mc_count: 1, essay_count: 0, duration_minutes: 60, status: 'draft' }],
    exam_sessions: [{ id: 1, exam_id: 1, student_id: 2, status: 'completed' }],
    exam_questions: [{ session_id: 1, question_id: 1, position: 1 }],
    responses: [{ session_id: 1, question_id: 1, answer: 'A' }],
    violation_events: [],
    audit_logs: [],
    schema_migrations: [{ version: 1, name: 'init' }],
    ...customData,
  };

  return {
    data,
    async connect() {
      return {
        query: async (sql, params = []) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rowCount: 1 };
          if (sql.startsWith('INSERT INTO "')) {
            const match = sql.match(/INSERT INTO "([^"]+)"/);
            const table = match ? match[1] : null;
            if (table) {
              if (!data[table]) data[table] = [];
              const obj = {};
              if (table === 'question_media') {
                obj.file_key = params.find(p => typeof p === 'string' && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.webp'))) || 'test-image.png';
              }
              data[table].push(obj);
            }
            return { rowCount: 1 };
          }
          if (sql.includes('setval')) return { rowCount: 1 };
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
      };
    },
    async query(sql, params = []) {
      for (const [table, rows] of Object.entries(data)) {
        if (sql === `SELECT * FROM "${table}"`) return { rows, rowCount: rows.length };
        if (sql === `SELECT count(*)::int AS count FROM "${table}"`) return { rows: [{ count: rows.length }], rowCount: 1 };
      }
      if (sql.includes("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")) {
        return { rows: Object.keys(data).map(table_name => ({ table_name })), rowCount: Object.keys(data).length };
      }
      if (sql.includes("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email'")) {
        return { rows: [{ 1: 1 }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(*)::int AS count FROM questions q LEFT JOIN question_banks')) {
        return { rows: [{ count: 0 }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(*)::int AS count FROM exam_sessions s LEFT JOIN exams')) {
        return { rows: [{ count: 0 }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(*)::int AS count FROM exam_sessions s LEFT JOIN users')) {
        return { rows: [{ count: 0 }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(*)::int AS count FROM responses r LEFT JOIN exam_sessions')) {
        return { rows: [{ count: 0 }], rowCount: 1 };
      }
      if (sql.includes("SELECT count(*)::int AS count FROM users WHERE role = 'admin'")) {
        return { rows: [{ count: 1 }], rowCount: 1 };
      }
      if (sql.includes("SELECT count(*)::int AS count FROM exam_sessions WHERE status = 'in_progress'")) {
        const inProgress = (data.exam_sessions || []).filter(s => s.status === 'in_progress').length;
        return { rows: [{ count: inProgress }], rowCount: 1 };
      }
      if (sql.includes('SELECT file_key FROM question_media')) {
        return { rows: data.question_media.map(m => ({ file_key: m.file_key })), rowCount: data.question_media.length };
      }
      if (sql.includes('SELECT school_name, violation_threshold FROM school_settings WHERE id = 1') || sql.includes('SELECT school_name FROM school_settings WHERE id = 1')) {
        return { rows: data.school_settings, rowCount: data.school_settings.length };
      }
      if (sql.includes("SELECT id, username FROM users WHERE role = 'admin'")) {
        return { rows: data.users.filter(u => u.role === 'admin'), rowCount: 1 };
      }
      if (sql.includes('SELECT count(*) FROM questions')) {
        return { rows: [{ count: data.questions.length }], rowCount: 1 };
      }
      if (sql.includes('TRUNCATE TABLE')) {
        for (const k of Object.keys(data)) data[k] = [];
        return { rowCount: 1 };
      }
      if (sql.includes('GRANT') || sql.includes('ALTER DEFAULT PRIVILEGES')) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    async end() {},
  };
}

test('backup service creates encrypted package with manifest, media, and audit log', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cbt-bak-test-'));
  const mediaDir = path.join(tmpDir, 'media');
  const bakDir = path.join(tmpDir, 'backups');
  const masterKey = randomBytes(32);

  const mockTenant = {
    id: 'tenant-123',
    school_code: 'sekolah-test',
    database_name: 'cbt_t_test123',
    database_secret_ref: 'tenant/tenant-123/application',
  };

  const auditLogs = [];
  const controlPool = createMockControlPool([mockTenant], auditLogs);
  const tenantPool = createMockTenantPool();

  // Create dummy media file
  await (await import('node:fs/promises')).mkdir(mediaDir, { recursive: true });
  await writeFile(path.join(mediaDir, 'test-image.png'), Buffer.from('fake-png-content'));

  const service = createTenantBackupService({
    controlPool,
    adminPool: controlPool,
    secretStore: null,
    router: {
      resolveById: async () => ({ pool: tenantPool }),
      evict: async () => {},
    },
    mediaDirectory: mediaDir,
    backupsDirectory: bakDir,
    masterKey,
  });

  const result = await service.createBackup({ tenantId: 'tenant-123', actorId: 'owner-1' });

  assert.ok(result.filename.startsWith('backup_sekolah-test_'));
  assert.ok(result.sizeBytes > 0);
  assert.equal(result.manifest.schoolCode, 'sekolah-test');
  assert.equal(result.manifest.tablesSummary.users, 2);
  assert.equal(result.manifest.mediaCount, 1);
  assert.ok(result.downloadToken);

  // Verify audit log recorded
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'tenant.backup.create');
  assert.equal(auditLogs[0].tenantId, 'tenant-123');

  // Verify download token validation
  const tokenData = service.verifyDownloadToken(result.downloadToken, result.filename);
  assert.equal(tokenData.tenantId, 'tenant-123');
  assert.equal(tokenData.filename, result.filename);

  // List backups
  const list = await service.listBackups({ tenantId: 'tenant-123' });
  assert.equal(list.length, 1);
  assert.equal(list[0].filename, result.filename);
  assert.equal(list[0].manifest.schoolCode, 'sekolah-test');

  await rm(tmpDir, { recursive: true, force: true });
});

test('download token rejects forged or expired tokens and does not leak master key', async () => {
  const masterKey = randomBytes(32);
  const service = createTenantBackupService({
    controlPool: createMockControlPool(),
    masterKey,
  });

  const validToken = service.createDownloadToken({ tenantId: 't-1', filename: 'backup_test.cbtenc' });
  assert.ok(!validToken.includes(masterKey.toString('hex')));
  assert.ok(!validToken.includes(masterKey.toString('base64')));

  // Tampered token
  const tampered = validToken.slice(0, -4) + 'xxxx';
  assert.throws(() => service.verifyDownloadToken(tampered, 'backup_test.cbtenc'), { status: 403 });

  // Expired token
  const expiredToken = service.createDownloadToken({ tenantId: 't-1', filename: 'backup_test.cbtenc', expMinutes: -1 });
  assert.throws(() => service.verifyDownloadToken(expiredToken, 'backup_test.cbtenc'), { status: 410 });
});

test('restores to staging, runs 5 verifications, cuts over and evicts pool with rollback protection', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cbt-restore-test-'));
  const mediaDir = path.join(tmpDir, 'media');
  const bakDir = path.join(tmpDir, 'backups');
  const masterKey = randomBytes(32);

  const mockTenant = {
    id: 'tenant-restore-1',
    school_code: 'smp-restore',
    database_name: 'cbt_t_restore_old',
    database_secret_ref: 'tenant/tenant-restore-1/application',
  };

  const auditLogs = [];
  const controlPool = createMockControlPool([mockTenant], auditLogs);
  const tenantPool = createMockTenantPool();
  let evictedTenantId = null;

  await (await import('node:fs/promises')).mkdir(mediaDir, { recursive: true });
  await writeFile(path.join(mediaDir, 'test-image.png'), Buffer.from('test-image-binary'));

  let stagingPoolCreated = null;
  const adminQueries = [];
  const mockAdminPool = {
    async query(sql) {
      adminQueries.push(sql);
      return { rowCount: 1 };
    },
  };

  const service = createTenantBackupService({
    controlPool,
    adminPool: mockAdminPool,
    secretStore: null,
    router: {
      resolveById: async () => ({ pool: stagingPoolCreated || tenantPool }),
      evict: async (id) => { evictedTenantId = id; },
    },
    mediaDirectory: mediaDir,
    backupsDirectory: bakDir,
    masterKey,
    createTenantPool: async () => {
      stagingPoolCreated = createMockTenantPool();
      return stagingPoolCreated;
    },
    initializeTenantDatabase: async () => {},
    applyEmailMigration: async () => {},
  });

  // 1. Create a backup
  const backup = await service.createBackup({ tenantId: 'tenant-restore-1', actorId: 'owner-1' });

  // 2. Restore to staging
  const stagingRes = await service.restoreToStaging({
    tenantId: 'tenant-restore-1',
    filename: backup.filename,
    actorId: 'owner-1',
  });

  assert.ok(stagingRes.stagingDatabaseName.startsWith('cbt_stg_smprestore_'));
  assert.equal(stagingRes.verification.passed, true);
  assert.equal(stagingRes.verification.schema.passed, true);
  assert.equal(stagingRes.verification.relations.passed, true);
  assert.equal(stagingRes.verification.dataCounts.passed, true);
  assert.equal(stagingRes.verification.loginAndExams.passed, true);
  assert.equal(stagingRes.verification.media.passed, true);

  // 3. Cutover
  const cutoverRes = await service.cutoverTenant({
    tenantId: 'tenant-restore-1',
    stagingDatabaseName: stagingRes.stagingDatabaseName,
    actorId: 'owner-1',
  });

  assert.equal(cutoverRes.success, true);
  assert.equal(cutoverRes.activeDatabase, stagingRes.stagingDatabaseName);
  assert.equal(cutoverRes.preservedDatabase, 'cbt_t_restore_old');
  assert.equal(evictedTenantId, 'tenant-restore-1');
  assert.equal(mockTenant.database_name, stagingRes.stagingDatabaseName);

  // Check cutover success audit log
  const cutoverLog = auditLogs.find(l => l.action === 'tenant.restore.cutover.success');
  assert.ok(cutoverLog);
  assert.equal(cutoverLog.detail.preservedOldDatabase, 'cbt_t_restore_old');

  // 4. One-click auto restore executes cleanly
  const autoRes = await service.executeAutoRestore({
    tenantId: 'tenant-restore-1',
    filename: backup.filename,
    actorId: 'owner-1',
    confirmMaintenance: true,
  });
  assert.equal(autoRes.success, true);
  assert.equal(autoRes.aborted, false);

  await rm(tmpDir, { recursive: true, force: true });
});

test('cutover halts when there are active exam sessions unless maintenance confirmed', async () => {
  const masterKey = randomBytes(32);
  const mockTenant = {
    id: 'tenant-exam',
    school_code: 'smp-exam',
    database_name: 'cbt_t_exam_old',
    database_secret_ref: 'tenant/tenant-exam/application',
  };
  const controlPool = createMockControlPool([mockTenant]);
  const livePoolWithExams = createMockTenantPool({
    exam_sessions: [{ id: 1, exam_id: 1, student_id: 2, status: 'in_progress' }],
  });

  const service = createTenantBackupService({
    controlPool,
    adminPool: controlPool,
    secretStore: null,
    router: {
      resolveById: async () => ({ pool: livePoolWithExams }),
      evict: async () => {},
    },
    masterKey,
  });

  await assert.rejects(
    () => service.cutoverTenant({
      tenantId: 'tenant-exam',
      stagingDatabaseName: 'cbt_stg_exam_new',
      actorId: 'owner-1',
      confirmMaintenance: false,
    }),
    err => {
      assert.equal(err.status, 409);
      assert.match(err.message, /sesi ujian aktif/);
      return true;
    },
  );
});

test('auto-rollback triggers if smoke test fails after cutover', async () => {
  const masterKey = randomBytes(32);
  const mockTenant = {
    id: 'tenant-smoke-fail',
    school_code: 'smp-fail',
    database_name: 'cbt_t_fail_original',
    database_secret_ref: 'tenant/tenant-smoke-fail/application',
  };
  const auditLogs = [];
  const controlPool = createMockControlPool([mockTenant], auditLogs);

  // Pool that throws on school_settings query
  const brokenStagingPool = {
    async query(sql) {
      if (sql.includes('status = \'in_progress\'')) return { rows: [{ count: 0 }], rowCount: 1 };
      if (sql.includes('school_settings')) throw new Error('Corrupted table header');
      return { rows: [], rowCount: 0 };
    },
  };

  const service = createTenantBackupService({
    controlPool,
    adminPool: controlPool,
    secretStore: null,
    router: {
      resolveById: async () => ({ pool: brokenStagingPool }),
      evict: async () => {},
    },
    masterKey,
  });

  await assert.rejects(
    () => service.cutoverTenant({
      tenantId: 'tenant-smoke-fail',
      stagingDatabaseName: 'cbt_stg_broken',
      actorId: 'owner-1',
    }),
    err => {
      assert.match(err.message, /Otomatis rollback ke database lama/);
      return true;
    },
  );

  // Confirm database name rolled back to original
  assert.equal(mockTenant.database_name, 'cbt_t_fail_original');
  const rollbackLog = auditLogs.find(l => l.action === 'tenant.restore.cutover.rollback');
  assert.ok(rollbackLog);
  assert.equal(rollbackLog.detail.revertedTo, 'cbt_t_fail_original');
});
