import { supabaseAdmin } from '../supabase.js';

export async function resolveProfileScope(userId) {
  if (!supabaseAdmin) throw new Error('Supabase profile storage is not configured.');

  const { data: organizationProfile, error: organizationError } = await supabaseAdmin
    .from('organization_users')
    .select('organization_id, role, status')
    .eq('id', userId)
    .maybeSingle();
  if (organizationError) throw new Error(organizationError.message);
  if (organizationProfile) {
    if (organizationProfile.status !== 'ACTIVE') return null;
    return {
      authorScope: 'ORGANIZATION',
      organizationId: organizationProfile.organization_id,
      organizationRole: organizationProfile.role,
    };
  }

  const { data: individualProfile, error: individualError } = await supabaseAdmin
    .from('individual_users')
    .select('id, status')
    .eq('id', userId)
    .maybeSingle();
  if (individualError) throw new Error(individualError.message);
  if (individualProfile) {
    if (individualProfile.status !== 'ACTIVE') return null;
    return { authorScope: 'INDIVIDUAL', organizationId: null, organizationRole: null };
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('account_type')
    .eq('id', userId)
    .maybeSingle();
  if (userError) throw new Error(userError.message);
  if (user?.account_type === 'SUPER_ADMIN') {
    return { authorScope: 'INDIVIDUAL', organizationId: null, organizationRole: null };
  }
  return null;
}
