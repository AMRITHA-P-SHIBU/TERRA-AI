import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingStorageConfig = [];
if (!supabaseUrl) missingStorageConfig.push('SUPABASE_URL');
if (!supabaseServiceRoleKey) missingStorageConfig.push('SUPABASE_SERVICE_ROLE_KEY');
if (missingStorageConfig.length) {
  console.error(`[Supabase Storage] Missing server environment variable(s): ${missingStorageConfig.join(', ')}. Private media uploads are unavailable.`);
} else {
  console.log('[Supabase Storage] Server credentials loaded; expected private bucket: post-media.');
}

export const supabase =
  supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)
    : null;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { status: 'not_configured', message: 'Supabase credentials are missing' };
  }

  let url;
  try {
    url = new URL('/auth/v1/health', supabaseUrl);
  } catch {
    return { status: 'disconnected', message: 'SUPABASE_URL is not a valid URL' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: supabaseAnonKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: 'disconnected',
        message: `Supabase returned HTTP ${response.status}; check your project URL and anon key`,
      };
    }

    return { status: 'connected', message: 'Supabase connected' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { status: 'disconnected', message: 'Supabase connection timed out' };
    }

    return { status: 'disconnected', message: 'Unable to reach Supabase' };
  } finally {
    clearTimeout(timeout);
  }
}
