import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../config/database.js';
import { supabaseAdmin } from '../supabase.js';
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
export async function processMemberCreation({ orgId, email, fullName, password, role = 'MEMBER', addedBy = null }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'MEMBER';
  const defaultPassword = password && password.trim().length >= 6 ? password.trim() : 'Sjcet@123#';
  const name = (fullName || cleanEmail.split('@')[0]).trim();

  // 1. Check if user already exists in users table
  const userRes = await query('SELECT id, full_name, email, account_type, status FROM users WHERE email = $1', [cleanEmail]);

  if (userRes.rows.length > 0) {
    const existingUser = userRes.rows[0];
    if (existingUser.account_type !== 'INDIVIDUAL') {
      return {
        status: 'skipped',
        email: cleanEmail,
        fullName: existingUser.full_name,
        reason: 'Only individual accounts can be added as organization members',
      };
    }

    if (!supabaseAdmin) throw new Error('Supabase profile storage is not configured.');
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', existingUser.id);
    if (membershipsError) throw new Error(membershipsError.message);

    if (memberships?.some((membership) => membership.organization_id === orgId)) {
      return {
        status: 'skipped',
        email: cleanEmail,
        fullName: existingUser.full_name,
        reason: 'User is already a member of this organization',
      };
    }
    if (memberships?.length) {
      return {
        status: 'skipped',
        email: cleanEmail,
        fullName: existingUser.full_name,
        reason: 'User already belongs to another organization',
      };
    }

    // Link user to organization_members
    await query(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, 'ACTIVE')`,
      [orgId, existingUser.id, cleanRole]
    );

    const { error: profileError } = await supabaseAdmin.from('organization_users').upsert({
      id: existingUser.id,
      organization_id: orgId,
      full_name: existingUser.full_name,
      email: existingUser.email,
      role: cleanRole,
      status: 'ACTIVE',
      added_by: addedBy,
    }, { onConflict: 'id' });
    if (profileError) throw new Error(profileError.message);

    const { error: individualDeleteError } = await supabaseAdmin
      .from('individual_users')
      .delete()
      .eq('id', existingUser.id);
    if (individualDeleteError) throw new Error(individualDeleteError.message);

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

  // 2. User does not exist in users table -> Create a cookie-auth account.
  if (!supabaseAdmin) throw new Error('Supabase profile storage is not configured.');

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

  // Insert into organization_members
  await query(
    `INSERT INTO organization_members (organization_id, user_id, role, status)
     VALUES ($1, $2, $3, 'ACTIVE')`,
    [orgId, newUser.id, cleanRole]
  );

  const { error: profileError } = await supabaseAdmin.from('organization_users').insert({
    id: newUser.id,
    organization_id: orgId,
    full_name: name,
    email: cleanEmail,
    role: cleanRole,
    status: 'ACTIVE',
    added_by: addedBy,
  });
  if (profileError) throw new Error(profileError.message);

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
      addedBy: req.user.id,
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
          addedBy: req.user.id,
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
    const userRes = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    let targetUserId = null;
    const cleanRole = role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'MEMBER';

    if (userRes.rows.length > 0) {
      const membershipResult = await processMemberCreation({
        orgId,
        email,
        role: cleanRole,
        addedBy: req.user.id,
      });

      if (membershipResult.status === 'skipped') {
        return res.status(409).json({ error: membershipResult.reason });
      }
      targetUserId = membershipResult.userId;
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
        JSON.stringify({ email, organization_id: orgId, role: cleanRole }),
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
        role: cleanRole,
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
