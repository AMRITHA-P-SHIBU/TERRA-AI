import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl:
        process.env.DB_SSL === 'false'
          ? false
          : connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'terra_ai',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(poolConfig);

let pgAvailable = false;
let checkDone = false;

// In-memory fallback tables if PostgreSQL is not yet configured or reachable
const memoryStore = {
  users: [],
  organizations: [],
  organization_members: [],
  organization_approval_logs: [],
  auth_tokens: [],
};

pool.on('error', (err) => {
  if (pgAvailable) {
    console.error('[PostgreSQL Pool Error]:', err.message);
  }
});

/**
 * Check if PostgreSQL is available
 */
async function isPgAvailable() {
  if (checkDone) return pgAvailable;
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    if (res && res.rows && res.rows.length > 0) {
      pgAvailable = true;
      console.log('✅ Connected to PostgreSQL database successfully.');
    }
  } catch (err) {
    pgAvailable = false;
    console.warn(
      '⚠️ [DB Note] PostgreSQL is not yet reachable (' +
        (err.message || 'connection failed') +
        '). Running with in-memory persistence fallback. Configure DATABASE_URL in server/.env and run "npm run migrate" for permanent PostgreSQL storage.'
    );
  }
  checkDone = true;
  return pgAvailable;
}

// Initial async check without blocking module load
isPgAvailable();

/**
 * Execute parameterized query
 * @param {string} text - SQL Query
 * @param {any[]} [params] - Parameters
 */
export async function query(text, params = []) {
  const isAvailable = await isPgAvailable();

  if (isAvailable) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      console.error('[PostgreSQL Query Error]', { text, error: err.message });
      throw err;
    }
  }

  // Fallback in-memory query handler
  return executeMemoryQuery(text, params);
}

/**
 * In-memory SQL emulator for development when PostgreSQL is not yet connected
 */
function executeMemoryQuery(text, params = []) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const upper = normalized.toUpperCase();

  // 1. SELECT NOW()
  if (upper.includes('SELECT NOW()')) {
    return {
      rows: [{ current_time: new Date().toISOString(), database: 'in_memory_fallback' }],
      rowCount: 1,
    };
  }

  // 2. USERS Queries
  if (upper.startsWith('INSERT INTO USERS')) {
    const id = crypto.randomUUID();
    const [full_name, email, password_hash, account_type, status, email_verified] = params;
    
    // Check unique email
    const existing = memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const error = new Error('duplicate key value violates unique constraint "users_email_key"');
      error.code = '23505';
      throw error;
    }

    const newUser = {
      id,
      full_name,
      email: email.toLowerCase(),
      password_hash,
      account_type: account_type || 'INDIVIDUAL',
      status: status || 'ACTIVE',
      email_verified: email_verified === true,
      created_at: new Date().toISOString(),
    };
    memoryStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  if (upper.includes('FROM USERS') && upper.includes('WHERE EMAIL =')) {
    const emailParam = params[0]?.toLowerCase();
    const user = memoryStore.users.find((u) => u.email.toLowerCase() === emailParam);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (upper.includes('FROM USERS') && upper.includes('WHERE ID =')) {
    const idParam = params[0];
    const user = memoryStore.users.find((u) => u.id === idParam);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (upper.startsWith('UPDATE USERS SET EMAIL_VERIFIED =') || upper.startsWith('UPDATE USERS SET PASSWORD_HASH =')) {
    if (upper.includes('PASSWORD_HASH = $1 WHERE ID = $2')) {
      const [newHash, id] = params;
      const user = memoryStore.users.find((u) => u.id === id);
      if (user) user.password_hash = newHash;
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (upper.includes('EMAIL_VERIFIED = TRUE WHERE ID = $1')) {
      const [id] = params;
      const user = memoryStore.users.find((u) => u.id === id);
      if (user) user.email_verified = true;
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (upper.includes('STATUS = $1 WHERE ID = $2')) {
      const [status, id] = params;
      const user = memoryStore.users.find((u) => u.id === id);
      if (user) user.status = status;
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
  }

  if (upper.includes('FROM USERS') && upper.includes('ORDER BY CREATED_AT DESC')) {
    const rows = [...memoryStore.users].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return { rows, rowCount: rows.length };
  }

  // 3. ORGANIZATIONS Queries
  if (upper.startsWith('INSERT INTO ORGANIZATIONS')) {
    const id = crypto.randomUUID();
    const [
      name,
      organization_type,
      registration_number,
      official_email,
      contact_number,
      address,
      website,
      document_url,
      approval_status,
    ] = params;

    const newOrg = {
      id,
      name,
      organization_type,
      registration_number: registration_number || null,
      official_email,
      contact_number,
      address,
      website: website || null,
      document_url: document_url || null,
      approval_status: approval_status || 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
    };
    memoryStore.organizations.push(newOrg);
    return { rows: [newOrg], rowCount: 1 };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes('WHERE ID =')) {
    const org = memoryStore.organizations.find((o) => o.id === params[0]);
    return { rows: org ? [org] : [], rowCount: org ? 1 : 0 };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes("APPROVAL_STATUS = 'PENDING'")) {
    const rows = memoryStore.organizations
      .filter((o) => o.approval_status === 'PENDING')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { rows, rowCount: rows.length };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes('ORDER BY CREATED_AT DESC')) {
    const rows = [...memoryStore.organizations].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return { rows, rowCount: rows.length };
  }

  if (upper.startsWith('UPDATE ORGANIZATIONS SET APPROVAL_STATUS =')) {
    const id = params[params.length - 1];
    let approval_status = 'APPROVED';
    let reviewed_by = null;
    let rejection_reason = null;

    if (params.length === 4) {
      [approval_status, reviewed_by, rejection_reason] = params;
    } else if (params.length === 3) {
      [approval_status, reviewed_by] = params;
    } else if (params.length === 2) {
      [reviewed_by] = params;
      approval_status = upper.includes('APPROVED')
        ? 'APPROVED'
        : upper.includes('SUSPENDED')
        ? 'SUSPENDED'
        : 'REJECTED';
    }

    const org = memoryStore.organizations.find((o) => o.id === id);
    if (org) {
      org.approval_status = approval_status;
      org.reviewed_by = reviewed_by;
      org.reviewed_at = new Date().toISOString();
      if (rejection_reason) org.rejection_reason = rejection_reason;
      if (approval_status === 'APPROVED') org.rejection_reason = null;
    }
    return { rows: org ? [org] : [], rowCount: org ? 1 : 0 };
  }

  // 4. ORGANIZATION MEMBERS Queries
  if (upper.startsWith('INSERT INTO ORGANIZATION_MEMBERS')) {
    const id = crypto.randomUUID();
    const [organization_id, user_id, role, status] = params;

    // Check unique (org, user)
    const existing = memoryStore.organization_members.find(
      (m) => m.organization_id === organization_id && m.user_id === user_id
    );
    if (existing) {
      const err = new Error('Member already exists in organization');
      err.code = '23505';
      throw err;
    }

    const member = {
      id,
      organization_id,
      user_id,
      role: role || 'MEMBER',
      status: status || 'ACTIVE',
      joined_at: new Date().toISOString(),
    };
    memoryStore.organization_members.push(member);
    return { rows: [member], rowCount: 1 };
  }

  if (upper.includes('FROM ORGANIZATION_MEMBERS') && upper.includes('JOIN ORGANIZATIONS')) {
    // Org membership lookup for user
    const userId = params[0];
    const memberships = memoryStore.organization_members.filter((m) => m.user_id === userId);
    const rows = memberships
      .map((m) => {
        const org = memoryStore.organizations.find((o) => o.id === m.organization_id);
        if (!org) return null;
        return {
          member_id: m.id,
          role: m.role,
          member_status: m.status,
          joined_at: m.joined_at,
          organization_id: org.id,
          organization_name: org.name,
          organization_type: org.organization_type,
          registration_number: org.registration_number,
          official_email: org.official_email,
          contact_number: org.contact_number,
          address: org.address,
          website: org.website,
          document_url: org.document_url,
          approval_status: org.approval_status,
          reviewed_by: org.reviewed_by,
          reviewed_at: org.reviewed_at,
          rejection_reason: org.rejection_reason,
          created_at: org.created_at,
        };
      })
      .filter(Boolean);
    return { rows, rowCount: rows.length };
  }

  if (upper.includes('FROM ORGANIZATION_MEMBERS') && upper.includes('JOIN USERS')) {
    // Org member list
    const orgId = params[0];
    const members = memoryStore.organization_members.filter((m) => m.organization_id === orgId);
    const rows = members.map((m) => {
      const user = memoryStore.users.find((u) => u.id === m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        full_name: user?.full_name || 'Unknown',
        email: user?.email || '',
        user_status: user?.status || 'ACTIVE',
      };
    });
    return { rows, rowCount: rows.length };
  }

  // 5. ORGANIZATION APPROVAL LOGS
  if (upper.startsWith('INSERT INTO ORGANIZATION_APPROVAL_LOGS')) {
    const id = crypto.randomUUID();
    const [organization_id, admin_id, action, remarks] = params;
    const log = {
      id,
      organization_id,
      admin_id,
      action,
      remarks: remarks || null,
      created_at: new Date().toISOString(),
    };
    memoryStore.organization_approval_logs.push(log);
    return { rows: [log], rowCount: 1 };
  }

  if (upper.includes('FROM ORGANIZATION_APPROVAL_LOGS')) {
    const orgId = params[0];
    const logs = memoryStore.organization_approval_logs
      .filter((l) => (orgId ? l.organization_id === orgId : true))
      .map((l) => {
        const admin = memoryStore.users.find((u) => u.id === l.admin_id);
        return {
          ...l,
          admin_name: admin?.full_name || 'System Admin',
          admin_email: admin?.email || '',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: logs, rowCount: logs.length };
  }

  // 6. AUTH TOKENS
  if (upper.startsWith('INSERT INTO AUTH_TOKENS')) {
    const id = crypto.randomUUID();
    let user_id, token, token_type, expires_at, metadata;
    if (params.length === 5) {
      [user_id, token, token_type, metadata, expires_at] = params;
      if (typeof metadata === 'string' && metadata.includes('T')) {
        expires_at = metadata;
        metadata = {};
      }
    } else if (params.length === 4) {
      [user_id, token, token_type, expires_at] = params;
      metadata = {};
    } else {
      [user_id, token, expires_at] = params;
      token_type = upper.includes('PASSWORD_RESET') ? 'PASSWORD_RESET' : 'EMAIL_VERIFICATION';
      metadata = {};
    }

    let parsedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      if (expires_at) {
        const d = new Date(expires_at);
        if (!isNaN(d.getTime())) parsedExpiresAt = d.toISOString();
      }
    } catch {}

    const tokenRecord = {
      id,
      user_id,
      token,
      token_type: token_type || 'EMAIL_VERIFICATION',
      expires_at: parsedExpiresAt,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };
    memoryStore.auth_tokens.push(tokenRecord);
    return { rows: [tokenRecord], rowCount: 1 };
  }

  if (upper.includes('FROM AUTH_TOKENS') && upper.includes('WHERE TOKEN =')) {
    const token = params[0];
    const type = params[1];
    const match = memoryStore.auth_tokens.find(
      (t) => t.token === token && (type ? t.token_type === type : true)
    );
    return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
  }

  if (upper.startsWith('DELETE FROM AUTH_TOKENS WHERE TOKEN =')) {
    const token = params[0];
    const idx = memoryStore.auth_tokens.findIndex((t) => t.token === token);
    if (idx !== -1) memoryStore.auth_tokens.splice(idx, 1);
    return { rowCount: 1, rows: [] };
  }

  return { rows: [], rowCount: 0 };
}

/**
 * Transaction client
 */
export async function getClient() {
  const isAvailable = await isPgAvailable();
  if (isAvailable) {
    return pool.connect();
  }

  // Simulated client for transaction handling
  return {
    query: (text, params) => executeMemoryQuery(text, params),
    release: () => {},
  };
}

/**
 * Test DB connection
 */
export async function testConnection() {
  try {
    const isAvailable = await isPgAvailable();
    if (isAvailable) {
      const res = await pool.query('SELECT NOW() as current_time, current_database() as database');
      return {
        connected: true,
        mode: 'postgresql',
        database: res.rows[0].database,
        time: res.rows[0].current_time,
      };
    }
  } catch (error) {
    // Return status
  }

  return {
    connected: true,
    mode: 'memory_fallback',
    database: 'terra_ai_memory_mode',
    time: new Date().toISOString(),
  };
}

export default {
  pool,
  query,
  getClient,
  testConnection,
};
