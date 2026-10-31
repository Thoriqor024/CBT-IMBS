import test from 'node:test';
import assert from 'node:assert/strict';
import { createControlPlaneRuntime, validateControlPlaneEnvironment } from './controlPlaneRuntime.js';

const validEnv = {
  CONTROL_DB_NAME: 'cbt_control_plane',
  CONTROL_DB_USER: 'cbt_control_app',
  CONTROL_DB_PASSWORD: 'control-plane-password',
  TENANT_MASTER_KEY_FILE: 'local-master-key.bin',
  DB_HOST: 'db',
  DB_PORT: '5432',
  DB_NAME: 'cbt_imbs',
  DB_USER: 'cbt',
  DB_PASSWORD: 'legacy-password',
};

test('control-plane runtime stays optional when no control-plane settings are configured', () => {
  assert.deepEqual(validateControlPlaneEnvironment({}), { enabled: false, valid: true, errors: [] });
  assert.equal(createControlPlaneRuntime({ env: {}, PoolClass: class { constructor() { throw new Error('unexpected pool'); } } }), null);
});

test('control-plane runtime rejects partial configuration before opening a pool', () => {
  let opened = false;
  class FakePool { constructor() { opened = true; } }

  const validation = validateControlPlaneEnvironment({ CONTROL_DB_NAME: 'cbt_control_plane' });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /CONTROL_DB_USER is required/);
  assert.throws(() => createControlPlaneRuntime({ env: { CONTROL_DB_NAME: 'cbt_control_plane' }, PoolClass: FakePool }), /CONTROL_DB_USER is required/);
  assert.equal(opened, false);
});

test('control-plane runtime rejects reuse of the school database', () => {
  const validation = validateControlPlaneEnvironment({ ...validEnv, CONTROL_DB_NAME: 'cbt_imbs' });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /separate from the school database/);
});

test('control-plane runtime uses a bounded dedicated pool and encrypted secret store', async () => {
  const pools = [];
  class FakePool {
    constructor(config) { this.config = config; this.calls = []; pools.push(this); }
    async query(sql, params) { this.calls.push({ sql, params }); return { rows: [] }; }
    async end() { this.ended = true; }
  }

  const runtime = createControlPlaneRuntime({ env: validEnv, PoolClass: FakePool, masterKey: Buffer.alloc(32, 7) });
  assert.equal(pools[0].config.database, 'cbt_control_plane');
  assert.equal(pools[0].config.user, 'cbt_control_app');
  assert.equal(pools[0].config.max, 5);

  await runtime.secretStore.store('tenant/example/application', 'cbt_example_app', 'a'.repeat(48));
  const stored = pools[0].calls.at(-1);
  assert.equal(stored.params[2] instanceof Buffer, true);
  assert.notEqual(stored.params[2].toString(), 'a'.repeat(48));
  await runtime.verifyControlPlane();
  await runtime.close();
  assert.equal(pools[0].ended, true);
});