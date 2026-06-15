import { createClient } from '@supabase/supabase-js';

const URL = process.env.SB_URL;
const PUB = process.env.SB_PUB;       // publishable / anon (public)
const SVC = process.env.SB_SVC;       // service role (bypasses RLS)

const anon = createClient(URL, PUB);
const admin = createClient(URL, SVC, { auth: { persistSession: false } });

const log = (label, ok, extra = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);

let failures = 0;
const expect = (cond, label, extra) => { if (!cond) failures++; log(label, cond, extra); };

// 1. Anon can read a public table (RLS public SELECT) and key is accepted
{
  const { data, error } = await anon.from('athlete_profiles').select('id').limit(1);
  expect(!error, 'anon SELECT athlete_profiles (public read + key accepted)', error?.message ?? `rows=${data?.length ?? 0}`);
}

// 2. Anon CANNOT write to organizations (RLS deny)
{
  const { error } = await anon.from('organizations').insert({ name: 'Hacker FC', type: 'club' });
  expect(!!error, 'anon INSERT organizations is BLOCKED by RLS', error ? 'denied' : 'UNEXPECTEDLY ALLOWED');
}

// 3. Anon CANNOT read sensitive PII table user_private
{
  const { data, error } = await anon.from('user_private').select('user_id').limit(1);
  // RLS returns 0 rows for anon (no policy), not necessarily an error
  expect((data?.length ?? 0) === 0, 'anon SELECT user_private returns no rows (PII protected)', error?.message ?? `rows=${data?.length ?? 0}`);
}

// 4. Admin (service role) seeds public content
{
  const orgs = [
    { name: 'Al Ain FC', type: 'club', city: 'Al Ain', country: 'UAE', is_verified: true, verification_status: 'approved' },
    { name: 'Shabab Al Ahli', type: 'club', city: 'Dubai', country: 'UAE', is_verified: true, verification_status: 'approved' },
    { name: 'UAE Football Academy', type: 'academy', city: 'Abu Dhabi', country: 'UAE', verification_status: 'approved' },
  ];
  const { error: e1 } = await admin.from('organizations').upsert(orgs, { onConflict: 'name', ignoreDuplicates: true });
  expect(!e1, 'admin seed organizations', e1?.message ?? `${orgs.length} rows`);

  const stories = [
    { title: 'From Al Ain academy to the Pro League', slug: 'al-ain-academy-pro', sport: 'Football', athlete_name: 'Khalid Al-Rashidi', is_published: true, published_at: new Date().toISOString() },
    { title: 'How verified data changed a scouting career', slug: 'verified-data-scouting', sport: 'Football', athlete_name: 'Tariq Hassan', is_published: true, published_at: new Date().toISOString() },
  ];
  const { error: e2 } = await admin.from('success_stories').upsert(stories, { onConflict: 'slug', ignoreDuplicates: true });
  expect(!e2, 'admin seed success_stories', e2?.message ?? `${stories.length} rows`);

  const { error: e3 } = await admin.from('platform_settings').upsert(
    [{ key: 'launch_sport', value: { sport: 'Football' } }, { key: 'features', value: { ai_discovery: true, payments: false } }],
    { onConflict: 'key' });
  expect(!e3, 'admin seed platform_settings', e3?.message ?? '2 keys');
}

// 5. Anon now sees published success_stories
{
  const { data, error } = await anon.from('success_stories').select('title').eq('is_published', true);
  expect(!error && (data?.length ?? 0) >= 2, 'anon SELECT published success_stories', error?.message ?? `rows=${data?.length ?? 0}`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
