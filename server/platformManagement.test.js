import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatformManagement } from './platformManagement.js';

test('platform management lists tenants with a safe default limit and optional status filter', async () => {
  const calls = [];
  const controlPool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ id: 'tenant-1' }] };
    },
  };

  const platform = createPlatformManagement({ controlPool, defaultLimit: 25 });
  const rows = await platform.listTenants({ status: 'active', limit: 10 });

  assert.deepEqual(rows, [{ id: 'tenant-1' }]);
  assert.equal(platform.provisioningReady, false);
  assert.match(calls[0].sql, /WHERE status =/);
  assert.deepEqual(calls[0].params, ['active', 10]);
});

test('platform management delegates tenant provisioning to the configured provisioner', async () => {
  let invoked = null;
  const platform = createPlatformManagement({
    controlPool: { query: async () => ({ rows: [] }) },
    createTenantProvisioner: {
      async provision(payload) {
        invoked = payload;
        return { ok: true, schoolCode: payload.schoolCode };
      },
    },
  });

  const result = await platform.provisionTenant({ schoolCode: 'demo-school' });
  assert.deepEqual(result, { ok: true, schoolCode: 'demo-school' });
  assert.deepEqual(invoked, { schoolCode: 'demo-school' });
  assert.equal(platform.provisioningReady, true);
});

test('platform management updates tenant status with audit logging', async () => {
  const calls = [];
  const controlPool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('UPDATE control_plane.tenants')) {
        return { rowCount: 1, rows: [{ id: params[1], schoolCode: 'demo', displayName: 'Demo', status: params[0] }] };
      }
      return { rows: [] };
    },
  };

  const platform = createPlatformManagement({ controlPool });
  const updated = await platform.updateTenantStatus({ tenantId: 'tenant-123', status: 'suspended', actorId: 'actor-1' });

  assert.equal(updated.status, 'suspended');
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /UPDATE control_plane.tenants/);
  assert.deepEqual(calls[0].params, ['suspended', 'tenant-123']);
  assert.match(calls[1].sql, /INSERT INTO control_plane.platform_audit_logs/);
  assert.deepEqual(calls[1].params, ['actor-1', 'tenant-123', JSON.stringify({ newStatus: 'suspended' })]);
});

test('platform management rejects invalid tenant status or missing tenant', async () => {
  const controlPool = {
    async query(sql) {
      if (sql.includes('UPDATE')) return { rowCount: 0, rows: [] };
      return { rows: [] };
    },
  };
  const platform = createPlatformManagement({ controlPool });
  await assert.rejects(platform.updateTenantStatus({ tenantId: 't1', status: 'invalid_status' }), { status: 400 });
  await assert.rejects(platform.updateTenantStatus({ tenantId: 't1', status: 'active' }), { status: 404 });
});

test('platform management updates quotas and extends trial days', async () => {
  const calls = [];
  const controlPool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('UPDATE control_plane.tenants')) {
        return {
          rowCount: 1,
          rows: [{
            id: params[params.length - 1],
            maxStudents: params[0],
            maxTeachers: params[1],
            status: 'active',
          }],
        };
      }
      return { rows: [] };
    },
  };

  const platform = createPlatformManagement({ controlPool });
  const updated = await platform.updateTenant({
    tenantId: 'tenant-456',
    maxStudents: 500,
    maxTeachers: 30,
    extendTrialDays: 15,
    actorId: 'owner-1',
  });

  assert.equal(updated.maxStudents, 500);
  assert.equal(updated.maxTeachers, 30);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /max_students =/);
  assert.match(calls[0].sql, /max_teachers =/);
  assert.match(calls[0].sql, /trial_ends_at =/);
  assert.match(calls[1].sql, /INSERT INTO control_plane.platform_audit_logs/);

  // validation errors
  await assert.rejects(platform.updateTenant({ tenantId: 't1', maxStudents: 0 }), { status: 400 });
  await assert.rejects(platform.updateTenant({ tenantId: 't1', maxTeachers: -1 }), { status: 400 });
  await assert.rejects(platform.updateTenant({ tenantId: 't1', extendTrialDays: 500 }), { status: 400 });
  await assert.rejects(platform.updateTenant({ tenantId: 't1' }), { status: 400 });
});

