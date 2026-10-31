import bcrypt from 'bcryptjs';
import { isSecurePlatformOwnerPassword } from './seedAccounts.js';

const bootstrapError = (message, status = 400) => Object.assign(new Error(message), { status });

export async function bootstrapPlatformOwner({ controlPool, password, hashPassword = bcrypt.hash, comparePassword = bcrypt.compare } = {}) {
  if (!controlPool?.connect) throw new TypeError('A database pool is required for owner bootstrap.');
  if (!isSecurePlatformOwnerPassword(password)) {
    throw bootstrapError('Password owner harus kuat dan minimal 24 karakter.');
  }

  const client = await controlPool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT id, role, active, password_hash FROM users WHERE username='platform_owner' FOR UPDATE",
    );
    let owner = result.rows[0];
    let action;

    if (!owner) {
      const passwordHash = await hashPassword(password, 12);
      const inserted = await client.query(
        "INSERT INTO users(username,full_name,role,password_hash,active) VALUES('platform_owner','Pemilik Platform','platform_owner',$1,TRUE) RETURNING id",
        [passwordHash],
      );
      owner = inserted.rows[0];
      action = 'platform.owner.bootstrap';
    } else {
      if (owner.role !== 'platform_owner' || !owner.active) {
        throw bootstrapError('Akun platform owner tidak aktif atau identitasnya konflik.', 409);
      }
      if (!(await comparePassword('platform-owner-local', owner.password_hash))) {
        throw bootstrapError('Bootstrap ditolak karena owner sudah memiliki password non-demo.', 409);
      }
      const passwordHash = await hashPassword(password, 12);
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, owner.id]);
      action = 'platform.owner.password.rotate';
    }

    await client.query("DELETE FROM user_sessions WHERE sess->'user'->>'id'=$1", [String(owner.id)]);
    await client.query(
      'INSERT INTO audit_logs(user_id,action,detail) VALUES($1,$2,$3)',
      [owner.id, action, JSON.stringify({ localBootstrap: true })],
    );
    await client.query('COMMIT');
    return { action };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}