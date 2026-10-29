import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../config/database.js';
import { supabase, supabaseAdmin } from '../supabase.js';
import { sendMemberInvitationEmail } from '../services/emailService.js';

const memberSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  fullName: z.string().trim().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().default('Sjcet@123#'),
  role: z.enum(['ORG_ADMIN', 'MEMBER']).default('MEMBER'),
});

const bulkMemberSchema = z.object({
  members: z.array(
    z.object({
      email: z.string().trim().email('Valid email address is required').toLowerCase(),
      fullName: z.string().trim().optional(),
      password: z.string().optional(),
      role: z.enum(['ORG_ADMIN', 'MEMBER']).optional().default('MEMBER'),
    })
  ).min(1, 'At least one member is required'),
});

/**
 * Helper to create or link a single member to an organization
 */
export async function processMemberCreation({ orgId, email, fullName, password, role = 'MEMBER' }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'MEMBER';
  const defaultPassword = password && password.trim().length >= 6 ? password.trim() : 'Sjcet@123#';
  const name = (fullName || cleanEmail.split('@')[0]).trim();

  // 1. Check if user already exists in users table
  const userRes = await query('SELECT id, full_name, email, account_type, status FROM users WHERE email = $1', [cleanEmail]);

  if (userRes.rows.length > 0) {
    const existingUser = userRes.rows[0];

    // Check if already a member of this organization
    const memberRes = await query(
      'SELECT id, role, status FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, existingUser.id]
    );

    if (memberRes.rows.length > 0) {
      return {
        status: 'skipped',
        email: cleanEmail,
        fullName: existingUser.full_name,
        reason: 'User is already a member of this organization',
      };
    }

    // Link user to organization_members
    await query(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, 'ACTIVE')`,
      [orgId, existingUser.id, cleanRole]
    );

    return {
      status: 'added',
      email: cleanEmail,
      fullName: existingUser.full_name,
      userId: existingUser.id,
      role: cleanRole,
      linkedExisting: true,
      message: 'Existing platform user linked to organization',
    };
  }

  // 2. User does not exist in users table -> Create user
  // Try Supabase Auth Admin createUser if supabaseAdmin is configured
  if (supabaseAdmin) {
    try {
      const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          must_change_password: true,
        },
      });
      if (authErr) {
        console.warn(`[Supabase Auth Admin warning for ${cleanEmail}]:`, authErr.message);
      }
    } catch (authException) {
      console.warn(`[Supabase Auth Admin exception for ${cleanEmail}]:`, authException.message);
    }
  }

  // Hash password using bcrypt
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // Insert user into users table with must_change_password = true
  const insertUserRes = await query(
    `INSERT INTO users (full_name, email, password_hash, account_type, status, email_verified, must_change_password)
     VALUES ($1, $2, $3, 'INDIVIDUAL', 'ACTIVE', true, true)
     RETURNING id, full_name, email, account_type, status, email_verified, created_at`,
    [name, cleanEmail, passwordHash, 'INDIVIDUAL', 'ACTIVE', true, true]
  );

  const newUser = insertUserRes.rows[0];

  // Upsert profile if profiles table is configured in Supabase
  if (supabase) {
    try {
      await supabase.from('profiles').upsert({
        id: newUser.id,
        username: cleanEmail.split('@')[0],
        full_name: name,
        role: 'user',
      });
    } catch {
      // profiles table might be optional or auto-managed
    }
  }

  // Insert into organization_members
  await query(
    `INSERT INTO organization_members (organization_id, user_id, role, status)
     VALUES ($1, $2, $3, 'ACTIVE')`,
    [orgId, newUser.id, cleanRole]
  );

  return {
    status: 'added',
    email: cleanEmail,
    fullName: name,
    userId: newUser.id,
    role: cleanRole,
    createdNew: true,
    message: 'New member account created and added to organization',
  };
}

/**
 * 1. Get current authenticated user's organization
 */
export async function getMyOrganization(req, res) {
  try {
    return res.json({
      organization: req.organization,
      membership: req.membership,
    });
  } catch (error) {
    console.error('[getMyOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve organization' });
  }
}

/**
 * 2. Get members of current user's organization
 * Enforces strict isolation: org ID is derived from authenticated session only!
 */
export async function getMyMembers(req, res) {
  try {
    const orgId = req.organization.id;

    const membersRes = await query(
      `SELECT 
        om.id,
        om.role,
        om.status,
        om.joined_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.status AS user_status
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at ASC`,
      [orgId]
    );

    return res.json({
      organization_id: orgId,
      organization_name: req.organization.name,
      members: membersRes.rows,
    });
  } catch (error) {
    console.error('[getMyMembers Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve organization members' });
  }
}

/**
 * 3. Add a Single Member to current organization (Org Admin only)
 */
export async function addMember(req, res) {
  try {
    if (req.membership.role !== 'ORG_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can add new members.' });
    }

    const parseResult = memberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, fullName, password, role } = parseResult.data;
    const orgId = req.organization.id;

    const result = await processMemberCreation({
      orgId,
      email,
      fullName,
      password,
      role,
    });

    if (result.status === 'skipped') {
      return res.status(409).json({
        error: result.reason,
        skipped: true,
        email,
      });
    }

    return res.status(201).json({
      message: `Member ${email} successfully added to ${req.organization.name}`,
      member: result,
    });
  } catch (error) {
    console.error('[addMember Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to add organization member' });
  }
}

/**
 * 4. Add Members in Bulk (from Excel / CSV, Org Admin only)
 */
export async function addMembersBulk(req, res) {
  try {
    if (req.membership.role !== 'ORG_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can add members.' });
    }

    const parseResult = bulkMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { members } = parseResult.data;
    const orgId = req.organization.id;

    const added = [];
    const skipped = [];
    const failed = [];

    for (const item of members) {
      try {
        const result = await processMemberCreation({
          orgId,
          email: item.email,
          fullName: item.fullName,
          password: item.password,
          role: item.role || 'MEMBER',
        });

        if (result.status === 'added') {
          added.push(result);
        } else if (result.status === 'skipped') {
          skipped.push(result);
        } else {
          failed.push({ email: item.email, reason: result.reason || 'Unknown error' });
        }
      } catch (err) {
        failed.push({
          email: item.email,
          reason: err.message || 'Database error processing member',
        });
      }
    }

    return res.status(200).json({
      total: members.length,
      addedCount: added.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      added,
      skipped,
      failed,
      message: `Processed ${members.length} member(s): ${added.length} added, ${skipped.length} skipped, ${failed.length} failed.`,
    });
  } catch (error) {
    console.error('[addMembersBulk Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to process bulk members' });
  }
}

/**
 * 5. Invite Member via email (legacy invitation flow preserved)
 */
export async function inviteMember(req, res) {
  try {
    if (req.membership.role !== 'ORG_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can invite new members.' });
    }

    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const orgId = req.organization.id;

    // Check if user already exists
    const userRes = await query('SELECT id, full_name, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    let targetUserId = null;

    if (userRes.rows.length > 0) {
      targetUserId = userRes.rows[0].id;

      // Check if already a member
      const existingMember = await query(
        'SELECT id, role, status FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, targetUserId]
      );

      if (existingMember.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a member or invited to this organization' });
      }

      // Add to organization_members with status ACTIVE
      await query(
        `INSERT INTO organization_members (organization_id, user_id, role, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [orgId, targetUserId, role || 'MEMBER']
      );
    }

    // Create an invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO auth_tokens (user_id, token, token_type, metadata, expires_at)
       VALUES ($1, $2, 'MEMBER_INVITATION', $3, $4)`,
      [
        targetUserId || req.user.id,
        inviteToken,
        JSON.stringify({ email, organization_id: orgId, role: role || 'MEMBER' }),
        expiresAt,
      ]
    );

    sendMemberInvitationEmail(
      email,
      req.organization.name,
      req.user.full_name,
      inviteToken
    ).catch((err) => console.error('[Invite Email Error]:', err));

    return res.status(201).json({
      message: `Invitation successfully sent to ${email}`,
      invitation: {
        email,
        role: role || 'MEMBER',
        organization: req.organization.name,
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    console.error('[inviteMember Error]:', error);
    return res.status(500).json({ error: 'Failed to send organization invitation' });
  }
}

export default {
  getMyOrganization,
  getMyMembers,
  addMember,
  addMembersBulk,
  inviteMember,
};
