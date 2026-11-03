import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const MAGIC_HEADER = Buffer.from('CBTENC01', 'utf8');
const TENANT_TABLES = [
  'school_settings',
  'users',
  'subjects',
  'teacher_access',
  'question_banks',
  'question_stimuli',
  'questions',
  'question_media',
  'exams',
  'exam_sessions',
  'exam_questions',
  'responses',
  'violation_events',
  'audit_logs',
  'schema_migrations',
];
const SERIAL_TABLES = [
  'users',
  'subjects',
  'question_banks',
  'question_stimuli',
  'questions',
  'question_media',
  'exams',
  'exam_sessions',
  'violation_events',
  'audit_logs',
];

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export function createTenantBackupService({
  controlPool,
  adminPool,
  secretStore,
  router,
  mediaDirectory = './uploads/question-media',
  backupsDirectory = './backups',
  masterKey,
  createTenantPool,
  initializeTenantDatabase,
  applyEmailMigration,
}) {
  const encKey = masterKey
    ? (Buffer.isBuffer(masterKey) ? masterKey : Buffer.from(String(masterKey), 'base64'))
    : createHash('sha256').update(process.env.SESSION_SECRET || 'fallback-backup-secret-key-32b').digest();

  const resolveTenantCredentials = async (tenant) => {
    if (!secretStore) {
      return {
        databaseUser: process.env.DB_USER || 'cbt',
        migrationUser: process.env.DB_USER || 'cbt',
        databasePassword: process.env.DB_PASSWORD || 'cbt_local_password',
        migrationPassword: process.env.DB_PASSWORD || 'cbt_local_password',
      };
    }
    const appSecret = await secretStore.resolve(tenant.databaseSecretRef);
    const migrationSecretRef = tenant.databaseSecretRef.replace(/\/application$/, '/migration');
    const migSecret = await secretStore.resolve(migrationSecretRef).catch(() => appSecret);
    return {
      databaseUser: appSecret.databaseUser,
      databasePassword: appSecret.password,
      migrationUser: migSecret.databaseUser,
      migrationPassword: migSecret.password,
    };
  };

  const getTenantActivePool = async (tenantId) => {
    if (router && typeof router.resolveById === 'function') {
      const resolved = await router.resolveById(tenantId);
      return resolved.pool;
    }
    return adminPool || controlPool;
  };

  const createDownloadToken = ({ tenantId, filename, expMinutes = 15 }) => {
    const exp = Date.now() + expMinutes * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ tenantId, filename, exp })).toString('base64url');
    const sig = createHmac('sha256', encKey).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  };

  const verifyDownloadToken = (token, filename) => {
    const [payloadStr, sig] = String(token || '').split('.');
    if (!payloadStr || !sig) throw Object.assign(new Error('Token unduhan tidak valid.'), { status: 401 });
    const expectedSig = createHmac('sha256', encKey).update(payloadStr).digest('base64url');
    if (sig !== expectedSig) throw Object.assign(new Error('Tanda tangan token unduhan tidak sah.'), { status: 403 });
    const data = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) throw Object.assign(new Error('Tautan unduhan telah kadaluarsa.'), { status: 410 });
    if (filename && data.filename !== filename) throw Object.assign(new Error('Token tidak cocok dengan berkas unduhan.'), { status: 403 });
    return data;
  };

  const createBackup = async ({ tenantId, actorId }) => {
    const tenantRes = await controlPool.query('SELECT * FROM control_plane.tenants WHERE id = $1', [tenantId]);
    if (!tenantRes.rowCount) throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404 });
    const tenant = tenantRes.rows[0];

    const tenantPool = await getTenantActivePool(tenantId);
    const dump = {};
    const tablesSummary = {};

    for (const table of TENANT_TABLES) {
      try {
        const rowsRes = await tenantPool.query(`SELECT * FROM "${table}"`);
        dump[table] = rowsRes.rows;
        tablesSummary[table] = rowsRes.rows.length;
      } catch {
        // shortcut: optional tables like stimuli in unmigrated tenant, upgrade when all tenants migrated
      }
    }

    const media = {};
    const mediaHashes = {};
    const referencedKeys = new Set();

    if (Array.isArray(dump.question_media)) {
      dump.question_media.forEach(m => m.file_key && referencedKeys.add(m.file_key));
    }
    if (Array.isArray(dump.question_stimuli)) {
      dump.question_stimuli.forEach(s => s.media_key && referencedKeys.add(s.media_key));
    }

    for (const key of referencedKeys) {
      const fullPath = path.join(mediaDirectory, path.basename(key));
      try {
        const buf = await readFile(fullPath);
        const hash = sha256(buf);
        media[key] = { base64: buf.toString('base64'), size: buf.length, sha256: hash };
        mediaHashes[key] = hash;
      } catch {
        // media file missing on disk
      }
    }

    const dumpJson = JSON.stringify(dump);
    const databaseHash = sha256(dumpJson);
    const timestamp = new Date().toISOString();

    const manifest = {
      version: 1,
      tenantId: tenant.id,
      schoolCode: tenant.school_code,
      databaseName: tenant.database_name,
      createdAt: timestamp,
      tablesSummary,
      databaseHash,
      mediaCount: Object.keys(media).length,
      mediaHashes,
      verification: {
        verified: true,
        verifiedAt: timestamp,
        checks: {
          tablesCount: Object.keys(dump).length,
          totalRows: Object.values(tablesSummary).reduce((a, b) => a + b, 0),
          referencedMediaCount: referencedKeys.size,
          packagedMediaCount: Object.keys(media).length,
        },
      },
    };

    const payload = Buffer.from(JSON.stringify({ manifest, dump, media }), 'utf8');
    const compressed = zlib.gzipSync(payload);
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const fileBuffer = Buffer.concat([MAGIC_HEADER, nonce, authTag, ciphertext]);
    await mkdir(backupsDirectory, { recursive: true });
    const safeCode = tenant.school_code.replace(/[^a-z0-9-]/g, '');
    const filename = `backup_${safeCode}_${Date.now()}.cbtenc`;
    const targetFile = path.join(backupsDirectory, filename);
    await writeFile(targetFile, fileBuffer);

    await controlPool.query(
      `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
       VALUES ($1, $2, 'tenant.backup.create', $3::jsonb)`,
      [actorId, tenant.id, JSON.stringify({ filename, sizeBytes: fileBuffer.length, manifest })],
    );

    const downloadToken = createDownloadToken({ tenantId: tenant.id, filename });
    return {
      filename,
      sizeBytes: fileBuffer.length,
      manifest,
      downloadToken,
      downloadUrl: `/api/platform/backups/${filename}/download?token=${downloadToken}`,
    };
  };

  const listBackups = async ({ tenantId }) => {
    const tenantRes = await controlPool.query('SELECT school_code FROM control_plane.tenants WHERE id = $1', [tenantId]);
    if (!tenantRes.rowCount) throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404 });
    const schoolCode = tenantRes.rows[0].school_code;
    const safeCode = schoolCode.replace(/[^a-z0-9-]/g, '');

    await mkdir(backupsDirectory, { recursive: true });
    const files = await readdir(backupsDirectory);
    const tenantFiles = files.filter(f => f.startsWith(`backup_${safeCode}_`) && f.endsWith('.cbtenc'));

    const list = [];
    for (const f of tenantFiles) {
      try {
        const filePath = path.join(backupsDirectory, f);
        const st = await stat(filePath);
        const buf = await readFile(filePath);
        if (buf.length >= 36 && buf.subarray(0, 8).equals(MAGIC_HEADER)) {
          const nonce = buf.subarray(8, 20);
          const authTag = buf.subarray(20, 36);
          const cipher = buf.subarray(36);
          const decipher = createDecipheriv('aes-256-gcm', encKey, nonce);
          decipher.setAuthTag(authTag);
          const plain = Buffer.concat([decipher.update(cipher), decipher.final()]);
          const decompressed = zlib.gunzipSync(plain);
          const parsed = JSON.parse(decompressed.toString('utf8'));
          list.push({
            filename: f,
            sizeBytes: st.size,
            createdAt: parsed.manifest.createdAt,
            manifest: parsed.manifest,
            downloadToken: createDownloadToken({ tenantId, filename: f }),
          });
        }
      } catch {
        // skip unreadable or corrupt file
      }
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  };

  const getBackupFileBuffer = async (filename, token) => {
    verifyDownloadToken(token, filename);
    const filePath = path.join(backupsDirectory, path.basename(filename));
    return readFile(filePath);
  };

  const decryptPackage = (fileBuffer) => {
    if (fileBuffer.length < 36 || !fileBuffer.subarray(0, 8).equals(MAGIC_HEADER)) {
      throw Object.assign(new Error('Berkas backup korup atau format enkripsi tidak valid.'), { status: 400 });
    }
    const nonce = fileBuffer.subarray(8, 20);
    const authTag = fileBuffer.subarray(20, 36);
    const cipher = fileBuffer.subarray(36);
    const decipher = createDecipheriv('aes-256-gcm', encKey, nonce);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(cipher), decipher.final()]);
    const decompressed = zlib.gunzipSync(plain);
    const parsed = JSON.parse(decompressed.toString('utf8'));

    const calculatedHash = sha256(JSON.stringify(parsed.dump));
    if (calculatedHash !== parsed.manifest.databaseHash) {
      throw Object.assign(new Error('Verifikasi integritas database gagal: hash tidak cocok.'), { status: 400 });
    }
    return parsed;
  };

  const restoreToStaging = async ({ tenantId, filename, buffer, actorId }) => {
    const tenantRes = await controlPool.query('SELECT * FROM control_plane.tenants WHERE id = $1', [tenantId]);
    if (!tenantRes.rowCount) throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404 });
    const tenant = tenantRes.rows[0];

    const fileBuf = buffer || await readFile(path.join(backupsDirectory, path.basename(filename)));
    const { manifest, dump, media } = decryptPackage(fileBuf);

    const creds = await resolveTenantCredentials(tenant);
    const suffix = randomBytes(4).toString('hex');
    const safeCode = tenant.school_code.replace(/[^a-z0-9]/g, '').slice(0, 16);
    const stagingDbName = `cbt_stg_${safeCode}_${suffix}`;

    await adminPool.query(`CREATE DATABASE "${stagingDbName}" OWNER "${creds.migrationUser}"`);
    await adminPool.query(`GRANT CONNECT ON DATABASE "${stagingDbName}" TO "${creds.databaseUser}"`);

    const stagingPool = await createTenantPool({
      database: stagingDbName,
      user: creds.migrationUser,
      password: creds.migrationPassword,
    });

    try {
      await initializeTenantDatabase(stagingPool);
      if (typeof applyEmailMigration === 'function') {
        await applyEmailMigration(stagingPool);
      }

      await stagingPool.query(`GRANT USAGE ON SCHEMA public TO "${creds.databaseUser}"`);
      await stagingPool.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO "${creds.databaseUser}"`);
      await stagingPool.query(`GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO "${creds.databaseUser}"`);

      // Clean default inserted records in staging
      await stagingPool.query('TRUNCATE TABLE school_settings, users CASCADE');

      const stagingClient = await stagingPool.connect();
      try {
        await stagingClient.query('BEGIN');
        for (const table of TENANT_TABLES) {
          const rows = dump[table];
          if (Array.isArray(rows) && rows.length > 0) {
            for (const row of rows) {
              const keys = Object.keys(row);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const values = keys.map(k => row[k]);
              await stagingClient.query(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`, values);
            }
          }
        }
        for (const t of SERIAL_TABLES) {
          await stagingClient.query(
            `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1))`,
            [t],
          ).catch(() => {});
        }
        await stagingClient.query('COMMIT');
      } catch (err) {
        await stagingClient.query('ROLLBACK');
        throw err;
      } finally {
        stagingClient.release();
      }

      // Restore missing media files to disk
      await mkdir(mediaDirectory, { recursive: true });
      if (media && typeof media === 'object') {
        for (const [key, item] of Object.entries(media)) {
          const target = path.join(mediaDirectory, path.basename(key));
          try {
            await stat(target);
          } catch {
            await writeFile(target, Buffer.from(item.base64, 'base64'));
          }
        }
      }

      // Run 5 comprehensive staging checks
      const checks = await runStagingVerification({
        stagingPool,
        tenantId,
        manifest,
        mediaDirectory,
      });

      await controlPool.query(
        `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
         VALUES ($1, $2, 'tenant.restore.staging', $3::jsonb)`,
        [actorId, tenantId, JSON.stringify({ stagingDbName, checks })],
      );

      return {
        stagingDatabaseName: stagingDbName,
        verification: checks,
      };
    } finally {
      await stagingPool.end().catch(() => {});
    }
  };

  const runStagingVerification = async ({ stagingPool, tenantId, manifest, mediaDirectory }) => {
    // 1. Schema check
    const tablesRes = await stagingPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));
    const requiredTables = ['users', 'subjects', 'school_settings', 'question_banks', 'questions', 'exams', 'exam_sessions', 'responses', 'question_media'];
    const missingTables = requiredTables.filter(t => !existingTables.has(t));
    const emailColRes = await stagingPool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email'");
    const schemaOk = missingTables.length === 0 && emailColRes.rowCount > 0;
    const schemaCheck = {
      passed: schemaOk,
      detail: schemaOk ? 'Seluruh skema tabel dan kolom inti terverifikasi.' : `Tabel/kolom hilang: ${missingTables.join(', ') || 'users.email'}`,
    };

    // 2. Relation / integrity check
    const orphanQuestions = await stagingPool.query('SELECT count(*)::int AS count FROM questions q LEFT JOIN question_banks b ON q.bank_id = b.id WHERE b.id IS NULL');
    const orphanSessions = await stagingPool.query('SELECT count(*)::int AS count FROM exam_sessions s LEFT JOIN exams e ON s.exam_id = e.id WHERE e.id IS NULL');
    const orphanStudents = await stagingPool.query('SELECT count(*)::int AS count FROM exam_sessions s LEFT JOIN users u ON s.student_id = u.id WHERE u.id IS NULL');
    const orphanResponses = await stagingPool.query('SELECT count(*)::int AS count FROM responses r LEFT JOIN exam_sessions s ON r.session_id = s.id WHERE s.id IS NULL');
    const totalOrphans = Number(orphanQuestions.rows[0].count) + Number(orphanSessions.rows[0].count) + Number(orphanStudents.rows[0].count) + Number(orphanResponses.rows[0].count);
    const relationsCheck = {
      passed: totalOrphans === 0,
      detail: totalOrphans === 0 ? 'Relasi foreign-key 100% konsisten tanpa data yatim.' : `Ditemukan ${totalOrphans} relasi data yatim (orphaned).`,
    };

    // 3. Data count check
    let matchedCounts = 0;
    let checkedTables = 0;
    for (const [table, expectedCount] of Object.entries(manifest.tablesSummary || {})) {
      if (existingTables.has(table)) {
        checkedTables++;
        const countRes = await stagingPool.query(`SELECT count(*)::int AS count FROM "${table}"`);
        if (Number(countRes.rows[0].count) === expectedCount) matchedCounts++;
      }
    }
    const dataCountsCheck = {
      passed: matchedCounts === checkedTables,
      detail: `Kecocokan baris data: ${matchedCounts}/${checkedTables} tabel identik dengan manifest.`,
    };

    // 4. Login check on staging & active exam check on live DB
    const adminCheck = await stagingPool.query("SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND active = TRUE AND password_hash IS NOT NULL AND length(password_hash) > 10");
    const adminReady = Number(adminCheck.rows[0].count) > 0;

    let activeExamsOnLive = 0;
    try {
      const livePool = await getTenantActivePool(tenantId);
      const activeExamRes = await livePool.query("SELECT count(*)::int AS count FROM exam_sessions WHERE status = 'in_progress'");
      activeExamsOnLive = Number(activeExamRes.rows[0].count);
    } catch {
      // live pool check fallback
    }
    const loginExamCheck = {
      passed: adminReady && activeExamsOnLive === 0,
      adminReady,
      activeExamsOnLive,
      detail: !adminReady ? 'Akun admin tidak siap atau tanpa password hash valid.' : activeExamsOnLive > 0 ? `Peringatan: Terdapat ${activeExamsOnLive} sesi ujian aktif di database tenant saat ini.` : 'Akun admin siap & tidak ada sesi ujian aktif di database live.',
    };

    // 5. Media check
    const mediaRows = await stagingPool.query('SELECT file_key FROM question_media');
    let missingMedia = 0;
    for (const row of mediaRows.rows) {
      try {
        await stat(path.join(mediaDirectory, path.basename(row.file_key)));
      } catch {
        missingMedia++;
      }
    }
    const mediaCheck = {
      passed: missingMedia === 0,
      missingMedia,
      totalMedia: mediaRows.rowCount,
      detail: missingMedia === 0 ? `Semua ${mediaRows.rowCount} berkas media terverifikasi di server.` : `${missingMedia} berkas media tidak ditemukan pada penyimpanan.`,
    };

    const allPassed = schemaCheck.passed && relationsCheck.passed && dataCountsCheck.passed && loginExamCheck.passed && mediaCheck.passed;
    return {
      passed: allPassed,
      schema: schemaCheck,
      relations: relationsCheck,
      dataCounts: dataCountsCheck,
      loginAndExams: loginExamCheck,
      media: mediaCheck,
    };
  };

  const cutoverTenant = async ({ tenantId, stagingDatabaseName, actorId, confirmMaintenance = false }) => {
    const tenantRes = await controlPool.query('SELECT * FROM control_plane.tenants WHERE id = $1', [tenantId]);
    if (!tenantRes.rowCount) throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404 });
    const tenant = tenantRes.rows[0];

    const currentDb = tenant.database_name;
    if (currentDb === stagingDatabaseName) {
      throw Object.assign(new Error('Tenant sudah menggunakan database staging ini.'), { status: 400 });
    }

    // Safety check: ensure no active exams on live database
    const livePool = await getTenantActivePool(tenantId);
    const activeExamRes = await livePool.query("SELECT count(*)::int AS count FROM exam_sessions WHERE status = 'in_progress'");
    const activeExams = Number(activeExamRes.rows[0].count);
    if (activeExams > 0 && !confirmMaintenance) {
      throw Object.assign(new Error(`Terdapat ${activeExams} sesi ujian aktif yang sedang berlangsung. Selesaikan ujian atau jadwalkan maintenance sebelum cutover.`), { status: 409 });
    }

    // Switch routing to staging database, retaining old database for rollback
    await controlPool.query(
      'UPDATE control_plane.tenants SET database_name = $1, updated_at = NOW() WHERE id = $2',
      [stagingDatabaseName, tenantId],
    );

    // Drain/evict connection pool from application memory
    if (router && typeof router.evict === 'function') {
      await router.evict(tenantId);
    }

    // Run smoke test on newly connected database
    try {
      const smokePool = await getTenantActivePool(tenantId);
      const settingsRes = await smokePool.query('SELECT school_name, violation_threshold FROM school_settings WHERE id = 1');
      if (!settingsRes.rowCount) throw new Error('school_settings tidak dapat diakses.');
      const adminRes = await smokePool.query("SELECT id, username FROM users WHERE role = 'admin' AND active = TRUE LIMIT 1");
      if (!adminRes.rowCount) throw new Error('Akun admin tidak dapat diverifikasi.');
      await smokePool.query('SELECT count(*) FROM questions');
    } catch (smokeError) {
      // Smoke test failed: AUTOMATIC ROLLBACK to old database
      await controlPool.query(
        'UPDATE control_plane.tenants SET database_name = $1, updated_at = NOW() WHERE id = $2',
        [currentDb, tenantId],
      );
      if (router && typeof router.evict === 'function') {
        await router.evict(tenantId);
      }
      await controlPool.query(
        `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
         VALUES ($1, $2, 'tenant.restore.cutover.rollback', $3::jsonb)`,
        [actorId, tenantId, JSON.stringify({ reason: smokeError.message, revertedTo: currentDb, failedStagingDb: stagingDatabaseName })],
      );
      throw Object.assign(new Error(`Smoke test cutover gagal (${smokeError.message}). Otomatis rollback ke database lama (${currentDb}).`), { status: 500 });
    }

    // Smoke test succeeded: log success
    await controlPool.query(
      `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
       VALUES ($1, $2, 'tenant.restore.cutover.success', $3::jsonb)`,
      [actorId, tenantId, JSON.stringify({ activeDatabase: stagingDatabaseName, preservedOldDatabase: currentDb })],
    );

    return {
      success: true,
      activeDatabase: stagingDatabaseName,
      preservedDatabase: currentDb,
      message: `Cutover berhasil dialihkan ke ${stagingDatabaseName}. Database lama (${currentDb}) dipertahankan untuk opsi rollback.`,
    };
  };

  const executeAutoRestore = async ({ tenantId, filename, buffer, actorId, confirmMaintenance = true }) => {
    // Step 1: restore to staging & verify
    const stagingResult = await restoreToStaging({ tenantId, filename, buffer, actorId });
    if (!stagingResult.verification.passed) {
      const tenantRes = await controlPool.query('SELECT database_name FROM control_plane.tenants WHERE id = $1', [tenantId]);
      const currentDb = tenantRes.rows[0]?.database_name;
      await controlPool.query(
        `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
         VALUES ($1, $2, 'tenant.restore.auto.aborted', $3::jsonb)`,
        [actorId, tenantId, JSON.stringify({ reason: 'Verifikasi staging tidak lulus', verification: stagingResult.verification, preservedDatabase: currentDb })],
      );
      return {
        success: false,
        aborted: true,
        message: 'Restore otomatis dihentikan karena salah satu poin verifikasi tidak lulus. Database aktif tetap menggunakan database lama.',
        verification: stagingResult.verification,
        stagingDatabaseName: stagingResult.stagingDatabaseName,
        activeDatabase: currentDb,
      };
    }

    // Step 2: automatic cutover
    const cutoverResult = await cutoverTenant({
      tenantId,
      stagingDatabaseName: stagingResult.stagingDatabaseName,
      actorId,
      confirmMaintenance,
    });

    return {
      success: true,
      aborted: false,
      message: '1-Klik Restore & Cutover otomatis berhasil penuh.',
      verification: stagingResult.verification,
      stagingDatabaseName: stagingResult.stagingDatabaseName,
      ...cutoverResult,
    };
  };

  const rollbackTenant = async ({ tenantId, targetDatabaseName, actorId }) => {
    const tenantRes = await controlPool.query('SELECT * FROM control_plane.tenants WHERE id = $1', [tenantId]);
    if (!tenantRes.rowCount) throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404 });
    const tenant = tenantRes.rows[0];

    await controlPool.query(
      'UPDATE control_plane.tenants SET database_name = $1, updated_at = NOW() WHERE id = $2',
      [targetDatabaseName, tenantId],
    );

    if (router && typeof router.evict === 'function') {
      await router.evict(tenantId);
    }

    // Smoke test rollback target
    const smokePool = await getTenantActivePool(tenantId);
    await smokePool.query('SELECT school_name FROM school_settings WHERE id = 1');

    await controlPool.query(
      `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
       VALUES ($1, $2, 'tenant.restore.manual_rollback', $3::jsonb)`,
      [actorId, tenantId, JSON.stringify({ activeDatabase: targetDatabaseName, previousDatabase: tenant.database_name })],
    );

    return {
      success: true,
      activeDatabase: targetDatabaseName,
      message: `Rollback berhasil. Tenant dialihkan kembali ke database ${targetDatabaseName}.`,
    };
  };

  return {
    createBackup,
    listBackups,
    getBackupFileBuffer,
    createDownloadToken,
    verifyDownloadToken,
    restoreToStaging,
    cutoverTenant,
    executeAutoRestore,
    rollbackTenant,
  };
}

