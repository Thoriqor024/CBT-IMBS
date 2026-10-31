import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION = 1;

function validateSecretInput(secretRef, databaseUser, password) {
  if (typeof secretRef !== 'string' || !/^[a-zA-Z0-9/_-]{1,255}$/.test(secretRef)) {
    throw new TypeError('Secret reference is invalid.');
  }
  if (typeof databaseUser !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(databaseUser)) {
    throw new TypeError('Database username is invalid.');
  }
  if (typeof password !== 'string' || password.length < 32 || password.length > 1024) {
    throw new TypeError('Database password must contain 32 to 1024 characters.');
  }
}

function normalizeKey(masterKey) {
  const key = Buffer.isBuffer(masterKey) ? Buffer.from(masterKey) : Buffer.from(String(masterKey || ''), 'base64');
  if (key.length !== 32) throw new TypeError('Tenant secret master key must be exactly 32 bytes.');
  return key;
}

export function createTenantSecretStore({ pool, masterKey }) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('A control-plane query pool is required.');
  const key = normalizeKey(masterKey);

  function encrypt(secretRef, databaseUser, password) {
    validateSecretInput(secretRef, databaseUser, password);
    const nonce = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, nonce);
    cipher.setAAD(Buffer.from(`${KEY_VERSION}:${secretRef}`, 'utf8'));
    const encryptedPassword = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    return { encryptedPassword, nonce, authTag: cipher.getAuthTag() };
  }

  function decrypt(secretRef, encryptedPassword, nonce, authTag, keyVersion) {
    if (keyVersion !== KEY_VERSION) throw new Error(`Unsupported tenant secret key version: ${keyVersion}`);
    const decipher = createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAAD(Buffer.from(`${keyVersion}:${secretRef}`, 'utf8'));
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedPassword), decipher.final()]).toString('utf8');
  }

  return {
    async store(secretRef, databaseUser, password) {
      const encrypted = encrypt(secretRef, databaseUser, password);
      await pool.query(`INSERT INTO control_plane.tenant_database_secrets
        (secret_ref,database_user,encrypted_password,nonce,auth_tag,key_version,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT(secret_ref) DO UPDATE SET database_user=EXCLUDED.database_user,
          encrypted_password=EXCLUDED.encrypted_password,nonce=EXCLUDED.nonce,
          auth_tag=EXCLUDED.auth_tag,key_version=EXCLUDED.key_version,updated_at=NOW()`,
      [secretRef,databaseUser,encrypted.encryptedPassword,encrypted.nonce,encrypted.authTag,KEY_VERSION]);
    },
    async resolve(secretRef) {
      const result = await pool.query(`SELECT database_user AS "databaseUser",encrypted_password AS "encryptedPassword",
        nonce,auth_tag AS "authTag",key_version AS "keyVersion"
        FROM control_plane.tenant_database_secrets WHERE secret_ref=$1`,[secretRef]);
      const row = result.rows[0];
      if (!row) return null;
      return {
        user: row.databaseUser,
        password: decrypt(secretRef,row.encryptedPassword,row.nonce,row.authTag,Number(row.keyVersion)),
      };
    },
  };
}