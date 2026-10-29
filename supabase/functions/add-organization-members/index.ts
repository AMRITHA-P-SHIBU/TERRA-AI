// ====================================================================
// Supabase Edge Function: add-organization-members
// Path: supabase/functions/add-organization-members/index.ts
//
// Deploy with:
//   supabase functions deploy add-organization-members --no-verify-jwt
//
// Environment variables automatically provided by Supabase:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
// ====================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // 1. Client for verifying caller token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized caller' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Admin client with service role key for user creation and cross-table management
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Verify caller membership & derive organization (NEVER trust client org ID)
    const { data: callerMembership, error: membershipErr } = await adminClient
      .from('organization_members')
      .select('id, organization_id, role, status')
      .eq('user_id', callerUser.id)
      .eq('role', 'ORG_ADMIN')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (membershipErr || !callerMembership) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Caller is not an active ORG_ADMIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = callerMembership.organization_id;

    // Verify organization is APPROVED
    const { data: organization, error: orgErr } = await adminClient
      .from('organizations')
      .select('id, name, approval_status')
      .eq('id', orgId)
      .eq('approval_status', 'APPROVED')
      .maybeSingle();

    if (orgErr || !organization) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Organization is not verified or approved' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse payload
    const body = await req.json();
    const membersToProcess = Array.isArray(body.members)
      ? body.members
      : [body];

    const added: any[] = [];
    const skipped: any[] = [];
    const failed: any[] = [];

    for (const item of membersToProcess) {
      const email = String(item.email || '').trim().toLowerCase();
      const fullName = String(item.fullName || item.full_name || email.split('@')[0]).trim();
      const password = String(item.password || 'Sjcet@123#').trim();
      const role = item.role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'MEMBER';

      if (!email || !email.includes('@')) {
        failed.push({ email, reason: 'Invalid email address' });
        continue;
      }

      try {
        // Check if user already in users table
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id, full_name, email')
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          // Check if already in this org
          const { data: existingMember } = await adminClient
            .from('organization_members')
            .select('id')
            .eq('organization_id', orgId)
            .eq('user_id', existingUser.id)
            .maybeSingle();

          if (existingMember) {
            skipped.push({ email, reason: 'Already a member of this organization' });
            continue;
          }

          // Link to organization
          await adminClient.from('organization_members').insert({
            organization_id: orgId,
            user_id: existingUser.id,
            role,
            status: 'ACTIVE',
          });

          added.push({ email, fullName: existingUser.full_name, linkedExisting: true });
          continue;
        }

        // Create Supabase Auth user
        const { data: authCreated, error: createAuthErr } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, must_change_password: true },
          });

        if (createAuthErr) {
          failed.push({ email, reason: createAuthErr.message });
          continue;
        }

        const newUserId = authCreated.user.id;

        // Insert into users table
        await adminClient.from('users').insert({
          id: newUserId,
          full_name: fullName,
          email,
          password_hash: '', // Handled by Supabase Auth
          account_type: 'INDIVIDUAL',
          status: 'ACTIVE',
          email_verified: true,
        });

        // Insert into profiles if table exists
        await adminClient.from('profiles').upsert({
          id: newUserId,
          username: email.split('@')[0],
          full_name: fullName,
          role: 'user',
        });

        // Insert into organization_members
        await adminClient.from('organization_members').insert({
          organization_id: orgId,
          user_id: newUserId,
          role,
          status: 'ACTIVE',
        });

        added.push({ email, fullName, userId: newUserId });
      } catch (err: any) {
        failed.push({ email, reason: err.message || 'Processing error' });
      }
    }

    return new Response(
      JSON.stringify({
        total: membersToProcess.length,
        addedCount: added.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        added,
        skipped,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

