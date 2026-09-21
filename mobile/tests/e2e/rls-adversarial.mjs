#!/usr/bin/env node
/**
 * Adversarial RLS/permission checks against the configured remote Supabase.
 *
 * Uses only the public anon key and normal user sessions. Mutating ownership
 * probes use PostgREST's strict max-affected=0 preference, so a policy hole is
 * reported without committing the destructive UPDATE/DELETE.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MOBILE_PASSWORD = 'AceAiX-Demo-2026';
const WEB_PASSWORD = 'demo123456';

const ACCOUNT_SPECS = {
  layla: ['layla.demo@aceaix.com', MOBILE_PASSWORD, 'athlete'],
  marco: ['marco.demo@aceaix.com', MOBILE_PASSWORD, 'coach'],
  nadia: ['nadia.demo@aceaix.com', MOBILE_PASSWORD, 'scout'],
  academy: ['academy.demo@aceaix.com', MOBILE_PASSWORD, 'club'],
  parent: ['parent.demo@aceaix.com', MOBILE_PASSWORD, 'guardian'],
  mina: ['mina.demo@aceaix.com', MOBILE_PASSWORD, 'athlete'],
  webAthlete: ['athlete@aceaix.demo', WEB_PASSWORD, 'athlete'],
  webScout: ['scout@aceaix.demo', WEB_PASSWORD, 'scout'],
  webAdmin: ['admin@aceaix.demo', WEB_PASSWORD, 'admin'],
  webMedical: ['medical@aceaix.demo', WEB_PASSWORD, 'medical_partner'],
};

function readEnv() {
  const env = { ...process.env };
  for (const file of [path.join(ROOT, '.env'), path.join(ROOT, '../web/.env')]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || match[1] in env) continue;
      env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return env;
}

const env = readEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const anonymous = createClient(SUPABASE_URL, ANON_KEY, clientOptions);
const accounts = {};
const results = [];
const holes = [];
const cleanupProblems = [];

function securityBug(message, rank = 'HIGH') {
  const error = new Error(`SECURITY BUG: ${message}`);
  error.securityHole = true;
  error.rank = rank;
  return error;
}

function fixtureUnavailable(message) {
  const error = new Error(message);
  error.fixtureUnavailable = true;
  return error;
}

async function check(label, operation) {
  try {
    const detail = await operation();
    results.push({ label, ok: true, detail });
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const message = String(error?.message ?? error).split('\n')[0];
    if (error?.fixtureUnavailable) {
      results.push({ label, ok: true, skipped: true, message });
      console.log(`  SKIP ${label} — ${message}`);
      return;
    }
    results.push({ label, ok: false, message, securityHole: Boolean(error?.securityHole) });
    if (error?.securityHole) holes.push({ rank: error.rank ?? 'HIGH', label, message });
    console.log(`  FAIL ${label} — ${message}`);
  }
}

function requireNoError(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

function expectRows(data, context, minimum = 1) {
  if (!Array.isArray(data) || data.length < minimum) {
    throw new Error(`${context}: expected at least ${minimum} row(s), received ${data?.length ?? 0}`);
  }
  return data;
}

function expectDenied(result, context, rank = 'HIGH') {
  if (result.error) return `denied (${result.error.code ?? 'error'})`;
  const rows = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
  if (rows === 0) return 'denied (zero rows)';
  throw securityBug(`${context} succeeded and returned ${rows} row(s)`, rank);
}

async function signIn(name, spec) {
  const [email, password] = spec;
  const client = createClient(SUPABASE_URL, ANON_KEY, clientOptions);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  accounts[name] = { name, email, client, user: data.user, session: data.session };
  return accounts[name];
}

async function safeMutation(account, table, method, filter, body) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${filter}&select=id`,
    {
      method,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${account.session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'handling=strict,max-affected=0,return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, payload };
}

function expectSafeMutationDenied(result, context, rank = 'HIGH') {
  if (result.ok && Array.isArray(result.payload) && result.payload.length === 0) {
    return 'denied (zero rows; rollback guard armed)';
  }
  const code = result.payload?.code;
  const message = String(result.payload?.message ?? result.payload ?? '');
  if (code === 'PGRST124' || /max-affected|maximum number of rows/i.test(message)) {
    throw securityBug(`${context} would affect a protected row (server rolled it back)`, rank);
  }
  if (
    result.status === 401 ||
    result.status === 403 ||
    /permission denied|row-level security|violates row-level security/i.test(message)
  ) {
    return `denied (HTTP ${result.status})`;
  }
  throw new Error(`${context}: unexpected HTTP ${result.status}: ${message || 'empty response'}`);
}

async function cleanup(client, table, id, label) {
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) cleanupProblems.push(`${label}: ${error.message}`);
}

console.log('\n  authentication and fixtures');
for (const [name, spec] of Object.entries(ACCOUNT_SPECS)) {
  await check(`${spec[0]} signs in`, async () => {
    const account = await signIn(name, spec);
    const profile = requireNoError(
      await account.client
        .from('user_profiles')
        .select('id,role,is_verified,is_minor,is_discoverable,full_name,bio')
        .eq('id', account.user.id)
        .single(),
      'read own profile',
    );
    account.profile = profile;
    if (profile.role !== spec[2]) {
      throw new Error(`expected role ${spec[2]}, received ${profile.role}`);
    }
    return `${profile.role}${profile.is_minor ? ', minor' : ''}`;
  });
}

const layla = accounts.layla;
const marco = accounts.marco;
const nadia = accounts.nadia;
const parent = accounts.parent;
const mina = accounts.mina;
const athleteA = accounts.webAthlete;

const athleteProfiles = {};
for (const account of [layla, mina, athleteA]) {
  const data = requireNoError(
    await account.client.from('athlete_profiles').select('id,user_id,birth_date,bio').eq('user_id', account.user.id),
    `load athlete profile for ${account.email}`,
  );
  athleteProfiles[account.name] = expectRows(data, `${account.email} athlete profile`)[0];
}

const publicMedia = expectRows(
  requireNoError(
    await anonymous.from('athlete_media').select('id,athlete_id,title').eq('is_public', true).limit(100),
    'load public media fixtures',
  ),
  'public media fixtures',
);
let bProfile;
let bPost;
let bMatch;
let bMedia;
for (const media of publicMedia) {
  const profile = requireNoError(
    await anonymous.from('athlete_profiles').select('id,user_id,bio').eq('id', media.athlete_id).maybeSingle(),
    'load candidate athlete B profile',
  );
  if (!profile) continue;
  const [posts, matches] = await Promise.all([
    anonymous.from('posts').select('id,caption,text').eq('author_id', profile.user_id).limit(1),
    anonymous.from('match_records').select('id,notes').eq('athlete_id', profile.id).limit(1),
  ]);
  if (posts.error || matches.error || !posts.data?.length || !matches.data?.length) continue;
  bProfile = profile;
  bPost = posts.data[0];
  bMatch = matches.data[0];
  bMedia = media;
  break;
}
if (!bProfile) throw new Error('No public athlete B fixture has profile, media, post, and match rows');

console.log('\n  cross-athlete ownership');
await check('athlete A cannot update athlete B profile', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'athlete_profiles', 'PATCH', `id=eq.${bProfile.id}`, { bio: bProfile.bio }),
    `athlete_profiles UPDATE by ${athleteA.email}`,
  ));
await check('athlete A cannot delete athlete B profile', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'athlete_profiles', 'DELETE', `id=eq.${bProfile.id}`),
    `athlete_profiles DELETE by ${athleteA.email}`,
    'CRITICAL',
  ));
await check('athlete A cannot update athlete B media', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'athlete_media', 'PATCH', `id=eq.${bMedia.id}`, { title: bMedia.title }),
    `athlete_media UPDATE by ${athleteA.email}`,
  ));
await check('athlete A cannot delete athlete B media', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'athlete_media', 'DELETE', `id=eq.${bMedia.id}`),
    `athlete_media DELETE by ${athleteA.email}`,
  ));
await check('athlete A cannot update athlete B post', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'posts', 'PATCH', `id=eq.${bPost.id}`, { caption: bPost.caption }),
    `posts UPDATE by ${athleteA.email}`,
  ));
await check('athlete A cannot delete athlete B post', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'posts', 'DELETE', `id=eq.${bPost.id}`),
    `posts DELETE by ${athleteA.email}`,
  ));
await check('athlete A cannot update athlete B match', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'match_records', 'PATCH', `id=eq.${bMatch.id}`, { notes: bMatch.notes }),
    `match_records UPDATE by ${athleteA.email}`,
  ));
await check('athlete A cannot delete athlete B match', async () =>
  expectSafeMutationDenied(
    await safeMutation(athleteA, 'match_records', 'DELETE', `id=eq.${bMatch.id}`),
    `match_records DELETE by ${athleteA.email}`,
  ));
await check('athlete B can update own profile', async () => {
  const data = requireNoError(
    await layla.client
      .from('athlete_profiles')
      .update({ bio: athleteProfiles.layla.bio })
      .eq('id', athleteProfiles.layla.id)
      .select('id'),
    'own athlete profile no-op update',
  );
  expectRows(data, 'own profile update');
  return 'owner policy permits a no-op update';
});

console.log('\n  recruiter-only creation and applicants');
const badOpportunityId = crypto.randomUUID();
await check('athlete cannot insert an opportunity', async () => {
  const result = await layla.client.from('opportunities').insert({
    id: badOpportunityId,
    created_by_id: layla.user.id,
    title: `RLS adversarial ${badOpportunityId.slice(0, 8)}`,
    description: 'This row must be rejected by recruiter-only authorization.',
    type: 'trial',
    is_active: false,
  }).select('id');
  if (!result.error && result.data?.length) {
    await cleanup(layla.client, 'opportunities', badOpportunityId, 'unauthorized opportunity cleanup');
    throw securityBug(`opportunities INSERT by ${layla.email} succeeded`, 'CRITICAL');
  }
  return `denied (${result.error?.code ?? 'zero rows'})`;
});

const badChallengeId = crypto.randomUUID();
await check('athlete cannot insert a challenge', async () => {
  const result = await layla.client.from('challenges').insert({
    id: badChallengeId,
    created_by: layla.user.id,
    sport: 'Football',
    title: 'RLS denial probe',
    brief: 'This direct athlete insert must be rejected by table privileges.',
    closes_at: new Date(Date.now() + 86_400_000).toISOString(),
  }).select('id');
  if (!result.error && result.data?.length) {
    await cleanup(layla.client, 'challenges', badChallengeId, 'unauthorized challenge cleanup');
    throw securityBug(`challenges INSERT by ${layla.email} succeeded`, 'CRITICAL');
  }
  return `denied (${result.error?.code ?? 'zero rows'})`;
});

const ownedOpportunity = expectRows(
  requireNoError(
    await marco.client.from('opportunities').select('id,title').eq('created_by_id', marco.user.id).limit(1),
    'load Marco opportunity',
  ),
  'Marco opportunity fixture',
)[0];
await check('non-owner cannot read opportunity applicants via RPC', async () =>
  expectDenied(
    await layla.client.rpc('opportunity_applicants', { p_opportunity: ownedOpportunity.id }),
    `opportunity_applicants(${ownedOpportunity.id}) by ${layla.email}`,
  ));
await check('non-owner cannot read opportunity applicants table', async () =>
  expectDenied(
    await nadia.client
      .from('applications')
      .select('id')
      .eq('opportunity_id', ownedOpportunity.id),
    `applications SELECT for ${ownedOpportunity.id} by ${nadia.email}`,
  ));
await check('opportunity owner can read applicants', async () => {
  const data = requireNoError(
    await marco.client.rpc('opportunity_applicants', { p_opportunity: ownedOpportunity.id }),
    'owner applicant RPC',
  );
  return `owner RPC succeeded (${data.length} row(s))`;
});

console.log('\n  profile privilege escalation');
for (const role of ['admin', 'scout']) {
  await check(`athlete cannot set own role to ${role}`, async () =>
    expectDenied(
      await layla.client
        .from('user_profiles')
        .update({ role })
        .eq('id', layla.user.id)
        .select('id'),
      `user_profiles.role=${role} by ${layla.email}`,
      'CRITICAL',
    ));
}
await check('athlete cannot self-verify', async () =>
  expectDenied(
    await layla.client
      .from('user_profiles')
      .update({ is_verified: true })
      .eq('id', layla.user.id)
      .select('id'),
    `user_profiles.is_verified=true by ${layla.email}`,
    'CRITICAL',
  ));

console.log('\n  medical privacy');
for (const table of ['medical_records', 'medical_clearances', 'injuries']) {
  await check(`ungranted user cannot read another athlete's ${table}`, async () =>
    expectDenied(
      await athleteA.client.from(table).select('id').eq('athlete_id', athleteProfiles.layla.id),
      `${table} SELECT for ${athleteProfiles.layla.id} by ${athleteA.email}`,
      'CRITICAL',
    ));
  await check(`athlete can query own ${table}`, async () => {
    const data = requireNoError(
      await layla.client.from(table).select('id').eq('athlete_id', athleteProfiles.layla.id),
      `own ${table} query`,
    );
    return `owner query succeeded (${data.length} row(s))`;
  });
}

console.log('\n  youth safety');
await check('unverified adult cannot read hidden minor profile row', async () =>
  expectDenied(
    await layla.client.from('user_profiles').select('id').eq('id', mina.user.id),
    `hidden minor user_profiles SELECT by ${layla.email}`,
    'CRITICAL',
  ));
await check('unverified adult cannot read minor athlete row or exact DOB', async () =>
  expectDenied(
    await layla.client.from('athlete_profiles').select('id,birth_date').eq('user_id', mina.user.id),
    `minor athlete_profiles SELECT by ${layla.email}`,
    'CRITICAL',
  ));
await check('hidden minor is absent from people search', async () => {
  const data = requireNoError(
    await layla.client.rpc('search_people', {
      p_query: mina.profile.full_name,
      p_role: 'athlete',
      p_limit: 20,
    }),
    'minor people search',
  );
  if (data.some((row) => row.id === mina.user.id)) {
    throw securityBug(`search_people exposed hidden minor ${mina.email}`, 'CRITICAL');
  }
  return 'minor absent';
});
await check('minor cannot create an opportunity', async () => {
  const id = crypto.randomUUID();
  const result = await mina.client.from('opportunities').insert({
    id,
    created_by_id: mina.user.id,
    title: 'Minor adult-feature denial probe',
    type: 'trial',
    is_active: false,
  }).select('id');
  if (!result.error && result.data?.length) {
    await cleanup(mina.client, 'opportunities', id, 'minor opportunity cleanup');
    throw securityBug(`minor ${mina.email} inserted an opportunity`, 'CRITICAL');
  }
  return `denied (${result.error?.code ?? 'zero rows'})`;
});
await check('minor cannot create a challenge', async () =>
  expectDenied(
    await mina.client.rpc('create_challenge', {
      p_sport: 'Football',
      p_title: 'Minor denial probe',
      p_brief: 'A minor athlete must not be able to set recruiter challenges.',
      p_closes_at: new Date(Date.now() + 86_400_000).toISOString(),
    }),
    `create_challenge by minor ${mina.email}`,
    'CRITICAL',
  ));
await check('unverified adult cannot message a minor', async () => {
  const data = requireNoError(
    await layla.client.rpc('can_message_user', { p_recipient: mina.user.id }),
    'minor message preflight',
  );
  if (data.allowed) throw securityBug(`${layla.email} can message minor ${mina.email}`, 'CRITICAL');
  return data.reason ?? 'denied';
});
await check('unverified adult cannot start conversation with minor', async () =>
  expectDenied(
    await layla.client.rpc('start_conversation', { p_user: mina.user.id }),
    `start_conversation from ${layla.email} to ${mina.email}`,
    'CRITICAL',
  ));

console.log('\n  blocked-user semantics');
let blockCreated = false;
try {
  await check('blocker can block another account', async () => {
    requireNoError(await layla.client.rpc('block_user', { p_user: nadia.user.id }), 'block_user');
    blockCreated = true;
    return `${layla.email} blocked ${nadia.email}`;
  });
  await check('blocked account cannot start a conversation', async () =>
    expectDenied(
      await nadia.client.rpc('start_conversation', { p_user: layla.user.id }),
      `blocked start_conversation by ${nadia.email}`,
      'CRITICAL',
    ));
  await check('blocked account cannot follow blocker', async () => {
    const result = await nadia.client.from('follows').insert({
      follower_id: nadia.user.id,
      following_id: layla.user.id,
    }).select('id');
    if (!result.error && result.data?.length) {
      await nadia.client
        .from('follows')
        .delete()
        .eq('follower_id', nadia.user.id)
        .eq('following_id', layla.user.id);
      throw securityBug(
        `follows INSERT by blocked ${nadia.email} toward blocker ${layla.email} succeeded`,
        'HIGH',
      );
    }
    return `denied (${result.error?.code ?? 'zero rows'})`;
  });
  await check('blocked account cannot discover blocker in search', async () => {
    const data = requireNoError(
      await nadia.client.rpc('search_people', {
        p_query: layla.profile.full_name,
        p_role: null,
        p_limit: 20,
      }),
      'blocked search_people',
    );
    if (data.some((row) => row.id === layla.user.id)) {
      throw securityBug(`search_people exposed blocker ${layla.email} to ${nadia.email}`);
    }
    return 'blocked profile absent';
  });
} finally {
  if (blockCreated) {
    const result = await layla.client.rpc('unblock_user', { p_user: nadia.user.id });
    if (result.error) cleanupProblems.push(`unblock ${nadia.email}: ${result.error.message}`);
  }
}

console.log('\n  messaging isolation');
const laylaConversation = expectRows(
  requireNoError(
    await layla.client
      .from('conversations')
      .select('id,participant_1_id,participant_2_id')
      .limit(1),
    'load Layla conversation',
  ),
  'Layla conversation fixture',
)[0];
await check('non-participant cannot read another conversation', async () =>
  expectDenied(
    await nadia.client.from('conversations').select('id').eq('id', laylaConversation.id),
    `conversations SELECT by ${nadia.email}`,
    'CRITICAL',
  ));
await check('non-participant cannot read another conversation messages', async () =>
  expectDenied(
    await nadia.client.from('messages').select('id').eq('conversation_id', laylaConversation.id),
    `messages SELECT by ${nadia.email}`,
    'CRITICAL',
  ));
await check('non-participant cannot insert into another conversation', async () => {
  const id = crypto.randomUUID();
  const result = await nadia.client.from('messages').insert({
    id,
    conversation_id: laylaConversation.id,
    sender_id: nadia.user.id,
    content: 'RLS adversarial probe; this must never be stored.',
  }).select('id');
  if (!result.error && result.data?.length) {
    await cleanup(nadia.client, 'messages', id, 'unauthorized message cleanup');
    throw securityBug(`messages INSERT by non-participant ${nadia.email} succeeded`, 'CRITICAL');
  }
  return `denied (${result.error?.code ?? 'zero rows'})`;
});
await check('participant can read own conversation', async () => {
  const data = requireNoError(
    await layla.client.from('conversations').select('id').eq('id', laylaConversation.id),
    'participant conversation query',
  );
  expectRows(data, 'participant conversation');
  return 'participant row visible';
});

console.log('\n  notification isolation');
const laylaNotification = expectRows(
  requireNoError(
    await layla.client.from('notifications').select('id,is_read').limit(1),
    'load Layla notification',
  ),
  'Layla notification fixture',
)[0];
await check('other user cannot read notification', async () =>
  expectDenied(
    await nadia.client.from('notifications').select('id').eq('id', laylaNotification.id),
    `notifications SELECT by ${nadia.email}`,
    'CRITICAL',
  ));
await check('other user cannot update notification', async () =>
  expectSafeMutationDenied(
    await safeMutation(nadia, 'notifications', 'PATCH', `id=eq.${laylaNotification.id}`, {
      is_read: laylaNotification.is_read,
    }),
    `notifications UPDATE by ${nadia.email}`,
    'CRITICAL',
  ));
await check('notification owner can read own notification', async () => {
  const data = requireNoError(
    await layla.client.from('notifications').select('id').eq('id', laylaNotification.id),
    'own notification query',
  );
  expectRows(data, 'own notification');
  return 'owner row visible';
});

console.log('\n  guardian scope');
await check('guardian can list only linked minors', async () => {
  const data = requireNoError(await parent.client.rpc('my_linked_minors'), 'my_linked_minors');
  parent.linkedMinors = data;
  if (!data.some((row) => row.minor_user_id === mina.user.id)) {
    throw fixtureUnavailable(`${parent.email} is not linked to demo minor ${mina.email}`);
  }
  if (data.some((row) => row.minor_user_id === layla.user.id)) {
    throw securityBug(`guardian list incorrectly includes unrelated adult ${layla.email}`);
  }
  return `${data.length} linked minor(s)`;
});
await check('guardian can inspect linked minor conversation metadata', async () => {
  if (!parent.linkedMinors?.some((row) => row.minor_user_id === mina.user.id)) {
    throw fixtureUnavailable(`${parent.email} is not linked to demo minor ${mina.email}`);
  }
  const data = requireNoError(
    await parent.client.rpc('guardian_conversation_overview', { p_minor: mina.user.id }),
    'linked minor overview',
  );
  return `authorized overview succeeded (${data.length} row(s))`;
});
await check('guardian cannot act on arbitrary athlete', async () =>
  expectDenied(
    await parent.client.rpc('guardian_conversation_overview', { p_minor: layla.user.id }),
    `guardian_conversation_overview for unrelated ${layla.email}`,
    'CRITICAL',
  ));
await check('guardian cannot read arbitrary guardian consent rows', async () =>
  expectDenied(
    await parent.client
      .from('guardian_consents')
      .select('id')
      .eq('minor_user_id', layla.user.id),
    `guardian_consents SELECT for unrelated ${layla.email}`,
    'CRITICAL',
  ));

console.log('\n  anonymous access');
await check('anonymous can read intended adult public profiles', async () => {
  const data = requireNoError(
    await anonymous.from('user_profiles').select('id,is_minor').limit(100),
    'anonymous user_profiles',
  );
  if (!data.length) throw new Error('no public adult profiles were visible');
  if (data.some((row) => row.is_minor || row.id === mina.user.id)) {
    throw securityBug('anonymous user_profiles query exposed a minor', 'CRITICAL');
  }
  return `${data.length} adult public row(s)`;
});
await check('anonymous cannot read minor athlete profile', async () =>
  expectDenied(
    await anonymous.from('athlete_profiles').select('id,birth_date').eq('user_id', mina.user.id),
    `anonymous athlete_profiles SELECT for ${mina.email}`,
    'CRITICAL',
  ));
for (const table of ['medical_records', 'medical_clearances', 'conversations', 'messages', 'notifications']) {
  await check(`anonymous cannot read ${table}`, async () =>
    expectDenied(
      await anonymous.from(table).select('id').limit(5),
      `anonymous ${table} SELECT`,
      'CRITICAL',
    ));
}

if (cleanupProblems.length) {
  for (const problem of cleanupProblems) {
    results.push({ label: 'cleanup', ok: false, message: problem });
    console.log(`  FAIL cleanup — ${problem}`);
  }
}

const failed = results.filter((result) => !result.ok);
const skipped = results.filter((result) => result.skipped);
console.log(`\n  ${results.length - failed.length - skipped.length}/${results.length} adversarial checks passed`);
if (skipped.length) console.log(`  ${skipped.length} skipped because the hosted demo fixture is unavailable`);
console.log(`  ${holes.length} security hole(s) detected`);
if (holes.length) {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  holes.sort((a, b) => (order[a.rank] ?? 9) - (order[b.rank] ?? 9));
  for (const hole of holes) console.log(`  ${hole.rank.padEnd(8)} ${hole.label}: ${hole.message}`);
}
console.log('');
if (failed.length) process.exitCode = 1;
