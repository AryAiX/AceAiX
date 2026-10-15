import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configMissing = !url || !anonKey;

/**
 * The same Supabase project the mobile app uses. The console signs in with a
 * normal account; every privileged read and action is a SECURITY DEFINER RPC
 * that checks the caller is `admin` or `super_admin` on the server.
 * No service-role key ever reaches the browser.
 */
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'aceaix-admin-auth' },
});
