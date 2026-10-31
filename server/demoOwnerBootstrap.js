// demoOwnerBootstrap.js
// Utility script to create a demo platform_owner with full access.
// Use ONLY for temporary verification of the SaaS admin panel.
// After you finish testing, you may delete this file or run the script again
// to rotate the password.

import { pool } from './db.js';
import bcrypt from 'bcryptjs';

// Demo credentials (hard‑coded for quick access). Change if you prefer another password.
const DEMO_USERNAME = 'platform_owner';
const DEMO_PASSWORD = 'DemoOwnerPassword2026!!!'; // 24+ chars, meets security check

async function createOrUpdateDemoOwner() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if the demo owner already exists
    const res = await client.query(
      `SELECT id, password_hash FROM control_plane.platform_users WHERE lower(username)=lower($1) FOR UPDATE`,
      [DEMO_USERNAME]
    );
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    if (res.rowCount === 0) {
      // Insert new demo owner (active, role = platform_owner)
      await client.query(
        `INSERT INTO control_plane.platform_users (username, email, full_name, role, password_hash, active)
         VALUES ($1, $1, 'Demo Platform Owner', 'platform_owner', $2, TRUE)`,
        [DEMO_USERNAME, passwordHash]
      );
      console.log('Demo platform_owner created.');
    } else {
      // Update existing password (keeps the same id)
      await client.query(
        `UPDATE control_plane.platform_users SET password_hash=$1 WHERE id=$2`,
        [passwordHash, res.rows[0].id]
      );
      console.log('Demo platform_owner password updated.');
    }
    await client.query('COMMIT');
    console.log('Demo credentials:');
    console.log(`  username: ${DEMO_USERNAME}`);
    console.log(`  password: ${DEMO_PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create demo owner:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

createOrUpdateDemoOwner();

