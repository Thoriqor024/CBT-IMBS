import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPoolConfig } from './db.js';
import { TenantDatabaseRouter } from './tenantDatabaseRouter.js';
import { createTenantRegistry } from './tenantRegistry.js';
import { createTenantDatabaseContext } from './tenantDatabaseContext.js';
import { createTenantSecretStore } from './tenantSecrets.js';

const { Pool } = pg;

function requiredValue(env, key) {
  const value = String(env[key] || '').trim();
  if (!value) throw new Error(`${key} is required when tenant mode is enabled.`);
  return value;
}

export function validateTenantRuntimeEnvironment(env = process.env) {
  const enabled = String(env.TENANCY_ENABLED || '').trim().toLowerCase() === 'true';
  if (!enabled) {
    return { enabled: false, valid: true, errors: [] };
  }

  const errors = [];
  const required = ['CONTROL_DB_NAME', 'CONTROL_DB_USER', 'CONTROL_DB_PASSWORD', 'TENANT_MASTER_KEY_FILE'];
  for (const key of required) {
    if (!String(env[key] || '').trim()) {
      errors.push(`${key} is required when tenant mode is enabled.`);
    }
  }

  const defaultTenantDatabase = String(env.DB_NAME || 'cbt_imbs').trim();
  if (String(env.CONTROL_DB_NAME || '').trim() && String(env.CONTROL_DB_NAME || '').trim() === defaultTenantDatabase) {
    errors.push('CONTROL_DB_NAME must be separate from the tenant database.');
  }

  if (env.TENANT_MASTER_KEY_FILE && !String(env.TENANT_MASTER_KEY_FILE).trim()) {
    errors.push('TENANT_MASTER_KEY_FILE is required when tenant mode is enabled.');
  }

  return {
    enabled: true,
    valid: errors.length === 0,
    errors,
  };
}

export function createTenantRuntime({ env = process.env, PoolClass = Pool, resolveSecret, masterKey } = {}) {
  const validation = validateTenantRuntimeEnvironment(env);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const controlDatabase = requiredValue(env, 'CONTROL_DB_NAME');
  const controlUser = requiredValue(env, 'CONTROL_DB_USER');
  const controlPassword = requiredValue(env, 'CONTROL_DB_PASSWORD');
  const defaultTenantDatabase = String(env.DB_NAME || 'cbt_imbs').trim();
  if (controlDatabase === defaultTenantDatabase) {
    throw new Error('CONTROL_DB_NAME must be separate from the tenant database.');
  }
  if (typeof resolveSecret !== 'function' && !masterKey) {
    throw new Error('A secret provider must be configured when tenant mode is enabled.');
  }
  const controlPoolConfig = getPoolConfig({
    ...env,
    DB_HOST: env.CONTROL_DB_HOST || env.DB_HOST,
    DB_PORT: env.CONTROL_DB_PORT || env.DB_PORT,
    DB_NAME: controlDatabase,
    DB_USER: controlUser,
    DB_PASSWORD: controlPassword,
    DB_POOL_MAX: env.CONTROL_DB_POOL_MAX || '5',
  });
  const controlPool = new PoolClass(controlPoolConfig);
  const secretStore = masterKey ? createTenantSecretStore({ pool: controlPool, masterKey }) : null;
  const getTenantSecret = resolveSecret || (secretRef => secretStore.resolve(secretRef));
  const baseRegistry = createTenantRegistry({ pool: controlPool });
  const ensureTenantDatabaseIsSeparate = tenant => {
    if (tenant && tenant.databaseName === controlDatabase) {
      throw Object.assign(new Error('Tenant database cannot point to the control-plane database.'), {
        status: 503,
        code: 'TENANT_DATABASE_CONFLICT',
      });
    }
    return tenant;
  };
  const registry = {
    async findByCode(code) { return ensureTenantDatabaseIsSeparate(await baseRegistry.findByCode(code)); },
    async findById(id) { return ensureTenantDatabaseIsSeparate(await baseRegistry.findById(id)); },
  };
  const maxPools = Number(env.TENANT_MAX_POOLS || 10);
  const maxTotalConnections = Number(env.TENANT_POOL_TOTAL_MAX || 40);
  const maxPerPool = Number(env.TENANT_POOL_MAX || 4);
  const router = new TenantDatabaseRouter({
    registry,
    resolveSecret: getTenantSecret,
    createPool: config => new PoolClass(config),
    poolConfig: getPoolConfig({
      ...env,
      DB_POOL_MAX: String(maxPerPool),
    }),
    maxPools,
    maxConnectionsPerPool: maxPerPool,
    maxTotalTenantConnections: maxTotalConnections,
  });
  const context = createTenantDatabaseContext({
    router,
    enrichContext: async ({ pool }) => {
      const result = await pool.query(`SELECT violation_threshold AS "violationThreshold",
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email') AS "emailSchemaReady"
        FROM school_settings WHERE id=1`);
      if (!result.rowCount) throw new Error('Tenant school settings are not initialized.');
      if (!result.rows[0].emailSchemaReady) {
        throw Object.assign(new Error('Tenant email migration is required before login.'), { status: 503, code: 'TENANT_SCHEMA_NOT_READY' });
      }
      const violationThreshold = Number(result.rows[0].violationThreshold);
      if (!Number.isSafeInteger(violationThreshold) || violationThreshold < 1 || violationThreshold > 10) {
        throw new Error('Tenant violation threshold configuration is invalid.');
      }
      return { violationThreshold };
    },
  });

  return {
    controlPool,
    secretStore,
    router,
    context,
    evictTenantPool: tenantId => router.evict(tenantId),
    async initializeControlPlane() {
      const sql = await readFile(new URL('./migrations/control-plane/001_tenant_registry.sql', import.meta.url), 'utf8');
      await controlPool.query(sql);
    },
    async verifyControlPlane() {
      await controlPool.query('SELECT id FROM control_plane.tenants LIMIT 0');
      await controlPool.query('SELECT secret_ref FROM control_plane.tenant_database_secrets LIMIT 0');
      await controlPool.query('SELECT sid FROM public.user_sessions LIMIT 0');
    },
    async close() {
      await router.close();
      await controlPool.end();
    },
  };
}

export async function createTenantRuntimeFromEnvironment({ env = process.env, PoolClass = Pool } = {}) {
  const keyFile = requiredValue(env, 'TENANT_MASTER_KEY_FILE');
  let masterKey;
  try {
    masterKey = await readFile(keyFile);
  } catch (error) {
    if (keyFile.startsWith('/run/secrets/')) {
      masterKey = await readFile(path.resolve('./secrets', path.basename(keyFile)));
    } else {
      throw error;
    }
  }
  return createTenantRuntime({ env, PoolClass, masterKey });
}