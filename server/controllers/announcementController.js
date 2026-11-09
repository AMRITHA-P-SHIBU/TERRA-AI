import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, supabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const announcementsFile = path.join(dataDir, 'announcements.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadAnnouncements() {
  try {
    if (fs.existsSync(announcementsFile)) {
      const content = fs.readFileSync(announcementsFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[loadAnnouncements Error]:', err.message);
  }
  return [];
}

function saveAnnouncements(list) {
  try {
    fs.writeFileSync(announcementsFile, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[saveAnnouncements Error]:', err.message);
  }
}

// Seed default welcome announcements if empty
function initializeAnnouncements() {
  const current = loadAnnouncements();
  if (current.length === 0) {
    const defaultAnnouncements = [
      {
        id: 'ann_platform_welcome',
        title: 'Welcome to Terra AI Environmental Intelligence Platform',
        content: 'Join our collective mission to lower carbon footprints across India. Track your zero-waste milestones on GreenFeed, compute household emissions with our certified Carbon Tracker, and trade pre-loved goods on Eco Exchange!',
        category: 'ECO_CAMPAIGN',
        priority: 'HIGH',
        scope: 'PLATFORM',
        organization_id: null,
        organization_name: 'Terra AI Super Admin',
        author_id: 'cfaffdc6-30da-48db-8cb8-653dbcf8b9f5',
        author_name: 'Super Admin',
        author_role: 'SUPER_ADMIN',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'ann_sjcet_welcome',
        title: 'SJCET Green Campus Clean-Up & Zero-Waste Week',
        content: 'Attention all students and faculty members of St. Joseph College of Engineering and Technology (SJCET): Please join the campus tree plantation drive this Friday at 10:00 AM near the central courtyard. Earn bonus EcoPoints on verification!',
        category: 'EVENT',
        priority: 'URGENT',
        scope: 'ORGANIZATION',
        organization_id: '0fa1a879-2b29-4045-88cb-e157eaab4bd0',
        organization_name: 'SJCET',
        author_id: '47b7d9fe-87bf-4987-9aab-624762808bf3',
        author_name: 'V P Devasia (Org Admin)',
        author_role: 'ORG_ADMIN',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      }
    ];
    saveAnnouncements(defaultAnnouncements);
  }
}

initializeAnnouncements();

/**
 * Helper to resolve user's organization id (if any)
 */
async function resolveUserOrgId(userId) {
  try {
    // 1. Check organization_members
    const memRes = await query(
      `SELECT om.organization_id, om.role, o.name as org_name
       FROM organization_members om
       LEFT JOIN organizations o ON om.organization_id = o.id
       WHERE om.user_id = $1 AND om.status = 'ACTIVE' LIMIT 1`,
      [userId]
    );
    if (memRes.rows && memRes.rows.length > 0) {
      return {
        organization_id: memRes.rows[0].organization_id,
        role: memRes.rows[0].role,
        org_name: memRes.rows[0].org_name,
      };
    }

    // 2. Fallback check organization_users in supabase
    const { data: ou } = await supabase
      .from('organization_users')
      .select('organization_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (ou?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', ou.organization_id)
        .maybeSingle();
      return {
        organization_id: ou.organization_id,
        role: ou.role,
        org_name: org?.name || 'Organization',
      };
    }
  } catch (err) {
    console.error('[resolveUserOrgId Error]:', err.message);
  }
  return null;
}

/**
 * GET /api/announcements
 * Returns announcements tailored to the viewer:
 * - Organization users (org admin or org member) see their Organization's announcements
 * - Other users (individual citizens) see Super Admin announcements
 * - Super Admin can see all or platform announcements
 */
export async function getAnnouncements(req, res) {
  try {
    const list = loadAnnouncements();
    const user = req.user;
    const { manage, scope, orgId } = req.query;

    if (!user) {
      // Unauthenticated public visitors see platform announcements
      return res.json({
        announcements: list.filter((a) => a.scope === 'PLATFORM'),
      });
    }

    const orgInfo = await resolveUserOrgId(user.id);
    const isSuperAdmin = user.account_type === 'SUPER_ADMIN';
    const isOrgAdmin = user.account_type === 'ORG_ADMIN' || orgInfo?.role === 'ORG_ADMIN';

    // If requested for management view in admin consoles:
    if (manage === 'true') {
      if (isSuperAdmin) {
        // Super Admin manages platform announcements
        const filtered = list.filter((a) => a.scope === 'PLATFORM');
        return res.json({ announcements: filtered, role: 'SUPER_ADMIN' });
      }
      if (isOrgAdmin && orgInfo?.organization_id) {
        // Org Admin manages their own org's announcements
        const filtered = list.filter((a) => a.scope === 'ORGANIZATION' && a.organization_id === orgInfo.organization_id);
        return res.json({ announcements: filtered, role: 'ORG_ADMIN', orgInfo });
      }
    }

    // Normal user feed viewing logic:
    // If the user belongs to an organization (e.g. SJCET org member or admin):
    if (orgInfo?.organization_id) {
      const orgAnnouncements = list.filter(
        (a) => a.scope === 'ORGANIZATION' && a.organization_id === orgInfo.organization_id
      );
      return res.json({
        scope: 'ORGANIZATION',
        organization_id: orgInfo.organization_id,
        organization_name: orgInfo.org_name,
        announcements: orgAnnouncements,
      });
    }

    // For other users (individual citizens): show platform/Super Admin announcements!
    const platformAnnouncements = list.filter((a) => a.scope === 'PLATFORM');
    return res.json({
      scope: 'PLATFORM',
      announcements: platformAnnouncements,
    });
  } catch (err) {
    console.error('[getAnnouncements Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve announcements' });
  }
}

/**
 * POST /api/announcements
 * Adds an announcement:
 * - Super Admin adds PLATFORM announcements (visible to individual / other users)
 * - Org Admin adds ORGANIZATION announcements (visible to members of that organization)
 */
export async function createAnnouncement(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { title, content, category = 'GENERAL', priority = 'MEDIUM' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Announcement content is required' });
    }

    const orgInfo = await resolveUserOrgId(user.id);
    const isSuperAdmin = user.account_type === 'SUPER_ADMIN';
    const isOrgAdmin = user.account_type === 'ORG_ADMIN' || orgInfo?.role === 'ORG_ADMIN';

    if (!isSuperAdmin && !isOrgAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only administrators can create announcements' });
    }

    let scope = 'PLATFORM';
    let organization_id = null;
    let organization_name = 'Terra AI Administration';

    if (isOrgAdmin && !isSuperAdmin) {
      if (!orgInfo?.organization_id) {
        return res.status(400).json({ error: 'Organization admin profile is not linked to any active organization.' });
      }
      scope = 'ORGANIZATION';
      organization_id = orgInfo.organization_id;
      organization_name = orgInfo.org_name || 'Organization';
    }

    const newAnnouncement = {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      content: content.trim(),
      category: category.trim().toUpperCase(),
      priority: priority.trim().toUpperCase(),
      scope,
      organization_id,
      organization_name,
      author_id: user.id,
      author_name: user.full_name || (isSuperAdmin ? 'Super Admin' : 'Organization Admin'),
      author_role: isSuperAdmin ? 'SUPER_ADMIN' : 'ORG_ADMIN',
      created_at: new Date().toISOString(),
    };

    const list = loadAnnouncements();
    list.unshift(newAnnouncement);
    saveAnnouncements(list);

    console.log(`[Announcements] Created announcement "${newAnnouncement.title}" by ${user.email} (scope: ${scope})`);
    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      announcement: newAnnouncement,
    });
  } catch (err) {
    console.error('[createAnnouncement Error]:', err);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
}

/**
 * DELETE /api/announcements/:id
 * Deletes an announcement:
 * - Super Admin can delete any announcement
 * - Org Admin can delete announcements belonging to their organization
 */
export async function deleteAnnouncement(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const list = loadAnnouncements();
    const target = list.find((a) => a.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const isSuperAdmin = user.account_type === 'SUPER_ADMIN';
    const orgInfo = await resolveUserOrgId(user.id);
    const isOrgAdmin = user.account_type === 'ORG_ADMIN' || orgInfo?.role === 'ORG_ADMIN';

    if (!isSuperAdmin) {
      if (!isOrgAdmin || target.organization_id !== orgInfo?.organization_id) {
        return res.status(403).json({ error: 'You do not have permission to delete this announcement' });
      }
    }

    const updated = list.filter((a) => a.id !== id);
    saveAnnouncements(updated);

    return res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('[deleteAnnouncement Error]:', err);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

export default {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};

