import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../config/database.js';
import { sendMemberInvitationEmail } from '../services/emailService.js';

const inviteSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  role: z.enum(['ORG_ADMIN', 'MEMBER']).default('MEMBER'),
});

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
 * 3. Invite Member to current organization (Org Admin only)
 */
export async function inviteMember(req, res) {
  try {
    // Check if the requester has ORG_ADMIN role in this organization
    if (req.membership.role !== 'ORG_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can invite new members.' });
    }

    const parseResult = inviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, role } = parseResult.data;
    const orgId = req.organization.id;

    // Check if user already exists
    const userRes = await query('SELECT id, full_name, email FROM users WHERE email = $1', [email]);

    let targetUserId = null;
    let targetUserName = email.split('@')[0];

    if (userRes.rows.length > 0) {
      targetUserId = userRes.rows[0].id;
      targetUserName = userRes.rows[0].full_name;

      // Check if already a member of this organization
      const existingMember = await query(
        'SELECT id, role, status FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [orgId, targetUserId]
      );

      if (existingMember.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a member or invited to this organization' });
      }

      // Add to organization_members with status ACTIVE (or INVITED)
      await query(
        `INSERT INTO organization_members (organization_id, user_id, role, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [orgId, targetUserId, role]
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
        JSON.stringify({ email, organization_id: orgId, role }),
        expiresAt,
      ]
    );

    // Send invitation email
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
        role,
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
  inviteMember,
};
