#!/usr/bin/env node
/**
 * Major-flow verification against a hosted Supabase project (dev or prd).
 *
 * Unlike rls-adversarial.mjs, this suite seeds nothing and depends on no demo
 * accounts. It creates throwaway users, exercises the flows a real athlete and
 * scout go through, then deletes them, so it is safe to point at production.
 *
 * Resolve a target with either:
 *   SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN   (keys fetched from the API)
 * or explicit values:
 *   HOSTED_URL + HOSTED_ANON_KEY + HOSTED_SERVICE_ROLE_KEY
 *
 * The service-role key is used only to confirm signup emails (so login can be
 * tested without a mail round-trip), to read back rows the client must not be
 * able to change, and to delete the users afterwards.
 */

import { createClient } from '@supabase/supabase-js';

const PASSWORD = 'AceAiX-Hosted-QA-2026';
const stamp = Date.now();

async function resolveTarget() {
  const url = process.env.HOSTED_URL;
  const anon = process.env.HOSTED_ANON_KEY;
  const service = process.env.HOSTED_SERVICE_ROLE_KEY;
  if (url && anon && service) return { url, anon, service };

  const ref = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) {
    throw new Error(
      'Set HOSTED_URL + HOSTED_ANON_KEY + HOSTED_SERVICE_ROLE_KEY, ' +
        'or SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN',
    );
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`could not read API keys for ${ref}: HTTP ${res.status}`);
  const keys = await res.json();

  // Prefer the newer publishable/secret pair, fall back to the legacy names.
  const publishable = keys.find((k) => k.type === 'publishable')?.api_key;
  const legacyAnon = keys.find((k) => k.id === 'anon')?.api_key;
  const secret = keys.find((k) => k.id === 'service_role')?.api_key;
  return {
    url: `https://${ref}.supabase.co`,
    anon: publishable || legacyAnon,
    service: secret,
  };
}

const { url: URL_, anon: ANON, service: SERVICE } = await resolveTarget();
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

let passed = 0;
const failures = [];

function ok(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const section = (title) => console.log(`\n── ${title}`);
const anonClient = () => createClient(URL_, ANON, { auth: { persistSession: false } });

const createdUserIds = [];

async function signUp(tag, role) {
  const email = `qa.hosted.${tag}.${stamp}@aceaix.demo`;
  const { data, error } = await anonClient().auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { role, full_name: `QA ${tag}`, first_name: 'QA', last_name: tag } },
  });
  if (error) throw new Error(`signup ${tag}: ${error.message}`);
  createdUserIds.push(data.user.id);
  const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, {
    email_confirm: true,
  });
  if (confirmError) throw confirmError;
  return { email, id: data.user.id };
}

async function signIn(email) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { client, user: data.user };
}

try {
  console.log(`Hosted flow verification @ ${URL_}`);

  section('Signup');
  const athlete = await signUp('athlete', 'athlete');
  ok('athlete signup creates an auth user', Boolean(athlete.id));
  const scout = await signUp('scout', 'scout');
  ok('scout signup creates an auth user', Boolean(scout.id));

  const { data: seededProfile } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('id', athlete.id)
    .maybeSingle();
  ok('auth trigger creates the profile row', Boolean(seededProfile));
  ok('signup role is persisted', seededProfile?.role === 'athlete', `got ${seededProfile?.role}`);

  const { data: duplicate } = await anonClient().auth.signUp({
    email: athlete.email,
    password: PASSWORD,
  });
  ok(
    'duplicate signup does not create a second user',
    !duplicate?.user || duplicate.user.identities?.length === 0,
  );

  const { error: weakPasswordError } = await anonClient().auth.signUp({
    email: `qa.hosted.weak.${stamp}@aceaix.demo`,
    password: '123',
  });
  ok('weak password is rejected', Boolean(weakPasswordError));

  section('Login');
  const athleteSession = await signIn(athlete.email);
  ok('athlete can sign in', Boolean(athleteSession.user));
  const scoutSession = await signIn(scout.email);
  ok('scout can sign in', Boolean(scoutSession.user));

  const { error: wrongPasswordError } = await anonClient().auth.signInWithPassword({
    email: athlete.email,
    password: 'WrongPassword!1',
  });
  ok('wrong password is rejected', Boolean(wrongPasswordError));

  section('Account lookup RPC');
  const { data: knownEmail, error: knownEmailError } = await athleteSession.client.rpc(
    'check_email_exists',
    { p_email: athlete.email },
  );
  ok('check_email_exists is callable', !knownEmailError, knownEmailError?.message);
  ok('check_email_exists is true for a known address', knownEmail === true);

  const { data: unknownEmail } = await athleteSession.client.rpc('check_email_exists', {
    p_email: `nobody.${stamp}@aceaix.demo`,
  });
  ok('check_email_exists is false for an unknown address', unknownEmail === false);

  section('Profile');
  const { data: ownProfile, error: ownProfileError } = await athleteSession.client
    .from('user_profiles')
    .select('id, role, full_name')
    .eq('id', athlete.id)
    .maybeSingle();
  ok('athlete reads their own profile', !ownProfileError && Boolean(ownProfile), ownProfileError?.message);

  const { error: profileUpdateError } = await athleteSession.client
    .from('user_profiles')
    .update({ bio: 'hosted QA bio', city: 'Dubai' })
    .eq('id', athlete.id);
  ok('athlete updates their own profile', !profileUpdateError, profileUpdateError?.message);

  const { data: updatedProfile } = await athleteSession.client
    .from('user_profiles')
    .select('bio, city')
    .eq('id', athlete.id)
    .maybeSingle();
  ok('the profile update persists', updatedProfile?.bio === 'hosted QA bio');

  await athleteSession.client
    .from('user_profiles')
    .update({ bio: 'HIJACKED' })
    .eq('id', scout.id);
  const { data: scoutProfile } = await admin
    .from('user_profiles')
    .select('bio')
    .eq('id', scout.id)
    .maybeSingle();
  ok("athlete cannot edit the scout's profile", scoutProfile?.bio !== 'HIJACKED');

  section('Athlete profile');
  // Direct UPDATE on the descriptive columns is granted, but the derived
  // columns are withheld, so the sanctioned path is the RPC.
  const { error: rpcProfileError } = await athleteSession.client.rpc('update_own_profile', {
    p_first_name: 'QA',
    p_middle_name: null,
    p_last_name: 'Athlete',
    p_bio: 'hosted QA athlete',
    p_city: 'Dubai',
    p_country: 'AE',
    p_sport: 'football',
    p_position: 'ST',
    p_current_club: 'QA FC',
    p_level: 'amateur',
    p_league: null,
    p_nationality: 'AE',
    p_phone: null,
    p_date_of_birth: '2000-05-10',
  });
  ok('update_own_profile succeeds', !rpcProfileError, rpcProfileError?.message);

  const { data: athleteProfile } = await athleteSession.client
    .from('athlete_profiles')
    .select('sport, position_primary')
    .eq('user_id', athlete.id)
    .maybeSingle();
  ok('athlete_profiles reflects the RPC update', athleteProfile?.sport === 'football');

  const { error: derivedColumnError } = await athleteSession.client
    .from('athlete_profiles')
    .update({ visibility_score: 999, followers_count: 999999 })
    .eq('user_id', athlete.id);
  ok(
    'derived athlete_profiles columns are not writable',
    Boolean(derivedColumnError),
    derivedColumnError ? '' : 'protected columns accepted a write',
  );

  section('Posts and feed');
  const { data: post, error: postError } = await athleteSession.client
    .from('posts')
    .insert({ author_id: athlete.id, type: 'text', text: 'hosted QA post', audience: 'public' })
    .select()
    .maybeSingle();
  ok('athlete creates a post', !postError && Boolean(post), postError?.message);

  if (post) {
    const { data: feed } = await scoutSession.client.from('posts').select('id').eq('id', post.id);
    ok('scout sees the public post', feed?.length === 1);

    const { error: likeError } = await scoutSession.client
      .from('post_likes')
      .insert({ post_id: post.id, user_id: scout.id });
    ok('scout likes the post', !likeError, likeError?.message);

    const { error: saveError } = await scoutSession.client.rpc('toggle_post_save', {
      p_post: post.id,
    });
    ok('toggle_post_save saves the post', !saveError, saveError?.message);

    const { data: savedPosts, error: savedPostsError } = await scoutSession.client.rpc(
      'get_saved_posts',
      { p_limit: 20, p_before: null },
    );
    ok('get_saved_posts is callable', !savedPostsError, savedPostsError?.message);
    ok(
      'the saved post is returned',
      Array.isArray(savedPosts) && savedPosts.some((p) => p.id === post.id || p.post_id === post.id),
    );

    await scoutSession.client.rpc('toggle_post_save', { p_post: post.id });
    const { data: afterUnsave } = await scoutSession.client.rpc('get_saved_posts', {
      p_limit: 20,
      p_before: null,
    });
    ok(
      'toggling again unsaves the post',
      !Array.isArray(afterUnsave) ||
        !afterUnsave.some((p) => p.id === post.id || p.post_id === post.id),
    );

    await scoutSession.client.from('posts').update({ text: 'HIJACKED' }).eq('id', post.id);
    const { data: postAfter } = await admin
      .from('posts')
      .select('text')
      .eq('id', post.id)
      .maybeSingle();
    ok("scout cannot edit the athlete's post", postAfter?.text !== 'HIJACKED');
  }

  section('Follows');
  const { error: followError } = await scoutSession.client
    .from('follows')
    .insert({ follower_id: scout.id, following_id: athlete.id });
  ok('scout follows the athlete', !followError, followError?.message);

  const { error: selfFollowError } = await scoutSession.client
    .from('follows')
    .insert({ follower_id: scout.id, following_id: scout.id });
  ok('a self-follow is rejected', Boolean(selfFollowError));

  const { error: forgedFollowError } = await scoutSession.client
    .from('follows')
    .insert({ follower_id: athlete.id, following_id: scout.id });
  ok('a follow cannot be forged for another user', Boolean(forgedFollowError));

  section('Blocking');
  await scoutSession.client
    .from('follows')
    .delete()
    .eq('follower_id', scout.id)
    .eq('following_id', athlete.id);

  const { error: blockError } = await athleteSession.client
    .from('user_blocks')
    .insert({ blocker_id: athlete.id, blocked_id: scout.id });
  ok('athlete blocks the scout', !blockError, blockError?.message);

  const { error: blockedFollowError } = await scoutSession.client
    .from('follows')
    .insert({ follower_id: scout.id, following_id: athlete.id });
  ok(
    'a blocked account cannot recreate the follow',
    Boolean(blockedFollowError),
    blockedFollowError ? '' : 'the blocked follow was accepted',
  );

  const { count: followRows } = await admin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', scout.id)
    .eq('following_id', athlete.id);
  ok('no follow row survives the blocked attempt', (followRows ?? 0) === 0);

  await athleteSession.client
    .from('user_blocks')
    .delete()
    .eq('blocker_id', athlete.id)
    .eq('blocked_id', scout.id);

  section('Messaging');
  const { data: conversationId, error: conversationError } = await athleteSession.client.rpc(
    'start_conversation',
    { p_user: scout.id },
  );
  ok(
    'athlete starts a conversation',
    !conversationError && Boolean(conversationId),
    conversationError?.message,
  );

  if (conversationId) {
    const { error: sendError } = await athleteSession.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: athlete.id, content: 'hosted QA hello' });
    ok('athlete sends a message', !sendError, sendError?.message);

    const { data: received } = await scoutSession.client
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId);
    ok('scout receives the message', (received?.length ?? 0) > 0);

    const { data: threads, error: threadsError } = await scoutSession.client.rpc(
      'get_conversations',
      { p_limit: 20 },
    );
    ok(
      'get_conversations returns the thread',
      !threadsError && Array.isArray(threads) && threads.length > 0,
      threadsError?.message,
    );

    const { error: markReadError } = await scoutSession.client.rpc('mark_conversation_read', {
      p_conversation: conversationId,
    });
    ok('mark_conversation_read succeeds', !markReadError, markReadError?.message);

    const { data: leaked } = await anonClient()
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);
    ok('an anonymous caller cannot read the thread', !leaked || leaked.length === 0);
  }

  section('Talent score');
  const { error: talentScoreError } = await athleteSession.client
    .from('talent_scores')
    .select('overall')
    .eq('athlete_id', athlete.id);
  ok('talent_scores is readable', !talentScoreError, talentScoreError?.message);

  section('Anonymous exposure');
  for (const table of ['user_private', 'user_blocks', 'messages']) {
    const { data } = await anonClient().from(table).select('*').limit(1);
    ok(`an anonymous caller cannot read ${table}`, !data || data.length === 0);
  }
} catch (error) {
  failures.push(`threw: ${error.message}`);
  console.log(`\n  ERROR  ${error.message}`);
} finally {
  section('Cleanup');
  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      failures.push(`could not delete test user ${id}: ${error.message}`);
      console.log(`  FAILED to delete ${id} — ${error.message}`);
    } else {
      console.log(`  deleted ${id}`);
    }
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  process.exit(failures.length > 0 ? 1 : 0);
}
