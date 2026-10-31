import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantSecretStore } from './tenantSecrets.js';

function createStore() {
  const rows = new Map();
  const pool = {
    async query(_sql, values) {
      if (_sql.startsWith('INSERT')) {
        rows.set(values[0], {
          databaseUser: values[1],
          encryptedPassword: values[2],
          nonce: values[3],
          authTag: values[4],
          keyVersion: values[5],
        });
        return { rowCount: 1, rows: [] };
      }
      const row = rows.get(values[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
    },
  };
  return { store: createTenantSecretStore({ pool, masterKey: Buffer.alloc(32, 7) }), rows };
}

test('tenant database credential is encrypted at rest and resolves to its original value', async () => {
  const { store, rows } = createStore();
  const password = 'long-random-password-value-for-tenant-credential-01';
  await store.store('tenant/school-a', 'school_a_app', password);

  const stored = rows.get('tenant/school-a');
  assert.notEqual(stored.encryptedPassword.toString('utf8'), password);
  assert.equal((await store.resolve('tenant/school-a')).password, password);
  assert.equal((await store.resolve('tenant/school-a')).user, 'school_a_app');
});

test('secret references are authenticated and cannot be swapped', async () => {
  const { store, rows } = createStore();
  await store.store('tenant/school-a', 'school_a_app', 'long-random-password-value-for-tenant-credential-01');
  rows.set('tenant/school-b', rows.get('tenant/school-a'));

  await assert.rejects(store.resolve('tenant/school-b'));
});

test('secret store rejects weak keys, unsafe references, users, and passwords', async () => {
  assert.throws(() => createTenantSecretStore({ pool: { query() {} }, masterKey: Buffer.alloc(16) }), /exactly 32 bytes/);
  const { store } = createStore();
  await assert.rejects(store.store('bad ref', 'safe_user', 'long-random-password-value-for-tenant-credential-01'), /reference is invalid/);
  await assert.rejects(store.store('tenant/a', 'bad-user', 'long-random-password-value-for-tenant-credential-01'), /username is invalid/);
  await assert.rejects(store.store('tenant/a', 'safe_user', 'short'), /32 to 1024 characters/);
});