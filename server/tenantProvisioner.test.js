import test from 'node:test';
import assert from 'node:assert/strict';
import { TenantProvisioner } from './tenantProvisioner.js';

function createHarness(){
  const calls={admin:[],control:[],tenant:[],secret:[]};
  const adminPool={async query(sql){calls.admin.push(sql);return {rows:[]};}};
  const controlPool={async query(sql,values){calls.control.push({sql,values});return {rows:[]};}};
  const secretStore={async store(...args){calls.secret.push(args);}};
  const createTenantPool=async config=>({config,async query(sql,values){calls.tenant.push({sql,values});return sql.includes('INSERT INTO users')?{rows:[{id:1,email:values[1],name:values[2]}],rowCount:1}:{rows:[],rowCount:0};},async end(){}});
  const provisioner=new TenantProvisioner({adminPool,controlPool,secretStore,createTenantPool,
    initializeTenantDatabase:async()=>{},applyEmailMigration:async()=>{}});
  return {provisioner,calls};
}

test('provisioning uses generated DB/role identifiers and inserts the school admin',async()=>{
  const {provisioner,calls}=createHarness();
  const result=await provisioner.provision({schoolCode:'Sekolah-A',displayName:'Sekolah A',adminName:'Admin A',adminEmail:'Admin@Sekolah.id',trialEndsAt:'2099-01-01T00:00:00Z'});

  assert.equal(result.schoolCode,'sekolah-a');
  assert.match(result.databaseName,/^cbt_t_[0-9a-f]{32}$/);
  assert.match(result.admin.username,/^owner-[0-9a-f]{12}$/);
  assert.equal(result.admin.email,'admin@sekolah.id');
  assert.ok(result.initialPassword.length>=32);
  assert.match(calls.admin[0],/^CREATE ROLE "cbt_m_[0-9a-f]{32}" LOGIN PASSWORD '/);
  assert.match(calls.admin[1],/^CREATE ROLE "cbt_a_[0-9a-f]{32}" LOGIN PASSWORD '/);
  assert.match(calls.admin[2],/^CREATE DATABASE "cbt_t_[0-9a-f]{32}" OWNER "cbt_m_[0-9a-f]{32}"$/);
  assert.equal(calls.secret.length,2);
  assert.equal(calls.control.filter(call=>call.sql.includes('INSERT INTO control_plane.tenants')).length,1);
  assert.ok(calls.tenant.some(call=>call.sql.includes('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES')));
});

test('malformed user-supplied identifiers are rejected before database provisioning',async()=>{
  const {provisioner,calls}=createHarness();
  await assert.rejects(provisioner.provision({schoolCode:'x; DROP DATABASE cbt_imbs',displayName:'bad',adminName:'Admin',adminEmail:'admin@school.id',trialEndsAt:'2099-01-01'}),{status:400});
  assert.equal(calls.admin.length,0);
  assert.equal(calls.control.length,0);
});

test('failed provisioning compensates only its generated database and role',async()=>{
  const {calls}=createHarness();
  const provisioner=new TenantProvisioner({
    adminPool:{async query(sql){calls.admin.push(sql);return {rows:[]};}},
    controlPool:{async query(sql){calls.control.push({sql});return {rows:[]};}},
    secretStore:{async store(){throw new Error('secret store unavailable');}},
    createTenantPool:async()=>({async query(){return {rows:[]};},async end(){}}),
    initializeTenantDatabase:async()=>{},applyEmailMigration:async()=>{},
  });
  await assert.rejects(provisioner.provision({schoolCode:'school-b',displayName:'School B',adminName:'Admin B',adminEmail:'admin@school-b.id',trialEndsAt:'2099-01-01'}),/secret store unavailable/);
  assert.match(calls.admin.at(-1),/^DROP ROLE IF EXISTS "cbt_m_[0-9a-f]{32}"$/);
  assert.match(calls.admin.at(-2),/^DROP ROLE IF EXISTS "cbt_a_[0-9a-f]{32}"$/);
  assert.match(calls.admin.at(-3),/^DROP DATABASE IF EXISTS "cbt_t_[0-9a-f]{32}"$/);
});