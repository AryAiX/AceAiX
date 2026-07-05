/**
 * Create or update the AceAiX super admin account.
 *
 * Run with service-role credentials, for example:
 * SB_URL=https://...supabase.co SB_SVC=<service_role> SUPER_ADMIN_PASSWORD='...' npm run create:super-admin
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SB_URL;
const serviceRole = process.env.SB_SVC;
const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@aceaix.com').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
const fullName = process.env.SUPER_ADMIN_NAME || 'AceAiX Super Admin';

if (!url || !serviceRole || !password) {
  console.error('Set SB_URL, SB_SVC, and SUPER_ADMIN_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

async function findUserByEmail() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

async function main() {
  const existing = await findUserByEmail();
  const user = existing
    ? (await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { ...existing.user_metadata, full_name: fullName },
      })).data.user
    : (await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'super_admin' },
      })).data.user;

  if (!user) throw new Error('Unable to create or update auth user.');

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      role: 'super_admin',
      full_name: fullName,
      is_verified: true,
      subscription_tier: 'enterprise',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) throw profileError;

  await supabase.from('athlete_profiles').delete().eq('user_id', user.id);
  await supabase.from('user_private').upsert({ user_id: user.id, email }, { onConflict: 'user_id' });

  console.log(`Super admin ready: ${email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
