/**
 * database.js — Supabase JS REST adapter
 *
 * Provides the same query() / getClient() / testConnection() API as the old pg
 * layer, but communicates with Supabase over HTTPS (port 443) so it works on
 * any network, including those that block direct PostgreSQL TCP (5432 / 6543).
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// ---------------------------------------------------------------------------
// Supabase JS client (HTTPS / REST)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set in server/.env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// pg Pool shim — kept so migrate.js import doesn't break
// ---------------------------------------------------------------------------
const { Pool } = pg;
export const pool = new Pool({ host: 'localhost', database: 'terra_ai', user: 'postgres', password: 'postgres' });
pool.on('error', () => {}); // suppress unhandled pool errors (not used for queries)

// ---------------------------------------------------------------------------
// SQL → Supabase REST translator
// ---------------------------------------------------------------------------
export async function query(text, params = []) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const upper = normalized.toUpperCase();

  // SELECT NOW()
  if (upper.includes('SELECT NOW()')) {
    return { rows: [{ current_time: new Date().toISOString() }], rowCount: 1 };
  }

  // ── USERS ─────────────────────────────────────────────────────────────────

  if (upper.startsWith('INSERT INTO USERS')) {
    let full_name, email, password_hash, account_type, status, email_verified;
    if (params.length >= 6) {
      [full_name, email, password_hash, account_type, status, email_verified] = params;
    } else {
      [full_name, email, password_hash] = params;
      account_type = upper.includes("'ORG_ADMIN'") ? 'ORG_ADMIN' : 'INDIVIDUAL';
      status = upper.includes("'PENDING'") ? 'PENDING' : 'ACTIVE';
      email_verified = upper.includes('TRUE');
    }
    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name,
        email: email?.toLowerCase(),
        password_hash,
        account_type: account_type || 'INDIVIDUAL',
        status: status || 'ACTIVE',
        email_verified: email_verified ?? false,
      })
      .select('id, full_name, email, account_type, status, email_verified, created_at')
      .single();
    if (error) {
      const err = new Error(error.message);
      if (error.code === '23505') err.code = '23505';
      throw err;
    }
    return { rows: [data], rowCount: 1 };
  }

  // UPDATE users SET full_name, password_hash, account_type … (seed admin upsert)
  if (upper.startsWith('UPDATE USERS') && upper.includes('FULL_NAME = $1')) {
    const [full_name, password_hash, id] = params;
    const { data, error } = await supabase
      .from('users')
      .update({ full_name, password_hash, account_type: 'SUPER_ADMIN', status: 'ACTIVE', email_verified: true })
      .eq('id', id)
      .select('id, full_name, email, account_type, status, email_verified')
      .single();
    if (error) throw new Error(error.message);
    return { rows: [data], rowCount: 1 };
  }

  // UPDATE users SET password_hash
  if (upper.startsWith('UPDATE USERS SET PASSWORD_HASH')) {
    const [password_hash, id] = params;
    const { error } = await supabase.from('users').update({ password_hash }).eq('id', id);
    if (error) throw new Error(error.message);
    return { rows: [], rowCount: 1 };
  }

  // UPDATE users SET email_verified
  if (upper.startsWith('UPDATE USERS SET EMAIL_VERIFIED')) {
    const [id] = params;
    const { error } = await supabase.from('users').update({ email_verified: true }).eq('id', id);
    if (error) throw new Error(error.message);
    return { rows: [], rowCount: 1 };
  }

  // UPDATE users SET status
  if (upper.startsWith('UPDATE USERS SET STATUS')) {
    const [status, id] = params;
    const { error } = await supabase.from('users').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    return { rows: [], rowCount: 1 };
  }

  // SELECT … FROM users WHERE email = $1
  if (upper.includes('FROM USERS') && upper.includes('WHERE EMAIL =')) {
    const email = params[0]?.toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, password_hash, account_type, status, email_verified, created_at')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  // SELECT … FROM users WHERE id = $1
  if (upper.includes('FROM USERS') && upper.includes('WHERE ID =')) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, password_hash, account_type, status, email_verified, created_at')
      .eq('id', params[0])
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  // SELECT … FROM users ORDER BY created_at DESC
  if (upper.includes('FROM USERS') && upper.includes('ORDER BY CREATED_AT DESC')) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, account_type, status, email_verified, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  // ── ORGANIZATIONS ─────────────────────────────────────────────────────────

  if (upper.startsWith('INSERT INTO ORGANIZATIONS')) {
    const [name, organization_type, registration_number, official_email, contact_number, address, website, document_url, approval_status] = params;
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name, organization_type, registration_number: registration_number || null, official_email, contact_number, address, website: website || null, document_url: document_url || null, approval_status: approval_status || 'PENDING' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { rows: [data], rowCount: 1 };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes('WHERE ID =')) {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', params[0]).maybeSingle();
    if (error) throw new Error(error.message);
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes("APPROVAL_STATUS = 'PENDING'")) {
    const { data, error } = await supabase.from('organizations').select('*').eq('approval_status', 'PENDING').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  if (upper.includes('FROM ORGANIZATIONS') && upper.includes('ORDER BY CREATED_AT DESC')) {
    const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  if (upper.startsWith('UPDATE ORGANIZATIONS SET APPROVAL_STATUS =')) {
    const id = params[params.length - 1];
    let approval_status, reviewed_by, rejection_reason;
    if (params.length === 4) [approval_status, reviewed_by, rejection_reason] = params;
    else if (params.length === 3) [approval_status, reviewed_by] = params;
    else { approval_status = upper.includes('APPROVED') ? 'APPROVED' : upper.includes('SUSPENDED') ? 'SUSPENDED' : 'REJECTED'; [reviewed_by] = params; }
    const update = { approval_status, reviewed_by, reviewed_at: new Date().toISOString() };
    if (rejection_reason) update.rejection_reason = rejection_reason;
    if (approval_status === 'APPROVED') update.rejection_reason = null;
    const { data, error } = await supabase.from('organizations').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return { rows: [data], rowCount: 1 };
  }

  // ── ORGANIZATION MEMBERS ──────────────────────────────────────────────────

  if (upper.startsWith('INSERT INTO ORGANIZATION_MEMBERS')) {
    const [organization_id, user_id, role, status] = params;
    const { data, error } = await supabase
      .from('organization_members')
      .insert({ organization_id, user_id, role: role || 'MEMBER', status: status || 'ACTIVE' })
      .select()
      .single();
    if (error) { const err = new Error(error.message); if (error.code === '23505') err.code = '23505'; throw err; }
    return { rows: [data], rowCount: 1 };
  }

  // membership lookup for a user (join with organizations)
  if (upper.includes('FROM ORGANIZATION_MEMBERS') && upper.includes('JOIN ORGANIZATIONS')) {
    const userId = params[0];
    const { data: memberships, error: mErr } = await supabase
      .from('organization_members')
      .select('id, role, status, joined_at, organization_id')
      .eq('user_id', userId)
      .limit(1);
    if (mErr) throw new Error(mErr.message);
    if (!memberships || memberships.length === 0) return { rows: [], rowCount: 0 };
    const m = memberships[0];
    const { data: org, error: oErr } = await supabase.from('organizations').select('*').eq('id', m.organization_id).maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!org) return { rows: [], rowCount: 0 };
    const row = {
      member_id: m.id, member_role: m.role, member_status: m.status, joined_at: m.joined_at,
      organization_id: org.id, organization_name: org.name, organization_type: org.organization_type,
      registration_number: org.registration_number, official_email: org.official_email,
      contact_number: org.contact_number, address: org.address, website: org.website,
      document_url: org.document_url, approval_status: org.approval_status,
      reviewed_by: org.reviewed_by, reviewed_at: org.reviewed_at, rejection_reason: org.rejection_reason,
      created_at: org.created_at,
      role: m.role, status: m.status,
    };
    return { rows: [row], rowCount: 1 };
  }

  // member list for an org (join with users)
  if (upper.includes('FROM ORGANIZATION_MEMBERS') && upper.includes('JOIN USERS')) {
    const orgId = params[0];
    const { data: members, error: mErr } = await supabase.from('organization_members').select('id, user_id, role, status, joined_at').eq('organization_id', orgId);
    if (mErr) throw new Error(mErr.message);
    const rows = await Promise.all((members || []).map(async (m) => {
      const { data: u } = await supabase.from('users').select('full_name, email, status').eq('id', m.user_id).maybeSingle();
      return { id: m.id, user_id: m.user_id, role: m.role, status: m.status, joined_at: m.joined_at, full_name: u?.full_name || 'Unknown', email: u?.email || '', user_status: u?.status || 'ACTIVE' };
    }));
    return { rows, rowCount: rows.length };
  }

  // ── ORGANIZATION APPROVAL LOGS ────────────────────────────────────────────

  if (upper.startsWith('INSERT INTO ORGANIZATION_APPROVAL_LOGS')) {
    const [organization_id, admin_id, action, remarks] = params;
    const { data, error } = await supabase.from('organization_approval_logs').insert({ organization_id, admin_id, action, remarks: remarks || null }).select().single();
    if (error) throw new Error(error.message);
    return { rows: [data], rowCount: 1 };
  }

  if (upper.includes('FROM ORGANIZATION_APPROVAL_LOGS')) {
    const orgId = params[0];
    let q = supabase.from('organization_approval_logs').select('id, organization_id, admin_id, action, remarks, created_at').order('created_at', { ascending: false });
    if (orgId) q = q.eq('organization_id', orgId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = await Promise.all((data || []).map(async (l) => {
      const { data: admin } = await supabase.from('users').select('full_name, email').eq('id', l.admin_id).maybeSingle();
      return { ...l, admin_name: admin?.full_name || 'System Admin', admin_email: admin?.email || '' };
    }));
    return { rows, rowCount: rows.length };
  }

  // ── AUTH TOKENS ───────────────────────────────────────────────────────────

  if (upper.startsWith('INSERT INTO AUTH_TOKENS')) {
    let user_id, token, token_type, metadata, expires_at;
    if (params.length === 5) { [user_id, token, token_type, metadata, expires_at] = params; }
    else if (params.length === 4) { [user_id, token, token_type, expires_at] = params; metadata = {}; }
    else { [user_id, token, expires_at] = params; token_type = 'EMAIL_VERIFICATION'; metadata = {}; }
    const { data, error } = await supabase.from('auth_tokens').insert({ user_id, token, token_type, metadata: metadata || {}, expires_at }).select().single();
    if (error) throw new Error(error.message);
    return { rows: [data], rowCount: 1 };
  }

  if (upper.includes('FROM AUTH_TOKENS') && upper.includes('WHERE TOKEN =')) {
    let q = supabase.from('auth_tokens').select('id, user_id, token, token_type, expires_at, metadata').eq('token', params[0]);
    if (params[1]) q = q.eq('token_type', params[1]);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  if (upper.startsWith('DELETE FROM AUTH_TOKENS WHERE TOKEN =')) {
    const { error } = await supabase.from('auth_tokens').delete().eq('token', params[0]);
    if (error) throw new Error(error.message);
    return { rows: [], rowCount: 1 };
  }

  console.warn('[DB] Unhandled SQL pattern:', text.slice(0, 120));
  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// getClient — pseudo-transaction wrapper (Supabase REST is auto-commit)
// ---------------------------------------------------------------------------
export async function getClient() {
  return {
    query: (text, params) => query(text, params),
    release: () => {},
  };
}

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------
export async function testConnection() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (!error) {
      return { connected: true, mode: 'supabase-rest', database: 'supabase', time: new Date().toISOString() };
    }
    return { connected: false, mode: 'supabase-rest', error: error.message };
  } catch (err) {
    return { connected: false, mode: 'supabase-rest', error: err.message };
  }
}

export default { pool, query, getClient, testConnection };
