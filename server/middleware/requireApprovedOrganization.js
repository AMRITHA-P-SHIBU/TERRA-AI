import { query } from '../config/database.js';

/**
 * Organization Access Control Middleware
 * 
 * Strict Security Rules:
 * 1. NEVER trusts organization_id from request body, query, or params.
 * 2. Derives organization strictly from authenticated user's organization_members record.
 * 3. Blocks access if organization is PENDING, REJECTED, or SUSPENDED.
 * 4. Blocks access if user's membership status is not ACTIVE.
 */
export async function requireApprovedOrganization(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin can inspect org data if needed, but for org-scoped user routes:
    const userId = req.user.id;

    // Fetch user's organization membership and linked organization
    const orgQuery = `
      SELECT 
        om.id AS member_id,
        om.organization_id,
        om.role AS member_role,
        om.status AS member_status,
        om.joined_at,
        o.id AS organization_id,
        o.name AS organization_name,
        o.organization_type,
        o.registration_number,
        o.official_email,
        o.contact_number,
        o.address,
        o.website,
        o.document_url,
        o.approval_status,
        o.reviewed_by,
        o.reviewed_at,
        o.rejection_reason,
        o.created_at AS organization_created_at
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id
      WHERE om.user_id = $1
      LIMIT 1
    `;

    const result = await query(orgQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No organization association found for this user account.',
        code: 'NO_ORGANIZATION_FOUND',
      });
    }

    const record = result.rows[0];

    // Check Member Status
    if (record.member_status !== 'ACTIVE') {
      return res.status(403).json({
        error: `Your membership in "${record.organization_name}" is currently ${record.member_status}. Access denied.`,
        code: 'MEMBERSHIP_NOT_ACTIVE',
        member_status: record.member_status,
      });
    }

    // Check Organization Approval Status
    if (record.approval_status !== 'APPROVED') {
      return res.status(403).json({
        error: `Organization "${record.organization_name}" is currently ${record.approval_status}. Access to organization dashboard is restricted until approved.`,
        code: 'ORGANIZATION_NOT_APPROVED',
        approval_status: record.approval_status,
        rejection_reason: record.rejection_reason,
        organization: {
          id: record.organization_id,
          name: record.organization_name,
          approval_status: record.approval_status,
          rejection_reason: record.rejection_reason,
        },
      });
    }

    // Attach trusted organization and membership to request
    req.organization = {
      id: record.organization_id,
      name: record.organization_name,
      organization_type: record.organization_type,
      registration_number: record.registration_number,
      official_email: record.official_email,
      contact_number: record.contact_number,
      address: record.address,
      website: record.website,
      document_url: record.document_url,
      approval_status: record.approval_status,
      created_at: record.organization_created_at,
    };

    req.membership = {
      id: record.member_id,
      role: record.member_role,
      status: record.member_status,
      joined_at: record.joined_at,
    };

    next();
  } catch (error) {
    console.error('[requireApprovedOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to verify organization status' });
  }
}

export default requireApprovedOrganization;
