import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantRegistry } from './tenantRegistry.js';

test('tenant registry resolves normalized codes with parameterized queries', async () => {
  const calls = [];
  const tenant = { id: 'tenant-1', code: 'sekolah-a', status: 'active', databaseName: 'cbt_sekolah_a' };
  const registry = createTenantRegistry({
    pool: {
      async query(text, values) {
        calls.push({ text, values });
        return { rows: [tenant] };
      },
    },
  });

  assert.equal(await registry.findByCode(' Sekolah-A '), tenant);
  assert.deepEqual(calls[0].values, ['sekolah-a']);
  assert.match(calls[0].text, /lower\(school_code\)=\$1/);
});

test('invalid school code is rejected before querying the registry', async () => {
  let queries = 0;
  const registry = createTenantRegistry({
    pool: { async query() { queries += 1; return { rows: [] }; } },
  });

  await assert.rejects(registry.findByCode("a' OR TRUE --"), { code: 'INVALID_TENANT_CODE' });
  assert.equal(queries, 0);
});

test('tenant ID lookup is parameterized and returns null when absent', async () => {
  const calls = [];
  const registry = createTenantRegistry({
    pool: {
      async query(text, values) {
        calls.push({ text, values });
        return { rows: [] };
      },
    },
  });

  assert.equal(await registry.findById('tenant-id-from-session'), null);
  assert.deepEqual(calls[0].values, ['tenant-id-from-session']);
  assert.match(calls[0].text, /WHERE id=\$1/);
});