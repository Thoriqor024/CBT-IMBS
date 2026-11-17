import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantRuntime } from './tenantRuntime.js';
import { LATEST_DATABASE_MIGRATION_VERSION } from './db.js';

function createHarness(tenants) {
  const controlQueries = [];
  const pools = [];
  const resolvedSecrets = [];
  class FakePool {
    constructor(config) {
      this.config = config;
      this.ended = false;
      pools.push(this);
    }
    async query(sql, params = []) {
      controlQueries.push({ sql, params });
      if (sql.includes('FROM control_plane.tenants')) return { rows: tenants, rowCount: tenants.length };
      return { rows: [], rowCount: 1 };
    }
    async end() {
      this.ended = true;
    }
  }
  const runtime = createTenantRuntime({
    env: {
      TENANCY_ENABLED: 'true',
      DB_HOST: 'db.internal',
      DB_PORT: '5432',
      DB_NAME: 'cbt_app',
      CONTROL_DB_NAME: 'cbt_control',
      CONTROL_DB_USER: 'control_user',
      CONTROL_DB_PASSWORD: 'control_password',
      TENANT_MASTER_KEY_FILE: '/tmp/unused-tenant-master.key',
      TENANT_MAX_POOLS: '5',
      TENANT_POOL_MAX: '2',
      TENANT_POOL_TOTAL_MAX: '10',
    },
    PoolClass: FakePool,
    resolveSecret: async secretRef => {
      resolvedSecrets.push(secretRef);
      return { user: 'tenant_migration_user', password: 'tenant_migration_password' };
    },
  });
  return { runtime, controlQueries, pools, resolvedSecrets };
}

test('upgrades existing tenant databases with the tenant migration credentials', async () => {
  const { runtime, controlQueries, pools, resolvedSecrets } = createHarness([
    { id: 'tenant-a', databaseName: 'cbt_t_a', databaseSecretRef: 'tenant/tenant-a/application' },
  ]);
  const migratedDatabases = [];

  const results = await runtime.migrateExistingTenants(async tenantPool => {
    migratedDatabases.push({ database: tenantPool.config.database, user: tenantPool.config.user });
  });

  assert.deepEqual(resolvedSecrets, ['tenant/tenant-a/migration']);
  assert.deepEqual(migratedDatabases, [{ database: 'cbt_t_a', user: 'tenant_migration_user' }]);
  const update = controlQueries.find(query => query.sql.includes('UPDATE control_plane.tenants SET schema_version'));
  assert.deepEqual(update.params, ['tenant-a', LATEST_DATABASE_MIGRATION_VERSION]);
  assert.deepEqual(results, [{ tenantId: 'tenant-a', ok: true, schemaVersion: LATEST_DATABASE_MIGRATION_VERSION }]);

  const tenantPool = pools.find(pool => pool.config.database === 'cbt_t_a');
  assert.equal(tenantPool.ended, true);
  assert.equal(tenantPool.config.password, 'tenant_migration_password');

  const selection = controlQueries.find(query => query.sql.includes('FROM control_plane.tenants'));
  assert.match(selection.sql, /schema_version < \$1/);
  assert.deepEqual(selection.params, [LATEST_DATABASE_MIGRATION_VERSION]);
  await runtime.close();
});

test('continues upgrading other tenants but reports and logs a failed tenant', async () => {
  const { runtime, controlQueries, pools } = createHarness([
    { id: 'tenant-broken', databaseName: 'cbt_t_broken', databaseSecretRef: 'tenant/tenant-broken/application' },
    { id: 'tenant-ok', databaseName: 'cbt_t_ok', databaseSecretRef: 'tenant/tenant-ok/application' },
  ]);
  const errors = [];
  const attempted = [];

  const results = await runtime.migrateExistingTenants(async tenantPool => {
    attempted.push(tenantPool.config.database);
    if (tenantPool.config.database === 'cbt_t_broken') throw new Error('tenant database unavailable');
  }, { logger: { error: message => errors.push(message) } });

  assert.deepEqual(attempted, ['cbt_t_broken', 'cbt_t_ok']);
  assert.deepEqual(results.map(result => [result.tenantId, result.ok]), [
    ['tenant-broken', false],
    ['tenant-ok', true],
  ]);
  assert.match(results[0].error, /tenant database unavailable/);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /tenant-broken/);

  const updates = controlQueries.filter(query => query.sql.includes('UPDATE control_plane.tenants SET schema_version'));
  assert.deepEqual(updates.map(query => query.params[0]), ['tenant-ok']);
  assert.equal(pools.find(pool => pool.config.database === 'cbt_t_broken').ended, true);
  await runtime.close();
});
