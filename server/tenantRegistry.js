import { normalizeTenantCode } from './tenantDatabaseRouter.js';

const TENANT_COLUMNS = `id,lower(school_code) AS code,status,database_name AS "databaseName",
  database_secret_ref AS "databaseSecretRef",schema_version AS "schemaVersion",
  max_students AS "maxStudents",max_teachers AS "maxTeachers",
  trial_ends_at AS "trialEndsAt",service_ends_at AS "serviceEndsAt"`;

export function createTenantRegistry({ pool }) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('A control-plane query pool is required.');

  return {
    async findByCode(codeValue) {
      const code = normalizeTenantCode(codeValue);
      const result = await pool.query(
        `SELECT ${TENANT_COLUMNS} FROM control_plane.tenants WHERE lower(school_code)=$1 LIMIT 1`,
        [code],
      );
      return result.rows[0] || null;
    },
    async findById(id) {
      const result = await pool.query(
        `SELECT ${TENANT_COLUMNS} FROM control_plane.tenants WHERE id=$1 LIMIT 1`,
        [id],
      );
      return result.rows[0] || null;
    },
  };
}