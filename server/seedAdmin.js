import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './config/db.js';

dotenv.config();

const email = process.env.ADMIN_EMAIL || 'admin@foodbridge.test';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const passwordHash = await bcrypt.hash(password, 10);

await pool.query(
  `INSERT INTO users (name, email, password_hash, role, is_verified, account_status)
   VALUES (?, ?, ?, 'admin', TRUE, 'active')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_verified = TRUE, account_status = 'active'`,
  ['Admin', email, passwordHash]
);

console.log(`Admin ready: ${email}`);
await pool.end();
