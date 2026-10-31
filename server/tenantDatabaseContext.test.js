import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantAwarePool, createTenantDatabaseContext } from './tenantDatabaseContext.js';

function createRouter() {
  const lookups = [];
  const active = { tenant: { id: 'tenant-1', code: 'sekolah-a' }, pool: { name: 'tenant-pool' } };
  return {
    active,
    lookups,
    async resolve(code) {
      lookups.push(['code', code]);
      return active;
    },
    async resolveById(id) {
      lookups.push(['id', id]);
      return active;
    },
  };
}

test('login middleware resolves tenant from school code before entering route handlers', async () => {
  const router = createRouter();
  const context = createTenantDatabaseContext({ router });
  const req = { method: 'POST', path: '/api/auth/login', body: { schoolCode: 'sekolah-a' } };
  let observed;

  await new Promise((resolve, reject) => context.middleware(req, {}, error => {
    if (error) return reject(error);
    observed = context.getCurrent();
    resolve();
  }));

  assert.equal(observed.tenant.id, 'tenant-1');
  assert.equal(observed.pool.name, 'tenant-pool');
  assert.deepEqual(router.lookups, [['code', 'sekolah-a']]);
});

test('login middleware resolves tenant from x-school-code header fallback', async () => {
  const router = createRouter();
  const context = createTenantDatabaseContext({ router });
  const req = { method: 'POST', path: '/api/auth/login', body: {}, headers: { 'x-school-code': 'sekolah-header' } };
  let observed;

  await new Promise((resolve, reject) => context.middleware(req, {}, error => {
    if (error) return reject(error);
    observed = context.getCurrent();
    resolve();
  }));

  assert.equal(observed.tenant.id, 'tenant-1');
  assert.deepEqual(router.lookups, [['code', 'sekolah-header']]);
});

test('authenticated requests resolve tenant only from the server-side session', async () => {
  const router = createRouter();
  const context = createTenantDatabaseContext({ router });
  const req = { method: 'GET', path: '/api/dashboard', session: { user: { tenantId: 'tenant-1' } } };
  let observed;

  await new Promise((resolve, reject) => context.middleware(req, {}, error => {
    if (error) return reject(error);
    observed = context.getCurrent();
    resolve();
  }));

  assert.equal(observed.tenant.id, 'tenant-1');
  assert.deepEqual(router.lookups, [['id', 'tenant-1']]);
});

test('public requests without a tenant do not create tenant context', async () => {
  const router = createRouter();
  const context = createTenantDatabaseContext({ router });
  let observed = 'not-called';

  await new Promise((resolve, reject) => context.middleware({ method: 'GET', path: '/api/health' }, {}, error => {
    if (error) return reject(error);
    observed = context.getCurrent();
    resolve();
  }));

  assert.equal(observed, null);
  assert.deepEqual(router.lookups, []);
});

test('pool proxy dispatches query and connect to request tenant without leaking context', async () => {
  const calls = [];
  const fallbackPool = {
    query: async () => { calls.push('fallback-query'); return 'fallback'; },
    connect: async () => { calls.push('fallback-connect'); return 'fallback-client'; },
    end: async () => { calls.push('fallback-end'); },
  };
  let activeTenantPool = null;
  const tenantPool = {
    query: async () => { calls.push('tenant-query'); return 'tenant'; },
    connect: async () => { calls.push('tenant-connect'); return 'tenant-client'; },
    end: async () => { calls.push('tenant-end'); },
  };
  const proxy = createTenantAwarePool({ fallbackPool, getTenantPool: () => activeTenantPool });

  assert.equal(await proxy.query('SELECT 1'), 'fallback');
  activeTenantPool = tenantPool;
  assert.equal(await proxy.query('SELECT 1'), 'tenant');
  assert.equal(await proxy.connect(), 'tenant-client');
  activeTenantPool = null;
  assert.deepEqual(calls, ['fallback-query', 'tenant-query', 'tenant-connect']);
});

test('request tenant scope fails closed when session tenant does not match the resolved tenant context', async () => {
  const router = createRouter();
  const context = createTenantDatabaseContext({ router });
  const req = {
    method: 'GET',
    path: '/api/dashboard',
    session: { user: { tenantId: 'tenant-2' } },
  };

  await assert.rejects(new Promise((resolve, reject) => {
    context.middleware(req, {}, error => {
      if (error) return reject(error);
      resolve();
    });
  }), /tenant scope/i);
});