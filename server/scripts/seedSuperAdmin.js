import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query } from '../config/database.js';

dotenv.config();

export async function seedSuperAdmin() {
  console.log('🌱 Starting Super Admin seeding for Terra AI...');

  const fullName = process.env.SUPER_ADMIN_NAME || 'Terra Chief Admin';
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@terra.eco').toLowerCase().trim();
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD || 'AdminSecurePassword123!';

  if (!email || !rawPassword) {
    console.error('❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in server/.env');
    return false;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Check if user exists
    const existing = await query('SELECT id, email, account_type FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const updated = await query(
        `UPDATE users 
         SET full_name = $1, password_hash = $2, account_type = 'SUPER_ADMIN', status = 'ACTIVE', email_verified = true 
         WHERE id = $3 
         RETURNING id, full_name, email, account_type, status, email_verified`,
        [fullName, passwordHash, user.id]
      );
      console.log('✅ Super Admin updated successfully.');
      return updated.rows[0];
    } else {
      const inserted = await query(
        `INSERT INTO users (full_name, email, password_hash, account_type, status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, email, account_type, status, email_verified`,
        [fullName, email, passwordHash, 'SUPER_ADMIN', 'ACTIVE', true]
      );
      console.log('🎉 Super Admin created successfully.');
      return inserted.rows[0];
    }
  } catch (error) {
    console.error('❌ Failed to seed Super Admin:', error.message);
    return false;
  }
}

// If executed directly from CLI
if (process.argv[1] && process.argv[1].includes('seedSuperAdmin.js')) {
  seedSuperAdmin().then(() => {
    console.log('\n=============================================');
    console.log('  SUPER ADMIN CREDENTIALS READY:');
    console.log(`  Email:    ${process.env.SUPER_ADMIN_EMAIL || 'admin@terra.eco'}`);
    console.log(`  Password: (configured in SUPER_ADMIN_PASSWORD)`);
    console.log('  Login at: http://localhost:5173/admin/login');
    console.log('=============================================\n');
  });
}

export default seedSuperAdmin;
