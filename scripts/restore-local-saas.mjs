import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const backupPath = path.resolve(process.argv[2] || '');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const containerName = `cbt-restore-${randomBytes(6).toString('hex')}`;
const restorePassword = randomBytes(32).toString('base64url');
const image = 'postgres:17-alpine';
let pool;
let restorePort;
let restoreDirectory;
let containerStarted = false;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || result.error?.message || '').trim()}`);
  }
  return result.stdout.trim();
}

function docker(args) {
  return run('docker', args);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function validDatabaseName(name) {
  return name === 'cbt_imbs' || name === 'cbt_control_plane' || /^cbt_t_[a-f0-9]{32}$/.test(name);
}

async function hashFile(filePath) {
  const bytes = await readFile(filePath);
  return { length: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase() };
}

async function verifyBackupFiles(manifest) {
  if (manifest.formatVersion !== 1 || !Array.isArray(manifest.files) || !Array.isArray(manifest.databases)) {
    throw new Error('Unsupported or invalid recovery manifest.');
  }
  const rootRelative = path.relative(repoRoot, backupPath);
  const backupIsInsideRepo = rootRelative === ''
    || (!path.isAbsolute(rootRelative) && rootRelative !== '..' && !rootRelative.startsWith(`..${path.sep}`));
  if (backupIsInsideRepo) {
    throw new Error('Recovery folders must be outside the repository.');
  }
  const filePaths = manifest.files.map(entry => String(entry.path || '').replaceAll('\\', '/'));
  const filePathSet = new Set(filePaths);
  if (filePathSet.size !== filePaths.length
    || !filePathSet.has('tenant_master.key')
    || !filePathSet.has(manifest.globals)
    || !manifest.databases.every(database => typeof database.dump === 'string'
      && database.dump === path.posix.basename(database.dump)
      && filePathSet.has(database.dump))) {
    throw new Error('Recovery manifest is missing required files or contains duplicate names.');
  }
  for (const entry of manifest.files) {
    const relativePath = String(entry.path || '').replaceAll('\\', '/');
    if (!relativePath || path.posix.isAbsolute(relativePath) || relativePath.split('/').includes('..')) {
      throw new Error('Recovery manifest contains an unsafe path.');
    }
    const filePath = path.resolve(backupPath, ...relativePath.split('/'));
    const relative = path.relative(backupPath, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Recovery manifest path escaped its folder.');
    const actual = await hashFile(filePath);
    if (actual.length !== Number(entry.length) || actual.sha256 !== String(entry.sha256).toUpperCase()) {
      throw new Error(`Recovery file failed size/hash verification: ${relativePath}`);
    }
  }
  if (!manifest.databases.every(database => validDatabaseName(database.name))) {
    throw new Error('Recovery manifest contains an unexpected database name.');
  }
  const databaseNames = new Set(manifest.databases.map(database => database.name));
  if (!databaseNames.has('cbt_imbs') || !databaseNames.has('cbt_control_plane')) {
    throw new Error('Recovery manifest must include the legacy and control-plane databases.');
  }
  const key = await stat(path.join(backupPath, 'tenant_master.key'));
  if (key.size !== 32) throw new Error('Recovery master key is not exactly 32 bytes.');
}

async function waitForDatabase(port) {
  restorePort = port;
  pool = new Pool({ host: '127.0.0.1', port, user: 'restore_admin', password: restorePassword, database: 'postgres', connectionTimeoutMillis: 1000 });
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
  throw new Error(`Temporary PostgreSQL did not become ready: ${lastError?.message || 'timeout'}`);
}

async function tableCounts(database) {
  const databasePool = new Pool({ host: '127.0.0.1', port: restorePort, user: 'restore_admin', password: restorePassword, database, connectionTimeoutMillis: 1000 });
  const client = await databasePool.connect();
  try {
    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    const counts = {};
    for (const { tablename } of tables.rows) {
      const result = await client.query(`SELECT count(*)::bigint AS count FROM public.${quoteIdentifier(tablename)}`);
      counts[tablename] = String(result.rows[0].count);
    }
    return counts;
  } finally {
    client.release();
    await databasePool.end();
  }
}

async function verifyMedia(manifest) {
  const source = path.join(backupPath, 'question-media');
  restoreDirectory = await mkdtemp(path.join(os.tmpdir(), 'cbt-imbs-media-restore-'));
  const restored = path.join(restoreDirectory, 'question-media');
  await cp(source, restored, { recursive: true, errorOnExist: true });

  const expected = new Map(manifest.files
    .map(entry => ({ ...entry, path: String(entry.path).replaceAll('\\', '/') }))
    .filter(entry => entry.path.startsWith('question-media/'))
    .map(entry => [entry.path.slice('question-media/'.length), entry]));
  const actualFiles = [];
  async function visit(directory, prefix = '') {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, item.name);
      if (item.isDirectory()) await visit(path.join(directory, item.name), relative);
      else if (item.isFile()) actualFiles.push(relative);
      else throw new Error('Restored media contains a non-file entry.');
    }
  }
  await visit(restored);
  if (actualFiles.length !== expected.size) throw new Error('Restored media file count does not match the manifest.');
  for (const relative of actualFiles) {
    const expectedFile = expected.get(relative);
    if (!expectedFile) throw new Error('Restored media has an unlisted file.');
    const actual = await hashFile(path.join(restored, relative));
    if (actual.length !== Number(expectedFile.length) || actual.sha256 !== String(expectedFile.sha256).toUpperCase()) {
      throw new Error(`Restored media failed verification: ${relative}`);
    }
  }
  return actualFiles.length;
}

async function main() {
  if (!process.argv[2]) throw new Error('Usage: node scripts/restore-local-saas.mjs <recovery-folder>');
  const manifestText = await readFile(path.join(backupPath, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText.replace(/^\uFEFF/, ''));
  await verifyBackupFiles(manifest);
  docker(['image', 'inspect', image]);

  docker([
    'run', '--detach', '--rm', '--name', containerName,
    '--publish', '127.0.0.1::5432',
    '--env', 'POSTGRES_USER=restore_admin',
    '--env', `POSTGRES_PASSWORD=${restorePassword}`,
    '--env', 'POSTGRES_DB=postgres',
    image,
  ]);
  containerStarted = true;
  const portBinding = docker(['port', containerName, '5432/tcp']).split(/\r?\n/)[0];
  const port = Number(portBinding?.split(':').at(-1));
  if (!Number.isInteger(port) || port < 1) throw new Error('Could not resolve the isolated restore port.');
  await waitForDatabase(port);

  const globalsPath = path.join(backupPath, manifest.globals);
  docker(['cp', globalsPath, `${containerName}:/tmp/postgres-globals.sql`]);
  docker(['exec', containerName, 'psql', '-U', 'restore_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/postgres-globals.sql']);

  for (const database of manifest.databases) {
    docker(['cp', path.join(backupPath, database.dump), `${containerName}:/tmp/restore.dump`]);
    docker(['exec', containerName, 'pg_restore', '-U', 'restore_admin', '--create', '--exit-on-error', '--dbname=postgres', '/tmp/restore.dump']);

    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname=$1', [database.name]);
    if (!exists.rowCount) throw new Error(`Restored database is missing: ${database.name}`);
    const actualCounts = await tableCounts(database.name);
    const expectedCounts = Object.fromEntries(Object.entries(database.tableCounts || {}).map(([name, count]) => [name, String(count)]));
    if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
      const differences = [...new Set([...Object.keys(actualCounts), ...Object.keys(expectedCounts)])]
        .filter(name => actualCounts[name] !== expectedCounts[name])
        .map(name => ({ table: name, expected: expectedCounts[name] ?? null, actual: actualCounts[name] ?? null }));
      throw new Error(`Restored table counts differ for ${database.name}: ${JSON.stringify(differences)}`);
    }
  }

  const mediaCount = await verifyMedia(manifest);
  console.log(JSON.stringify({
    result: 'PASS',
    databasesRestored: manifest.databases.length,
    tableCountsMatched: true,
    mediaFilesVerified: mediaCount,
    backupFilesVerified: manifest.files.length,
    target: 'isolated temporary PostgreSQL container and OS temp directory',
  }));
}

main()
  .catch(error => {
    console.error(`Restore drill failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end().catch(() => {});
    if (restoreDirectory) await rm(restoreDirectory, { recursive: true, force: true }).catch(() => {});
    if (containerStarted) {
      const result = spawnSync('docker', ['stop', containerName], { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) console.error(`Temporary restore container cleanup needs attention: ${containerName}`);
    }
  });