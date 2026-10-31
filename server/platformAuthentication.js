import bcrypt from 'bcryptjs';
import { normalizeAccountEmail } from './userIdentity.js';

function requiredOwnerName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 120) throw Object.assign(new Error('Nama pemilik wajib diisi (maksimal 120 karakter).'), { status: 400 });
  return name;
}

export function createPlatformAuthenticator({ controlPool, comparePassword = bcrypt.compare } = {}) {
  if (!controlPool || typeof controlPool.query !== 'function') {
    throw new TypeError('A control-plane pool is required for platform authentication.');
  }

  return {
    async authenticate({ email, password } = {}) {
      const identity = normalizeAccountEmail(email, { required: true });
      if (typeof password !== 'string' || !password) {
        throw Object.assign(new Error('Email dan kata sandi wajib diisi.'), { status: 400 });
      }

      const result = await controlPool.query(
        `SELECT id,email,full_name,password_hash,active
         FROM control_plane.platform_users WHERE lower(email)=lower($1) LIMIT 1`,
        [identity],
      );
      const account = result.rows[0];
      if (!account || !account.active || !(await comparePassword(password, account.password_hash))) return null;

      return {
        id: String(account.id),
        username: identity,
        email: identity,
        name: account.full_name,
        role: 'platform_owner',
        className: null,
      };
    },
  };
}

export async function bootstrapControlPlaneOwner({
  controlPool,
  email,
  fullName,
  password,
  hashPassword = bcrypt.hash,
} = {}) {
  if (!controlPool?.connect) throw new TypeError('A database pool is required for control-plane owner bootstrap.');
  const normalizedEmail = normalizeAccountEmail(email, { required: true });
  const name = requiredOwnerName(fullName);
  const ownerPassword = typeof password === 'string' ? password : '';
  if (ownerPassword.trim().length < 24) {
    throw Object.assign(new Error('Password owner harus kuat dan minimal 24 karakter.'), { status: 400 });
  }

  const client = await controlPool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id FROM control_plane.platform_users WHERE lower(email)=lower($1) FOR UPDATE',
      [normalizedEmail],
    );
    if (existing.rowCount) throw Object.assign(new Error('Email pemilik sudah terdaftar.'), { status: 409 });

    const passwordHash = await hashPassword(ownerPassword, 12);
    const inserted = await client.query(
      `INSERT INTO control_plane.platform_users(email,full_name,password_hash,active)
       VALUES($1,$2,$3,TRUE) RETURNING id,email,full_name`,
      [normalizedEmail, name, passwordHash],
    );
    const owner = inserted.rows[0];
    await client.query(
      `INSERT INTO control_plane.platform_audit_logs(actor_id,action,detail)
       VALUES($1,'platform.owner.bootstrap',jsonb_build_object('localBootstrap',true))`,
      [owner.id],
    );
    await client.query('COMMIT');
    return { id: String(owner.id), email: owner.email, name: owner.full_name };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}