import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createTenantAwarePool } from './tenantDatabaseContext.js';
const { Pool } = pg;

function boundedInteger(env, name, fallback, minimum, maximum) {
  const rawValue = env[name];
  if (rawValue === undefined || rawValue.trim() === '') return fallback;
  const value = Number(rawValue);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function getPoolConfig(env = process.env) {
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    database: env.DB_NAME || 'cbt_imbs',
    user: env.DB_USER || 'cbt',
    password: env.DB_PASSWORD || 'cbt_local_password',
    // Keep one API pool within the PostgreSQL connection budget configured by Compose.
    max: boundedInteger(env, 'DB_POOL_MAX', 70, 1, 200),
    connectionTimeoutMillis: boundedInteger(env, 'DB_CONNECTION_TIMEOUT_MS', 5000, 100, 60000),
    query_timeout: boundedInteger(env, 'DB_QUERY_TIMEOUT_MS', 5000, 100, 120000),
    idleTimeoutMillis: 30000,
  };
}

const fallbackPool = new Pool(getPoolConfig());
let tenantDatabaseContext = null;

export function configureTenantDatabaseContext(context) {
  tenantDatabaseContext = context;
}

export const pool = createTenantAwarePool({
  fallbackPool,
  getTenantPool: () => tenantDatabaseContext?.getCurrent()?.pool || null,
});

export async function initializeDatabase(targetPool = pool) {
  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin','teacher','pengawas','student','platform_owner')), email TEXT,
        password_hash TEXT NOT NULL, class_name TEXT, active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS subjects (
        id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS teacher_access (
        teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_name TEXT NOT NULL,
        PRIMARY KEY(teacher_id,subject_id,class_name)
      );
      CREATE INDEX IF NOT EXISTS idx_teacher_access_class ON teacher_access(teacher_id,class_name);
      CREATE TABLE IF NOT EXISTS school_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        school_name TEXT NOT NULL DEFAULT 'IMBS Islamic School',
        academic_year TEXT NOT NULL DEFAULT '2026/2027',
        semester TEXT NOT NULL DEFAULT 'Ganjil' CHECK (semester IN ('Ganjil','Genap')),
        classes JSONB NOT NULL DEFAULT '["VII A","VII B","VIII A","VIII B","IX A","IX B"]'::jsonb,
        grades JSONB NOT NULL DEFAULT '["VII","VIII","IX"]'::jsonb,
        default_exam_duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (default_exam_duration_minutes BETWEEN 1 AND 480),
        violation_threshold INTEGER NOT NULL DEFAULT 2 CHECK (violation_threshold BETWEEN 1 AND 10),
        updated_by BIGINT REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO school_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
      CREATE TABLE IF NOT EXISTS question_banks (
        id BIGSERIAL PRIMARY KEY, subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        grade TEXT NOT NULL, topic TEXT NOT NULL, created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(subject_id, grade, topic)
      );
      CREATE TABLE IF NOT EXISTS questions (
        id BIGSERIAL PRIMARY KEY, bank_id BIGINT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('mc','essay','complex_mc')), prompt TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]'::jsonb, answer_key TEXT NOT NULL DEFAULT '', points NUMERIC(7,2) NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS exams (
        id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, bank_id BIGINT NOT NULL REFERENCES question_banks(id),
        class_name TEXT NOT NULL, mc_count INTEGER NOT NULL CHECK(mc_count >= 0), essay_count INTEGER NOT NULL CHECK(essay_count >= 0),
        duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','active','completed')),
        entry_pin_hash TEXT, entry_pin_updated_at TIMESTAMPTZ,
        entry_pin_expires_at TIMESTAMPTZ, entry_pin_issued_by BIGINT REFERENCES users(id),
        created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS entry_pin_hash TEXT;
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS entry_pin_updated_at TIMESTAMPTZ;
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS entry_pin_expires_at TIMESTAMPTZ;
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS entry_pin_issued_by BIGINT REFERENCES users(id);
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id BIGSERIAL PRIMARY KEY, exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed','locked')),
        violation_count INTEGER NOT NULL DEFAULT 0, score NUMERIC(7,2), max_score NUMERIC(7,2), final_score NUMERIC(5,2), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
        last_ping_at TIMESTAMPTZ,
        UNIQUE(exam_id, student_id)
      );
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS max_score NUMERIC(7,2);
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS exam_questions (
        session_id BIGINT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT, position INTEGER NOT NULL,
        options JSONB, answer_key TEXT,
        PRIMARY KEY(session_id, question_id), UNIQUE(session_id, position)
      );
      ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS options JSONB;
      ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS answer_key TEXT;
      CREATE TABLE IF NOT EXISTS responses (
        session_id BIGINT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
        answer TEXT NOT NULL DEFAULT '', points_awarded NUMERIC(7,2), essay_score NUMERIC(5,2), graded_by BIGINT REFERENCES users(id), graded_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(session_id, question_id)
      );
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS points_awarded NUMERIC(7,2);
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS essay_score NUMERIC(5,2);
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS graded_by BIGINT REFERENCES users(id);
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), action TEXT NOT NULL,
        detail JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS violation_events (
        id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        code TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', review_status TEXT NOT NULL DEFAULT 'pending'
          CHECK(review_status IN ('pending','confirmed','dismissed')),
        reviewed_by BIGINT REFERENCES users(id), review_reason TEXT, reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE violation_events ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE violation_events ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id);
      ALTER TABLE violation_events ADD COLUMN IF NOT EXISTS review_reason TEXT;
      ALTER TABLE violation_events ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
      ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS mc_weight_percentage INTEGER NOT NULL DEFAULT 50;
      ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS essay_weight_percentage INTEGER NOT NULL DEFAULT 50;
      CREATE INDEX IF NOT EXISTS idx_questions_bank_type ON questions(bank_id,type);
      CREATE INDEX IF NOT EXISTS idx_sessions_exam_status ON exam_sessions(exam_id,status);
      CREATE INDEX IF NOT EXISTS idx_violations_session_created ON violation_events(session_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
      CREATE INDEX IF NOT EXISTS idx_violations_session_pending ON violation_events(session_id) WHERE review_status = 'pending';
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const migration = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [1]);
    if (!migration.rowCount) {
      const migrationSql = await readFile(new URL('./migrations/001_subject-presentation-and-question-media.sql', import.meta.url), 'utf8');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [1, 'subject-presentation-and-question-media']);
    }
    const ownerRoleMigration = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [2]);
    if (!ownerRoleMigration.rowCount) {
      const migrationSql = await readFile(new URL('./migrations/002_platform-owner-role.sql', import.meta.url), 'utf8');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [2, 'platform-owner-role']);
    }
    const stimuliMigration = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [3]);
    if (!stimuliMigration.rowCount) {
      const migrationSql = await readFile(new URL('./migrations/003_question-stimuli.sql', import.meta.url), 'utf8');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [3, 'question-stimuli']);
    }
    const complexMcMigration = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [4]);
    if (!complexMcMigration.rowCount) {
      const migrationSql = await readFile(new URL('./migrations/004_complex_mc.sql', import.meta.url), 'utf8');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [4, 'complex-mc']);
    }
    const pengawasRoleMigration = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [5]);
    if (!pengawasRoleMigration.rowCount) {
      const migrationSql = await readFile(new URL('./migrations/005_pengawas-role.sql', import.meta.url), 'utf8');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [5, 'pengawas-role']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
