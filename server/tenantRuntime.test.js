import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantRuntime, validateTenantRuntimeEnvironment } from './tenantRuntime.js';

const validEnv = {
  CONTROL_DB_NAME: 'cbt_platform',
  CONTROL_DB_USER: 'cbt_platform_app',
  CONTROL_DB_PASSWORD: 'control-password',
  DB_HOST: 'postgres.internal',
  DB_NAME: 'cbt_imbs',
  DB_USER: 'legacy_app',
  DB_PASSWORD: 'legacy-password',
};

test('tenant runtime requires a separate control-plane database name', () => {
  assert.throws(() => createTenantRuntime({ env: { ...validEnv, CONTROL_DB_NAME: '' } }), /CONTROL_DB_NAME is required/);
  assert.throws(() => createTenantRuntime({ env: { ...validEnv, CONTROL_DB_NAME: 'cbt_imbs' } }), /must be separate/);
});

test('tenant runtime requires a secret-provider adapter instead of plaintext env credentials', () => {
  assert.throws(() => createTenantRuntime({ env: validEnv, PoolClass: class {} }), /secret provider must be configured/);
});

test('tenant runtime validation fails closed when tenant mode is enabled without required control-plane settings', () => {
  const validation = validateTenantRuntimeEnvironment({ TENANCY_ENABLED: 'true' });
  assert.equal(validation.enabled, true);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /CONTROL_DB_NAME is required/);
  assert.match(validation.errors.join(' '), /TENANT_MASTER_KEY_FILE is required/);
});

test('tenant runtime builds bounded control and tenant pool configurations', async () => {
  const createdPools = [];
  class FakePool {
    constructor(config) { this.config = config; createdPools.push(this); }
    async query(sql) {
      if (sql.includes('FROM control_plane.tenants')) {
        return { rows: [{
          id: 'tenant-1',
          code: 'school-a',
          status: 'active',
          databaseName: 'cbt_school_a',
          databaseSecretRef: 'tenant/school-a',
          serviceEndsAt: '2099-01-01T00:00:00.000Z',
        }] };
      }
      return { rows: [] };
    }
    async end() {}
  }
  const runtime = createTenantRuntime({
    env: validEnv,
    PoolClass: FakePool,
    resolveSecret: async secretRef => secretRef === 'tenant/school-a'
      ? { user: 'school_a_app', password: 'school-password' }
      : null,
  });

  assert.equal(runtime.controlPool.config.database, 'cbt_platform');
  assert.equal(runtime.controlPool.config.max, 5);
  const resolved = await runtime.router.resolve('school-a');
  assert.equal(resolved.pool.config.database, 'cbt_school_a');
  assert.equal(resolved.pool.config.user, 'school_a_app');
  assert.equal(resolved.pool.config.max, 4);
  assert.equal(createdPools.length, 2);
  await runtime.close();
});