import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { query, getClient } from '../config/database.js';
import { generateTokens, setAuthCookies, clearAuthCookies } from '../middleware/authenticate.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

// Input Validation Schemas
const individualSignupSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  location: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms and Conditions' }),
  }),
});

const organizationSignupSchema = z.object({
  name: z.string().trim().min(2, 'Organization name is required'),
  organization_type: z.string().trim().min(2, 'Organization type is required'),
  registration_number: z.string().trim().optional(),
  official_email: z.string().trim().email('Invalid official organization email').toLowerCase(),
  contact_number: z.string().trim().min(7, 'Valid contact number is required'),
  address: z.string().trim().min(5, 'Physical address or location is required'),
  website: z.string().trim().url('Invalid website URL').optional().or(z.literal('')),
  representative_name: z.string().trim().min(2, 'Representative full name is required'),
  representative_email: z.string().trim().email('Invalid representative email').toLowerCase(),
  representative_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  acceptTerms: z.string().or(z.boolean()).transform((v) => v === 'true' || v === true),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  expectedRole: z.enum(['INDIVIDUAL', 'ORG_ADMIN', 'SUPER_ADMIN']).optional(),
});

/**
 * 1. Individual User Self-Registration
 */
export async function signupIndividual(req, res) {
  try {
    const parseResult = individualSignupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { full_name, email, password } = parseResult.data;

    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await query(
      `INSERT INTO users (full_name, email, password_hash, account_type, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, account_type, status, email_verified, created_at`,
      [full_name, email, password_hash, 'INDIVIDUAL', 'ACTIVE', false]
    );

    const user = insertResult.rows[0];

    // Create email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await query(
      `INSERT INTO auth_tokens (user_id, token, token_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, verifyToken, 'EMAIL_VERIFICATION', expiresAt]
    );

    // Dispatch verification email (asynchronous / non-blocking)
    sendVerificationEmail(user.email, verifyToken, user.full_name).catch((err) =>
      console.error('[Email Dispatch Error]:', err)
    );

    // Generate JWT and set HttpOnly Cookies
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      account_type: user.account_type,
      status: user.status,
      email_verified: user.email_verified,
      created_at: user.created_at,
    };

    return res.status(201).json({
      message: 'Account created successfully! Welcome to Terra AI.',
      user: safeUser,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('[signupIndividual Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create individual account' });
  }
}

/**
 * 2. Organization Signup (Transaction: User + Organization + Organization Member)
 */
export async function signupOrganization(req, res) {
  const client = await getClient();
  try {
    const parseResult = organizationSignupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const data = parseResult.data;
    const documentFilename = req.file ? req.file.filename : null;

    // Check if representative email or official org email exists in users
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [data.representative_email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Representative email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(data.representative_password, salt);

    // Execute in Transaction
    if (client.query && typeof client.query === 'function') {
      try {
        await client.query('BEGIN');
      } catch {}
    }

    // 1. Create ORG_ADMIN user with PENDING status
    const userRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, account_type, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, account_type, status, email_verified, created_at`,
      [data.representative_name, data.representative_email, password_hash, 'ORG_ADMIN', 'PENDING', false]
    );
    const user = userRes.rows[0];

    // 2. Create organization with PENDING status
    const orgRes = await client.query(
      `INSERT INTO organizations (
        name, organization_type, registration_number, official_email,
        contact_number, address, website, document_url, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.name,
        data.organization_type,
        data.registration_number || null,
        data.official_email,
        data.contact_number,
        data.address,
        data.website || null,
        documentFilename,
        'PENDING',
      ]
    );
    const organization = orgRes.rows[0];

    // 3. Create organization_members row with role ORG_ADMIN
    const memberRes = await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organization.id, user.id, 'ORG_ADMIN', 'ACTIVE']
    );
    const membership = memberRes.rows[0];

    if (client.query && typeof client.query === 'function') {
      try {
        await client.query('COMMIT');
      } catch {}
    }

    // Issue tokens so representative can immediately check status on /pending-approval
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      account_type: user.account_type,
      status: user.status,
      email_verified: user.email_verified,
      created_at: user.created_at,
    };

    return res.status(201).json({
      message: 'Your organization registration request is pending admin approval.',
      status: 'PENDING',
      user: safeUser,
      organization: {
        id: organization.id,
        name: organization.name,
        organization_type: organization.organization_type,
        approval_status: organization.approval_status,
      },
      membership,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    if (client.query && typeof client.query === 'function') {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }
    console.error('[signupOrganization Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit organization registration' });
  } finally {
    if (client.release) client.release();
  }
}

/**
 * 3. Unified Login Endpoint
 */
export async function login(req, res) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid email or password format',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;

    // Fetch user by email
    const userRes = await query(
      `SELECT id, full_name, email, password_hash, account_type, status, email_verified, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    // Generic error message for security to prevent email enumeration
    const genericError = 'Invalid email or password';

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: genericError });
    }

    const userRecord = userRes.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: genericError });
    }

    // Role-based portal enforcement
    const { expectedRole } = parseResult.data;
    if (expectedRole && userRecord.account_type !== expectedRole) {
      if (expectedRole === 'INDIVIDUAL') {
        const targetPortal =
          userRecord.account_type === 'SUPER_ADMIN'
            ? 'Super Admin Console (/admin/login)'
            : 'Organization Portal (/login/organization)';
        return res.status(403).json({
          error: `Access Denied: This login page is exclusively for Individual Citizens. Your account is registered as ${userRecord.account_type}. Please sign in via the ${targetPortal}.`,
          code: 'ROLE_MISMATCH',
          actualRole: userRecord.account_type,
        });
      }

      if (expectedRole === 'ORG_ADMIN') {
        const targetPortal =
          userRecord.account_type === 'SUPER_ADMIN'
            ? 'Super Admin Console (/admin/login)'
            : 'Citizen Login (/login)';
        return res.status(403).json({
          error: `Access Denied: This login page is exclusively for Organization Administrators. Your account is registered as ${userRecord.account_type}. Please sign in via ${targetPortal}.`,
          code: 'ROLE_MISMATCH',
          actualRole: userRecord.account_type,
        });
      }

      if (expectedRole === 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Unauthorized: This portal is strictly restricted to Terra AI Platform Super Administrators.',
          code: 'ROLE_MISMATCH',
          actualRole: userRecord.account_type,
        });
      }
    }

    // Check account status
    if (userRecord.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact Terra AI support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Construct safe user object (NEVER return password_hash)
    const user = {
      id: userRecord.id,
      full_name: userRecord.full_name,
      email: userRecord.email,
      account_type: userRecord.account_type,
      status: userRecord.status,
      email_verified: userRecord.email_verified,
      created_at: userRecord.created_at,
    };

    let organization = null;
    let membership = null;

    // If ORG_ADMIN or MEMBER, fetch organization details
    if (user.account_type === 'ORG_ADMIN' || user.account_type === 'INDIVIDUAL') {
      const orgRes = await query(
        `SELECT 
          om.id as member_id, om.role as member_role, om.status as member_status,
          o.id as organization_id, o.name as organization_name, o.organization_type,
          o.approval_status, o.rejection_reason, o.document_url
         FROM organization_members om
         JOIN organizations o ON om.organization_id = o.id
         WHERE om.user_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (orgRes.rows.length > 0) {
        const row = orgRes.rows[0];
        organization = {
          id: row.organization_id,
          name: row.organization_name,
          organization_type: row.organization_type,
          approval_status: row.approval_status,
          rejection_reason: row.rejection_reason,
          document_url: row.document_url,
        };
        membership = {
          id: row.member_id,
          role: row.member_role,
          status: row.member_status,
        };
      }
    }

    // Generate JWT & set cookies
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.json({
      message: 'Login successful',
      user,
      organization,
      membership,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({ error: 'Authentication service encountered an error' });
  }
}

/**
 * 4. Logout
 */
export async function logout(req, res) {
  try {
    clearAuthCookies(res);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Logout Error]:', error);
    return res.status(500).json({ error: 'Failed to process logout' });
  }
}

/**
 * 5. Current Authenticated User & Permissions
 */
export async function getMe(req, res) {
  try {
    const user = req.user;
    let organization = null;
    let membership = null;

    const orgRes = await query(
      `SELECT 
        om.id as member_id, om.role as member_role, om.status as member_status,
        o.id as organization_id, o.name as organization_name, o.organization_type,
        o.official_email, o.contact_number, o.address, o.website,
        o.approval_status, o.rejection_reason, o.document_url, o.created_at as org_created_at
       FROM organization_members om
       JOIN organizations o ON om.organization_id = o.id
       WHERE om.user_id = $1
       LIMIT 1`,
      [user.id]
    );

    if (orgRes.rows.length > 0) {
      const row = orgRes.rows[0];
      organization = {
        id: row.organization_id,
        name: row.organization_name,
        organization_type: row.organization_type,
        official_email: row.official_email,
        contact_number: row.contact_number,
        address: row.address,
        website: row.website,
        approval_status: row.approval_status,
        rejection_reason: row.rejection_reason,
        document_url: row.document_url,
        created_at: row.org_created_at,
      };
      membership = {
        id: row.member_id,
        role: row.member_role,
        status: row.member_status,
      };
    }

    // Role-based capabilities/permissions
    const permissions = {
      canAccessAdminDashboard: user.account_type === 'SUPER_ADMIN',
      canManageOrganization: user.account_type === 'ORG_ADMIN' && organization?.approval_status === 'APPROVED',
      canInviteMembers: user.account_type === 'ORG_ADMIN' && organization?.approval_status === 'APPROVED',
      isOrgPending: organization?.approval_status === 'PENDING',
      isOrgApproved: organization?.approval_status === 'APPROVED',
      isOrgRejected: organization?.approval_status === 'REJECTED',
      isOrgSuspended: organization?.approval_status === 'SUSPENDED',
    };

    return res.json({
      user,
      organization,
      membership,
      permissions,
    });
  } catch (error) {
    console.error('[getMe Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve user context' });
  }
}

/**
 * 6. Forgot Password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userRes = await query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    // Constant time-like behavior: always respond with success to prevent user enumeration
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await query(
        `INSERT INTO auth_tokens (user_id, token, token_type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, resetToken, 'PASSWORD_RESET', expiresAt]
      );

      sendPasswordResetEmail(user.email, resetToken).catch((err) =>
        console.error('[Forgot Password Email Error]:', err)
      );
    }

    return res.json({
      message: 'If an account matches that email, a password reset link has been dispatched.',
    });
  } catch (error) {
    console.error('[forgotPassword Error]:', error);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

/**
 * 7. Reset Password
 */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Token and a password of at least 8 characters are required' });
    }

    const tokenRes = await query(
      `SELECT id, user_id, expires_at FROM auth_tokens 
       WHERE token = $1 AND token_type = 'PASSWORD_RESET'`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    const record = tokenRes.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM auth_tokens WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Password reset link has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Update user password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, record.user_id]);

    // Invalidate token
    await query('DELETE FROM auth_tokens WHERE token = $1', [token]);

    return res.json({ message: 'Password has been reset successfully. Please log in with your new credentials.' });
  } catch (error) {
    console.error('[resetPassword Error]:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * 8. Verify Email
 */
export async function verifyEmail(req, res) {
  try {
    const token = req.query.token || req.body.token;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const tokenRes = await query(
      `SELECT id, user_id, expires_at FROM auth_tokens
       WHERE token = $1 AND token_type = 'EMAIL_VERIFICATION'`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired email verification link.' });
    }

    const record = tokenRes.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM auth_tokens WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Verification link expired. Please request a new one.' });
    }

    // Mark email verified
    await query('UPDATE users SET email_verified = true WHERE id = $1', [record.user_id]);
    await query('DELETE FROM auth_tokens WHERE token = $1', [token]);

    return res.json({ message: 'Email verified successfully! You now have full account access.' });
  } catch (error) {
    console.error('[verifyEmail Error]:', error);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
}

export default {
  signupIndividual,
  signupOrganization,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
