import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapPlatformOwner } from './platformOwnerBootstrap.js';

function createPool({ owner = { id: 7, role: 'platform_owner', active: true, password_hash: 'demo-hash' } } = {}) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, role')) return { rows: owner ? [owner] : [] };
      if (sql.startsWith('INSERT INTO users')) return { rows: [{ id: 8 }] };
      return { rows: [] };
    },
    release() {},
  };
  return { calls, connect: async () => client };
}

test('bootstrap replaces only the built-in demo owner password and audits without its value', async () => {
  const pool = createPool();
  const result = await bootstrapPlatformOwner({
    controlPool: pool,
    password: 'a'.repeat(32),
    comparePassword: async (password, hash) => password === 'platform-owner-local' && hash === 'demo-hash',
    hashPassword: async () => 'new-password-hash',
  });

  assert.deepEqual(result, { action: 'platform.owner.password.rotate' });
  assert.ok(pool.calls.some(call => call.sql.startsWith('UPDATE users') && call.params[0] === 'new-password-hash'));
  assert.ok(pool.calls.some(call => call.sql.startsWith('INSERT INTO audit_logs') && !call.params.join(' ').includes('a'.repeat(32))));
  assert.equal(pool.calls.at(-1).sql, 'COMMIT');
});

test('bootstrap rejects weak passwords before opening a database connection', async () => {
  let connected = false;
  await assert.rejects(
    bootstrapPlatformOwner({ controlPool: { connect: async () => { connected = true; } }, password: 'short' }),
    /minimal 24 karakter/,
  );
  assert.equal(connected, false);
});

test('bootstrap refuses to rotate an owner that no longer uses the demo password', async () => {
  const pool = createPool({ owner: { id: 7, role: 'platform_owner', active: true, password_hash: 'managed-hash' } });

  await assert.rejects(
    bootstrapPlatformOwner({
      controlPool: pool,
      password: 'a'.repeat(32),
      comparePassword: async () => false,
      hashPassword: async () => 'unused',
    }),
    /password non-demo/,
  );
  assert.ok(pool.calls.some(call => call.sql === 'ROLLBACK'));
  assert.equal(pool.calls.some(call => call.sql.startsWith('UPDATE users')), false);
});

test('bootstrap creates and audits an owner when none exists', async () => {
  const pool = createPool({ owner: null });
  const result = await bootstrapPlatformOwner({
    controlPool: pool,
    password: 'b'.repeat(32),
    hashPassword: async () => 'new-password-hash',
  });

  assert.deepEqual(result, { action: 'platform.owner.bootstrap' });
  assert.ok(pool.calls.some(call => call.sql.startsWith('INSERT INTO users')));
  assert.ok(pool.calls.some(call => call.sql.startsWith('INSERT INTO audit_logs')));
});