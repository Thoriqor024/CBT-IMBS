import test from 'node:test';
import assert from 'node:assert/strict';
import { TenantDatabaseRouter, normalizeTenantCode } from './tenantDatabaseRouter.js';

function createHarness(tenants, options = {}) {
  const calls = { lookups: [], secrets: [], pools: [] };
  const router = new TenantDatabaseRouter({
    registry: {
      async findByCode(code) {
        calls.lookups.push(code);
        return tenants[code] || null;
      },
      async findById(id) {
        calls.lookupIds = calls.lookupIds || [];
        calls.lookupIds.push(id);
        return Object.values(tenants).find(record => record.id === id) || null;
      },
    },
    resolveSecret: async secretRef => {
      calls.secrets.push(secretRef);
      return { user: 'tenant_app', password: `secret:${secretRef}` };
    },
    createPool: config => {
      const pool = { config, end: async () => {} };
      calls.pools.push(pool);
      return pool;
    },
    poolConfig: { host: 'postgres.internal', max: 70 },
    maxPools: options.maxPools ?? 10,
    maxConnectionsPerPool: options.maxConnectionsPerPool ?? 5,
    maxTotalTenantConnections: options.maxTotalTenantConnections ?? 50,
    now: () => new Date('2026-10-12T00:00:00.000Z'),
  });
  return { router, calls };
}

const tenant = (overrides = {}) => ({
  id: 'tenant-1',
  code: 'sekolah-a',
  status: 'active',
  databaseName: 'cbt_sekolah_a',
  databaseSecretRef: 'tenant/sekolah-a/db',
  serviceEndsAt: '2099-01-01T00:00:00.000Z',
  ...overrides,
});

test('tenant codes are normalized and constrained to a safe public format', () => {
  assert.equal(normalizeTenantCode('  Sekolah-A  '), 'sekolah-a');
  assert.throws(() => normalizeTenantCode('a'), { code: 'INVALID_TENANT_CODE' });
  assert.throws(() => normalizeTenantCode('school;drop database'), { code: 'INVALID_TENANT_CODE' });
});

test('resolves database only from an active registry record and secret reference', async () => {
  const { router, calls } = createHarness({ 'sekolah-a': tenant() });
  const result = await router.resolve('SEKOLAH-A');

  assert.equal(result.tenant.id, 'tenant-1');
  assert.equal(result.pool.config.database, 'cbt_sekolah_a');
  assert.equal(result.pool.config.user, 'tenant_app');
  assert.equal(result.pool.config.password, 'secret:tenant/sekolah-a/db');
  assert.equal(result.pool.config.host, 'postgres.internal');
  assert.equal(result.pool.config.max, 5);
  assert.deepEqual(calls.lookups, ['sekolah-a']);
  assert.deepEqual(calls.secrets, ['tenant/sekolah-a/db']);
});

test('subsequent requests resolve tenant from the server-side session ID', async () => {
  const { router, calls } = createHarness({ 'sekolah-a': tenant() });
  const result = await router.resolveById('tenant-1');

  assert.equal(result.tenant.code, 'sekolah-a');
  assert.equal(calls.pools.length, 1);
  assert.deepEqual(calls.lookupIds, ['tenant-1']);
  await assert.rejects(router.resolveById(''), { status: 400, code: 'INVALID_TENANT_ID' });
});

test('unknown or inactive tenant never creates a tenant connection', async () => {
  const { router, calls } = createHarness({
    'sekolah-tutup': tenant({ id: 'tenant-closed', code: 'sekolah-tutup', status: 'suspended' }),
  });

  await assert.rejects(router.resolve('tidak-ada'), { status: 404, code: 'TENANT_NOT_FOUND' });
  await assert.rejects(router.resolve('sekolah-tutup'), { status: 403, code: 'TENANT_INACTIVE' });
  assert.equal(calls.secrets.length, 0);
  assert.equal(calls.pools.length, 0);
});

test('expired service and trial without an expiry fail closed', async () => {
  const { router, calls } = createHarness({
    'sekolah-lunas': tenant({ serviceEndsAt: '2026-10-11T23:59:59.000Z' }),
    'sekolah-trial': tenant({ id: 'tenant-trial', code: 'sekolah-trial', status: 'trial', serviceEndsAt: null }),
  });

  await assert.rejects(router.resolve('sekolah-lunas'), { status: 403, code: 'TENANT_SERVICE_EXPIRED' });
  await assert.rejects(router.resolve('sekolah-trial'), { status: 403, code: 'TENANT_SERVICE_UNCONFIGURED' });
  assert.equal(calls.pools.length, 0);
});

test('registry records cannot inject a database identifier', async () => {
  const { router, calls } = createHarness({
    'sekolah-a': tenant({ databaseName: 'cbt; DROP DATABASE cbt_imbs' }),
  });

  await assert.rejects(router.resolve('sekolah-a'), { status: 503, code: 'TENANT_CONFIGURATION_INVALID' });
  assert.equal(calls.secrets.length, 0);
  assert.equal(calls.pools.length, 0);
});

test('connection pools are reused and bounded by configured tenant capacity', async () => {
  const { router, calls } = createHarness({
    'sekolah-a': tenant(),
    'sekolah-b': tenant({ id: 'tenant-2', code: 'sekolah-b', databaseName: 'cbt_sekolah_b' }),
  }, { maxPools: 1 });

  const first = await router.resolve('sekolah-a');
  const repeated = await router.resolve('sekolah-a');
  assert.equal(first.pool, repeated.pool);
  assert.equal(calls.pools.length, 1);
  await assert.rejects(router.resolve('sekolah-b'), { status: 503, code: 'TENANT_POOL_CAPACITY' });
  await router.close();
});

test('per-pool max respects the global tenant connection budget', async () => {
  const { router } = createHarness({ 'sekolah-a': tenant() }, {
    maxPools: 10,
    maxConnectionsPerPool: 8,
    maxTotalTenantConnections: 30,
  });

  const { pool } = await router.resolve('sekolah-a');
  assert.equal(pool.config.max, 3);
  await router.close();
});

test('concurrent resolution creates only one pool per tenant', async () => {
  let creations = 0;
  const { router } = createHarness({ 'sekolah-a': tenant() });
  const resolvingRouter = new TenantDatabaseRouter({
    registry: { findByCode: async () => tenant() },
    resolveSecret: async () => ({ user: 'tenant_app', password: 'secret' }),
    createPool: async () => {
      creations += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return { end: async () => {} };
    },
    maxPools: 2,
  });

  const [first, second] = await Promise.all([
    resolvingRouter.resolve('sekolah-a'),
    resolvingRouter.resolve('sekolah-a'),
  ]);
  assert.equal(first.pool, second.pool);
  assert.equal(creations, 1);
  await resolvingRouter.close();
  await router.close();
});