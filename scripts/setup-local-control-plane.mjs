import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(projectRoot, '.env');
const secretsDirectory = path.join(projectRoot, 'secrets');
const masterKeyPath = path.join(secretsDirectory, 'tenant_master.key');
const controlDatabase = 'cbt_control_plane';
const controlUser = 'cbt_control_app';

function parseEnvironment(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) entries.set(match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2'));
  }
  return entries;
}

function runDocker(args, input) {
  const candidates = [
    'docker',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'),
  ].filter(Boolean);
  let result;
  for (const executable of candidates) {
    result = spawnSync(executable, args, { input, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    if (result.error?.code !== 'ENOENT') break;
  }
  if (result.error || result.status !== 0) throw new Error('Docker command failed; inspect local Docker/Compose availability.');
  return result.stdout.trim();
}

function quoteSqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function restrictedAcl(target, permission) {
  const user = `${process.env.USERDOMAIN || ''}\\${process.env.USERNAME || ''}`.replace(/^\\/, '');
  const result = spawnSync('icacls.exe', [target, '/inheritance:r', '/grant:r', `${user}:${permission}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error('Could not restrict local secret file permissions.');
}

async function updateEnvironment(text, values) {
  const seen = new Set();
  const lines = text.split(/\r?\n/).map(line => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !(match[1] in values)) return line;
    seen.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });
  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const updated = lines.join(newline).replace(new RegExp(`${newline}*$`), `${newline}`);
  const temporaryPath = `${envPath}.${randomBytes(8).toString('hex')}.tmp`;
  await writeFile(temporaryPath, updated, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporaryPath, envPath);
}

async function main() {
  const envText = await readFile(envPath, 'utf8');
  const env = parseEnvironment(envText);
  if (env.get('TENANCY_ENABLED') !== 'false') throw new Error('Set TENANCY_ENABLED=false before local control-plane setup.');
  for (const key of ['CONTROL_DB_NAME', 'CONTROL_DB_USER', 'CONTROL_DB_PASSWORD', 'TENANT_MASTER_KEY_FILE']) {
    if (env.get(key)) throw new Error(`Refusing to overwrite existing ${key} configuration.`);
  }

  const superuser = runDocker([
    'compose', 'exec', '-T', 'db', 'psql', '-U', 'cbt', '-d', 'postgres', '-At', '-c',
    "SELECT rolsuper FROM pg_roles WHERE rolname=current_user",
  ]);
  if (superuser !== 't') throw new Error('The local cbt database role is not a PostgreSQL superuser; stop for operator review.');

  const existing = runDocker([
    'compose', 'exec', '-T', 'db', 'psql', '-U', 'cbt', '-d', 'postgres', '-At', '-c',
    `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=${quoteSqlLiteral(controlDatabase)})::int || '|' || EXISTS(SELECT 1 FROM pg_roles WHERE rolname=${quoteSqlLiteral(controlUser)})::int`,
  ]);
  if (existing !== '0|0') throw new Error('Control-plane database or role already exists; refusing to reuse it.');

  await mkdir(secretsDirectory, { recursive: true });
  const databasePassword = randomBytes(48).toString('hex');
  const masterKey = randomBytes(32);
  const sessionSecret = randomBytes(48).toString('base64url');
  const sql = `CREATE ROLE ${controlUser} LOGIN PASSWORD ${quoteSqlLiteral(databasePassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE;\nCREATE DATABASE ${controlDatabase} OWNER ${controlUser};\n`;
  runDocker(['compose', 'exec', '-T', 'db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'cbt', '-d', 'postgres'], sql);

  await writeFile(masterKeyPath, masterKey, { flag: 'wx', mode: 0o600 });
  restrictedAcl(secretsDirectory, '(OI)(CI)F');
  restrictedAcl(masterKeyPath, 'R');
  await updateEnvironment(envText, {
    CONTROL_DB_NAME: controlDatabase,
    CONTROL_DB_USER: controlUser,
    CONTROL_DB_PASSWORD: databasePassword,
    TENANT_MASTER_KEY_FILE: '/run/secrets/tenant_master.key',
    SESSION_SECRET: sessionSecret,
    TENANCY_ENABLED: 'false',
    LEGACY_BOOTSTRAP_SEED_ENABLED: 'false',
  });
  restrictedAcl(envPath, 'F');

  console.log('Local control-plane database, dedicated role, master key, and .env configuration created. No credential values were displayed. TENANCY_ENABLED remains false.');
}

main().catch(error => {
  console.error(`Local control-plane setup failed: ${error.message}`);
  process.exitCode = 1;
});