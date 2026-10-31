import { pool } from './db.js';
import { bootstrapPlatformOwner } from './platformOwnerBootstrap.js';

function promptSecret(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Jalankan bootstrap melalui terminal interaktif dengan TTY.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const input = process.stdin;
    const finish = (error) => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = chunk => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') return finish(new Error('Bootstrap dibatalkan.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (character >= ' ' && value.length < 1024) {
          value += character;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(label);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

try {
  const password = await promptSecret('Password owner baru (minimal 24 karakter): ');
  const confirmation = await promptSecret('Ulangi password owner: ');
  if (password !== confirmation) throw new Error('Konfirmasi password tidak cocok.');
  const result = await bootstrapPlatformOwner({ controlPool: pool, password });
  console.log(`Bootstrap selesai: ${result.action}. Secret tidak dicatat.`);
} catch (error) {
  console.error(`Bootstrap gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}