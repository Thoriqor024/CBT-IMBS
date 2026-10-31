import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, readdir, rename, rm } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import pg from 'pg';
import { configureTenantDatabaseContext, pool, initializeDatabase, getPoolConfig } from './db.js';
import { TenantProvisioner } from './tenantProvisioner.js';
import { createErrorHandler, createObservability } from './observability.js';
import {
  detectQuestionImageMime,
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_MIME_TYPES,
  questionImageExtension,
  validateQuestionImage,
  DANGEROUS_EXTENSIONS
} from './questionMedia.js';
import { gradesForTeacherClasses } from './teacherAccess.js';
import { prepareAccountProfile } from './accountProfile.js';
import { createTenantRuntimeFromEnvironment } from './tenantRuntime.js';
import { createControlPlaneRuntimeFromEnvironment } from './controlPlaneRuntime.js';
import { normalizeAccountEmail } from './userIdentity.js';
import { createPlatformManagement } from './platformManagement.js';
import { createPlatformAuthenticator } from './platformAuthentication.js';
import { buildSeedAccounts, isLegacyBootstrapSeedEnabled } from './seedAccounts.js';
import { assertStudentQuota, assertTeacherQuota } from './tenantQuota.js';
import { validateSubjectInput } from './subjectValidation.js';
import { calculateItemDifficulty } from './itemAnalysis.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const tenancyEnabled = process.env.TENANCY_ENABLED === 'true';
const controlPlaneRuntime = tenancyEnabled
  ? await createTenantRuntimeFromEnvironment()
  : await createControlPlaneRuntimeFromEnvironment();
const tenantRuntime = tenancyEnabled ? controlPlaneRuntime : null;
const controlPool = controlPlaneRuntime?.controlPool || pool;
if (tenantRuntime) configureTenantDatabaseContext(tenantRuntime.context);
const mediaDirectory = path.resolve(process.env.QUESTION_MEDIA_DIR || './uploads/question-media');
const mediaStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, mediaDirectory),
  filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`),
});
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: QUESTION_IMAGE_MAX_BYTES, files: 1, fields: 1, parts: 2, fieldSize: 500 },
  fileFilter: (_req, file, callback) => {
    if (!QUESTION_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return callback(invalidQuestion('Gunakan gambar JPG, PNG, atau WebP.'));
    }
    const rawExt = path.extname(file.originalname || '').toLowerCase().replace('.', '');
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) || DANGEROUS_EXTENSIONS.has(rawExt)) {
      return callback(invalidQuestion('Ekstensi berkas tidak diizinkan. Gunakan .jpg, .jpeg, .png, atau .webp.'));
    }
    callback(null, true);
  },
}).single('image');
const uploadQuestionImage = (req, res, next) => mediaUpload(req, res, error => {
  if (error) {
    if (req.file?.path) rm(req.file.path, { force: true }).catch(() => {});
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 3 MB.' : error.message || 'Unggahan gambar tidak valid.';
    return res.status(status).json({ error: message });
  }
  next();
});
const mediaPath = fileKey => path.join(mediaDirectory, path.basename(fileKey));
async function removeMediaFile(fileKey) {
  if (typeof fileKey === 'string' && path.basename(fileKey) === fileKey) await rm(mediaPath(fileKey), { force: true });
}
async function removeOrphanMediaFiles() {
  const registered = new Set((await pool.query('SELECT file_key FROM question_media')).rows.map(row => row.file_key));
  const files = await readdir(mediaDirectory, { withFileTypes: true });
  await Promise.all(files.filter(file => file.isFile() && !registered.has(file.name)).map(file => rm(mediaPath(file.name), { force: true })));
}
const PgSession = connectPgSimple(session);
app.set('trust proxy', 1);
const observability = createObservability({ pool: controlPool });
app.use(observability.httpMetricsMiddleware);
app.get('/metrics', observability.metricsHandler);
const allowedOrigins = new Set(String(process.env.CORS_ORIGINS || process.env.PUBLIC_BASE_URL || '')
  .split(',').map(origin => origin.trim()).filter(Boolean));
app.use((req,res,next)=>{
  const origin=req.get('Origin');
  if(!origin)return next();
  if(!allowedOrigins.has(origin))return res.status(403).json({error:'Origin tidak diizinkan.'});
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '2mb' }));
const sessionSecret = process.env.SESSION_SECRET || 'local-dev-session-secret-change-before-deployment';
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('local-dev') || process.env.SESSION_SECRET.includes('change-this-secret'))) {
  console.warn('[SECURITY WARNING] SESSION_SECRET menggunakan nilai default dev. Harap tentukan secret unik di environment produksi demi keamanan sesi.');
}
app.use(session({
  store: new PgSession({ pool: controlPool, tableName: 'user_sessions', createTableIfMissing: !controlPlaneRuntime }),
  secret: sessionSecret,
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 60 * 60 * 1000 },
}));
const asyncRoute = handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);
const auth = (req,res,next) => req.session.user ? next() : res.status(401).json({ error:'Silakan masuk terlebih dahulu.' });
const allow = (...roles) => (req,res,next) => !req.session.user ? res.status(401).json({error:'Silakan masuk terlebih dahulu.'}) : roles.includes(req.session.user.role) ? next() : res.status(403).json({error:'Akses tidak diizinkan untuk role ini.'});
const platformOwnerOnly = (req,res,next) => {
  if(!req.session.user)return res.status(401).json({error:'Silakan masuk terlebih dahulu.'});
  const trustedOwner=req.session.user.role==='platform_owner'
    &&(!controlPlaneRuntime||req.session.user.authSource==='control_plane');
  return trustedOwner?next():res.status(403).json({error:'Akses platform hanya untuk pemilik platform.'});
};
const { Pool } = pg;
let tenantProvisioner = null;
if (controlPlaneRuntime?.secretStore) {
  tenantProvisioner = new TenantProvisioner({
    adminPool: pool,
    controlPool,
    secretStore: controlPlaneRuntime.secretStore,
    createTenantPool: async ({ database, user, password }) => new Pool(getPoolConfig({
      ...process.env,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: Number(process.env.DB_PORT || 5432),
      DB_NAME: database,
      DB_USER: user,
      DB_PASSWORD: password,
      DB_POOL_MAX: '5',
    })),
    initializeTenantDatabase: (targetPool) => initializeDatabase(targetPool),
    applyEmailMigration: async (targetPool) => {
      const sql = await readFile(new URL('./migrations/tenant/002_user_email.sql', import.meta.url), 'utf8');
      await targetPool.query(sql);
    },
  });
}
const platformManagement = createPlatformManagement({
  controlPool,
  createTenantProvisioner: tenantProvisioner,
});
const platformAuthenticator = controlPlaneRuntime ? createPlatformAuthenticator({ controlPool }) : null;
const revokeUserSessions = (client,userId,tenantId,exceptSid=null) => tenantRuntime&&tenantId
  ? client.query(`DELETE FROM user_sessions WHERE sess->'user'->>'id'=$1 AND sess->'user'->>'tenantId'=$2 ${exceptSid?'AND sid<>$3':''}`,
    exceptSid?[String(userId),String(tenantId),exceptSid]:[String(userId),String(tenantId)])
  : client.query(`DELETE FROM user_sessions WHERE sess->'user'->>'id'=$1 ${exceptSid?'AND sid<>$2':''}`,
    exceptSid?[String(userId),exceptSid]:[String(userId)]);
const safeUser = (u,tenant) => ({id:u.id,username:u.username,email:u.email||null,name:u.full_name,role:u.role,className:u.class_name,...(tenant?{tenantId:tenant.id,tenantCode:tenant.code,tenantName:tenant.displayName}: {})});
let defaultViolationThreshold = 2; const getViolationThreshold=()=>Number(tenantRuntime?.context.getCurrent()?.violationThreshold ?? defaultViolationThreshold);
const userRateLimit = (windowMs, limit, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => `user:${req.session.user.tenantId||'legacy'}:${req.session.user.id}`,
  handler: (_req,res) => res.status(429).json({error:message}),
});
const responseLimiter = userRateLimit(60_000, 120, 'Terlalu banyak penyimpanan jawaban. Tunggu sebentar lalu coba lagi.');
const violationLimiter = userRateLimit(5 * 60_000, 12, 'Terlalu banyak laporan sinyal. Tunggu sebentar lalu coba lagi.');
const heartbeatLimiter = userRateLimit(60_000, 30, 'Heartbeat terlalu sering.');
const startLimiter = userRateLimit(15 * 60_000, 8, 'Terlalu banyak percobaan masuk. Hubungi pengawas.');
const pinIssueLimiter = userRateLimit(15 * 60_000, 6, 'PIN terlalu sering diterbitkan. Tunggu sebentar lalu coba lagi.');
const invalidQuestion = message => Object.assign(new Error(message), { status: 400 });
async function audit(clientOrPool, userId, action, detail = {}) {
  try {
    await clientOrPool.query(
      'INSERT INTO audit_logs(user_id, action, detail) VALUES($1, $2, $3)',
      [userId || null, action, JSON.stringify(detail)]
    );
  } catch (auditError) {
    // Audit gagal tidak boleh menggagalkan request utama — log saja
    console.error('[audit] Gagal menyimpan log audit:', auditError.message, { action, userId });
  }
}
const normalizeSettingsList = (value,label,maximumItems,maximumLength) => {
  if (!Array.isArray(value) || !value.length || value.length > maximumItems) throw invalidQuestion(`${label} harus berisi 1 sampai ${maximumItems} item.`);
  const items=value.map(item=>String(item||'').trim());
  if(items.some(item=>!item||item.length>maximumLength))throw invalidQuestion(`Setiap ${label.toLowerCase()} wajib diisi dan maksimal ${maximumLength} karakter.`);
  if(new Set(items.map(item=>item.toLocaleLowerCase('id-ID'))).size!==items.length)throw invalidQuestion(`${label} tidak boleh duplikat.`);
  return items;
};
const publicSettings = row => ({
  schoolName:row.school_name,academicYear:row.academic_year,semester:row.semester,
  classes:row.classes,grades:row.grades,defaultExamDurationMinutes:row.default_exam_duration_minutes,
  violationThreshold:row.violation_threshold,
  mcWeightPercentage:Number(row.mc_weight_percentage ?? 50),
  essayWeightPercentage:Number(row.essay_weight_percentage ?? 50),
  updatedAt:row.updated_at,
});
import { scoreComplexMC } from './complexMcScoring.js';
export { scoreComplexMC };

export const prepareBankQuestion = item => {
  if (!item || typeof item !== 'object' || !['mc', 'essay', 'complex_mc'].includes(item.type)) throw invalidQuestion('Jenis soal harus PG, essay, atau PG kompleks.');
  const type = item.type;
  const prompt = String(item.prompt || '').trim();
  const answerKey = String(item.rubric ?? item.answerKey ?? '').trim();
  const points = Number(item.points ?? 1);
  if (!prompt) throw invalidQuestion('Pertanyaan wajib diisi.');
  if (!Number.isFinite(points) || points <= 0) throw invalidQuestion('Bobot soal harus lebih besar dari 0.');
  let options = [];
  if (type === 'mc' || type === 'complex_mc') {
    if (!Array.isArray(item.options) || item.options.length !== 4) throw invalidQuestion('Soal PG harus memiliki opsi A sampai D.');
    options = item.options.map(option => String(option || '').trim());
    if (options.some(option => !option)) throw invalidQuestion('Lengkapi semua opsi A sampai D.');
    if (type === 'mc') {
      if (!['A', 'B', 'C', 'D'].includes(answerKey) || !options['ABCD'.indexOf(answerKey)]) throw invalidQuestion('Pilih kunci jawaban A sampai D yang memiliki opsi.');
    } else {
      const keys = [...new Set(answerKey.toUpperCase().split(/[^A-Z0-9]+/).map(k => k.trim()).filter(Boolean))];
      if (keys.length < 1 || keys.some(k => !['A', 'B', 'C', 'D'].includes(k) || !options['ABCD'.indexOf(k)])) {
        throw invalidQuestion('Pilih minimal satu kunci jawaban A sampai D yang memiliki opsi.');
      }
    }
  } else if (!answerKey) {
    throw invalidQuestion('Soal essay harus memiliki rubrik atau panduan koreksi.');
  }
  const rawStimulusId = item.stimulusId ?? item.stimulus_id;
  const stimulusId = rawStimulusId && Number.isInteger(Number(rawStimulusId)) && Number(rawStimulusId) > 0 ? Number(rawStimulusId) : null;
  const rawStimulusIndex = item.stimulusIndex ?? item.stimulus_index;
  const stimulusIndex = rawStimulusIndex !== undefined && rawStimulusIndex !== null && Number.isInteger(Number(rawStimulusIndex)) && Number(rawStimulusIndex) >= 0 ? Number(rawStimulusIndex) : null;
  return { type, prompt, options, answerKey, points, stimulusId, stimulusIndex };
};
async function teacherAssignments(userId, client=pool) {
  return (await client.query('SELECT subject_id AS "subjectId",class_name AS "className" FROM teacher_access WHERE teacher_id=$1',[userId])).rows;
}
async function teacherCanAccessBankScope(userId,subjectId,grade,client=pool) {
  const result=await client.query(`SELECT EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$1 AND ta.subject_id=$2
    AND left(ta.class_name,length($3))=$3 AND (length(ta.class_name)=length($3) OR substring(ta.class_name,length($3)+1,1) IN (' ','-'))) AS allowed`,[userId,subjectId,grade]);
  return result.rows[0].allowed;
}
async function teacherCanAccessBank(userId,bankId,client=pool) {
  const result=await client.query(`SELECT EXISTS(SELECT 1 FROM question_banks b JOIN teacher_access ta ON ta.subject_id=b.subject_id
    WHERE b.id=$1 AND ta.teacher_id=$2 AND left(ta.class_name,length(b.grade))=b.grade
      AND (length(ta.class_name)=length(b.grade) OR substring(ta.class_name,length(b.grade)+1,1) IN (' ','-'))) AS allowed`,[bankId,userId]);
  return result.rows[0].allowed;
}
async function teacherCanAccessExam(userId,examId,client=pool) {
  const result=await client.query(`SELECT EXISTS(SELECT 1 FROM exams e JOIN question_banks b ON b.id=e.bank_id
    JOIN teacher_access ta ON ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))
    WHERE e.id=$1 AND ta.teacher_id=$2) AS allowed`,[examId,userId]);
  return result.rows[0].allowed;
}
const requireExamScope=asyncRoute(async(req,res,next)=>{
  if(req.session.user.role==='admin')return next();
  if(!await teacherCanAccessExam(req.session.user.id,req.params.id))return res.status(404).json({error:'Ujian tidak ditemukan.'});
  next();
});
const requireResultScope=asyncRoute(async(req,res,next)=>{
  if(req.session.user.role==='admin')return next();
  const result=await pool.query(`SELECT EXISTS(SELECT 1 FROM exams e JOIN question_banks b ON b.id=e.bank_id
    JOIN teacher_access ta ON ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))
    WHERE e.id=$1 AND ta.teacher_id=$2) AS allowed`,[req.params.examId,req.session.user.id]);
  if(!result.rows[0].allowed)return res.status(404).json({error:'Hasil ujian tidak ditemukan.'});
  next();
});
const skipLoginRateLimit = process.env.NODE_ENV === 'test'
  || (process.env.NODE_ENV === 'development' && process.env.LOCAL_LOAD_TEST_MODE === 'true');
const loginLimitMessage = 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.';
const loginNetworkLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => skipLoginRateLimit,
  handler: (_req,res) => res.status(429).json({error:loginLimitMessage}),
});
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => skipLoginRateLimit,
  keyGenerator: req => `${ipKeyGenerator(req.ip)}:${String(req.body?.schoolCode||'legacy').trim().toLowerCase()}:${String(req.body?.email||req.body?.username||'').trim().toLowerCase().slice(0,100)}`,
  handler: (_req,res) => res.status(429).json({error:loginLimitMessage}),
});
app.use('/api/auth/login',loginNetworkLimiter,loginAccountLimiter);
app.use('/api/platform/auth/login',loginNetworkLimiter,loginAccountLimiter);
if (tenantRuntime) app.use((req,res,next)=>{
  if(req.path==='/api/auth/logout'||req.path==='/api/platform/auth/login')return next();
  if(req.session?.user?.role==='platform_owner'&&req.session.user.authSource==='control_plane')return next();
  if(req.session?.user&&!req.session.user.tenantId){
    return req.session.destroy(()=>{res.clearCookie('connect.sid');res.status(401).json({error:'Sesi lama tidak memiliki konteks sekolah. Silakan masuk kembali.'});});
  }
  return tenantRuntime.context.middleware(req,res,next);
});


async function calculateAndSaveFinalScore(client, sessionId) {
  const settingsRow = await client.query('SELECT mc_weight_percentage, essay_weight_percentage FROM school_settings WHERE id=1');
  const mcWeight = Number(settingsRow.rows[0]?.mc_weight_percentage ?? 50);
  const essayWeight = Number(settingsRow.rows[0]?.essay_weight_percentage ?? 50);

  const items = await client.query(`
    SELECT
      q.id,
      q.type,
      q.points,
      COALESCE(eq.answer_key, q.answer_key) AS answer_key,
      r.answer,
      r.essay_score
    FROM exam_questions eq
    JOIN questions q ON q.id=eq.question_id
    LEFT JOIN responses r ON r.session_id=eq.session_id AND r.question_id=q.id
    WHERE eq.session_id=$1
  `, [sessionId]);

  let mcCount = 0;
  let mcPointsTotal = 0;
  let mcPointsEarned = 0;
  let essayCount = 0;
  let essayGradedCount = 0;
  let essayPointsTotal = 0;
  let essayPointsEarned = 0;

  for (const q of items.rows) {
    const points = Number(q.points) || 0;
    if (q.type === 'mc') {
      mcCount++;
      mcPointsTotal += points;
      const ans = String(q.answer || '').trim().toUpperCase();
      const key = String(q.answer_key || '').trim().toUpperCase();
      if (ans && ans === key) {
        mcPointsEarned += points;
      }
    } else if (q.type === 'complex_mc') {
      mcCount++;
      mcPointsTotal += points;
      mcPointsEarned += scoreComplexMC(q.answer, q.answer_key, points);
    } else if (q.type === 'essay') {
      essayCount++;
      essayPointsTotal += points;
      if (q.essay_score !== null && q.essay_score !== undefined) {
        essayGradedCount++;
        essayPointsEarned += (Number(q.essay_score) * points) / 100.0;
      }
    }
  }

  const mcScore = mcPointsTotal > 0 ? (mcPointsEarned / mcPointsTotal) * 100 : 0;
  const essayScore = essayPointsTotal > 0 ? (essayPointsEarned / essayPointsTotal) * 100 : 0;

  let finalScore = null;
  if (essayCount > 0 && essayGradedCount < essayCount) {
    finalScore = null;
  } else if (essayCount === 0 && mcCount > 0) {
    finalScore = Math.round(mcScore * 100) / 100;
  } else if (mcCount === 0 && essayCount > 0) {
    finalScore = Math.round(essayScore * 100) / 100;
  } else if (mcCount > 0 && essayCount > 0) {
    finalScore = Math.round(((mcScore * mcWeight + essayScore * essayWeight) / 100.0) * 100) / 100;
  } else {
    finalScore = 0;
  }

  await client.query('UPDATE exam_sessions SET final_score=$1 WHERE id=$2', [finalScore, sessionId]);
  return { finalScore, mcScore, essayScore, allEssaysGraded: essayCount === 0 || essayGradedCount >= essayCount };
}

async function finishStudentSession(sessionId, studentId) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionResult=await client.query(`SELECT es.id,es.status,es.violation_count,e.id AS exam_id,e.duration_minutes,
        (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
      WHERE es.id=$1 AND es.student_id=$2 FOR UPDATE OF es`,[sessionId,studentId]);
    const examSession=sessionResult.rows[0];
    if(!examSession)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
    if(examSession.status==='locked'){await client.query('COMMIT');return {status:'locked',score:null,finalScore:null};}
    if(examSession.status==='completed'){await client.query('COMMIT');return {status:'completed',score:null,finalScore:null};}
    if(Number(examSession.violation_count)+Number(examSession.pending_violation_count)>=getViolationThreshold()){
      await client.query('COMMIT');
      return {status:'in_progress',violationCount:Number(examSession.violation_count),pendingViolationCount:Number(examSession.pending_violation_count),violationReviewRequired:true};
    }
    await client.query("UPDATE exam_sessions SET status='completed',finished_at=NOW() WHERE id=$1",[sessionId]);
    const calc = await calculateAndSaveFinalScore(client, sessionId);
    await client.query('COMMIT');
    await audit(pool,studentId,'student.exam_submit',{sessionId,finalScore:calc.finalScore,finalScorePending:calc.finalScore===null});
    return {status:'completed',score:calc.finalScore,finalScore:calc.finalScore};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function checkSessionDeadline(sessionId, studentId) {
  const q=await pool.query(`SELECT es.status,es.started_at,e.duration_minutes,es.violation_count,
    (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count,
    (es.started_at + e.duration_minutes * INTERVAL '1 minute') <= NOW() AS expired
    FROM exam_sessions es JOIN exams e ON e.id=es.exam_id WHERE es.id=$1 AND es.student_id=$2`,[sessionId,studentId]);
  if(!q.rowCount)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
  const row=q.rows[0];
  const violationReviewRequired=Number(row.violation_count)+Number(row.pending_violation_count)>=getViolationThreshold();
  if(row.status==='in_progress'&&row.expired&&!violationReviewRequired)return finishStudentSession(sessionId,studentId);
  return {status:row.status,violationReviewRequired};
}

const pinVerificationCache = new Map();
async function verifyExamPin(examId, pin, pinHash) {
  const cacheKey = `${examId}:${pin}:${pinHash}`;
  const cached = pinVerificationCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 60000) {
    return cached.ok;
  }
  const ok = await bcrypt.compare(pin, pinHash);
  if (pinVerificationCache.size > 2000) pinVerificationCache.clear();
  pinVerificationCache.set(cacheKey, { ok, ts: Date.now() });
  return ok;
}

async function ensureSessionOptionShuffle(sessionId, externalClient = null) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;
  try {
    if (shouldManageTransaction) await client.query('BEGIN');
    await client.query('SELECT id FROM exam_sessions WHERE id=$1 FOR UPDATE', [sessionId]);
    const questions = await client.query(`SELECT eq.question_id,q.type,q.options,q.answer_key
      FROM exam_questions eq JOIN questions q ON q.id=eq.question_id
      WHERE eq.session_id=$1 AND q.type IN ('mc', 'complex_mc') AND eq.options IS NULL FOR UPDATE OF eq`, [sessionId]);
    for (const question of questions.rows) {
      const options = Array.isArray(question.options) ? question.options : [];
      const order = options.map((_, index) => index);
      for (let index = order.length - 1; index > 0; index--) {
        const swap = randomInt(index + 1);
        [order[index], order[swap]] = [order[swap], order[index]];
      }
      let shuffledKey = '';
      if (question.type === 'mc') {
        const keyIndex = 'ABCD'.indexOf(String(question.answer_key || '').trim().toUpperCase());
        shuffledKey = keyIndex >= 0 ? String.fromCharCode(65 + order.indexOf(keyIndex)) : '';
      } else if (question.type === 'complex_mc') {
        const origKeys = String(question.answer_key || '').toUpperCase().split(/[^A-Z0-9]+/).map(k => k.trim()).filter(Boolean);
        const mapped = origKeys.map(k => {
          const idx = 'ABCD'.indexOf(k);
          return idx >= 0 ? String.fromCharCode(65 + order.indexOf(idx)) : '';
        }).filter(Boolean);
        mapped.sort();
        shuffledKey = mapped.join(',');
      }
      await client.query('UPDATE exam_questions SET options=$3::jsonb,answer_key=$4 WHERE session_id=$1 AND question_id=$2',
        [sessionId, question.question_id, JSON.stringify(order.map(index => options[index])), shuffledKey]);
    }
    if (shouldManageTransaction) await client.query('COMMIT');
  } catch (error) {
    if (shouldManageTransaction) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

async function getStudentSession(sessionId,studentId) {
  const state=await checkSessionDeadline(sessionId,studentId);
  const q=await pool.query(`SELECT es.id,es.status,es.violation_count AS "violationCount",es.final_score AS score,
      (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS "pendingViolationCount",
      e.title,e.duration_minutes AS "durationMinutes",es.started_at AS "startedAt",
      s.name AS subject,s.language_code AS "languageCode",s.text_direction AS "textDirection",
      u.class_name AS "studentClass",
      COALESCE((SELECT b2.grade FROM exam_questions eq2 JOIN questions q2 ON q2.id=eq2.question_id JOIN question_banks b2 ON b2.id=q2.bank_id WHERE eq2.session_id=es.id LIMIT 1), b.grade) AS grade,
      EXISTS(SELECT 1 FROM exam_questions exq JOIN questions eq ON eq.id=exq.question_id WHERE exq.session_id=es.id AND eq.type='essay') AS "essayPending",
      es.started_at + e.duration_minutes * INTERVAL '1 minute' AS "expiresAt"
    FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
    JOIN users u ON u.id=es.student_id
    JOIN question_banks b ON b.id=e.bank_id JOIN subjects s ON s.id=b.subject_id
    WHERE es.id=$1 AND es.student_id=$2`,[sessionId,studentId]);
  const result=q.rows[0];
  if(!result)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
  result.pendingViolationCount=Number(result.pendingViolationCount);
  result.violationThreshold=getViolationThreshold();
  result.violationReviewRequired=result.status==='in_progress'&&Number(result.violationCount)+result.pendingViolationCount>=getViolationThreshold();
  if(state.status==='completed'||state.status==='locked'||result.status!=='in_progress')return {...result,serverTime:new Date()};
  await ensureSessionOptionShuffle(sessionId);
  const questions=await pool.query(`SELECT q.id,q.type,q.prompt,COALESCE(eq.options,q.options) AS options,q.points,eq.position,r.answer
      ,r.updated_at AS "answerUpdatedAt",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',qm.id,'altText',qm.alt_text,'url','/api/question-media/'||qm.id)) FROM question_media qm WHERE qm.question_id=q.id),'[]'::jsonb) AS media,
      (CASE WHEN q.stimulus_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', qs.id,
          'title', qs.title,
          'content', qs.content,
          'mediaUrl', CASE WHEN qs.media_key IS NOT NULL THEN '/api/stimuli/'||qs.id||'/media' ELSE NULL END,
          'mediaAltText', qs.media_alt_text
        ) FROM question_stimuli qs WHERE qs.id=q.stimulus_id
      ) ELSE NULL END) AS stimulus
    FROM exam_questions eq JOIN questions q ON q.id=eq.question_id
    LEFT JOIN responses r ON r.session_id=eq.session_id AND r.question_id=q.id
    WHERE eq.session_id=$1 ORDER BY eq.position`,[sessionId]);
  return {...result,questions:questions.rows,serverTime:new Date()};
}

async function seed() {
  const demoStudents = [
    ['IMBS-24001','Aisyah Putri Ramadhani','student','ujian123','VII A'],
    ['IMBS-24002','Muhammad Rayhan Alfarizi','student','ujian123','VII A'],
    ['IMBS-24003','Naila Zahra Khairunnisa','student','ujian123','VII B'],
    ['IMBS-24004','Fathir Ahmad Pratama','student','ujian123','VIII A'],
    ['IMBS-24005','Siti Azzahra Maulida','student','ujian123','VIII A'],
  ];
  const defaults = [
    ...buildSeedAccounts(process.env),
    ...(process.env.SEED_DEMO_STUDENTS === 'false' || process.env.ROTATE_DEMO_SEED_PASSWORDS === 'true' ? [] : demoStudents),
  ];
  for (const [username,name,role,password,className] of defaults) {
    await pool.query('INSERT INTO users(username,full_name,role,password_hash,class_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT(username) DO NOTHING',[username,name,role,await bcrypt.hash(password,10),className]);
  }
  const teacher = await pool.query("SELECT id FROM users WHERE username='guru'");
  for (const subject of ['Bahasa Arab','Matematika','Pendidikan Agama Islam','Bahasa Indonesia','IPA','IPS']) {
    await pool.query('INSERT INTO subjects(name,created_by) VALUES($1,$2) ON CONFLICT(name) DO NOTHING',[subject,teacher.rows[0].id]);
  }
  const subject = await pool.query("SELECT id FROM subjects WHERE name='Bahasa Arab'");
  const bank = await pool.query("INSERT INTO question_banks(subject_id,grade,topic,created_by) VALUES($1,'VII','الفصل الدراسي الأول',$2) ON CONFLICT(subject_id,grade,topic) DO UPDATE SET topic=EXCLUDED.topic RETURNING id",[subject.rows[0].id,teacher.rows[0].id]);
  const count = await pool.query('SELECT count(*)::int AS n FROM questions WHERE bank_id=$1',[bank.rows[0].id]);
  if(count.rows[0].n===0){
    const samples=[['mc','مَا مَعْنَى كَلِمَةِ كِتَابٌ؟',['قَلَمٌ','كِتَابٌ','بَابٌ','بَيْتٌ'],'B'],['mc','مَا مَعْنَى كَلِمَةِ بَيْتٌ؟',['Rumah','Sekolah','Buku','Pena'],'A'],['essay','اُكْتُبْ ثَلَاثَ مُفْرَدَاتٍ عَرَبِيَّةٍ عَنِ الْمَدْرَسَةِ.','','نَمُوذَج: كِتَابٌ، قَلَمٌ، فَصْلٌ'],['mc','أَكْمِلْ: هَذَا ___ جَدِيدٌ.',['كِتَابٌ','مَدْرَسَةٌ','سَيَّارَةٌ','مُعَلِّمَةٌ'],'A'],['essay','تَرْجِمْ إِلَى الْعَرَبِيَّةِ: Saya belajar bahasa Arab.','','أَنَا أَتَعَلَّمُ اللُّغَةَ الْعَرَبِيَّةَ.']];
    for(const [type,prompt,options,key] of samples) await pool.query('INSERT INTO questions(bank_id,type,prompt,options,answer_key) VALUES($1,$2,$3,$4,$5)',[bank.rows[0].id,type,prompt,JSON.stringify(options),key]);
  }
}

async function rotateDemoSeedAccounts() {
  const rotateBootstrapPasswords = process.env.ROTATE_DEMO_SEED_PASSWORDS === 'true';
  if (!rotateBootstrapPasswords && process.env.SEED_DEMO_STUDENTS !== 'false') return;
  if (rotateBootstrapPasswords) {
    const bootstrapAccounts = [
      ['admin', 'admin123', process.env.SEED_ADMIN_PASSWORD, 'SEED_ADMIN_PASSWORD'],
      ['guru', 'guru123', process.env.SEED_TEACHER_PASSWORD, 'SEED_TEACHER_PASSWORD'],
    ];
    for (const [username, defaultPassword, configuredPassword, envName] of bootstrapAccounts) {
      if (!configuredPassword || configuredPassword.length < 24 || configuredPassword === defaultPassword) {
        throw new Error(`LAN_DEPLOYMENT ditolak: isi ${envName} dengan sandi baru minimal 24 karakter di .env.`);
      }
      const result = await pool.query('SELECT id,password_hash FROM users WHERE username=$1 AND active=TRUE', [username]);
      const account = result.rows[0];
      if (account && await bcrypt.compare(defaultPassword, account.password_hash)) {
        await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1', [account.id, await bcrypt.hash(configuredPassword, 12)]);
        console.log(`LAN_DEPLOYMENT: sandi demo akun ${username} diganti; ambil sandi baru dari .env.`);
      }
    }
  }

  const demoStudents = [
    ['IMBS-24001','Aisyah Putri Ramadhani'],
    ['IMBS-24002','Muhammad Rayhan Alfarizi'],
    ['IMBS-24003','Naila Zahra Khairunnisa'],
    ['IMBS-24004','Fathir Ahmad Pratama'],
    ['IMBS-24005','Siti Azzahra Maulida'],
  ];
  for (const [username,name] of demoStudents) {
    const result = await pool.query("SELECT id,password_hash FROM users WHERE username=$1 AND full_name=$2 AND role='student'", [username,name]);
    const student = result.rows[0];
    if (student && await bcrypt.compare('ujian123', student.password_hash)) {
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        await client.query('UPDATE audit_logs SET user_id=NULL WHERE user_id=$1',[student.id]);
        await client.query("DELETE FROM user_sessions WHERE sess->'user'->>'id'=$1",[String(student.id)]);
        await client.query("DELETE FROM users WHERE id=$1 AND username=$2 AND full_name=$3 AND role='student'",[student.id,username,name]);
        await client.query('COMMIT');
        console.log(`LAN_DEPLOYMENT: akun demo ${username} dihapus permanen.`);
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    }
  }
}

app.get('/api/health',asyncRoute(async(_req,res)=>{
  await pool.query('SELECT 1');
  if(controlPlaneRuntime)await controlPool.query('SELECT 1');
  res.json({ok:true,database:'connected',controlPlane:controlPlaneRuntime?'connected':'not_configured'});
}));
app.post('/api/platform/auth/login',asyncRoute(async(req,res)=>{
  if(!platformAuthenticator)return res.status(503).json({error:'Autentikasi control-plane belum dikonfigurasi.'});
  const user=await platformAuthenticator.authenticate(req.body||{});
  if(!user){
    await controlPool.query(`INSERT INTO control_plane.platform_audit_logs(action,detail)
      VALUES('platform.owner.login.failed',jsonb_build_object('reason','invalid_credentials'))`);
    return res.status(401).json({error:'Email atau kata sandi salah.'});
  }
  await controlPool.query(`INSERT INTO control_plane.platform_audit_logs(actor_id,action,detail)
    VALUES($1,'platform.owner.login',jsonb_build_object('success',true))`,[user.id]);
  await new Promise((resolve,reject)=>req.session.regenerate(error=>error?reject(error):resolve()));
  req.session.user={...user,authSource:'control_plane'};
  await new Promise((resolve,reject)=>req.session.save(error=>error?reject(error):resolve()));
  res.json({user:req.session.user});
}));
app.get('/api/platform/overview',platformOwnerOnly,asyncRoute(async(req,res)=>{
  const platformModeEnabled = String(process.env.TENANCY_ENABLED || '').trim().toLowerCase() === 'true';
  const controlReady = Boolean(controlPlaneRuntime);
  res.json({
    mode: platformModeEnabled ? 'tenant-production' : 'local-safe-pilot',
    tenantModeEnabled: platformModeEnabled,
    localDeployment: true,
    controlPlaneReady: controlReady,
    provisioningReady: controlReady && platformManagement.provisioningReady,
    productionGuard: !platformModeEnabled,
    checklist: [
      'akses platform_owner aktif',
      'safe local deployment berjalan',
      'tenant mode tetap tertutup sampai control-plane siap',
      'backup dan restore harus melalui test sebelum enable live',
    ],
    lastUpdated: new Date().toISOString(),
  });
}));
app.get('/api/platform/tenants',platformOwnerOnly,asyncRoute(async(req,res)=>{
  if (!controlPlaneRuntime) return res.status(503).json({ error: 'Control-plane belum tersedia pada instance ini.' });
  const status = typeof req.query?.status === 'string' ? req.query.status.trim() : undefined;
  const limit = req.query?.limit !== undefined ? Number(req.query.limit) : 25;
  const tenants = await platformManagement.listTenants({ status, limit });
  res.json({ tenants });
}));
app.post('/api/platform/tenants',platformOwnerOnly,asyncRoute(async(req,res)=>{
  if (!platformManagement.provisioningReady) {
    return res.status(503).json({ error: 'Provisioning belum tersedia: control-plane dan provisioner nyata harus aktif.' });
  }
  const payload = { ...req.body };
  if (!payload.trialEndsAt && payload.trialDays) {
    const days = Number(payload.trialDays);
    if (Number.isSafeInteger(days) && days > 0) {
      const end = new Date();
      end.setDate(end.getDate() + days);
      payload.trialEndsAt = end.toISOString();
    }
  }
  const result = await platformManagement.provisionTenant(payload);
  res.status(201).json(result);
}));
app.post('/api/platform/onboarding',platformOwnerOnly,asyncRoute(async(req,res)=>{
  if (!platformManagement.provisioningReady) {
    return res.status(503).json({ error: 'Provisioning belum tersedia: control-plane dan provisioner nyata harus aktif.' });
  }
  const payload = { ...req.body };
  if (!payload.trialEndsAt && payload.trialDays) {
    const days = Number(payload.trialDays);
    if (Number.isSafeInteger(days) && days > 0) {
      const end = new Date();
      end.setDate(end.getDate() + days);
      payload.trialEndsAt = end.toISOString();
    }
  }
  const result = await platformManagement.provisionTenant(payload);
  res.status(201).json(result);
}));
app.patch('/api/platform/tenants/:id/status',platformOwnerOnly,asyncRoute(async(req,res)=>{
  if (!controlPlaneRuntime) return res.status(503).json({ error: 'Control-plane belum tersedia pada instance ini.' });
  const { status } = req.body || {};
  const updated = await platformManagement.updateTenantStatus({
    tenantId: req.params.id,
    status,
    actorId: req.session.user.id,
  });
  res.json({ tenant: updated });
}));
app.patch('/api/platform/tenants/:id',platformOwnerOnly,asyncRoute(async(req,res)=>{
  if (!controlPlaneRuntime) return res.status(503).json({ error: 'Control-plane belum tersedia pada instance ini.' });
  const updated = await platformManagement.updateTenant({
    tenantId: req.params.id,
    ...req.body,
    actorId: req.session.user.id,
  });
  res.json({ tenant: updated });
}));
app.get('/api/auth/me',(req,res)=>res.json({user:req.session.user||null}));
app.post('/api/auth/login',asyncRoute(async(req,res)=>{
  const {username,password}=req.body||{};
  const tenantContext=tenantRuntime?.context.getCurrent();
  const identity=tenantRuntime?String(req.body?.email||'').trim().toLowerCase():String(username||'').trim();
  if(!identity||!password)return res.status(400).json({error:tenantRuntime?'Kode sekolah, email, dan password wajib diisi.':'Username dan kata sandi wajib diisi.'});
  const result=tenantRuntime
    ? await pool.query('SELECT * FROM users WHERE lower(email)=lower($1) AND active=TRUE',[identity])
    : await pool.query('SELECT * FROM users WHERE username=$1 AND active=TRUE',[identity]);
  const u=result.rows[0];
  if(controlPlaneRuntime&&u?.role==='platform_owner')
    return res.status(401).json({error:'Gunakan halaman login pemilik platform.'});
  if(u?.role==='platform_owner'&&await bcrypt.compare('platform-owner-local',u.password_hash))
    return res.status(401).json({error:'Akses pemilik belum di-bootstrap dengan password lokal yang kuat.'});
  if(!u||!(await bcrypt.compare(String(password),u.password_hash)))return res.status(401).json({error:'Username atau kata sandi salah.'});
  await new Promise((resolve,reject)=>req.session.regenerate(error=>error?reject(error):resolve()));
  req.session.user=safeUser(u,tenantContext?.tenant);await audit(pool,u.id,'login');res.json({user:req.session.user});
}));
app.post('/api/auth/logout',(req,res)=>req.session.destroy(()=>{res.clearCookie('connect.sid');res.json({ok:true});}));
app.put('/api/account/profile',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const profile=prepareAccountProfile(req.body);
  const client=await pool.connect();
  let updatedUser;
  try{
    await client.query('BEGIN');
    const account=await client.query("SELECT id,username,full_name,role,class_name,password_hash FROM users WHERE id=$1 AND role IN ('admin','teacher') AND active=TRUE FOR UPDATE",[req.session.user.id]);
    if(!account.rowCount)throw Object.assign(new Error('Akun tidak ditemukan atau tidak aktif.'),{status:404});
    const current=account.rows[0];
    if(profile.passwordRequested&&!await bcrypt.compare(profile.currentPassword,current.password_hash))
      throw Object.assign(new Error('Password saat ini tidak benar.'),{status:400});
    if(profile.name===current.full_name&&!profile.passwordRequested)
      throw Object.assign(new Error('Tidak ada perubahan profil.'),{status:400});
    const passwordHash=profile.passwordRequested?await bcrypt.hash(profile.newPassword,12):current.password_hash;
    await client.query('UPDATE users SET full_name=$1,password_hash=$2 WHERE id=$3',[profile.name,passwordHash,current.id]);
    if(profile.passwordRequested)
      await revokeUserSessions(client,current.id,req.session.user.tenantId,req.sessionID);
    await audit(client,current.id,'account.profile.update',{previousName:current.full_name,name:profile.name,passwordChanged:profile.passwordRequested});
    await client.query('COMMIT');
    updatedUser={id:Number(current.id),username:current.username,name:profile.name,role:current.role,className:current.class_name,passwordChanged:profile.passwordRequested};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  req.session.user.name=profile.name;
  await new Promise((resolve,reject)=>req.session.save(error=>error?reject(error):resolve()));
  res.json(updatedUser);
}));
app.get('/api/settings',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const result=await pool.query('SELECT * FROM school_settings WHERE id=1');
  const settings=publicSettings(result.rows[0]);
  if(req.session.user.role==='teacher'){
    const assignments=await teacherAssignments(req.session.user.id);
    settings.classes=settings.classes.filter(className=>assignments.some(assignment=>assignment.className===className));
    const assignedGrades=gradesForTeacherClasses(settings.classes,settings.grades);
    settings.grades=settings.grades.filter(grade=>assignedGrades.includes(grade));
  }
  res.json(settings);
}));
app.put('/api/settings',allow('admin'),asyncRoute(async(req,res)=>{
  const body=req.body||{};
  const schoolName=String(body.schoolName||'').trim();
  const academicYear=String(body.academicYear||'').trim();
  const semester=String(body.semester||'').trim();
  const classes=normalizeSettingsList(body.classes,'Kelas',40,32);
  const grades=normalizeSettingsList(body.grades,'Tingkat kelas',20,12);
  const defaultExamDurationMinutes=Number(body.defaultExamDurationMinutes);
  const violationThreshold=Number(body.violationThreshold);
  const mcWeightPercentage=body.mcWeightPercentage!==undefined?Number(body.mcWeightPercentage):50;
  const essayWeightPercentage=body.essayWeightPercentage!==undefined?Number(body.essayWeightPercentage):50;
  if(!schoolName||schoolName.length>100)throw invalidQuestion('Nama sekolah wajib diisi dan maksimal 100 karakter.');
  const yearMatch=academicYear.match(/^(\d{4})\/(\d{4})$/);
  if(!yearMatch||Number(yearMatch[2])!==Number(yearMatch[1])+1)throw invalidQuestion('Tahun ajaran harus menggunakan format berurutan, misalnya 2026/2027.');
  if(!['Ganjil','Genap'].includes(semester))throw invalidQuestion('Semester harus Ganjil atau Genap.');
  if(!Number.isSafeInteger(defaultExamDurationMinutes)||defaultExamDurationMinutes<1||defaultExamDurationMinutes>480)throw invalidQuestion('Durasi ujian bawaan harus antara 1 sampai 480 menit.');
  if(!Number.isSafeInteger(violationThreshold)||violationThreshold<1||violationThreshold>10)throw invalidQuestion('Batas pelanggaran harus berupa angka bulat antara 1 sampai 10.');
  if(!Number.isSafeInteger(mcWeightPercentage)||mcWeightPercentage<0||mcWeightPercentage>100||!Number.isSafeInteger(essayWeightPercentage)||essayWeightPercentage<0||essayWeightPercentage>100||mcWeightPercentage+essayWeightPercentage!==100)throw invalidQuestion('Bobot nilai total PG dan Essay harus berupa bilangan bulat antara 0–100% dan total keduanya harus berjumlah 100%.');

  const client=await pool.connect();
  let inTransaction=false;
  try{
    await client.query('BEGIN');inTransaction=true;
    const previousResult=await client.query('SELECT * FROM school_settings WHERE id=1 FOR UPDATE');
    const previous=publicSettings(previousResult.rows[0]);
    if(violationThreshold!==Number(previous.violationThreshold)){
      const active=await client.query("SELECT EXISTS(SELECT 1 FROM exams WHERE status IN ('scheduled','active')) OR EXISTS(SELECT 1 FROM exam_sessions WHERE status='in_progress') AS active");
      if(active.rows[0].active)throw Object.assign(new Error('Batas pelanggaran tidak dapat diubah selama ada ujian terjadwal/berlangsung atau siswa sedang mengerjakan.'),{status:409});
    }
    const removedClasses=previous.classes.filter(item=>!classes.includes(item));
    if(removedClasses.length){
      const used=await client.query('SELECT EXISTS(SELECT 1 FROM users WHERE role=\'student\' AND class_name=ANY($1::text[])) OR EXISTS(SELECT 1 FROM exams WHERE class_name=ANY($1::text[])) OR EXISTS(SELECT 1 FROM teacher_access WHERE class_name=ANY($1::text[])) AS used',[removedClasses]);
      if(used.rows[0].used)throw Object.assign(new Error(`Kelas ${removedClasses.join(', ')} masih dipakai siswa, riwayat ujian, atau akses guru.`),{status:409});
    }
    const removedGrades=previous.grades.filter(item=>!grades.includes(item));
    if(removedGrades.length){
      const used=await client.query(`SELECT EXISTS(SELECT 1 FROM question_banks WHERE grade=ANY($1::text[])) OR EXISTS(
        SELECT 1 FROM teacher_access ta,unnest($1::text[]) AS removed(grade)
        WHERE left(ta.class_name,length(removed.grade))=removed.grade
          AND (length(ta.class_name)=length(removed.grade) OR substring(ta.class_name,length(removed.grade)+1,1) IN (' ','-'))
      ) AS used`,[removedGrades]);
      if(used.rows[0].used)throw Object.assign(new Error(`Tingkat ${removedGrades.join(', ')} masih dipakai bank soal atau akses guru.`),{status:409});
    }
    const saved=await client.query(`UPDATE school_settings SET school_name=$1,academic_year=$2,semester=$3,classes=$4::jsonb,grades=$5::jsonb,
      default_exam_duration_minutes=$6,violation_threshold=$7,mc_weight_percentage=$8,essay_weight_percentage=$9,updated_by=$10,updated_at=NOW() WHERE id=1 RETURNING *`,
      [schoolName,academicYear,semester,JSON.stringify(classes),JSON.stringify(grades),defaultExamDurationMinutes,violationThreshold,mcWeightPercentage,essayWeightPercentage,req.session.user.id]);
    const next=publicSettings(saved.rows[0]);
    await audit(client,req.session.user.id,'school.settings.update',{previous,next});
    await client.query('COMMIT');inTransaction=false;
    defaultViolationThreshold=violationThreshold;
    res.json(next);
  }catch(error){if(inTransaction)await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}));
app.use('/api/students',auth,asyncRoute(async(req,res,next)=>{
  const requestPath=req.originalUrl.split('?')[0];
  if(req.method!=='POST'||!['/api/students','/api/students/import'].includes(requestPath)||req.session.user.role!=='admin')return next();
  const configured=await pool.query('SELECT classes FROM school_settings WHERE id=1');
  const classes=configured.rows[0]?.classes||[];
  if(requestPath==='/api/students'){
    if(!classes.includes(String(req.body?.className||'').trim()))return res.status(400).json({error:'Pilih kelas yang tersedia pada Pengaturan sekolah.'});
  }else{
    const rows=Array.isArray(req.body?.rows)?req.body.rows:[];
    const invalid=[...new Set(rows.filter(row=>String(row.name||'').trim()&&String(row.className||'').trim()&&!classes.includes(String(row.className).trim())).map(row=>String(row.className).trim()))];
    if(invalid.length)return res.status(400).json({error:`Kelas pada file belum terdaftar: ${invalid.join(', ')}.`});
  }
  next();
}));
app.use('/api/exams',auth,asyncRoute(async(req,res,next)=>{
  if(req.method!=='POST'||req.originalUrl.split('?')[0]!=='/api/exams')return next();
  const settings=await pool.query('SELECT classes FROM school_settings WHERE id=1');
  const allowedClasses=settings.rows[0]?.classes||[];
  const reqClassNames=Array.isArray(req.body?.classNames)&&req.body.classNames.length?req.body.classNames.map(String).map(s=>s.trim()).filter(Boolean):req.body?.className?String(req.body.className).split(',').map(s=>s.trim()).filter(Boolean):[];
  if(!reqClassNames.length||!reqClassNames.every(c=>allowedClasses.includes(c)))return res.status(400).json({error:'Pilih kelas yang tersedia pada Pengaturan sekolah.'});
  const duration=Number(req.body?.durationMinutes);
  if(!Number.isInteger(duration)||duration<1||duration>480)return res.status(400).json({error:'Durasi ujian harus antara 1 sampai 480 menit.'});
  next();
}));
app.use('/api/banks',auth,asyncRoute(async(req,res,next)=>{
  if(req.method!=='POST'||req.originalUrl.split('?')[0]!=='/api/banks')return next();
  const settings=await pool.query('SELECT grades FROM school_settings WHERE id=1');
  const grade=String(req.body?.grade||'').trim(),subjectId=Number(req.body?.subjectId);
  if(!(settings.rows[0]?.grades||[]).includes(grade))return res.status(400).json({error:'Pilih tingkat bank soal yang tersedia pada Pengaturan sekolah.'});
  if(req.session.user.role==='teacher'&&!await teacherCanAccessBankScope(req.session.user.id,subjectId,grade))return res.status(403).json({error:'Bank hanya dapat dibuat untuk mata pelajaran dan tingkat kelas yang diberikan admin.'});
  next();
}));
app.get('/api/subjects',auth,asyncRoute(async(req,res)=>{
  const query=req.session.user.role==='admin'
    ? pool.query('SELECT id,name,language_code AS "languageCode",text_direction AS "textDirection" FROM subjects ORDER BY name')
    : pool.query(`SELECT DISTINCT s.id,s.name,s.language_code AS "languageCode",s.text_direction AS "textDirection"
      FROM subjects s JOIN teacher_access ta ON ta.subject_id=s.id WHERE ta.teacher_id=$1 ORDER BY s.name`,[req.session.user.id]);
  res.json((await query).rows);
}));
app.post('/api/subjects',allow('admin'),asyncRoute(async(req,res)=>{
  const {name,languageCode,textDirection}=validateSubjectInput(req.body);
  const q=await pool.query('INSERT INTO subjects(name,language_code,text_direction,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(name) DO NOTHING RETURNING id,name,language_code AS "languageCode",text_direction AS "textDirection"',[name,languageCode,textDirection,req.session.user.id]);
  if(!q.rowCount)return res.status(409).json({error:'Mata pelajaran sudah tersedia.'});
  await audit(pool,req.session.user.id,'subject.create',{subjectId:q.rows[0].id,name});
  res.status(201).json(q.rows[0]);
}));
app.put('/api/subjects/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'ID mata pelajaran tidak valid.'});
  const {name,languageCode,textDirection}=validateSubjectInput(req.body);
  const dup=await pool.query('SELECT 1 FROM subjects WHERE lower(name)=lower($1) AND id<>$2',[name,id]);
  if(dup.rowCount)return res.status(409).json({error:'Nama mata pelajaran sudah digunakan.'});
  const q=await pool.query('UPDATE subjects SET name=$1,language_code=$2,text_direction=$3 WHERE id=$4 RETURNING id,name,language_code AS "languageCode",text_direction AS "textDirection"',[name,languageCode,textDirection,id]);
  if(!q.rowCount)return res.status(404).json({error:'Mata pelajaran tidak ditemukan.'});
  await audit(pool,req.session.user.id,'subject.update',{subjectId:id,name});
  res.json(q.rows[0]);
}));
app.delete('/api/subjects/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'ID mata pelajaran tidak valid.'});
  const check=await pool.query('SELECT 1 FROM question_banks WHERE subject_id=$1 LIMIT 1',[id]);
  if(check.rowCount)return res.status(400).json({error:'Mata pelajaran tidak dapat dihapus karena masih digunakan pada bank soal.'});
  const q=await pool.query('DELETE FROM subjects WHERE id=$1 RETURNING id,name',[id]);
  if(!q.rowCount)return res.status(404).json({error:'Mata pelajaran tidak ditemukan.'});
  await audit(pool,req.session.user.id,'subject.delete',{subjectId:id,name:q.rows[0].name});
  res.json({ok:true,id});
}));
app.get('/api/students',allow('admin','teacher'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT id,username,full_name AS name,class_name AS "className",active FROM users u
  WHERE role='student' AND ($1='' OR lower(full_name||' '||username||' '||coalesce(class_name,'')) LIKE '%'||lower($1)||'%')
    AND ($2='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$3 AND ta.class_name=u.class_name)) ORDER BY full_name`,[String(req.query.search||''),req.session.user.role,req.session.user.id]);res.json(q.rows);}));
app.post('/api/students',allow('admin'),asyncRoute(async(req,res)=>{
  const name=String(req.body?.name||'').trim(),className=String(req.body?.className||'').trim();
  const email=normalizeAccountEmail(req.body?.email,{required:Boolean(tenantRuntime)});
  if(!name||!className)return res.status(400).json({error:'Nama dan kelas wajib diisi.'});
  const tenant=tenantRuntime?.context.getCurrent()?.tenant;
  if(tenant?.maxStudents){
    const countQuery=await pool.query("SELECT count(*)::int AS count FROM users WHERE role='student' AND active=TRUE");
    assertStudentQuota({currentCount:countQuery.rows[0]?.count,additionalCount:1,maxStudents:tenant.maxStudents});
  }
  const username=await uniqueUsername();
  const token=randomBytes(6).toString('hex').toUpperCase();
  const passwordHash=await bcrypt.hash(token,10);
  const q=tenantRuntime
    ? await pool.query('INSERT INTO users(username,email,full_name,role,password_hash,class_name) VALUES($1,$2,$3,\'student\',$4,$5) RETURNING id,username,email,full_name AS name,class_name AS "className"',[username,email,name,passwordHash,className])
    : await pool.query('INSERT INTO users(username,full_name,role,password_hash,class_name) VALUES($1,$2,\'student\',$3,$4) RETURNING id,username,full_name AS name,class_name AS "className"',[username,name,passwordHash,className]);
  await audit(pool,req.session.user.id,'student.create',{studentId:q.rows[0].id});
  res.status(201).json({...q.rows[0],token});
}));
app.post('/api/students/import',allow('admin'),asyncRoute(async(req,res)=>{
  const rows=req.body.rows;
  if(!Array.isArray(rows)||rows.length>500)return res.status(400).json({error:'Data harus berisi maksimal 500 baris.'});
  const validRows=rows.filter(r=>String(r.name||'').trim()&&String(r.className||'').trim());
  if(!validRows.length)return res.status(400).json({error:'Tidak ada baris siswa yang valid untuk diimpor.'});
  const tenant=tenantRuntime?.context.getCurrent()?.tenant;
  if(tenant?.maxStudents){
    const countQuery=await pool.query("SELECT count(*)::int AS count FROM users WHERE role='student' AND active=TRUE");
    assertStudentQuota({currentCount:countQuery.rows[0]?.count,additionalCount:validRows.length,maxStudents:tenant.maxStudents});
  }
  const seenEmails = new Set();
  const preparedRows = [];
  for (const row of rows) {
    const name = String(row.name || '').trim(), className = String(row.className || '').trim();
    if (!name || !className) continue;
    const email = normalizeAccountEmail(row.email, { required: false });
    if (email && seenEmails.has(email)) throw Object.assign(new Error(`Email ${email} muncul lebih dari sekali pada file.`), { status: 400 });
    if (email) seenEmails.add(email);
    const token = randomBytes(6).toString('hex').toUpperCase();
    preparedRows.push({ name, className, email, token });
  }
  const hashes = await Promise.all(preparedRows.map(r => bcrypt.hash(r.token, 10)));
  for (let i = 0; i < preparedRows.length; i++) {
    preparedRows[i].passwordHash = hashes[i];
  }
  const client = await pool.connect(), added = [];
  try {
    await client.query('BEGIN');
    for (const row of preparedRows) {
      const username = await uniqueUsername(client);
      const q = tenantRuntime
        ? await client.query('INSERT INTO users(username,email,full_name,role,password_hash,class_name) VALUES($1,$2,$3,\'student\',$4,$5) RETURNING id,username,email,full_name AS name,class_name AS "className"', [username, row.email, row.name, row.passwordHash, row.className])
        : await client.query('INSERT INTO users(username,full_name,role,password_hash,class_name) VALUES($1,$2,\'student\',$3,$4) RETURNING id,username,full_name AS name,class_name AS "className"', [username, row.name, row.passwordHash, row.className]);
      added.push({ ...q.rows[0], token: row.token });
    }
    await client.query('COMMIT');
    await audit(pool, req.session.user.id, 'student.import', { count: added.length });
    res.status(201).json({ students: added });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('Email sudah digunakan pada sekolah ini.'), { status: 409 });
    throw error;
  } finally {
    client.release();
  }
}));
app.delete('/api/students/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const student=await client.query("SELECT id,username,full_name AS name,class_name AS \"className\" FROM users WHERE id=$1 AND role='student' FOR UPDATE",[req.params.id]);
    if(!student.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Siswa tidak ditemukan.'});}
    const studentId=student.rows[0].id;
    const impact=await client.query(`SELECT
      (SELECT count(*)::int FROM exam_sessions WHERE student_id=$1) AS sessions,
      (SELECT count(*)::int FROM responses r JOIN exam_sessions es ON es.id=r.session_id WHERE es.student_id=$1) AS responses,
      (SELECT count(*)::int FROM violation_events ve JOIN exam_sessions es ON es.id=ve.session_id WHERE es.student_id=$1) AS violations`,[studentId]);
    const deleted=Object.fromEntries(Object.entries(impact.rows[0]).map(([key,value])=>[key,Number(value)]));
    await client.query('UPDATE audit_logs SET user_id=NULL WHERE user_id=$1',[studentId]);
    await revokeUserSessions(client,studentId,req.session.user.tenantId);
    await client.query("DELETE FROM users WHERE id=$1 AND role='student'",[studentId]);
    await audit(client,req.session.user.id,'student.delete',{
      studentId:Number(studentId),username:student.rows[0].username,name:student.rows[0].name,
      className:student.rows[0].className,...deleted,
    });
    await client.query('COMMIT');
    res.json({ok:true,deleted});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
async function uniqueUsername(client=pool){for(let i=0;i<20;i++){const username=`IMBS-${randomBytes(3).toString('hex').slice(0,5).toUpperCase()}`;const q=await client.query('SELECT 1 FROM users WHERE username=$1',[username]);if(!q.rowCount)return username;}throw new Error('Gagal membuat username unik.');}
app.post('/api/teachers',allow('admin'),asyncRoute(async(req,res)=>{
  const name=String(req.body?.name||'').trim();
  const username=String(req.body?.username||'').trim().toLowerCase();
  const email=normalizeAccountEmail(req.body?.email,{required:Boolean(tenantRuntime)});
  const password=String(req.body?.password||'');
  const classNames=Array.isArray(req.body?.classes)?[...new Set(req.body.classes.map(value=>String(value).trim()).filter(Boolean))]:[];
  const subjectIds=Array.isArray(req.body?.subjectIds)?[...new Set(req.body.subjectIds.map(Number))]:[];
  if(!name||name.length>120)return res.status(400).json({error:'Nama guru wajib diisi dan maksimal 120 karakter.'});
  if(!/^[a-z0-9._-]{3,40}$/.test(username))return res.status(400).json({error:'Username akses harus 3–40 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.'});
  if(password.length<8||password.length>128)return res.status(400).json({error:'Password harus berisi 8–128 karakter.'});
  if(!classNames.length||!subjectIds.length||subjectIds.some(id=>!Number.isSafeInteger(id)||id<1))return res.status(400).json({error:'Pilih sedikitnya satu kelas dan satu mata pelajaran.'});
  const tenant=tenantRuntime?.context.getCurrent()?.tenant;
  if(tenant?.maxTeachers){
    const countQuery=await pool.query("SELECT count(*)::int AS count FROM users WHERE role='teacher' AND active=TRUE");
    assertTeacherQuota({currentCount:countQuery.rows[0]?.count,additionalCount:1,maxTeachers:tenant.maxTeachers});
  }
  const [settings,subjects,existing,existingEmail]=await Promise.all([
    pool.query('SELECT classes FROM school_settings WHERE id=1'),
    pool.query('SELECT id FROM subjects WHERE id=ANY($1::bigint[])',[subjectIds]),
    pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1)',[username]),
    email?pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email]):Promise.resolve({rowCount:0}),
  ]);
  if(classNames.some(className=>!settings.rows[0].classes.includes(className)))return res.status(400).json({error:'Kelas guru harus dipilih dari Pengaturan sekolah.'});
  if(subjects.rowCount!==subjectIds.length)return res.status(400).json({error:'Mata pelajaran guru tidak valid.'});
  if(existing.rowCount)return res.status(409).json({error:'Username akses sudah digunakan.'});
  if(existingEmail.rowCount)return res.status(409).json({error:'Email sudah digunakan pada sekolah ini.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const passwordHash=await bcrypt.hash(password,12);
    const teacher=tenantRuntime
      ? await client.query("INSERT INTO users(username,email,full_name,role,password_hash,active) VALUES($1,$2,$3,'teacher',$4,TRUE) RETURNING id,username,email,full_name AS name",[username,email,name,passwordHash])
      : await client.query("INSERT INTO users(username,full_name,role,password_hash,active) VALUES($1,$2,'teacher',$3,TRUE) RETURNING id,username,full_name AS name",[username,name,passwordHash]);
    for(const subjectId of subjectIds)for(const className of classNames)
      await client.query('INSERT INTO teacher_access(teacher_id,subject_id,class_name) VALUES($1,$2,$3)',[teacher.rows[0].id,subjectId,className]);
    await audit(client,req.session.user.id,'teacher.create',{teacherId:teacher.rows[0].id,username,classNames,subjectIds});
    await client.query('COMMIT');
    res.status(201).json({...teacher.rows[0],classes:classNames,subjectIds});
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw Object.assign(new Error('Username atau email sudah digunakan pada sekolah ini.'),{status:409});throw error;}finally{client.release();}
}));
app.post('/api/teachers/import',allow('admin'),asyncRoute(async(req,res)=>{
  const rows=req.body.rows;
  if(!Array.isArray(rows)||rows.length>500)return res.status(400).json({error:'Data harus berisi maksimal 500 baris.'});
  const validRows=rows.filter(r=>String(r.name||'').trim()&&String(r.username||'').trim()&&String(r.password||'').trim()&&String(r.className||'').trim()&&String(r.subjectName||'').trim());
  if(!validRows.length)return res.status(400).json({error:'Tidak ada baris guru yang valid untuk diimpor.'});
  const tenant=tenantRuntime?.context.getCurrent()?.tenant;
  if(tenant?.maxTeachers){
    const countQuery=await pool.query("SELECT count(*)::int AS count FROM users WHERE role='teacher' AND active=TRUE");
    assertTeacherQuota({currentCount:countQuery.rows[0]?.count,additionalCount:validRows.length,maxTeachers:tenant.maxTeachers});
  }
  const client=await pool.connect(),added=[],seenUsernames=new Set(),seenEmails=new Set();
  try{
    await client.query('BEGIN');
    const [settings,subjects]=await Promise.all([
      pool.query('SELECT classes FROM school_settings WHERE id=1'),
      pool.query('SELECT id,name FROM subjects')
    ]);
    const subjectMap=new Map(subjects.rows.map(s=>[String(s.name).toLowerCase().trim(),s.id]));
    const classNamesSet=new Set(settings.rows[0].classes||[]);
    for(const row of rows){
      const name=String(row.name||'').trim(),username=String(row.username||'').trim().toLowerCase(),password=String(row.password||''),className=String(row.className||'').trim(),subjectName=String(row.subjectName||'').trim();
      if(!name||!username||!password||!className||!subjectName)continue;
      if(password.length<8||password.length>128)throw Object.assign(new Error(`Password untuk ${name} harus 8\u2013128 karakter.`),{status:400});
      if(!/^[a-z0-9._-]{3,40}$/.test(username))throw Object.assign(new Error(`Username ${username} tidak valid: 3\u201340 karakter, huruf kecil, angka, titik, garis bawah, atau tanda hubung.`),{status:400});
      if(seenUsernames.has(username))throw Object.assign(new Error(`Username ${username} muncul lebih dari sekali pada file.`),{status:400});
      seenUsernames.add(username);
      const email=normalizeAccountEmail(row.email,{required:false});
      if(email){
        if(seenEmails.has(email))throw Object.assign(new Error(`Email ${email} muncul lebih dari sekali pada file.`),{status:400});
        seenEmails.add(email);
      }
      if(!classNamesSet.has(className))throw Object.assign(new Error(`Kelas ${className} tidak ada di Pengaturan sekolah.`),{status:400});
      const subjectId=subjectMap.get(subjectName.toLowerCase().trim());
      if(!subjectId)throw Object.assign(new Error(`Mata pelajaran ${subjectName} tidak ditemukan.`),{status:400});
      const existing=await pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1)',[username]);
      if(existing.rowCount)throw Object.assign(new Error(`Username ${username} sudah digunakan.`),{status:409});
      if(email){
        const existingEmail=await pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email]);
        if(existingEmail.rowCount)throw Object.assign(new Error(`Email ${email} sudah digunakan.`),{status:409});
      }
      const passwordHash=await bcrypt.hash(password,12);
      const q=tenantRuntime
        ? await client.query('INSERT INTO users(username,email,full_name,role,password_hash,active) VALUES($1,$2,$3,\'teacher\',$4,TRUE) RETURNING id,username,email,full_name AS name',[username,email,name,passwordHash])
        : await client.query('INSERT INTO users(username,full_name,role,password_hash,active) VALUES($1,$2,\'teacher\',$3,TRUE) RETURNING id,username,full_name AS name',[username,name,passwordHash]);
      await client.query('INSERT INTO teacher_access(teacher_id,subject_id,class_name) VALUES($1,$2,$3)',[q.rows[0].id,subjectId,className]);
      added.push({...q.rows[0],classes:[className],subjectIds:[subjectId]});
    }
    await audit(client,req.session.user.id,'teacher.import',{count:added.length});
    await client.query('COMMIT');
    res.status(201).json({teachers:added});
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw Object.assign(new Error('Username atau email sudah digunakan pada sekolah ini.'),{status:409});throw error;}finally{client.release();}
}));
app.get('/api/teachers',allow('admin'),asyncRoute(async(_req,res)=>{
  const teachers=await pool.query(`SELECT u.id,u.username,${tenantRuntime?'u.email,':''}u.full_name AS name,u.active,
    COALESCE(array_agg(DISTINCT ta.class_name) FILTER(WHERE ta.class_name IS NOT NULL),ARRAY[]::text[]) AS classes,
    COALESCE(array_agg(DISTINCT ta.subject_id) FILTER(WHERE ta.subject_id IS NOT NULL),ARRAY[]::bigint[]) AS "subjectIds"
    FROM users u LEFT JOIN teacher_access ta ON ta.teacher_id=u.id WHERE u.role='teacher'
    GROUP BY u.id ORDER BY u.full_name`);
  res.json(teachers.rows);
}));
app.delete('/api/teachers/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const teacher=await client.query("SELECT id,username,full_name AS name FROM users WHERE id=$1 AND role='teacher' FOR UPDATE",[req.params.id]);
    if(!teacher.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Guru tidak ditemukan.'});}
    const teacherId=teacher.rows[0].id;
    await client.query("UPDATE subjects SET created_by=NULL WHERE created_by=$1",[teacherId]);
    await client.query('UPDATE school_settings SET updated_by=NULL WHERE updated_by=$1',[teacherId]);
    await client.query('UPDATE question_banks SET created_by=NULL WHERE created_by=$1',[teacherId]);
    await client.query('UPDATE exams SET created_by=NULL,entry_pin_issued_by=NULL WHERE created_by=$1 OR entry_pin_issued_by=$1',[teacherId]);
    await client.query('UPDATE responses SET graded_by=NULL WHERE graded_by=$1',[teacherId]);
    await client.query('UPDATE violation_events SET reviewed_by=NULL WHERE reviewed_by=$1',[teacherId]);
    await client.query('UPDATE audit_logs SET user_id=NULL WHERE user_id=$1',[teacherId]);
    await revokeUserSessions(client,teacherId,req.session.user.tenantId);
    await audit(client,req.session.user.id,'teacher.delete',{teacherId:Number(teacherId),username:teacher.rows[0].username,name:teacher.rows[0].name});
    await client.query("DELETE FROM users WHERE id=$1 AND role='teacher'",[teacherId]);
    await client.query('COMMIT');
    res.json({ok:true});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.put('/api/teachers/:id/access',allow('admin'),asyncRoute(async(req,res)=>{
  const classNames=Array.isArray(req.body?.classes)?[...new Set(req.body.classes.map(value=>String(value).trim()).filter(Boolean))]:[];
  const subjectIds=Array.isArray(req.body?.subjectIds)?[...new Set(req.body.subjectIds.map(Number))]:[];
  if(!classNames.length||!subjectIds.length||subjectIds.some(id=>!Number.isSafeInteger(id)||id<1))return res.status(400).json({error:'Pilih sedikitnya satu kelas dan satu mata pelajaran.'});
  const [settings,subjects]=await Promise.all([
    pool.query('SELECT classes FROM school_settings WHERE id=1'),
    pool.query('SELECT id FROM subjects WHERE id=ANY($1::bigint[])',[subjectIds]),
  ]);
  if(classNames.some(className=>!settings.rows[0].classes.includes(className)))return res.status(400).json({error:'Kelas guru harus dipilih dari Pengaturan sekolah.'});
  if(subjects.rowCount!==subjectIds.length)return res.status(400).json({error:'Mata pelajaran guru tidak valid.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const teacher=await client.query("SELECT id FROM users WHERE id=$1 AND role='teacher' FOR UPDATE",[req.params.id]);
    if(!teacher.rowCount)throw Object.assign(new Error('Guru tidak ditemukan.'),{status:404});
    const previous=await teacherAssignments(req.params.id,client);
    await client.query('DELETE FROM teacher_access WHERE teacher_id=$1',[req.params.id]);
    for(const subjectId of subjectIds)for(const className of classNames)
      await client.query('INSERT INTO teacher_access(teacher_id,subject_id,class_name) VALUES($1,$2,$3)',[req.params.id,subjectId,className]);
    await audit(client,req.session.user.id,'teacher.access.update',{teacherId:Number(req.params.id),previous,next:{classNames,subjectIds}});
    await client.query('COMMIT');
    res.json({id:Number(req.params.id),classes:classNames,subjectIds});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.get('/api/banks',allow('admin','teacher'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT b.id,b.grade,b.topic,s.id AS subject_id,s.name AS subject,s.language_code AS "languageCode",s.text_direction AS "textDirection",count(q.id)::int AS count,count(q.id) FILTER(WHERE q.type='mc')::int AS mc,count(q.id) FILTER(WHERE q.type='essay')::int AS essay,(SELECT count(*)::int FROM exams e WHERE e.bank_id=b.id) AS "examCount",(SELECT count(*)::int FROM exam_sessions es JOIN exams e ON e.id=es.exam_id WHERE e.bank_id=b.id) AS "sessionCount" FROM question_banks b JOIN subjects s ON s.id=b.subject_id LEFT JOIN questions q ON q.bank_id=b.id WHERE ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND left(ta.class_name,length(b.grade))=b.grade AND (length(ta.class_name)=length(b.grade) OR substring(ta.class_name,length(b.grade)+1,1) IN (' ','-')))) GROUP BY b.id,s.id ORDER BY b.created_at DESC`,[req.session.user.role,req.session.user.id]);res.json(q.rows);}));
app.delete('/api/banks/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const client=await pool.connect();
  let mediaFiles=[];
  try{
    await client.query('BEGIN');
    const bank=await client.query('SELECT id,grade,topic FROM question_banks WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!bank.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Bank soal tidak ditemukan.'});}
    await client.query('SELECT id FROM exams WHERE bank_id=$1 ORDER BY id FOR UPDATE',[req.params.id]);
    const impact=await client.query(`SELECT
      (SELECT count(*)::int FROM exams e WHERE e.bank_id=$1) AS exams,
      (SELECT count(*)::int FROM exam_sessions es JOIN exams e ON e.id=es.exam_id WHERE e.bank_id=$1) AS sessions,
      (SELECT count(*)::int FROM responses r JOIN exam_sessions es ON es.id=r.session_id JOIN exams e ON e.id=es.exam_id WHERE e.bank_id=$1) AS responses,
      (SELECT count(*)::int FROM violation_events v JOIN exam_sessions es ON es.id=v.session_id JOIN exams e ON e.id=es.exam_id WHERE e.bank_id=$1) AS violations,
      EXISTS(SELECT 1 FROM exams e WHERE e.bank_id=$1 AND (e.status='active' OR EXISTS(SELECT 1 FROM exam_sessions es WHERE es.exam_id=e.id AND es.status='in_progress'))) AS active`,[req.params.id]);
    const deleted=impact.rows[0];
    if(deleted.active){await client.query('ROLLBACK');return res.status(409).json({error:'Bank memiliki ujian aktif atau sesi peserta yang masih berlangsung. Akhiri sesi tersebut sebelum menghapus bank.'});}
    mediaFiles=(await client.query('SELECT qm.file_key FROM question_media qm JOIN questions q ON q.id=qm.question_id WHERE q.bank_id=$1',[req.params.id])).rows.map(row=>row.file_key);
    await client.query('DELETE FROM exams WHERE bank_id=$1',[req.params.id]);
    await client.query('DELETE FROM question_banks WHERE id=$1',[req.params.id]);
    await audit(client,req.session.user.id,'bank.delete',{bankId:bank.rows[0].id,topic:bank.rows[0].topic,grade:bank.rows[0].grade,examCount:deleted.exams,sessionCount:deleted.sessions,responseCount:deleted.responses,violationCount:deleted.violations});
    await client.query('COMMIT');
    await Promise.allSettled(mediaFiles.map(removeMediaFile));
    res.json({ok:true,deleted:{exams:deleted.exams,sessions:deleted.sessions,responses:deleted.responses,violations:deleted.violations}});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
app.get('/api/banks/:id/questions',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,req.params.id))return res.status(404).json({error:'Bank soal tidak ditemukan.'});
  const q=await pool.query(`SELECT q.id,q.type,q.prompt,q.options,q.answer_key AS "answerKey",q.points,q.stimulus_id AS "stimulusId",
    s.title AS "stimulusTitle",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',qm.id,'altText',qm.alt_text,'url','/api/question-media/'||qm.id)) FROM question_media qm WHERE qm.question_id=q.id),'[]'::jsonb) AS media
    FROM questions q
    LEFT JOIN question_stimuli s ON s.id=q.stimulus_id
    WHERE q.bank_id=$1 ORDER BY q.id`,[req.params.id]);
  res.json(q.rows);
}));
app.post('/api/banks',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const {subjectId,grade,topic,questions,stimuli}=req.body||{};
  if(!subjectId||!grade||!String(topic||'').trim()||!Array.isArray(questions))return res.status(400).json({error:'Mata pelajaran, kelas, topik, dan daftar soal wajib diisi.'});
  if(questions.length<1||questions.length>1000)return res.status(400).json({error:'Bank harus berisi 1 sampai 1.000 soal.'});
  if(req.session.user.role==='teacher'&&!await teacherCanAccessBankScope(req.session.user.id,subjectId,grade))return res.status(403).json({error:'Akses guru tidak mencakup mata pelajaran dan tingkat bank ini.'});
  if(stimuli!==undefined&&stimuli!==null&&!Array.isArray(stimuli))return res.status(400).json({error:'Format daftar wacana tidak valid.'});
  if(Array.isArray(stimuli)){
    for(let i=0;i<stimuli.length;i++){
      const s=stimuli[i];
      if(!s||typeof s!=='object'||!String(s.title||'').trim())return res.status(400).json({error:`Wacana ${i+1}: judul wacana/cerita wajib diisi.`});
    }
  }
  const prepared=questions.map(prepareBankQuestion);
  const mcCount=prepared.filter(question=>question.type==='mc').length;
  const essayCount=prepared.length-mcCount;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const bank=await client.query('INSERT INTO question_banks(subject_id,grade,topic,created_by) VALUES($1,$2,$3,$4) RETURNING id',[subjectId,grade,String(topic).trim(),req.session.user.id]);
    const bankId=bank.rows[0].id;
    const createdStimulusIds=[];
    if(Array.isArray(stimuli)){
      for(const s of stimuli){
        const savedS=await client.query('INSERT INTO question_stimuli(bank_id,title,content) VALUES($1,$2,$3) RETURNING id',[bankId,String(s.title||'').trim(),String(s.content||'').trim()]);
        createdStimulusIds.push(savedS.rows[0].id);
      }
    }
    const questionIds=[];
    for(const question of prepared){
      let finalStimulusId=question.stimulusId;
      if(finalStimulusId===null&&question.stimulusIndex!==null&&createdStimulusIds[question.stimulusIndex]!==undefined){
        finalStimulusId=createdStimulusIds[question.stimulusIndex];
      }
      const saved=await client.query('INSERT INTO questions(bank_id,type,prompt,options,answer_key,points,stimulus_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[bankId,question.type,question.prompt,JSON.stringify(question.options),question.answerKey,question.points,finalStimulusId]);
      questionIds.push(saved.rows[0].id);
    }
    await client.query('COMMIT');
    await audit(pool,req.session.user.id,'bank.create',{bankId,questionCount:prepared.length,mcCount,essayCount,stimuliCount:createdStimulusIds.length});
    res.status(201).json({id:bankId,questionCount:prepared.length,questionIds,mcCount,essayCount,stimuliCount:createdStimulusIds.length});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
app.post('/api/banks/:id/questions',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,req.params.id))return res.status(404).json({error:'Bank soal tidak ditemukan.'});
  const question=prepareBankQuestion(req.body||{});
  const q=await pool.query('INSERT INTO questions(bank_id,type,prompt,options,answer_key,points,stimulus_id) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS(SELECT 1 FROM question_banks WHERE id=$1) RETURNING id',[req.params.id,question.type,question.prompt,JSON.stringify(question.options),question.answerKey,question.points,question.stimulusId]);
  if(!q.rowCount)return res.status(404).json({error:'Bank soal tidak ditemukan.'});
  res.status(201).json({id:q.rows[0].id});
}));
app.put('/api/questions/:questionId',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const question=prepareBankQuestion(req.body||{});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const existing=await client.query('SELECT q.id,b.id AS bank_id FROM questions q JOIN question_banks b ON b.id=q.bank_id WHERE q.id=$1 FOR UPDATE OF b',[req.params.questionId]);
    if(!existing.rowCount)throw Object.assign(new Error('Soal tidak ditemukan.'),{status:404});
    if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,existing.rows[0].bank_id,client))throw Object.assign(new Error('Soal tidak ditemukan.'),{status:404});
    const exam=await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1',[existing.rows[0].bank_id]);
    if(exam.rowCount)throw Object.assign(new Error('Soal pada bank yang sudah memiliki ujian tidak dapat diubah.'),{status:409});
    await client.query('UPDATE questions SET type=$2,prompt=$3,options=$4::jsonb,answer_key=$5,points=$6,stimulus_id=$7 WHERE id=$1',[req.params.questionId,question.type,question.prompt,JSON.stringify(question.options),question.answerKey,question.points,question.stimulusId]);
    await audit(client,req.session.user.id,'question.update',{questionId:Number(req.params.questionId),bankId:existing.rows[0].bank_id,type:question.type});
    await client.query('COMMIT');
    res.json({ok:true});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}));
app.post('/api/questions/:questionId/media',allow('admin','teacher'),uploadQuestionImage,asyncRoute(async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Pilih satu gambar untuk diunggah.'});
  const altText=String(req.body?.altText||'').trim();
  if(!altText||altText.length>500){await rm(req.file.path,{force:true});return res.status(400).json({error:'Deskripsi gambar wajib diisi dan maksimal 500 karakter.'});}
  let client=null,transaction=false,finalKey=null,moved=false;
  try{
    const bytes=await readFile(req.file.path);
    const validated=validateQuestionImage({ originalName: req.file.originalname, buffer: bytes });
    const mimeType=validated.mimeType;
    client=await pool.connect();await client.query('BEGIN');transaction=true;
    await client.query('SELECT pg_advisory_xact_lock(7755021)');
    const question=await client.query('SELECT q.id,b.id AS bank_id FROM questions q JOIN question_banks b ON b.id=q.bank_id WHERE q.id=$1 FOR UPDATE OF b',[req.params.questionId]);
    if(!question.rowCount)throw Object.assign(new Error('Soal tidak ditemukan.'),{status:404});
    if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,question.rows[0].bank_id,client))throw Object.assign(new Error('Soal tidak ditemukan.'),{status:404});
    const exam=await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1',[question.rows[0].bank_id]);
    if(exam.rowCount)throw Object.assign(new Error('Gambar bank soal tidak dapat diubah setelah bank dijadwalkan ke ujian.'),{status:409});
    const exists=await client.query('SELECT 1 FROM question_media WHERE question_id=$1',[req.params.questionId]);
    if(exists.rowCount)throw Object.assign(new Error('Soal sudah memiliki gambar. Hapus gambar lama sebelum menggantinya.'),{status:409});
    const maximum=Number(process.env.QUESTION_MEDIA_MAX_TOTAL_BYTES||1073741824);
    const used=Number((await client.query('SELECT COALESCE(sum(file_size),0)::bigint AS bytes FROM question_media')).rows[0].bytes);
    if(!Number.isSafeInteger(maximum)||maximum<QUESTION_IMAGE_MAX_BYTES||used+req.file.size>maximum)throw Object.assign(new Error('Kapasitas penyimpanan gambar soal sudah penuh.'),{status:413});
    finalKey=`${randomUUID()}.${validated.extension}`;
    await rename(req.file.path,mediaPath(finalKey));moved=true;
    const saved=await client.query('INSERT INTO question_media(question_id,file_key,mime_type,file_size,alt_text) VALUES($1,$2,$3,$4,$5) RETURNING id,alt_text AS "altText"',[req.params.questionId,finalKey,mimeType,req.file.size,altText]);
    await audit(client,req.session.user.id,'question.media.create',{questionId:req.params.questionId,mediaId:saved.rows[0].id,fileSize:req.file.size,mimeType});
    await client.query('COMMIT');transaction=false;
    res.status(201).json({...saved.rows[0],url:`/api/question-media/${saved.rows[0].id}`});
  }catch(error){
    if(transaction)await client.query('ROLLBACK').catch(()=>{});
    await rm(req.file.path,{force:true}).catch(()=>{});
    if(moved&&finalKey)await removeMediaFile(finalKey).catch(()=>{});
    throw error;
  }finally{client?.release();}
}));
app.get('/api/question-media/:id',auth,asyncRoute(async(req,res)=>{
  const q=await pool.query('SELECT qm.id,qm.file_key,qm.mime_type,q.id AS question_id,q.bank_id FROM question_media qm JOIN questions q ON q.id=qm.question_id WHERE qm.id=$1',[req.params.id]);
  if(!q.rowCount)return res.status(404).json({error:'Gambar soal tidak ditemukan.'});
  if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,q.rows[0].bank_id))return res.status(404).json({error:'Gambar soal tidak ditemukan.'});
  if(req.session.user.role==='student'){
    const access=await pool.query(`SELECT 1 FROM exam_questions eq JOIN exam_sessions es ON es.id=eq.session_id
      WHERE eq.question_id=$1 AND es.student_id=$2 AND es.status='in_progress' LIMIT 1`,[q.rows[0].question_id,req.session.user.id]);
    if(!access.rowCount)return res.status(403).json({error:'Anda tidak memiliki akses ke gambar soal ini.'});
  }else if(!['admin','teacher'].includes(req.session.user.role))return res.status(403).json({error:'Akses tidak diizinkan.'});
  const cleanKey=path.basename(q.rows[0].file_key);
  res.type(q.rows[0].mime_type)
    .set('X-Content-Type-Options','nosniff')
    .set('Content-Security-Policy',"default-src 'none'; sandbox")
    .set('Cache-Control','private, no-store')
    .sendFile(mediaPath(cleanKey));
}));
app.delete('/api/question-media/:id',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const client=await pool.connect();let fileKey;
  try{
    await client.query('BEGIN');
    const media=await client.query('SELECT qm.id,qm.file_key,b.id AS bank_id FROM question_media qm JOIN questions q ON q.id=qm.question_id JOIN question_banks b ON b.id=q.bank_id WHERE qm.id=$1 FOR UPDATE OF b',[req.params.id]);
    if(!media.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Gambar soal tidak ditemukan.'});}
    if(req.session.user.role==='teacher'&&!await teacherCanAccessBank(req.session.user.id,media.rows[0].bank_id,client)){await client.query('ROLLBACK');return res.status(404).json({error:'Gambar soal tidak ditemukan.'});}
    const exam=await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1',[media.rows[0].bank_id]);
    if(exam.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Gambar bank soal tidak dapat diubah setelah bank dijadwalkan ke ujian.'});}
    fileKey=media.rows[0].file_key;
    await client.query('DELETE FROM question_media WHERE id=$1',[req.params.id]);
    await audit(client,req.session.user.id,'question.media.delete',{mediaId:req.params.id,bankId:media.rows[0].bank_id});
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  await removeMediaFile(fileKey);res.json({ok:true});
}));

async function pickExamQuestions(client, targetBankIds, mcCount, essayCount) {
  let essayPicks = [];
  if (essayCount > 0) {
    const allEssay = (await client.query(`SELECT id, stimulus_id FROM questions WHERE bank_id = ANY($1) AND type='essay' ORDER BY id ASC`, [targetBankIds])).rows;
    const stimMap = new Map();
    const standalone = [];
    for (const q of allEssay) {
      if (q.stimulus_id) {
        if (!stimMap.has(q.stimulus_id)) stimMap.set(q.stimulus_id, []);
        stimMap.get(q.stimulus_id).push(q);
      } else {
        standalone.push(q);
      }
    }
    let remaining = essayCount;
    // Rule: Pada essay, jika wacana terpilih maka seluruh butir soalnya dikeluarkan (100%)
    for (const [, group] of stimMap.entries()) {
      if (group.length <= remaining) {
        essayPicks.push(...group);
        remaining -= group.length;
      }
    }
    for (const q of standalone) {
      if (remaining <= 0) break;
      essayPicks.push(q);
      remaining--;
    }
    if (remaining > 0) {
      for (const q of allEssay) {
        if (remaining <= 0) break;
        if (!essayPicks.some(p => p.id === q.id)) {
          essayPicks.push(q);
          remaining--;
        }
      }
    }
  }

  let mcPicks = [];
  if (mcCount > 0) {
    const allMC = (await client.query(`SELECT id, stimulus_id FROM questions WHERE bank_id = ANY($1) AND type IN ('mc', 'complex_mc') ORDER BY random()`, [targetBankIds])).rows;
    const stimMap = new Map();
    const standalone = [];
    for (const q of allMC) {
      if (q.stimulus_id) {
        if (!stimMap.has(q.stimulus_id)) stimMap.set(q.stimulus_id, []);
        stimMap.get(q.stimulus_id).push(q);
      } else {
        standalone.push(q);
      }
    }
    let remaining = mcCount;
    // Rule: Pada PG, minimal 60% dari total soal wacana tersebut diambil jika wacana terpilih
    for (const [, group] of stimMap.entries()) {
      const min60 = Math.ceil(group.length * 0.6);
      if (remaining >= min60) {
        const take = Math.min(group.length, remaining);
        mcPicks.push(...group.slice(0, take));
        remaining -= take;
      }
    }
    for (const q of standalone) {
      if (remaining <= 0) break;
      mcPicks.push(q);
      remaining--;
    }
    if (remaining > 0) {
      for (const q of allMC) {
        if (remaining <= 0) break;
        if (!mcPicks.some(p => p.id === q.id)) {
          mcPicks.push(q);
          remaining--;
        }
      }
    }
    // Total random distribution per student
    for (let i = mcPicks.length - 1; i > 0; i--) {
      const j = randomBytes(4).readUInt32BE(0) % (i + 1);
      [mcPicks[i], mcPicks[j]] = [mcPicks[j], mcPicks[i]];
    }
  }
  return [...mcPicks, ...essayPicks];
}

app.get('/api/banks/:id/stimuli', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, req.params.id)) return res.status(404).json({ error: 'Bank soal tidak ditemukan.' });
  const q = await pool.query(`SELECT s.id, s.bank_id AS "bankId", s.title, s.content, s.media_alt_text AS "mediaAltText",
    CASE WHEN s.media_key IS NOT NULL THEN '/api/stimuli/'||s.id||'/media' ELSE NULL END AS "mediaUrl",
    (SELECT count(*)::int FROM questions q WHERE q.stimulus_id = s.id) AS "questionCount",
    s.created_at AS "createdAt"
    FROM question_stimuli s WHERE s.bank_id = $1 ORDER BY s.id`, [req.params.id]);
  res.json(q.rows);
}));
app.post('/api/banks/:id/stimuli', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, req.params.id)) return res.status(404).json({ error: 'Bank soal tidak ditemukan.' });
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  if (!title) return res.status(400).json({ error: 'Judul wacana/cerita wajib diisi.' });
  const q = await pool.query(`INSERT INTO question_stimuli(bank_id, title, content)
    SELECT $1, $2, $3 WHERE EXISTS(SELECT 1 FROM question_banks WHERE id=$1) RETURNING id`, [req.params.id, title, content]);
  if (!q.rowCount) return res.status(404).json({ error: 'Bank soal tidak ditemukan.' });
  res.status(201).json({ id: q.rows[0].id });
}));
app.put('/api/stimuli/:id', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  if (!title) return res.status(400).json({ error: 'Judul wacana/cerita wajib diisi.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT s.id, s.bank_id FROM question_stimuli s WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!existing.rowCount) throw Object.assign(new Error('Wacana tidak ditemukan.'), { status: 404 });
    if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, existing.rows[0].bank_id, client)) {
      throw Object.assign(new Error('Wacana tidak ditemukan.'), { status: 404 });
    }
    const exam = await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1', [existing.rows[0].bank_id]);
    if (exam.rowCount) throw Object.assign(new Error('Wacana pada bank yang sudah memiliki ujian tidak dapat diubah.'), { status: 409 });
    await client.query('UPDATE question_stimuli SET title=$2, content=$3 WHERE id=$1', [req.params.id, title, content]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
}));
app.delete('/api/stimuli/:id', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  const client = await pool.connect();
  let fileKey;
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT s.id, s.bank_id, s.media_key FROM question_stimuli s WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!existing.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wacana tidak ditemukan.' }); }
    if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, existing.rows[0].bank_id, client)) {
      await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wacana tidak ditemukan.' });
    }
    const exam = await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1', [existing.rows[0].bank_id]);
    if (exam.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Wacana pada bank yang sudah memiliki ujian tidak dapat dihapus.' }); }
    fileKey = existing.rows[0].media_key;
    await client.query('DELETE FROM question_stimuli WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
  if (fileKey) await removeMediaFile(fileKey);
  res.json({ ok: true });
}));
app.post('/api/stimuli/:id/media', allow('admin', 'teacher'), uploadQuestionImage, asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Pilih satu gambar untuk diunggah.' });
  const altText = String(req.body?.altText || '').trim();
  let client = null, transaction = false, finalKey = null, moved = false;
  try {
    const bytes = await readFile(req.file.path);
    const validated = validateQuestionImage({ originalName: req.file.originalname, buffer: bytes });
    const mimeType = validated.mimeType;
    client = await pool.connect(); await client.query('BEGIN'); transaction = true;
    const existing = await client.query('SELECT s.id, s.bank_id, s.media_key FROM question_stimuli s WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!existing.rowCount) throw Object.assign(new Error('Wacana tidak ditemukan.'), { status: 404 });
    if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, existing.rows[0].bank_id, client)) {
      throw Object.assign(new Error('Wacana tidak ditemukan.'), { status: 404 });
    }
    const exam = await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1', [existing.rows[0].bank_id]);
    if (exam.rowCount) throw Object.assign(new Error('Gambar wacana tidak dapat diubah setelah bank dijadwalkan ke ujian.'), { status: 409 });
    const maximum = Number(process.env.QUESTION_MEDIA_MAX_TOTAL_BYTES || 1073741824);
    const used = Number((await client.query('SELECT COALESCE(sum(file_size),0)::bigint AS bytes FROM question_media')).rows[0].bytes);
    if (!Number.isSafeInteger(maximum) || maximum < QUESTION_IMAGE_MAX_BYTES || used + req.file.size > maximum) {
      throw Object.assign(new Error('Kapasitas penyimpanan gambar sudah penuh.'), { status: 413 });
    }
    finalKey = `${randomUUID()}.${validated.extension}`;
    await rename(req.file.path, mediaPath(finalKey)); moved = true;
    const oldKey = existing.rows[0].media_key;
    await client.query('UPDATE question_stimuli SET media_key=$2, media_alt_text=$3 WHERE id=$1', [req.params.id, finalKey, altText]);
    await client.query('COMMIT'); transaction = false;
    if (oldKey) await removeMediaFile(oldKey);
    res.status(201).json({ ok: true, mediaUrl: `/api/stimuli/${req.params.id}/media` });
  } catch (error) {
    if (transaction) await client.query('ROLLBACK').catch(() => {});
    await rm(req.file.path, { force: true }).catch(() => {});
    if (moved && finalKey) await removeMediaFile(finalKey).catch(() => {});
    throw error;
  } finally { client?.release(); }
}));
app.delete('/api/stimuli/:id/media', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  const client = await pool.connect(); let fileKey;
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT s.id, s.bank_id, s.media_key FROM question_stimuli s WHERE s.id=$1 FOR UPDATE', [req.params.id]);
    if (!existing.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wacana tidak ditemukan.' }); }
    if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, existing.rows[0].bank_id, client)) {
      await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wacana tidak ditemukan.' });
    }
    const exam = await client.query('SELECT 1 FROM exams WHERE bank_id=$1 LIMIT 1', [existing.rows[0].bank_id]);
    if (exam.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Gambar wacana tidak dapat diubah setelah bank dijadwalkan ke ujian.' }); }
    fileKey = existing.rows[0].media_key;
    await client.query('UPDATE question_stimuli SET media_key=NULL, media_alt_text=NULL WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
  if (fileKey) await removeMediaFile(fileKey);
  res.json({ ok: true });
}));
app.get('/api/stimuli/:id/media', auth, asyncRoute(async (req, res) => {
  const q = await pool.query('SELECT id, bank_id, media_key, media_alt_text FROM question_stimuli WHERE id=$1', [req.params.id]);
  if (!q.rowCount || !q.rows[0].media_key) return res.status(404).json({ error: 'Gambar wacana tidak ditemukan.' });
  const stimulus = q.rows[0];
  if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, stimulus.bank_id)) {
    return res.status(404).json({ error: 'Gambar wacana tidak ditemukan.' });
  }
  if (req.session.user.role === 'student') {
    const access = await pool.query(`SELECT 1 FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      JOIN exam_sessions es ON es.id = eq.session_id
      WHERE q.stimulus_id = $1 AND es.student_id = $2 AND es.status = 'in_progress' LIMIT 1`, [stimulus.id, req.session.user.id]);
    if (!access.rowCount) return res.status(403).json({ error: 'Anda tidak memiliki akses ke gambar wacana ini.' });
  } else if (!['admin', 'teacher'].includes(req.session.user.role)) {
    return res.status(403).json({ error: 'Akses tidak diizinkan.' });
  }
  const cleanKey = path.basename(stimulus.media_key);
  const ext = path.extname(cleanKey).toLowerCase().replace('.', '');
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  res.type(mimeType)
    .set('X-Content-Type-Options', 'nosniff')
    .set('Content-Security-Policy', "default-src 'none'; sandbox")
    .set('Cache-Control', 'private, no-store')
    .sendFile(mediaPath(cleanKey));
}));

app.post('/api/exams',allow('admin'),asyncRoute(async(req,res)=>{const {title,bankId,className,bankIds,classNames,mcCount,essayCount,durationMinutes}=req.body||{};const effectiveBankIds=Array.isArray(bankIds)&&bankIds.length?bankIds.map(Number):bankId?[Number(bankId)]:[];const effectiveClassNames=Array.isArray(classNames)&&classNames.length?classNames.map(String).map(s=>s.trim()).filter(Boolean):className?String(className).split(',').map(s=>s.trim()).filter(Boolean):[];const mc=Number(mcCount),essay=Number(essayCount),duration=Number(durationMinutes);if(!String(title||'').trim()||!effectiveBankIds.length||!effectiveClassNames.length||!Number.isInteger(mc)||!Number.isInteger(essay)||mc<0||essay<0||mc+essay<1||!Number.isInteger(duration)||duration<1)return res.status(400).json({error:'Lengkapi judul, bank soal, kelas peserta, jumlah soal, dan durasi.'});const client=await pool.connect();try{await client.query('BEGIN');const bankLock=await client.query('SELECT id,subject_id,grade,topic FROM question_banks WHERE id = ANY($1) FOR UPDATE',[effectiveBankIds]);if(bankLock.rows.length!==effectiveBankIds.length)throw Object.assign(new Error('Salah satu bank soal tidak ditemukan.'),{status:404});const bankGrades=[...new Set(bankLock.rows.map(b=>b.grade))];const escapeReg=(s)=>s.split('').map(c=>'[-/\\^$*+?.()|[]{}'.includes(c)?('\\'+c):c).join('');const matchGrade=(cls)=>{const sorted=[...bankGrades].sort((a,b)=>b.length-a.length);const norm=String(cls).trim();const stripped=norm.replace(/^(kelas|kls|class)\s*[-:]?\s*/i,'');const prefixMatch=sorted.find(g=>stripped===g||stripped.startsWith(g+' ')||stripped.startsWith(g+'-'));if(prefixMatch)return prefixMatch;return sorted.find(g=>new RegExp('(^|[^a-zA-Z0-9])'+escapeReg(g)+'([^a-zA-Z0-9]|$)','i').test(norm))||null;};for(const c of effectiveClassNames){const g=matchGrade(c);if(!g)throw Object.assign(new Error(`Kelas "${c}" tidak memiliki bank soal dengan tingkatan yang sesuai pada bank yang dipilih.`),{status:400});}for(const g of bankGrades){const gBankIds=bankLock.rows.filter(b=>b.grade===g).map(b=>b.id);const stock=await client.query("SELECT type,count(*)::int AS n FROM questions WHERE bank_id = ANY($1) GROUP BY type",[gBankIds]);const counts=Object.fromEntries(stock.rows.map(x=>[x.type,x.n]));const totalAvailableMC=(counts.mc||0)+(counts.complex_mc||0);if(mc>totalAvailableMC||essay>(counts.essay||0)){throw Object.assign(new Error(`Stok soal tingkat ${g} tidak cukup. Tersedia ${totalAvailableMC} pilihan ganda dan ${counts.essay||0} essay.`),{status:400});}}const primaryBankId=bankLock.rows[0].id;const displayClassName=effectiveClassNames.join(', ');const exam=await client.query("INSERT INTO exams(title,bank_id,class_name,mc_count,essay_count,duration_minutes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[String(title).trim(),primaryBankId,displayClassName,mc,essay,duration,req.session.user.id]);const students=await client.query("SELECT id,class_name FROM users WHERE role='student' AND class_name = ANY($1) AND active=TRUE ORDER BY id",[effectiveClassNames]);for(const student of students.rows){const studentGrade=matchGrade(student.class_name);const targetBankIds=bankLock.rows.filter(b=>b.grade===studentGrade).map(b=>b.id);const sessionRow=await client.query('INSERT INTO exam_sessions(exam_id,student_id) VALUES($1,$2) RETURNING id',[exam.rows[0].id,student.id]);const picks=await pickExamQuestions(client,targetBankIds,mc,essay);for(let i=0;i<picks.length;i++)await client.query('INSERT INTO exam_questions(session_id,question_id,position) VALUES($1,$2,$3)',[sessionRow.rows[0].id,picks[i].id,i+1]);}await client.query('COMMIT');await audit(pool,req.session.user.id,'exam.create',{examId:exam.rows[0].id,participants:students.rowCount,banks:effectiveBankIds.length,classes:effectiveClassNames.length});res.status(201).json({id:exam.rows[0].id,participants:students.rowCount});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}));
app.get('/api/exams',allow('admin','teacher'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT e.id,e.title,e.class_name AS "className",e.duration_minutes AS "durationMinutes",e.status,e.created_at AS "createdAt",s.name AS subject,b.grade,b.topic,e.mc_count AS "mcCount",e.essay_count AS "essayCount",count(es.id)::int AS participants,count(es.id) FILTER(WHERE es.status='in_progress')::int AS in_progress,count(es.id) FILTER(WHERE es.status='completed')::int AS completed,count(es.id) FILTER(WHERE es.status='locked')::int AS locked,count(es.id) FILTER(WHERE es.violation_count>0)::int AS violations FROM exams e JOIN question_banks b ON b.id=e.bank_id JOIN subjects s ON s.id=b.subject_id LEFT JOIN exam_sessions es ON es.exam_id=e.id WHERE ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*'))))) GROUP BY e.id,s.name,b.grade,b.topic ORDER BY e.created_at DESC`,[req.session.user.role,req.session.user.id]);res.json(q.rows);}));
app.delete('/api/exams/:id',allow('admin'),asyncRoute(async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const exam=await client.query('SELECT id,title,status FROM exams WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!exam.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Ujian tidak ditemukan.'});}
    const impact=await client.query(`SELECT
      (SELECT count(*)::int FROM exam_sessions WHERE exam_id=$1) AS sessions,
      (SELECT count(*)::int FROM responses r JOIN exam_sessions es ON es.id=r.session_id WHERE es.exam_id=$1) AS responses,
      (SELECT count(*)::int FROM violation_events v JOIN exam_sessions es ON es.id=v.session_id WHERE es.exam_id=$1) AS violations,
      (SELECT count(*)::int FROM exam_sessions WHERE exam_id=$1 AND status='in_progress') AS in_progress`,[req.params.id]);
    const deleted=impact.rows[0];
    if(exam.rows[0].status==='active'||deleted.in_progress>0){await client.query('ROLLBACK');return res.status(409).json({error:'Ujian aktif atau masih memiliki peserta yang sedang mengerjakan. Akhiri semua sesi sebelum menghapus ujian.'});}
    await client.query('DELETE FROM exams WHERE id=$1',[req.params.id]);
    await audit(client,req.session.user.id,'exam.delete',{examId:exam.rows[0].id,title:exam.rows[0].title,status:exam.rows[0].status,sessionCount:deleted.sessions,responseCount:deleted.responses,violationCount:deleted.violations});
    await client.query('COMMIT');
    res.json({ok:true,deleted:{sessions:deleted.sessions,responses:deleted.responses,violations:deleted.violations}});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
app.patch('/api/exams/:id/status',allow('admin'),asyncRoute(async(req,res)=>{const status=String(req.body.status);if(!['draft','scheduled','active','completed'].includes(status))return res.status(400).json({error:'Status tidak valid.'});const q=await pool.query('UPDATE exams SET status=$1 WHERE id=$2 RETURNING id,status',[status,req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Ujian tidak ditemukan.'});res.json(q.rows[0]);}));
app.post('/api/exams/:id/pin',allow('admin','teacher'),requireExamScope,pinIssueLimiter,asyncRoute(async(req,res)=>{
  const validityMinutes=req.body?.validityMinutes;
  if(typeof validityMinutes!=='number'||!Number.isSafeInteger(validityMinutes)||validityMinutes<1||validityMinutes>2147483647)return res.status(400).json({error:'Masa berlaku PIN harus berupa bilangan bulat menit yang positif.'});
  const pin=String(randomInt(100000,1000000));
  const pinHash=await bcrypt.hash(pin,10);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query("SELECT entry_pin_hash FROM exams WHERE id=$1 AND status='active' FOR UPDATE",[req.params.id]);
    if(!current.rowCount)throw Object.assign(new Error('PIN hanya dapat diterbitkan untuk ujian yang sedang aktif.'),{status:409});
    const q=await client.query(`UPDATE exams SET entry_pin_hash=$2,entry_pin_updated_at=clock_timestamp(),
      entry_pin_expires_at=clock_timestamp()+($3::int * INTERVAL '1 minute'),entry_pin_issued_by=$4
      WHERE id=$1 AND status='active' RETURNING id,entry_pin_updated_at AS "issuedAt",entry_pin_expires_at AS "expiresAt"`,
      [req.params.id,pinHash,validityMinutes,req.session.user.id]);
    const rotated=Boolean(current.rows[0].entry_pin_hash);
    await audit(client,req.session.user.id,'exam.pin_issue',{examId:Number(req.params.id),validityMinutes,issuedAt:q.rows[0].issuedAt,expiresAt:q.rows[0].expiresAt,rotated});
    await client.query('COMMIT');
    res.status(201).json({pin,issuedAt:q.rows[0].issuedAt,expiresAt:q.rows[0].expiresAt});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.get('/api/exams/:id/monitor',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{const [q,pinResult]=await Promise.all([pool.query(`SELECT es.id,es.status,es.violation_count AS "violationCount",es.final_score AS score,es.last_ping_at AS "lastPingAt",u.full_name AS name,u.username,u.class_name AS "className",
  count(ve.id) FILTER(WHERE ve.review_status='pending')::int AS "pendingViolationCount",
  (es.violation_count+count(ve.id) FILTER(WHERE ve.review_status='pending'))>=${getViolationThreshold()} AS "violationReviewRequired",
  COALESCE(jsonb_agg(jsonb_build_object('id',ve.id,'code',ve.code,'detail',ve.detail,'createdAt',ve.created_at,'reviewStatus',ve.review_status,'reviewReason',ve.review_reason,'reviewedAt',ve.reviewed_at) ORDER BY ve.created_at) FILTER(WHERE ve.id IS NOT NULL),'[]'::jsonb) AS events
  FROM exam_sessions es JOIN users u ON u.id=es.student_id LEFT JOIN violation_events ve ON ve.session_id=es.id
  WHERE es.exam_id=$1 GROUP BY es.id,u.id ORDER BY u.full_name`,[req.params.id]),pool.query(`SELECT entry_pin_hash IS NOT NULL AND entry_pin_expires_at>clock_timestamp() AS available,
  entry_pin_updated_at AS "issuedAt",entry_pin_expires_at AS "expiresAt" FROM exams WHERE id=$1`,[req.params.id])]);
  res.json({students:q.rows,pin:pinResult.rows[0]||{available:false,issuedAt:null,expiresAt:null}});
}));
app.get('/api/banks/:id/analysis', allow('admin', 'teacher'), asyncRoute(async (req, res) => {
  const bankId = Number(req.params.id);
  if (!Number.isInteger(bankId) || bankId <= 0) return res.status(400).json({ error: 'ID bank soal tidak valid.' });
  if (req.session.user.role === 'teacher' && !await teacherCanAccessBank(req.session.user.id, req.params.id)) return res.status(404).json({ error: 'Bank soal tidak ditemukan.' });
  const bankQuery = await pool.query(`
    SELECT b.id, b.grade, b.topic, s.name AS subject,
      (SELECT count(*)::int FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id WHERE q.bank_id=b.id AND es.status IN ('completed','locked')) AS "usedSessions",
      (SELECT count(*)::int FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id WHERE q.bank_id=b.id AND es.status='completed') AS "completedParticipants",
      (SELECT count(DISTINCT es.student_id)::int FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id WHERE q.bank_id=b.id AND es.status IN ('completed','locked')) AS "totalParticipants",
      EXISTS(SELECT 1 FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id WHERE q.bank_id=b.id AND e.status='completed') AS "hasCompletedExam"
    FROM question_banks b JOIN subjects s ON s.id=b.subject_id WHERE b.id=$1
  `, [bankId]);
  if (!bankQuery.rowCount) return res.status(404).json({ error: 'Bank soal tidak ditemukan.' });
  const bank = bankQuery.rows[0];
  if (!bank.hasCompletedExam) return res.status(423).json({ error: 'Analisis baru dapat dibuka setelah bank soal ini selesai digunakan dalam ujian.' });
  const items = await pool.query(`
    SELECT
      q.id AS "questionId",
      q.type,
      q.prompt,
      q.points,
      count(DISTINCT eq.session_id) FILTER (WHERE es.status IN ('completed','locked'))::int AS "totalAssigned",
      count(DISTINCT r.session_id) FILTER (WHERE es.status IN ('completed','locked') AND NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL)::int AS "totalAnswered",
      count(DISTINCT eq.session_id) FILTER (WHERE es.status IN ('completed','locked') AND NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NULL)::int AS "totalBlank",
      count(DISTINCT r.session_id) FILTER (
        WHERE es.status IN ('completed','locked') AND NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL AND (
          (q.type = 'mc' AND UPPER(BTRIM(COALESCE(r.answer, ''))) = UPPER(BTRIM(COALESCE(eq.answer_key, q.answer_key))))
          OR
          (q.type = 'essay' AND r.essay_score IS NOT NULL AND r.essay_score >= 50)
        )
      )::int AS "totalCorrect",
      count(DISTINCT r.session_id) FILTER (
        WHERE es.status IN ('completed','locked') AND NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL AND (
          (q.type = 'mc' AND UPPER(BTRIM(COALESCE(r.answer, ''))) != UPPER(BTRIM(COALESCE(eq.answer_key, q.answer_key))))
          OR
          (q.type = 'essay' AND (r.essay_score IS NULL OR r.essay_score < 50))
        )
      )::int AS "totalIncorrect"
    FROM questions q
    LEFT JOIN exam_questions eq ON eq.question_id = q.id
    LEFT JOIN exam_sessions es ON es.id = eq.session_id
    LEFT JOIN responses r ON r.session_id = eq.session_id AND r.question_id = q.id
    WHERE q.bank_id = $1
    GROUP BY q.id, q.type, q.prompt, q.points
    ORDER BY q.type DESC, q.id ASC
  `, [bankId]);
  const questionsWithMetrics = items.rows.map((item, index) => {
    const { difficultyIndex, difficulty } = calculateItemDifficulty(item.totalAssigned, item.totalCorrect);
    return { number: index + 1, ...item, difficultyIndex, difficulty };
  });
  res.json({ bank, items: questionsWithMetrics });
}));
app.get('/api/exams/:id/analysis',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{
  const examId=Number(req.params.id);
  const examQuery=await pool.query(`
    SELECT e.id,e.title,e.class_name AS "className",e.status,s.name AS subject,b.grade,b.topic,
      (SELECT count(*)::int FROM exam_sessions WHERE exam_id=e.id) AS "totalParticipants",
      (SELECT count(*)::int FROM exam_sessions WHERE exam_id=e.id AND status='completed') AS "completedParticipants"
    FROM exams e JOIN question_banks b ON b.id=e.bank_id JOIN subjects s ON s.id=b.subject_id WHERE e.id=$1
  `,[examId]);
  if(!examQuery.rowCount)return res.status(404).json({error:'Ujian tidak ditemukan.'});
  const exam=examQuery.rows[0];

  const items=await pool.query(`
    WITH exam_banks AS (
      SELECT DISTINCT b_id FROM (
        SELECT bank_id AS b_id FROM exams WHERE id = $1
        UNION
        SELECT DISTINCT q2.bank_id AS b_id
        FROM exam_sessions es2
        JOIN exam_questions eq2 ON eq2.session_id = es2.id
        JOIN questions q2 ON q2.id = eq2.question_id
        WHERE es2.exam_id = $1
      ) sub
    )
    SELECT
      q.id AS "questionId",
      q.type,
      q.prompt,
      q.points,
      count(DISTINCT eq.session_id)::int AS "totalAssigned",
      count(DISTINCT r.session_id) FILTER (WHERE NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL)::int AS "totalAnswered",
      count(DISTINCT eq.session_id) FILTER (WHERE NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NULL)::int AS "totalBlank",
      count(DISTINCT r.session_id) FILTER (
        WHERE NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL AND (
          (q.type = 'mc' AND UPPER(BTRIM(COALESCE(r.answer, ''))) = UPPER(BTRIM(COALESCE(eq.answer_key, q.answer_key))))
          OR
          (q.type = 'essay' AND r.essay_score IS NOT NULL AND r.essay_score >= 50)
        )
      )::int AS "totalCorrect",
      count(DISTINCT r.session_id) FILTER (
        WHERE NULLIF(BTRIM(COALESCE(r.answer, '')), '') IS NOT NULL AND (
          (q.type = 'mc' AND UPPER(BTRIM(COALESCE(r.answer, ''))) != UPPER(BTRIM(COALESCE(eq.answer_key, q.answer_key))))
          OR
          (q.type = 'essay' AND (r.essay_score IS NULL OR r.essay_score < 50))
        )
      )::int AS "totalIncorrect"
    FROM questions q
    JOIN exam_banks eb ON eb.b_id = q.bank_id
    LEFT JOIN (
      exam_sessions es
      JOIN exam_questions eq ON eq.session_id = es.id
    ) ON es.exam_id = $1 AND eq.question_id = q.id AND es.status != 'not_started'
    LEFT JOIN responses r ON r.session_id = eq.session_id AND r.question_id = q.id
    GROUP BY q.id, q.type, q.prompt, q.points
    ORDER BY q.type DESC, q.id ASC
  `,[examId]);

  const questionsWithMetrics = items.rows.map((item, index) => {
    const { difficultyIndex, difficulty } = calculateItemDifficulty(item.totalAssigned, item.totalCorrect);
    return {
      number: index + 1,
      ...item,
      difficultyIndex,
      difficulty,
    };
  });

  res.json({ exam, items: questionsWithMetrics });
}));
app.get('/api/monitor',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT e.id AS "examId",e.title AS "examTitle",e.status AS "examStatus",es.id,es.student_id AS "studentId",es.status,
      es.violation_count AS "violationCount",es.final_score AS score,es.last_ping_at AS "lastPingAt",u.full_name AS name,u.username,u.class_name AS "className",
      count(ve.id) FILTER(WHERE ve.review_status='pending')::int AS "pendingViolationCount",
      (es.violation_count+count(ve.id) FILTER(WHERE ve.review_status='pending'))>=${getViolationThreshold()} AS "violationReviewRequired",
      COALESCE(jsonb_agg(jsonb_build_object('id',ve.id,'code',ve.code,'detail',ve.detail,'createdAt',ve.created_at,'reviewStatus',ve.review_status,'reviewReason',ve.review_reason,'reviewedAt',ve.reviewed_at) ORDER BY ve.created_at) FILTER(WHERE ve.id IS NOT NULL),'[]'::jsonb) AS events
    FROM exams e JOIN question_banks b ON b.id=e.bank_id JOIN exam_sessions es ON es.exam_id=e.id JOIN users u ON u.id=es.student_id
    LEFT JOIN violation_events ve ON ve.session_id=es.id
    WHERE (es.status IN ('in_progress','locked') OR es.violation_count>0 OR EXISTS(
      SELECT 1 FROM violation_events pending WHERE pending.session_id=es.id AND pending.review_status IN ('pending','confirmed') AND pending.code<>'admin_reset'
    )) AND ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))))
    GROUP BY e.id,es.id,u.id ORDER BY e.created_at DESC,u.full_name`,[req.session.user.role,req.session.user.id]);
  res.json(q.rows);
}));
app.get('/api/student/exams',allow('student'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT es.id AS "sessionId",e.id AS "examId",e.title,e.duration_minutes AS "durationMinutes",e.status AS "examStatus",es.status AS "sessionStatus",es.violation_count AS "violationCount",es.final_score AS score,es.last_ping_at AS "lastPingAt",(e.entry_pin_hash IS NOT NULL AND e.entry_pin_expires_at>clock_timestamp()) AS "pinReady",s.name AS subject,b.topic,s.language_code AS "languageCode",s.text_direction AS "textDirection",
  u.class_name AS "studentClass",
  COALESCE((SELECT b2.grade FROM exam_questions eq2 JOIN questions q2 ON q2.id=eq2.question_id JOIN question_banks b2 ON b2.id=q2.bank_id WHERE eq2.session_id=es.id LIMIT 1), b.grade) AS grade
  FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
  JOIN users u ON u.id=es.student_id
  JOIN question_banks b ON b.id=e.bank_id JOIN subjects s ON s.id=b.subject_id
  WHERE es.student_id=$1 AND (e.status='active' OR es.status IN ('completed','locked')) ORDER BY e.created_at DESC`,[req.session.user.id]);res.json(q.rows);}));
app.post('/api/student/exams/:examId/start',allow('student'),startLimiter,asyncRoute(async(req,res)=>{
  const client=await pool.connect();let sessionId;
  try{
    await client.query('BEGIN');
    const q=await client.query(`SELECT es.id,es.status,e.status AS exam_status,e.entry_pin_hash
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
      WHERE es.exam_id=$1 AND es.student_id=$2 FOR UPDATE OF es FOR SHARE OF e`,[req.params.examId,req.session.user.id]);
    if(!q.rowCount)throw Object.assign(new Error('Anda tidak terdaftar sebagai peserta ujian ini.'),{status:404});
    const row=q.rows[0];sessionId=row.id;
    if(row.status==='locked')throw Object.assign(new Error('Sesi dikunci karena batas pelanggaran terlampaui. Nilai akhir ditentukan guru.'),{status:423});
    if(row.status==='completed')throw Object.assign(new Error('Ujian ini sudah selesai.'),{status:409});
    if(row.exam_status!=='active')throw Object.assign(new Error('Ujian tidak lagi aktif.'),{status:409});
    if(row.status==='not_started'){
      if(!row.entry_pin_hash)throw Object.assign(new Error('Pengawas belum menerbitkan PIN untuk ujian ini.'),{status:409});
      const pin=String(req.body?.pin||'').trim();
      if(!/^\d{4,6}$/.test(pin)||!(await verifyExamPin(req.params.examId, pin, row.entry_pin_hash)))throw Object.assign(new Error('PIN ujian tidak benar.'),{status:401});
      const started=await client.query(`UPDATE exam_sessions SET status='in_progress',started_at=clock_timestamp(),last_ping_at=clock_timestamp()
        WHERE id=$1 AND EXISTS(SELECT 1 FROM exams WHERE id=$2 AND entry_pin_hash=$3 AND entry_pin_expires_at>clock_timestamp()) RETURNING id`,
        [sessionId,req.params.examId,row.entry_pin_hash]);
      if(!started.rowCount)throw Object.assign(new Error('PIN ujian telah kedaluwarsa atau diganti. Minta PIN baru kepada pengawas.'),{status:409});
      await ensureSessionOptionShuffle(sessionId, client);
    }else{
      await client.query('UPDATE exam_sessions SET last_ping_at=NOW() WHERE id=$1',[sessionId]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  res.json(await getStudentSession(sessionId,req.session.user.id));
}));
app.get('/api/student/sessions/:sessionId',allow('student'),asyncRoute(async(req,res)=>res.json(await getStudentSession(req.params.sessionId,req.session.user.id))));
app.post('/api/student/sessions/:sessionId/heartbeat',allow('student'),heartbeatLimiter,asyncRoute(async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const owned=await client.query(`SELECT es.status,es.started_at,e.duration_minutes,es.violation_count,
        (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
      WHERE es.id=$1 AND es.student_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.session.user.id]);
    if(!owned.rowCount)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
    if(owned.rows[0].status!=='in_progress')throw Object.assign(new Error('Sesi ujian tidak aktif.'),{status:409});
    const violationReviewRequired=Number(owned.rows[0].violation_count)+Number(owned.rows[0].pending_violation_count)>=getViolationThreshold();
    const deadline=await client.query(`SELECT ($1::timestamptz + $2 * INTERVAL '1 minute') <= clock_timestamp() AS expired`,[owned.rows[0].started_at,owned.rows[0].duration_minutes]);
    if(deadline.rows[0].expired&&!violationReviewRequired){
      await client.query('ROLLBACK');
      const finished=await finishStudentSession(req.params.sessionId,req.session.user.id);
      return res.json({...finished,ok:true,serverTime:new Date()});
    }
    await client.query('UPDATE exam_sessions SET last_ping_at=NOW() WHERE id=$1',[req.params.sessionId]);
    await client.query('COMMIT');
    res.json({ok:true,status:'in_progress',serverTime:new Date(),violationCount:Number(owned.rows[0].violation_count),pendingViolationCount:Number(owned.rows[0].pending_violation_count),violationReviewRequired});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}));
app.put('/api/student/sessions/:sessionId/responses/:questionId',allow('student'),responseLimiter,asyncRoute(async(req,res)=>{
  const answer=String(req.body.answer??'');if(answer.length>20000)return res.status(413).json({error:'Jawaban terlalu panjang.'});
  const client=await pool.connect();let inTransaction=false;
  try{
    await client.query('BEGIN');inTransaction=true;
    const owned=await client.query(`SELECT es.id,es.status,es.started_at,e.duration_minutes,es.violation_count,
        (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id WHERE es.id=$1 AND es.student_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.session.user.id]);
    if(!owned.rowCount)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
    if(owned.rows[0].status==='locked'){await client.query('ROLLBACK');inTransaction=false;return res.status(423).json({error:'Sesi dikunci; nilai otomatis 0.'});}
    if(owned.rows[0].status!=='in_progress'){await client.query('ROLLBACK');inTransaction=false;return res.status(409).json({error:'Sesi ujian tidak menerima jawaban lagi.'});}
    if(Number(owned.rows[0].violation_count)+Number(owned.rows[0].pending_violation_count)>=getViolationThreshold()){await client.query('ROLLBACK');inTransaction=false;return res.status(423).json({error:'Ujian dijeda sementara menunggu keputusan Admin.',violationReviewRequired:true});}
    const deadline=await client.query(`SELECT ($1::timestamptz + $2 * INTERVAL '1 minute') <= clock_timestamp() AS expired`,[owned.rows[0].started_at,owned.rows[0].duration_minutes]);
    if(deadline.rows[0].expired){await client.query('ROLLBACK');inTransaction=false;await finishStudentSession(req.params.sessionId,req.session.user.id);return res.status(409).json({error:'Waktu ujian telah habis; sesi diselesaikan otomatis.'});}
    const q=await client.query(`INSERT INTO responses(session_id,question_id,answer,updated_at)
      SELECT $1,$2,$3,NOW() WHERE EXISTS(SELECT 1 FROM exam_questions WHERE session_id=$1 AND question_id=$2)
      ON CONFLICT(session_id,question_id) DO UPDATE SET answer=EXCLUDED.answer,updated_at=NOW() RETURNING updated_at`,[req.params.sessionId,req.params.questionId,answer]);
    if(!q.rowCount)throw Object.assign(new Error('Soal tidak ditemukan pada sesi ini.'),{status:404});
    await client.query('COMMIT');inTransaction=false;res.json({saved:true,updatedAt:q.rows[0].updated_at});
  }catch(error){if(inTransaction)await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.post('/api/student/sessions/:sessionId/violations',allow('student'),violationLimiter,asyncRoute(async(req,res)=>{
  const codes=new Set(['tab_hidden','window_blur','fullscreen_exit','blocked_shortcut','clipboard','context_menu']);const code=String(req.body.code||'');if(!codes.has(code))return res.status(400).json({error:'Jenis sinyal pelanggaran tidak dikenal.'});
  const client=await pool.connect();let inTransaction=false;
  try{
    await client.query('BEGIN');inTransaction=true;
    const owned=await client.query(`SELECT es.id,es.status,es.started_at,e.duration_minutes,es.violation_count,
        (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id WHERE es.id=$1 AND es.student_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.session.user.id]);
    if(!owned.rowCount)throw Object.assign(new Error('Sesi ujian tidak ditemukan.'),{status:404});
    if(owned.rows[0].status!=='in_progress'){await client.query('ROLLBACK');inTransaction=false;return res.status(409).json({error:'Sesi ujian tidak aktif.',status:owned.rows[0].status});}
    const violationReviewRequired=Number(owned.rows[0].violation_count)+Number(owned.rows[0].pending_violation_count)>=getViolationThreshold();
    if(violationReviewRequired){await client.query('ROLLBACK');inTransaction=false;return res.status(423).json({error:'Ujian dijeda sementara menunggu keputusan Admin.',status:'in_progress',violationReviewRequired:true});}
    const deadline=await client.query(`SELECT ($1::timestamptz + $2 * INTERVAL '1 minute') <= clock_timestamp() AS expired`,[owned.rows[0].started_at,owned.rows[0].duration_minutes]);
    if(deadline.rows[0].expired){await client.query('ROLLBACK');inTransaction=false;await finishStudentSession(req.params.sessionId,req.session.user.id);return res.status(409).json({error:'Waktu ujian telah habis; sesi diselesaikan otomatis.'});}
    const detail=String(req.body.detail||'').slice(0,160);
    await client.query('INSERT INTO violation_events(session_id,code,detail) VALUES($1,$2,$3)',[req.params.sessionId,code,detail]);
    const q=await client.query('SELECT violation_count AS "violationCount",status FROM exam_sessions WHERE id=$1',[req.params.sessionId]);
    const pending=await client.query("SELECT count(*)::int AS count FROM violation_events WHERE session_id=$1 AND review_status='pending'",[req.params.sessionId]);
    const count=q.rows[0].violationCount;
    const pendingViolationCount=pending.rows[0].count;
    const updatedViolationReviewRequired=Number(count)+Number(pendingViolationCount)>=getViolationThreshold();
    await audit(client,req.session.user.id,'student.violation_signal',{sessionId:Number(req.params.sessionId),code,detail,reviewStatus:'pending'});
    await client.query('COMMIT');inTransaction=false;
    res.json({violationCount:count,pendingViolationCount,status:q.rows[0].status,locked:false,reviewStatus:'pending',violationReviewRequired:updatedViolationReviewRequired,score:null,finalScore:null,tolerance:getViolationThreshold()});
  }catch(error){if(inTransaction)await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.post('/api/exams/:id/monitor/:sessionId/events/:eventId/review',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{
  const decision=String(req.body?.decision||'');
  const reason=String(req.body?.reason||'').trim().slice(0,240);
  if(!['confirm','dismiss'].includes(decision)||!reason)return res.status(400).json({error:'Keputusan dan alasan peninjauan wajib diisi.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const session=await client.query(`SELECT es.id,es.status,es.violation_count,es.started_at,e.duration_minutes
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
      WHERE es.id=$1 AND es.exam_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.params.id]);
    if(!session.rowCount)throw Object.assign(new Error('Peserta sesi tidak ditemukan.'),{status:404});
    const event=await client.query(`UPDATE violation_events SET review_status=$3,reviewed_by=$4,review_reason=$5,reviewed_at=NOW()
      WHERE id=$1 AND session_id=$2 AND review_status='pending' RETURNING id,code,review_status AS "reviewStatus"`,
      [req.params.eventId,req.params.sessionId,decision==='confirm'?'confirmed':'dismissed',req.session.user.id,reason]);
    if(!event.rowCount)throw Object.assign(new Error('Sinyal tidak ditemukan atau sudah ditinjau.'),{status:409});
    let status=session.rows[0].status;
    let count=Number(session.rows[0].violation_count);
    if(decision==='confirm'){
      count+=1;
      status=count>=getViolationThreshold()?'locked':status;
      await client.query(`UPDATE exam_sessions SET violation_count=$2,status=$3,
        final_score=CASE WHEN $3='locked' THEN NULL ELSE final_score END,
        finished_at=CASE WHEN $3='locked' THEN NOW() ELSE finished_at END WHERE id=$1`,[req.params.sessionId,count,status]);
    }
    const pending=await client.query("SELECT count(*)::int AS count FROM violation_events WHERE session_id=$1 AND review_status='pending'",[req.params.sessionId]);
    const pendingViolationCount=pending.rows[0].count;
    const violationReviewRequired=status==='in_progress'&&count+Number(pendingViolationCount)>=getViolationThreshold();
    await audit(client,req.session.user.id,'exam.violation_review',{examId:Number(req.params.id),sessionId:Number(req.params.sessionId),eventId:Number(req.params.eventId),decision,reason,count,status});
    await client.query('COMMIT');
    res.json({event:event.rows[0],violationCount:count,pendingViolationCount,violationReviewRequired,status,locked:status==='locked'});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}));
app.post('/api/exams/:id/monitor/:sessionId/decision',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{
  const decision=String(req.body?.decision||'');
  const reason=String(req.body?.reason||'').trim().slice(0,240);
  if(!['block','false_positive'].includes(decision)||!reason)return res.status(400).json({error:'Keputusan dan alasan peninjauan wajib diisi.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const session=await client.query(`SELECT es.id,es.status,es.violation_count,
        (SELECT count(*)::int FROM violation_events ve WHERE ve.session_id=es.id AND ve.review_status='pending') AS pending_violation_count
      FROM exam_sessions es WHERE es.id=$1 AND es.exam_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.params.id]);
    if(!session.rowCount)throw Object.assign(new Error('Peserta sesi tidak ditemukan.'),{status:404});
    const row=session.rows[0];
    const pendingCount=Number(row.pending_violation_count);
    const count=Number(row.violation_count);
    if(row.status!=='in_progress'||count+pendingCount<getViolationThreshold())
      throw Object.assign(new Error('Sesi tidak sedang menunggu keputusan pelanggaran.'),{status:409});

    let nextCount=count;
    let status=row.status;
    if(decision==='block'){
      nextCount=Math.max(count,getViolationThreshold());
      status='locked';
      await client.query(`UPDATE violation_events SET review_status='confirmed',reviewed_by=$2,review_reason=$3,reviewed_at=NOW()
        WHERE session_id=$1 AND review_status='pending'`,[row.id,req.session.user.id,reason]);
      await client.query(`UPDATE exam_sessions SET violation_count=$2,status='locked',final_score=NULL,finished_at=NOW() WHERE id=$1`,[row.id,nextCount]);
    }else{
      await client.query(`UPDATE violation_events SET review_status='dismissed',reviewed_by=$2,review_reason=$3,reviewed_at=NOW()
        WHERE session_id=$1 AND review_status='pending'`,[row.id,req.session.user.id,reason]);
      if(count>=getViolationThreshold()){
        const latest=await client.query(`SELECT id FROM violation_events WHERE session_id=$1 AND review_status='confirmed' AND code<>'admin_reset'
          ORDER BY created_at DESC,id DESC LIMIT 1`,[row.id]);
        if(latest.rowCount)await client.query(`UPDATE violation_events SET review_status='dismissed',reviewed_by=$2,review_reason=$3,reviewed_at=NOW() WHERE id=$1`,[latest.rows[0].id,req.session.user.id,reason]);
        nextCount=Math.max(0,count-1);
      }
      await client.query(`UPDATE exam_sessions SET violation_count=$2 WHERE id=$1`,[row.id,nextCount]);
    }
    await audit(client,req.session.user.id,'exam.violation_threshold_decision',{examId:Number(req.params.id),sessionId:Number(req.params.sessionId),decision,reason,count:nextCount,status});
    await client.query('COMMIT');
    res.json({status,violationCount:nextCount,pendingViolationCount:0,violationReviewRequired:false,decision});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}));
app.post('/api/exams/:id/monitor/:sessionId/reset',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{
  const reason=String(req.body?.reason||'').trim().slice(0,240);
  if(!reason)return res.status(400).json({error:'Alasan pemulihan wajib diisi.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query(`SELECT es.id,es.status,es.started_at,e.duration_minutes,e.status AS exam_status
      FROM exam_sessions es JOIN exams e ON e.id=es.exam_id
      WHERE es.id=$1 AND es.exam_id=$2 FOR UPDATE OF es`,[req.params.sessionId,req.params.id]);
    if(!q.rowCount)throw Object.assign(new Error('Peserta sesi tidak ditemukan.'),{status:404});
    const row=q.rows[0];
    if(row.exam_status!=='active')throw Object.assign(new Error('Ujian sudah ditutup dan sesi tidak dapat dipulihkan.'),{status:409});
    if(!row.started_at||Date.now()>=new Date(row.started_at).getTime()+Number(row.duration_minutes)*60000)
      throw Object.assign(new Error('Sesi tidak dapat dipulihkan setelah tenggat ujian.'),{status:409});
    if(!['in_progress','locked'].includes(row.status))throw Object.assign(new Error('Hanya sesi aktif atau terkunci yang dapat dipulihkan.'),{status:409});
    await client.query("UPDATE exam_sessions SET status='in_progress',violation_count=0,final_score=NULL,finished_at=NULL WHERE id=$1",[row.id]);
    await client.query(`UPDATE violation_events SET review_status='dismissed',reviewed_by=$2,review_reason=$3,reviewed_at=NOW()
      WHERE session_id=$1 AND review_status='pending'`,[row.id,req.session.user.id,reason]);
    await client.query("INSERT INTO violation_events(session_id,code,detail,review_status,reviewed_by,review_reason,reviewed_at) VALUES($1,'admin_reset',$2,'confirmed',$3,$2,NOW())",[row.id,reason,req.session.user.id]);
    await audit(client,req.session.user.id,'exam.session_reset',{examId:Number(req.params.id),sessionId:Number(req.params.sessionId),reason});
    await client.query('COMMIT');
    res.json({id:row.id,status:'in_progress',violationCount:0});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}));
app.post('/api/student/sessions/:sessionId/submit',allow('student'),asyncRoute(async(req,res)=>{
  const before=await checkSessionDeadline(req.params.sessionId,req.session.user.id);
  if(before.status==='locked')return res.status(423).json({status:'locked',score:null,finalScore:null});
  if(before.status==='completed')return res.json(before);
  if(before.status!=='in_progress')return res.status(409).json({error:'Sesi ujian belum dimulai.'});
  if(before.violationReviewRequired)return res.status(423).json({error:'Ujian dijeda sementara menunggu keputusan Admin.',status:'in_progress',violationReviewRequired:true});
  const result=await finishStudentSession(req.params.sessionId,req.session.user.id);
  if(result.violationReviewRequired)return res.status(423).json({error:'Ujian dijeda sementara menunggu keputusan Admin.',...result});
  res.json(result);
}));
app.post('/api/exams/:id/monitor/:sessionId/violation',allow('admin','teacher'),requireExamScope,asyncRoute(async(req,res)=>{const reason=String(req.body.reason||'Pelanggaran dicatat pengawas').trim().slice(0,240);if(!reason)return res.status(400).json({error:'Alasan pelanggaran wajib diisi.'});const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query('UPDATE exam_sessions SET violation_count=violation_count+1,status=CASE WHEN violation_count+1>=$3 THEN \'locked\' ELSE status END,final_score=CASE WHEN violation_count+1>=$3 THEN NULL ELSE final_score END,finished_at=CASE WHEN violation_count+1>=$3 THEN NOW() ELSE finished_at END WHERE id=$1 AND exam_id=$2 AND status=\'in_progress\' RETURNING id,status,violation_count AS "violationCount"',[req.params.sessionId,req.params.id,getViolationThreshold()]);if(!q.rowCount)throw Object.assign(new Error('Peserta tidak ditemukan atau tidak sedang ujian.'),{status:404});await client.query('INSERT INTO violation_events(session_id,code,detail,review_status,reviewed_by,review_reason,reviewed_at) VALUES($1,\'admin_report\',$2,\'confirmed\',$3,$2,NOW())',[req.params.sessionId,reason,req.session.user.id]);await audit(client,req.session.user.id,'exam.violation',{examId:Number(req.params.id),sessionId:Number(req.params.sessionId),reason,count:q.rows[0].violationCount});await client.query('COMMIT');res.json({...q.rows[0],reason});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}));

app.get('/api/results/:examId/:studentId/essays',allow('admin','teacher'),requireResultScope,asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT es.id AS "sessionId",eq.question_id AS "questionId",q.prompt,q.points,r.answer,r.essay_score AS "essayScore"
    FROM exam_sessions es JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id
    LEFT JOIN responses r ON r.session_id=es.id AND r.question_id=q.id
    WHERE es.exam_id=$1 AND es.student_id=$2 AND q.type='essay' AND es.status IN ('completed','locked') ORDER BY eq.position`,[req.params.examId,req.params.studentId]);
  res.json(q.rows);
}));
app.put('/api/results/:examId/:studentId/essays/:questionId',allow('admin','teacher'),requireResultScope,asyncRoute(async(req,res)=>{
  const rawScore=req.body?.score,score=Number(rawScore);
  if(rawScore===null||rawScore===undefined||String(rawScore).trim()===''||!Number.isFinite(score)||score<0||score>100)return res.status(400).json({error:'Nilai essay harus pada skala 0 sampai 100.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const allowed=await client.query(`SELECT es.id AS session_id FROM exam_sessions es
      JOIN exam_questions eq ON eq.session_id=es.id JOIN questions q ON q.id=eq.question_id
      WHERE es.exam_id=$1 AND es.student_id=$2 AND eq.question_id=$3 AND q.type='essay'
        AND es.status IN ('completed','locked') FOR UPDATE OF es`,[req.params.examId,req.params.studentId,req.params.questionId]);
    if(!allowed.rowCount)throw Object.assign(new Error('Jawaban essay tidak ditemukan atau sesi belum selesai.'),{status:404});
    const sessionId=allowed.rows[0].session_id;
    await client.query(`INSERT INTO responses(session_id,question_id,answer,essay_score,graded_by,graded_at)
      VALUES($1,$2,'',$3,$4,NOW()) ON CONFLICT(session_id,question_id)
      DO UPDATE SET essay_score=EXCLUDED.essay_score,graded_by=EXCLUDED.graded_by,graded_at=NOW()`,
      [sessionId,req.params.questionId,score,req.session.user.id]);
    await audit(client,req.session.user.id,'essay.grade',{examId:Number(req.params.examId),studentId:Number(req.params.studentId),questionId:Number(req.params.questionId),score});
    const calc = await calculateAndSaveFinalScore(client, sessionId);
    await client.query('COMMIT');
    res.json({saved:true,essayScore:score,finalScore:calc.finalScore,allEssaysGraded:calc.allEssaysGraded});
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}));
app.put('/api/results/:examId/:studentId/final-score',allow('admin','teacher'),requireResultScope,asyncRoute(async(req,res)=>{
  const rawScore=req.body?.score,score=Number(rawScore);
  if(rawScore===null||rawScore===undefined||String(rawScore).trim()===''||!Number.isFinite(score)||score<0||score>100)return res.status(400).json({error:'Nilai akhir harus pada skala 0 sampai 100.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const allowed=await client.query(`SELECT id FROM exam_sessions
      WHERE exam_id=$1 AND student_id=$2 AND status IN ('completed','locked') FOR UPDATE`,
      [req.params.examId,req.params.studentId]);
    if(!allowed.rowCount)throw Object.assign(new Error('Hasil ujian tidak ditemukan.'),{status:404});
    await client.query('UPDATE exam_sessions SET final_score=$1 WHERE id=$2',[score,allowed.rows[0].id]);
    await audit(client,req.session.user.id,'exam.final_score',{examId:Number(req.params.examId),studentId:Number(req.params.studentId),score});
    await client.query('COMMIT');
    res.json({saved:true,finalScore:score});
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}));
app.get('/api/results',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const q=await pool.query(`SELECT e.id AS "examId",es.student_id AS "studentId",e.title,e.class_name AS "className",
      u.class_name AS "studentClassName",u.full_name AS "studentName",u.username,es.status,es.final_score AS "finalScore",es.finished_at AS "finishedAt",
      es.violation_count AS "violationCount",
      COALESCE(overview.mc_correct_count,0)::int AS "mcCorrectCount",
      COALESCE(overview.mc_wrong_count,0)::int AS "mcWrongCount",
      COALESCE(overview.mc_unanswered_count,0)::int AS "mcUnansweredCount",
      COALESCE(overview.mc_points_earned,0)::numeric AS "mcPointsEarned",
      COALESCE(overview.mc_points_total,0)::numeric AS "mcPointsTotal",
      COALESCE(overview.essay_count,0)::int AS "essayCount",
      COALESCE(overview.essay_pending,FALSE) AS "essayPending",
      COALESCE(violation_audit.pending_count,0)::int AS "pendingViolationCount",
      COALESCE(violation_audit.summary,'') AS "violationSummary"
    FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN question_banks b ON b.id=e.bank_id JOIN users u ON u.id=es.student_id
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE q.type='mc' AND NULLIF(BTRIM(COALESCE(r.answer,'')),'') IS NOT NULL AND UPPER(BTRIM(COALESCE(r.answer,'')))=UPPER(BTRIM(COALESCE(eq.answer_key,q.answer_key)))) AS mc_correct_count,
        count(*) FILTER (WHERE q.type='mc' AND NULLIF(BTRIM(COALESCE(r.answer,'')),'') IS NOT NULL AND UPPER(BTRIM(COALESCE(r.answer,'')))<>UPPER(BTRIM(COALESCE(eq.answer_key,q.answer_key)))) AS mc_wrong_count,
        count(*) FILTER (WHERE q.type='mc' AND NULLIF(BTRIM(COALESCE(r.answer,'')),'') IS NULL) AS mc_unanswered_count,
        COALESCE(SUM(q.points) FILTER (WHERE q.type='mc' AND NULLIF(BTRIM(COALESCE(r.answer,'')),'') IS NOT NULL AND UPPER(BTRIM(COALESCE(r.answer,'')))=UPPER(BTRIM(COALESCE(eq.answer_key,q.answer_key)))),0) AS mc_points_earned,
        COALESCE(SUM(q.points) FILTER (WHERE q.type='mc'),0) AS mc_points_total,
        count(*) FILTER (WHERE q.type='essay') AS essay_count,
        COALESCE(BOOL_OR(q.type='essay' AND r.essay_score IS NULL),FALSE) AS essay_pending
      FROM exam_questions eq JOIN questions q ON q.id=eq.question_id
      LEFT JOIN responses r ON r.session_id=eq.session_id AND r.question_id=q.id
      WHERE eq.session_id=es.id
    ) overview ON TRUE
    LEFT JOIN LATERAL (
      SELECT string_agg(concat_ws(' | ',to_char(ve.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD HH24:MI:SS'),ve.code,ve.review_status,NULLIF(ve.detail,''),NULLIF(ve.review_reason,''),to_char(ve.reviewed_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD HH24:MI:SS'),reviewer.full_name),chr(10) ORDER BY ve.created_at,ve.id) AS summary,
        count(*) FILTER(WHERE ve.review_status='pending' AND ve.code<>'admin_reset') AS pending_count
      FROM violation_events ve LEFT JOIN users reviewer ON reviewer.id=ve.reviewed_by WHERE ve.session_id=es.id
    ) violation_audit ON TRUE
    WHERE es.status IN ('completed','locked') AND ($1='admin' OR EXISTS(
      SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))
    )) ORDER BY e.created_at DESC,u.full_name`,[req.session.user.role,req.session.user.id]);
  res.json(q.rows);
}));
app.get('/api/dashboard',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const params=[req.session.user.role,req.session.user.id];
  const [students,banks,exams,results]=await Promise.all([
    pool.query("SELECT count(*)::int n FROM users u WHERE u.role='student' AND u.active AND ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.class_name=u.class_name))",params),
    pool.query("SELECT count(*)::int n FROM question_banks b WHERE ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND left(ta.class_name,length(b.grade))=b.grade AND (length(ta.class_name)=length(b.grade) OR substring(ta.class_name,length(b.grade)+1,1) IN (' ','-'))))",params),
    pool.query("SELECT count(*)::int n FROM exams e JOIN question_banks b ON b.id=e.bank_id WHERE e.status IN ('active','scheduled') AND ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))))",params),
    pool.query("SELECT round(avg(es.final_score),1) n FROM exam_sessions es JOIN exams e ON e.id=es.exam_id JOIN question_banks b ON b.id=e.bank_id WHERE es.final_score IS NOT NULL AND ($1='admin' OR EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND (ta.class_name=e.class_name OR ta.class_name=ANY(regexp_split_to_array(e.class_name,'\\s*,\\s*')))))",params),
  ]);
  const tenant=tenantRuntime?.context.getCurrent()?.tenant;
  const quota=tenant?{
    maxStudents:tenant.maxStudents,
    maxTeachers:tenant.maxTeachers,
    status:tenant.status,
    trialEndsAt:tenant.trialEndsAt,
    serviceEndsAt:tenant.serviceEndsAt,
  }:null;
  res.json({students:students.rows[0].n,banks:banks.rows[0].n,exams:exams.rows[0].n,average:results.rows[0].n||0,...(quota?{quota}:{})});
}));
app.use(createErrorHandler());

await mkdir(mediaDirectory,{recursive:true});
if(controlPlaneRuntime)await controlPlaneRuntime.verifyControlPlane();
if(!tenantRuntime){
  await initializeDatabase();
  if(isLegacyBootstrapSeedEnabled()){
    await removeOrphanMediaFiles();
    await seed();
    await rotateDemoSeedAccounts();
  }
  const settingsAtStartup=await pool.query('SELECT violation_threshold FROM school_settings WHERE id=1');
  defaultViolationThreshold=Number(settingsAtStartup.rows[0]?.violation_threshold||2);
}
// Serve static files from the React build (for Render single-container deployment)
app.use(express.static(path.resolve(__dirname, '../dist')));

// Catch-all handler: serve index.html for SPA routes only (not /api/ or /assets/)
app.use((req, res, next) => {
  // Jangan tangani request API atau static assets
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

const server = app.listen(port,'0.0.0.0',()=>console.log(`IMBS CBT API listening on ${port}`));
const poolSampler = observability.createPoolSampler({ pool:controlPool });
poolSampler.start();

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  poolSampler.stop();
  server.close(() => {
    Promise.all([pool.end(),controlPlaneRuntime?.close()]).catch(()=>{});
  });
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
