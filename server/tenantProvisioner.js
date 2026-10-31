import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { normalizeTenantCode } from './tenantDatabaseRouter.js';
import { normalizeAccountEmail } from './userIdentity.js';

const quoteIdentifier = value => `"${String(value).replaceAll('"','""')}"`;
const quoteLiteral = value => `'${String(value).replaceAll("'","''")}'`;

function requiredName(value, label, maximum) {
  const normalized=String(value??'').trim();
  if(!normalized||normalized.length>maximum)throw Object.assign(new Error(`${label} wajib diisi dan maksimal ${maximum} karakter.`),{status:400});
  return normalized;
}

export class TenantProvisioner {
  constructor({adminPool,controlPool,secretStore,createTenantPool,initializeTenantDatabase,applyEmailMigration}){
    if(!adminPool?.query||!controlPool?.query||!secretStore?.store||typeof createTenantPool!=='function'
      ||typeof initializeTenantDatabase!=='function'||typeof applyEmailMigration!=='function')
      throw new TypeError('Tenant provisioning dependencies are incomplete.');
    this.adminPool=adminPool;
    this.controlPool=controlPool;
    this.secretStore=secretStore;
    this.createTenantPool=createTenantPool;
    this.initializeTenantDatabase=initializeTenantDatabase;
    this.applyEmailMigration=applyEmailMigration;
  }

  async provision({schoolCode,displayName,adminName,adminEmail,trialEndsAt,maxStudents=400,maxTeachers=25}){
    const code=normalizeTenantCode(schoolCode);
    const name=requiredName(displayName,'Nama sekolah',160);
    const firstAdminName=requiredName(adminName,'Nama admin sekolah',120);
    const email=normalizeAccountEmail(adminEmail,{required:true});
    const trialEnd=new Date(trialEndsAt);
    if(!trialEndsAt||Number.isNaN(trialEnd.getTime())||trialEnd<=new Date())throw Object.assign(new Error('Tanggal akhir trial harus berada di masa depan.'),{status:400});
    if(!Number.isSafeInteger(maxStudents)||maxStudents<1||maxStudents>100000||!Number.isSafeInteger(maxTeachers)||maxTeachers<1||maxTeachers>10000)
      throw Object.assign(new Error('Batas siswa/guru tidak valid.'),{status:400});

    const tenantId=randomUUID();
    const suffix=tenantId.replaceAll('-','');
    const databaseName=`cbt_t_${suffix}`;
    const databaseUser=`cbt_a_${suffix}`;
    const migrationUser=`cbt_m_${suffix}`;
    const secretRef=`tenant/${tenantId}/application`;
    const migrationSecretRef=`tenant/${tenantId}/migration`;
    const databasePassword=randomBytes(32).toString('hex');
    const migrationPassword=randomBytes(32).toString('hex');
    const initialPassword=randomBytes(24).toString('base64url');
    const username=`owner-${suffix.slice(0,12)}`;
    let applicationRoleCreated=false,migrationRoleCreated=false,databaseCreated=false,tenantPool=null,registryCreated=false;

    try{
      await this.adminPool.query(`CREATE ROLE ${quoteIdentifier(migrationUser)} LOGIN PASSWORD ${quoteLiteral(migrationPassword)}`);
      migrationRoleCreated=true;
      await this.adminPool.query(`CREATE ROLE ${quoteIdentifier(databaseUser)} LOGIN PASSWORD ${quoteLiteral(databasePassword)}`);
      applicationRoleCreated=true;
      await this.adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)} OWNER ${quoteIdentifier(migrationUser)}`);
      databaseCreated=true;
      tenantPool=await this.createTenantPool({database:databaseName,user:migrationUser,password:migrationPassword});
      await this.initializeTenantDatabase(tenantPool);
      await this.applyEmailMigration(tenantPool);
      await tenantPool.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(databaseUser)}`);
      await tenantPool.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(databaseUser)}`);
      await tenantPool.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdentifier(databaseUser)}`);
      await tenantPool.query(`GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdentifier(databaseUser)}`);
      await tenantPool.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(migrationUser)} IN SCHEMA public
        GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO ${quoteIdentifier(databaseUser)}`);
      await tenantPool.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(migrationUser)} IN SCHEMA public
        GRANT USAGE,SELECT,UPDATE ON SEQUENCES TO ${quoteIdentifier(databaseUser)}`);
      const passwordHash=await bcrypt.hash(initialPassword,12);
      const initialAdmin=await tenantPool.query(`INSERT INTO users(username,email,full_name,role,password_hash,active)
        VALUES($1,$2,$3,'admin',$4,TRUE) RETURNING id,email,full_name AS name`,[username,email,firstAdminName,passwordHash]);
      await this.secretStore.store(secretRef,databaseUser,databasePassword);
      await this.secretStore.store(migrationSecretRef,migrationUser,migrationPassword);
      await this.controlPool.query(`INSERT INTO control_plane.tenants
        (id,school_code,display_name,status,database_name,database_secret_ref,schema_version,
         max_students,max_teachers,trial_ends_at,created_at,updated_at)
        VALUES($1,$2,$3,'trial',$4,$5,2,$6,$7,$8,NOW(),NOW())`,
      [tenantId,code,name,databaseName,secretRef,maxStudents,maxTeachers,trialEnd.toISOString()]);
      registryCreated=true;
      await this.controlPool.query(
        `INSERT INTO control_plane.platform_audit_logs (tenant_id,action,detail)
         VALUES($1,'tenant.provision',$2::jsonb)`,
        [tenantId, JSON.stringify({ schoolCode: code, databaseName, adminEmail: email })],
      );
      await tenantPool.end();
      tenantPool=null;
      return {tenantId,schoolCode:code,displayName:name,databaseName,admin:{id:initialAdmin.rows[0].id,email:initialAdmin.rows[0].email,name:initialAdmin.rows[0].name,username},initialPassword,trialEndsAt:trialEnd.toISOString()};
    }catch(error){
      await tenantPool?.end().catch(()=>{});
      if(registryCreated)await this.controlPool.query('DELETE FROM control_plane.tenants WHERE id=$1',[tenantId]).catch(()=>{});
      await this.controlPool.query('DELETE FROM control_plane.tenant_database_secrets WHERE secret_ref=$1',[secretRef]).catch(()=>{});
      await this.controlPool.query('DELETE FROM control_plane.tenant_database_secrets WHERE secret_ref=$1',[migrationSecretRef]).catch(()=>{});
      if(databaseCreated)await this.adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`).catch(()=>{});
      if(applicationRoleCreated)await this.adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(databaseUser)}`).catch(()=>{});
      if(migrationRoleCreated)await this.adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(migrationUser)}`).catch(()=>{});
      if(error.code==='23505')throw Object.assign(new Error('Kode sekolah atau email admin sudah terdaftar.'),{status:409});
      throw error;
    }
  }
}