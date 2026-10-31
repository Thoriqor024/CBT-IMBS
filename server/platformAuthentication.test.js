import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapControlPlaneOwner, createPlatformAuthenticator } from './platformAuthentication.js';

test('platform authentication resolves active owner by normalized control-plane email only', async () => {
  const calls = [];
  const authenticator = createPlatformAuthenticator({
    controlPool: {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 'owner-uuid', email: 'owner@example.test', full_name: 'Platform Owner', password_hash: 'hash', active: true }] };
      },
    },
    comparePassword: async (password, hash) => password === 'a-valid-password' && hash === 'hash',
  });

  const user = await authenticator.authenticate({ email: ' Owner@Example.Test ', password: 'a-valid-password' });

  assert.deepEqual(user, {
    id: 'owner-uuid',
    username: 'owner@example.test',
    email: 'owner@example.test',
    name: 'Platform Owner',
    role: 'platform_owner',
    className: null,
  });
  assert.deepEqual(calls[0].params, ['owner@example.test']);
  assert.match(calls[0].sql, /control_plane\.platform_users/);
  assert.doesNotMatch(JSON.stringify(user), /password_hash|a-valid-password/);
});

test('platform authentication rejects inactive, unknown, and invalid credentials', async () => {
  const authenticator = createPlatformAuthenticator({
    controlPool: { query: async () => ({ rows: [{ id: 'owner-uuid', password_hash: 'hash', active: false }] }) },
    comparePassword: async () => true,
  });

  assert.equal(await authenticator.authenticate({ email: 'owner@example.test', password: 'valid-password' }), null);
  await assert.rejects(authenticator.authenticate({ email: 'not-an-email', password: 'valid-password' }));
  await assert.rejects(authenticator.authenticate({ email: 'owner@example.test', password: '' }), /wajib diisi/);
});

test('control-plane owner bootstrap writes a hash and audit without exposing the password', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id FROM control_plane.platform_users')) return { rowCount: 0, rows: [] };
      if (sql.startsWith('INSERT INTO control_plane.platform_users')) {
        return { rowCount: 1, rows: [{ id: 'owner-uuid', email: params[0], full_name: params[1] }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const result = await bootstrapControlPlaneOwner({
    controlPool: { connect: async () => client },
    email: ' Owner@Example.Test ',
    fullName: 'Platform Owner',
    password: 'a'.repeat(32),
    hashPassword: async () => 'bcrypt-hash',
  });

  assert.deepEqual(result, { id: 'owner-uuid', email: 'owner@example.test', name: 'Platform Owner' });
  assert.deepEqual(calls[2].params, ['owner@example.test', 'Platform Owner', 'bcrypt-hash']);
  assert.ok(calls.some(call => call.sql.includes('platform.owner.bootstrap')));
  assert.equal(JSON.stringify(calls).includes('a'.repeat(32)), false);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('control-plane owner bootstrap rejects short or duplicate identities without mutation', async () => {
  let connected = false;
  const controlPool = { connect: async () => { connected = true; } };
  await assert.rejects(bootstrapControlPlaneOwner({
    controlPool,
    email: 'owner@example.test',
    fullName: 'Owner',
    password: 'short',
  }), /minimal 24 karakter/);
  assert.equal(connected, false);

  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith('SELECT id FROM control_plane.platform_users')) return { rowCount: 1, rows: [{ id: 'owner-uuid' }] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  await assert.rejects(bootstrapControlPlaneOwner({
    controlPool: { connect: async () => client },
    email: 'owner@example.test',
    fullName: 'Owner',
    password: 'a'.repeat(32),
  }), /sudah terdaftar/);
  assert.equal(calls.some(sql => sql.startsWith('INSERT INTO control_plane.platform_users')), false);
  assert.equal(calls.at(-1), 'ROLLBACK');
});