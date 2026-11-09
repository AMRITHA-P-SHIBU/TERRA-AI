import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query, supabase } from '../config/database.js';
import { sendOrgDecisionEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');

/**
 * 1. Get Pending Organizations (For review queue)
 */
export async function getPendingOrganizations(_req, res) {
  try {
    const orgsRes = await query(
      `SELECT * FROM organizations 
       WHERE approval_status = 'PENDING' 
       ORDER BY created_at ASC`
    );

    return res.json({
      count: orgsRes.rows.length,
      organizations: orgsRes.rows,
    });
  } catch (error) {
    console.error('[getPendingOrganizations Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve pending organizations' });
  }
}

/**
 * 2. Get All Organizations (with stats)
 */
export async function getAllOrganizations(_req, res) {
  try {
    const orgsRes = await query(
      `SELECT * FROM organizations 
       ORDER BY created_at DESC`
    );

    return res.json({
      count: orgsRes.rows.length,
      organizations: orgsRes.rows,
    });
  } catch (error) {
    console.error('[getAllOrganizations Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve organizations' });
  }
}

/**
 * 3. Approve Organization
 */
export async function approveOrganization(req, res) {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};
    const adminId = req.user.id;

    // Verify organization exists
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const org = orgRes.rows[0];

    // Update organization approval_status = 'APPROVED'
    const updateRes = await query(
      `UPDATE organizations 
       SET approval_status = $1, reviewed_by = $2, reviewed_at = NOW(), rejection_reason = NULL 
       WHERE id = $3 
       RETURNING *`,
      ['APPROVED', adminId, id]
    );

    // Also activate the organization admin user(s)
    const membersRes = await query(
      `SELECT u.id, u.email, u.full_name 
       FROM organization_members om 
       JOIN users u ON om.user_id = u.id 
       WHERE om.organization_id = $1 AND om.role = 'ORG_ADMIN'`,
      [id]
    );

    for (const member of membersRes.rows) {
      await query("UPDATE users SET status = 'ACTIVE' WHERE id = $1", [member.id]);
    }

    // Write to audit log: organization_approval_logs
    await query(
      `INSERT INTO organization_approval_logs (organization_id, admin_id, action, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, adminId, 'APPROVED', remarks || 'Organization verified and approved.']
    );

    // Dispatch approval email
    sendOrgDecisionEmail(org.official_email, org.name, 'APPROVED').catch((err) =>
      console.error('[Approval Email Error]:', err)
    );

    return res.json({
      message: `Organization "${org.name}" has been approved successfully!`,
      organization: updateRes.rows[0],
    });
  } catch (error) {
    console.error('[approveOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to approve organization' });
  }
}

/**
 * 4. Reject Organization (Requires a reason)
 */
export async function rejectOrganization(req, res) {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;
    const adminId = req.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'A specific rejection reason is required.' });
    }

    // Verify organization exists
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const org = orgRes.rows[0];

    // Update status to REJECTED
    const updateRes = await query(
      `UPDATE organizations 
       SET approval_status = $1, reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3 
       WHERE id = $4 
       RETURNING *`,
      ['REJECTED', adminId, reason.trim(), id]
    );

    // Write to audit log
    await query(
      `INSERT INTO organization_approval_logs (organization_id, admin_id, action, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, adminId, 'REJECTED', remarks || reason]
    );

    // Dispatch rejection email
    sendOrgDecisionEmail(org.official_email, org.name, 'REJECTED', reason).catch((err) =>
      console.error('[Rejection Email Error]:', err)
    );

    return res.json({
      message: `Organization "${org.name}" has been rejected.`,
      organization: updateRes.rows[0],
    });
  } catch (error) {
    console.error('[rejectOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to reject organization' });
  }
}

/**
 * 5. Suspend Organization
 */
export async function suspendOrganization(req, res) {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};
    const adminId = req.user.id;

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const org = orgRes.rows[0];

    const updateRes = await query(
      `UPDATE organizations 
       SET approval_status = $1, reviewed_by = $2, reviewed_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      ['SUSPENDED', adminId, id]
    );

    // Write audit log
    await query(
      `INSERT INTO organization_approval_logs (organization_id, admin_id, action, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, adminId, 'SUSPENDED', remarks || 'Organization suspended by administrator.']
    );

    return res.json({
      message: `Organization "${org.name}" has been suspended.`,
      organization: updateRes.rows[0],
    });
  } catch (error) {
    console.error('[suspendOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to suspend organization' });
  }
}

/**
 * 6. Reactivate Suspended Organization
 */
export async function reactivateOrganization(req, res) {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};
    const adminId = req.user.id;

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const org = orgRes.rows[0];

    const updateRes = await query(
      `UPDATE organizations 
       SET approval_status = $1, reviewed_by = $2, reviewed_at = NOW(), rejection_reason = NULL 
       WHERE id = $3 
       RETURNING *`,
      ['APPROVED', adminId, id]
    );

    await query(
      `INSERT INTO organization_approval_logs (organization_id, admin_id, action, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, adminId, 'REACTIVATED', remarks || 'Organization reactivated.']
    );

    return res.json({
      message: `Organization "${org.name}" reactivated successfully.`,
      organization: updateRes.rows[0],
    });
  } catch (error) {
    console.error('[reactivateOrganization Error]:', error);
    return res.status(500).json({ error: 'Failed to reactivate organization' });
  }
}

/**
 * 7. Get Approval Logs for an Organization
 */
export async function getOrganizationLogs(req, res) {
  try {
    const { id } = req.params;
    const logsRes = await query(
      `SELECT 
        l.id, l.organization_id, l.admin_id, l.action, l.remarks, l.created_at,
        u.full_name AS admin_name, u.email AS admin_email
       FROM organization_approval_logs l
       JOIN users u ON l.admin_id = u.id
       WHERE l.organization_id = $1
       ORDER BY l.created_at DESC`,
      [id]
    );

    return res.json({ logs: logsRes.rows });
  } catch (error) {
    console.error('[getOrganizationLogs Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
}

/**
 * 8. Download / View Private Verification Document
 * Restricted strictly to SUPER_ADMIN
 */
export async function getOrganizationDocument(req, res) {
  try {
    const { id } = req.params;
    const orgRes = await query('SELECT id, name, document_url FROM organizations WHERE id = $1', [id]);

    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const documentName = orgRes.rows[0].document_url;
    if (!documentName) {
      return res.status(404).json({ error: 'No verification document was uploaded for this organization.' });
    }

    // Security: sanitize against directory traversal
    const safeBase = path.basename(documentName);
    const filePath = path.join(uploadDir, safeBase);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found on server storage.' });
    }

    // Send file securely
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[getOrganizationDocument Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve verification document' });
  }
}

/**
 * 9. Get All Users (Admin Management)
 */
export async function getAllUsers(_req, res) {
  try {
    const usersRes = await query(
      `SELECT id, full_name, email, account_type, status, email_verified, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    return res.json({
      count: usersRes.rows.length,
      users: usersRes.rows,
    });
  } catch (error) {
    console.error('[getAllUsers Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

/**
 * 10. Update User Status (Activate / Suspend)
 */
export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED.' });
    }

    // Prevent suspending self
    if (id === req.user.id && status === 'SUSPENDED') {
      return res.status(400).json({ error: 'You cannot suspend your own admin account.' });
    }

    const updateRes = await query(
      `UPDATE users 
       SET status = $1 
       WHERE id = $2 
       RETURNING id, full_name, email, account_type, status, email_verified, created_at`,
      [status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: `User status updated to ${status}.`,
      user: updateRes.rows[0],
    });
  } catch (error) {
    console.error('[updateUserStatus Error]:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
}

/**
 * 11. Get System & Platform Stats (Dashboard Overview)
 */
export async function getDashboardStats(_req, res) {
  try {
    // 1. Users
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, account_type, status, created_at');
    if (uErr) throw uErr;

    const totalUsers = users?.length || 0;
    const individualUsers = users?.filter(u => u.account_type === 'INDIVIDUAL').length || 0;
    const orgAdminUsers = users?.filter(u => u.account_type === 'ORG_ADMIN').length || 0;
    const superAdminUsers = users?.filter(u => u.account_type === 'SUPER_ADMIN').length || 0;
    const activeUsers = users?.filter(u => u.status === 'ACTIVE').length || 0;
    const suspendedUsers = users?.filter(u => u.status === 'SUSPENDED').length || 0;

    // Users joined in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = users?.filter(u => new Date(u.created_at) >= weekAgo).length || 0;

    // 2. Organizations
    const { data: orgs, error: oErr } = await supabase
      .from('organizations')
      .select('id, name, organization_type, approval_status, created_at');
    if (oErr) throw oErr;

    const totalOrgs = orgs?.length || 0;
    const approvedOrgs = orgs?.filter(o => o.approval_status === 'APPROVED').length || 0;
    const pendingOrgs = orgs?.filter(o => o.approval_status === 'PENDING').length || 0;
    const rejectedOrgs = orgs?.filter(o => o.approval_status === 'REJECTED').length || 0;

    // 3. Posts
    const { data: posts, error: pErr } = await supabase
      .from('posts')
      .select('id, status, created_at');
    if (pErr) throw pErr;

    const totalPosts = posts?.length || 0;
    const approvedPosts = posts?.filter(p => p.status === 'APPROVED').length || 0;
    const pendingPosts = posts?.filter(p => p.status === 'PENDING').length || 0;
    const rejectedPosts = posts?.filter(p => p.status === 'REJECTED').length || 0;
    const newPostsThisWeek = posts?.filter(p => new Date(p.created_at) >= weekAgo).length || 0;

    // 4. EcoPoints
    const { data: indUsers } = await supabase.from('individual_users').select('total_ecopoints');
    const { data: orgMembers } = await supabase.from('organization_users').select('total_ecopoints');

    const indEcoPoints = (indUsers || []).reduce((sum, u) => sum + (Number(u.total_ecopoints) || 0), 0);
    const orgEcoPoints = (orgMembers || []).reduce((sum, u) => sum + (Number(u.total_ecopoints) || 0), 0);
    const totalEcoPoints = indEcoPoints + orgEcoPoints;

    return res.json({
      users: {
        total: totalUsers,
        individual: individualUsers,
        orgAdmin: orgAdminUsers,
        superAdmin: superAdminUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newThisWeek: newUsersThisWeek,
      },
      organizations: {
        total: totalOrgs,
        approved: approvedOrgs,
        pending: pendingOrgs,
        rejected: rejectedOrgs,
      },
      posts: {
        total: totalPosts,
        approved: approvedPosts,
        pending: pendingPosts,
        rejected: rejectedPosts,
        newThisWeek: newPostsThisWeek,
      },
      ecopoints: {
        total: totalEcoPoints,
        individual: indEcoPoints,
        organization: orgEcoPoints,
      },
      system: {
        status: 'HEALTHY',
        serverTime: new Date().toISOString(),
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    console.error('[getDashboardStats Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
}

export default {
  getPendingOrganizations,
  getAllOrganizations,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  reactivateOrganization,
  getOrganizationLogs,
  getOrganizationDocument,
  getAllUsers,
  updateUserStatus,
  getDashboardStats,
};
