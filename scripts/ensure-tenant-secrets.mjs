import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secretsDirectory = path.join(projectRoot, 'secrets');
const masterKeyPath = path.join(secretsDirectory, 'tenant_master.key');

async function main() {
  await mkdir(secretsDirectory, { recursive: true });

  let keyExists = false;
  try {
    const stats = await stat(masterKeyPath);
    if (stats.size === 32) {
      keyExists = true;
      console.log('✓ Master key tenant sudah ada dan valid (32 bytes AES-256):', masterKeyPath);
    } else {
      console.warn(`! File master key ada tapi ukurannya ${stats.size} bytes (harus 32 bytes). Mengganti dengan key baru...`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (!keyExists) {
    const newKey = randomBytes(32);
    await writeFile(masterKeyPath, newKey, { mode: 0o600 });
    console.log('✓ Master key tenant baru berhasil dibuat (32 bytes AES-256):', masterKeyPath);
  }
}

main().catch(err => {
  console.error('Gagal memeriksa/membuat tenant master key:', err.message);
  process.exit(1);
});

