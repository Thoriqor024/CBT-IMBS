import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { getPoolConfig } from './db.js';
import { createTenantSecretStore } from './tenantSecrets.js';

const { Pool } = pg;
const CONTROL_PLANE_KEYS = ['CONTROL_DB_NAME', 'CONTROL_DB_USER', 'CONTROL_DB_PASSWORD', 'TENANT_MASTER_KEY_FILE'];

export function validateControlPlaneEnvironment(env = process.env) {
  const present = CONTROL_PLANE_KEYS.filter(key => String(env[key] || '').trim());
  if (present.length === 0) return { enabled: false, valid: true, errors: [] };

  const errors = CONTROL_PLANE_KEYS
    .filter(key => !String(env[key] || '').trim())
    .map(key => `${key} is required when the control plane is configured.`);
  const controlDatabase = String(env.CONTROL_DB_NAME || '').trim();
  const schoolDatabase = String(env.DB_NAME || 'cbt_imbs').trim();
  if (controlDatabase && controlDatabase === schoolDatabase) {
    errors.push('CONTROL_DB_NAME must be separate from the school database.');
  }

  return { enabled: true, valid: errors.length === 0, errors };
}

export function createControlPlaneRuntime({ env = process.env, PoolClass = Pool, masterKey } = {}) {
  const validation = validateControlPlaneEnvironment(env);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  if (!validation.enabled) return null;
  if (!masterKey) throw new Error('A control-plane master key is required.');

  const controlPool = new PoolClass(getPoolConfig({
    ...env,
    DB_HOST: env.CONTROL_DB_HOST || env.DB_HOST,
    DB_PORT: env.CONTROL_DB_PORT || env.DB_PORT,
    DB_NAME: env.CONTROL_DB_NAME,
    DB_USER: env.CONTROL_DB_USER,
    DB_PASSWORD: env.CONTROL_DB_PASSWORD,
    DB_POOL_MAX: env.CONTROL_DB_POOL_MAX || '5',
  }));
  const secretStore = createTenantSecretStore({ pool: controlPool, masterKey });

  return {
    controlPool,
    secretStore,
    async initializeControlPlane() {
      const sql = await readFile(new URL('./migrations/control-plane/001_tenant_registry.sql', import.meta.url), 'utf8');
      await controlPool.query(sql);
    },
    async verifyControlPlane() {
      await controlPool.query('SELECT id FROM control_plane.platform_users LIMIT 0');
      await controlPool.query('SELECT id FROM control_plane.tenants LIMIT 0');
      await controlPool.query('SELECT secret_ref FROM control_plane.tenant_database_secrets LIMIT 0');
      await controlPool.query('SELECT sid FROM public.user_sessions LIMIT 0');
    },
    async close() {
      await controlPool.end();
    },
  };
}

export async function createControlPlaneRuntimeFromEnvironment({ env = process.env, PoolClass = Pool } = {}) {
  const validation = validateControlPlaneEnvironment(env);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  if (!validation.enabled) return null;
  const keyFile = String(env.TENANT_MASTER_KEY_FILE).trim();
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
  return createControlPlaneRuntime({ env, PoolClass, masterKey });
}