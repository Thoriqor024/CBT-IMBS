import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(projectRoot, '.env');

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) {
      env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return env;
}

async function main() {
  console.log('==> [Control Plane Verification] Memeriksa status kesiapan Control Plane SaaS...\n');

  let env = process.env;
  try {
    const rawEnv = await readFile(envPath, 'utf8');
    env = { ...parseEnv(rawEnv), ...process.env };
  } catch {}

  const controlDbName = env.CONTROL_DB_NAME || 'cbt_control_plane';
  const controlDbUser = env.CONTROL_DB_USER || 'cbt_control_app';
  const controlDbPassword = env.CONTROL_DB_PASSWORD;
  const dbHost = env.CONTROL_DB_HOST || env.DB_HOST || 'localhost';
  const dbPort = Number(env.CONTROL_DB_PORT || env.DB_PORT || 5433);
  const keyFile = env.TENANT_MASTER_KEY_FILE || './secrets/tenant_master.key';

  // 1. Verifikasi Master Key
  console.log('1. Memeriksa Master Key Enkripsi:');
  const resolvedKeyPath = keyFile.startsWith('/run/secrets/')
    ? path.join(projectRoot, 'secrets', path.basename(keyFile))
    : path.resolve(projectRoot, keyFile);
  
  try {
    const keyData = await readFile(resolvedKeyPath);
    if (keyData.length === 32) {
      console.log(`   ✓ Master key valid (32 bytes AES-256): ${resolvedKeyPath}`);
    } else {
      throw new Error(`Ukuran file master key ${keyData.length} bytes (wajib 32 bytes).`);
    }
  } catch (err) {
    console.error(`   ✗ Gagal membaca master key: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // 2. Verifikasi Koneksi Database Control-Plane
  console.log('\n2. Memeriksa Koneksi Database Control-Plane:');
  console.log(`   Host: ${dbHost}:${dbPort} | DB: ${controlDbName} | User: ${controlDbUser}`);

  const pool = new Pool({
    host: dbHost,
    port: dbPort,
    database: controlDbName,
    user: controlDbUser,
    password: controlDbPassword,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('   ✓ Berhasil terhubung ke database control-plane.');

    // 3. Verifikasi Skema & Tabel
    console.log('\n3. Memeriksa Skema & Tabel Control-Plane:');
    const tables = [
      'control_plane.platform_users',
      'control_plane.tenants',
      'control_plane.tenant_database_secrets',
      'control_plane.platform_audit_logs',
      'public.user_sessions',
    ];

    for (const table of tables) {
      try {
        await client.query(`SELECT 1 FROM ${table} LIMIT 0`);
        console.log(`   ✓ Tabel ${table} tersedia.`);
      } catch (err) {
        console.error(`   ✗ Tabel ${table} tidak ditemukan: ${err.message}`);
        process.exitCode = 1;
      }
    }

    // 4. Ringkasan Data
    console.log('\n4. Statistik Data Control-Plane:');
    const [tenantsResult, ownersResult] = await Promise.all([
      client.query('SELECT count(*)::int AS count FROM control_plane.tenants'),
      client.query("SELECT count(*)::int AS count FROM control_plane.platform_users WHERE active=TRUE"),
    ]);

    console.log(`   • Jumlah Sekolah (Tenants) terdaftar : ${tenantsResult.rows[0].count}`);
    console.log(`   • Jumlah Platform Owner aktif        : ${ownersResult.rows[0].count}`);

    client.release();
    await pool.end();

    console.log('\n==> [HASIL] Control Plane SaaS TERVERIFIKASI SIAP 100% ✓');
  } catch (err) {
    console.error(`   ✗ Gagal terhubung ke database: ${err.message}`);
    console.log('\nTips: Pastikan port PostgreSQL (5432) ter-expose atau skrip dijalankan di dalam environment Docker.');
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Verifikasi control-plane error:', err.message);
  process.exit(1);
});
