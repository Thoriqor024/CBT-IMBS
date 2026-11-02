import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const raw = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const pool = new pg.Pool({
  host: env.CONTROL_DB_HOST || env.DB_HOST || 'localhost',
  port: Number(env.CONTROL_DB_PORT || env.DB_PORT || 5433),
  database: env.CONTROL_DB_NAME || 'cbt_control_plane',
  user: env.CONTROL_DB_USER || 'cbt_control_app',
  password: env.CONTROL_DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

const password = env.SEED_PLATFORM_OWNER_PASSWORD;
if (!password || password.length < 24) {
  throw new Error('SEED_PLATFORM_OWNER_PASSWORD missing or too short');
}

const hash = await bcrypt.hash(password, 12);
const result = await pool.query(
  `UPDATE control_plane.platform_users
   SET password_hash = $1, full_name = $2
   WHERE lower(email) = lower($3) RETURNING id, email, full_name`,
  [hash, 'Platform Owner', 'thoriqor@gmail.com'],
);

console.log('UPDATED_ROWS=' + result.rowCount);
console.log('OWNER=' + JSON.stringify(result.rows[0] || null));
await pool.end();
