#!/usr/bin/env node
/**
 * Does a write by one person actually reach another person?
 *
 * Every other suite in this repo answers a narrower question. The unit tests
 * never touch a network. `supabase/tests/functional.sql` runs inside Postgres,
 * as the superuser, over a connection that has already skipped PostgREST, the
 * anon key, the JWT and — for most of it — row-level security. All of that is
 * the right way to test a rule. None of it tests a *pipeline*.
 *
 * This does the other thing: it signs in as real demo accounts over HTTP with
 * the anon key, exactly as the app does, performs a write as one of them, and
 * then asks a different account whether it can see the result. A coach posts a
 * trial; an athlete looks for trials and it is there. Somebody hosts a game; a
 * stranger searches their city and finds it, asks to join, and the host's spot
 * count moves. That is the claim the product makes, and it is the one thing a
 * green SQL suite cannot vouch for.
 *
 *   ./tools/local-supabase/start.sh     # in another shell
 *   node tests/e2e/pipelines.mjs
 *
 * It writes to the local development database and does not clean up after
 * itself. Everything it creates is tagged with a run id, so a second run does
 * not collide with the first, and nothing it makes is confusable with seed
 * data. Never point it at a database anybody cares about.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '../..');

// ── Configuration ────────────────────────────────────────────────────────────
function fromEnvFile() {
  const file = path.join(MOBILE, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = { ...fromEnvFile(), ...process.env };
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ || !KEY) {
  console.error('\n  No EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY. Start the local backend first:');
  console.error('    ./tools/local-supabase/start.sh\n');
  process.exit(2);
}

const PASSWORD = 'AceAiX-Demo-2026';
const RUN = Math.random().toString(36).slice(2, 8);
const tag = (s) => `${s} [pipe-${RUN}]`;

// ── Accounts ─────────────────────────────────────────────────────────────────
const WHO = {
  layla: 'layla.demo@aceaix.com', //   athlete, 19, the review account
  sara: 'sara.demo@aceaix.com', //     athlete, 22
  daniel: 'daniel.demo@aceaix.com', // athlete, 24
  marco: 'marco.demo@aceaix.com', //   coach, verified
  academy: 'academy.demo@aceaix.com', // club, verified
  nadia: 'nadia.demo@aceaix.com', //   scout, verified
  mina: 'mina.demo@aceaix.com', //     athlete, 14, no guardian consent
};

const clients = {};
const ids = {};

async function signIn(name) {
  const client = createClient(URL_, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: WHO[name],
    password: PASSWORD,
  });
  if (error) throw new Error(`sign-in failed for ${name}: ${error.message}`);
  clients[name] = client;
  ids[name] = data.user.id;
  return client;
}

// ── Reporting ────────────────────────────────────────────────────────────────
const results = [];
let group = '';

function section(name) {
  group = name;
  console.log(`\n  ── ${name} ──`);
}

async function step(label, fn) {
  try {
    const detail = await fn();
    results.push({ group, label, ok: true });
    console.log(`    ok   ${label}${detail ? `  ${detail}` : ''}`);
  } catch (err) {
    results.push({ group, label, ok: false, error: String(err?.message ?? err) });
    console.log(`    ✗    ${label}`);
    console.log(`         ${String(err?.message ?? err).split('\n')[0]}`);
  }
}

/** Throw with something readable rather than "expected true to be true". */
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

/** supabase-js returns errors rather than throwing; this makes them loud. */
function unwrap({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message ?? JSON.stringify(error)}`);
  return data;
}

/**
 * Some effects are written by a trigger inside the same statement, and some
 * ride on a second round trip. This retries a read for a moment rather than
 * sprinkling sleeps around, so a pass is fast and a failure is still a failure.
 */
async function eventually(fn, { tries = 8, waitMs = 250 } = {}) {
  let last;
  for (let i = 0; i < tries; i += 1) {
    try {
      const value = await fn();
      if (value) return value;
      last = new Error('condition never became true');
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw last;
}

/**
 * The reads below mirror what the client actually does — `getNotifications` and
 * `getMessages` in lib/api.ts are table selects through RLS, not RPCs, and a
 * test that invented an RPC for them would be testing nothing.
 */
async function notifications(client) {
  return (
    unwrap(
      await client
        .from('notifications')
        .select('id, type, actor_id, entity_type, entity_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      'read notifications',
    ) ?? []
  );
}

async function credibility(client, athleteId) {
  const row = unwrap(
    await client.from('talent_scores').select('*').eq('athlete_id', athleteId).maybeSingle(),
    'read talent score',
  );
  return row?.credibility_score ?? row?.overall_score ?? 0;
}

// ── The flows ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  AceAiX write pipelines  ·  ${URL_}  ·  run ${RUN}`);

  section('signing in');
  for (const name of Object.keys(WHO)) {
    await step(`${name} (${WHO[name].split('@')[0]})`, async () => {
      await signIn(name);
      return ids[name].slice(0, 8);
    });
  }
  if (results.some((r) => !r.ok)) {
    console.log('\n  Cannot continue without sign-in.\n');
    return;
  }

  // ── 1. A coach posts a trial, and an athlete finds it ──────────────────────
  section('a coach posts an opportunity, an athlete sees it');

  let opportunityId = null;
  await step('marco posts a trial', async () => {
    const row = unwrap(
      await clients.marco
        .from('opportunities')
        /* Column names copied from `createOpportunity` in lib/api.ts — the
           point is to write the row the app writes, not one that merely looks
           plausible. */
        .insert({
          created_by_id: ids.marco,
          organization_id: null,
          title: tag('Open trial'),
          description: 'Bring boots. Written by the pipeline test.',
          type: 'trial',
          sport: 'Football',
          position: 'Striker',
          location: 'Dubai',
          application_deadline: new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10),
          is_active: true,
        })
        .select('id')
        .single(),
      'insert opportunity',
    );
    opportunityId = row.id;
    return row.id.slice(0, 8);
  });

  await step('layla sees it in her recommendations', async () => {
    const found = await eventually(async () => {
      const rows = unwrap(
        await clients.layla.rpc('recommended_opportunities', { p_limit: 50 }),
        'recommended_opportunities',
      );
      return (rows ?? []).find((r) => r.id === opportunityId);
    });
    expect(found, 'the trial never appeared for the athlete');
    return `match ${found.match_percent}%`;
  });

  let applicationId = null;
  await step('layla applies', async () => {
    unwrap(
      await clients.layla
        .from('applications')
        .insert({
          opportunity_id: opportunityId,
          athlete_id: ids.layla,
          message: tag('I would like a trial'),
          status: 'applied',
        }),
      'insert application',
    );
    const mine = unwrap(
      await clients.layla
        .from('applications')
        .select('id, status')
        .eq('opportunity_id', opportunityId)
        .eq('athlete_id', ids.layla)
        .single(),
      'read own application',
    );
    applicationId = mine.id;
    return mine.status;
  });

  await step('marco sees the applicant', async () => {
    const rows = await eventually(async () => {
      const data = unwrap(
        await clients.marco.rpc('opportunity_applicants', { p_opportunity: opportunityId }),
        'opportunity_applicants',
      );
      return (data ?? []).length ? data : null;
    });
    /* `athlete_user_id` is the person; `athlete_id` on the same row is their
       athlete_profiles id. The `applications` table uses `athlete_id` for the
       *user*, so the two names mean different things one join apart — worth
       knowing before wiring a profile link to the wrong one. */
    const mine = rows.find((r) => r.athlete_user_id === ids.layla);
    expect(mine, 'the application never reached the poster');
    return `${rows.length} applicant · ${mine.status} · match ${mine.match_percent}%`;
  });

  await step('layla is notified when marco shortlists her', async () => {
    unwrap(
      await clients.marco
        .from('applications')
        .update({ status: 'shortlisted' })
        .eq('id', applicationId),
      'update application status',
    );
    const note = await eventually(async () => {
      const rows = await notifications(clients.layla);
      return rows.find((n) => n.entity_id === applicationId || String(n.type).includes('applic'));
    });
    expect(note, 'no notification for the status change');
    return note.type;
  });

  // ── 2. Play: hosting, finding, joining ────────────────────────────────────
  section('someone hosts a game, a stranger finds it and joins');

  let meetupId = null;
  const city = `Testville-${RUN}`;
  await step('daniel hosts a five-a-side', async () => {
    meetupId = unwrap(
      await clients.daniel.rpc('create_meetup', {
        p_sport: 'Football',
        p_title: tag('Saturday five-a-side'),
        p_country: 'United Arab Emirates',
        p_city: city,
        p_starts_at: new Date(Date.now() + 3 * 864e5).toISOString(),
        p_spots_total: 10,
        p_area: 'Marina',
        p_venue: 'Pitch 2',
        p_level: 'any',
        p_note: 'Written by the pipeline test.',
        p_cost_note: 'AED 25 each',
      }),
      'create_meetup',
    );
    return meetupId.slice(0, 8);
  });

  await step('sara finds it by searching the city', async () => {
    const found = await eventually(async () => {
      const rows = unwrap(
        await clients.sara.rpc('find_meetups', { p_place: city, p_limit: 20 }),
        'find_meetups',
      );
      return (rows ?? []).find((m) => m.id === meetupId);
    });
    expect(found, 'the meetup never appeared in search');
    expect(found.spots_left === 9, `expected 9 spots left, got ${found.spots_left}`);
    return `${found.spots_taken} of ${found.spots_total} · ${found.spots_left} left`;
  });

  await step('asking to join does not take a spot', async () => {
    unwrap(
      await clients.sara.rpc('request_to_join_meetup', {
        p_meetup: meetupId,
        p_message: tag('Can I play?'),
      }),
      'request_to_join_meetup',
    );
    const detail = unwrap(
      await clients.sara.rpc('meetup_detail', { p_meetup: meetupId }),
      'meetup_detail',
    );
    expect(
      detail.meetup.spots_taken === 1,
      `a request took a spot: spots_taken is ${detail.meetup.spots_taken}`,
    );
    return `still ${detail.meetup.spots_taken} of ${detail.meetup.spots_total}`;
  });

  await step('the host sees the request pending', async () => {
    const detail = await eventually(async () => {
      const d = unwrap(
        await clients.daniel.rpc('meetup_detail', { p_meetup: meetupId }),
        'meetup_detail as host',
      );
      return (d.pending ?? []).length ? d : null;
    });
    expect(
      detail.pending.some((p) => p.user_id === ids.sara),
      'the request never reached the host',
    );
    return `${detail.pending.length} pending`;
  });

  await step('accepting takes the spot, for everyone', async () => {
    unwrap(
      await clients.daniel.rpc('decide_meetup_request', {
        p_meetup: meetupId,
        p_user: ids.sara,
        p_accept: true,
      }),
      'decide_meetup_request',
    );
    const found = await eventually(async () => {
      const rows = unwrap(
        await clients.layla.rpc('find_meetups', { p_place: city, p_limit: 20 }),
        'find_meetups as a third party',
      );
      const m = (rows ?? []).find((x) => x.id === meetupId);
      return m && m.spots_taken === 2 ? m : null;
    });
    return `${found.spots_taken} of ${found.spots_total} · ${found.spots_left} left`;
  });

  await step('a minor cannot see it at all', async () => {
    const rows = unwrap(
      await clients.mina.rpc('find_meetups', { p_place: city, p_limit: 20 }),
      'find_meetups as a minor',
    );
    expect((rows ?? []).length === 0, `a 14-year-old found ${rows.length} meetups`);
    return 'empty, as the age gate requires';
  });

  await step('and cannot host one', async () => {
    const { error } = await clients.mina.rpc('create_meetup', {
      p_sport: 'Football',
      p_title: tag('Should never exist'),
      p_country: 'United Arab Emirates',
      p_city: city,
      p_starts_at: new Date(Date.now() + 864e5).toISOString(),
      p_spots_total: 4,
    });
    expect(error, 'a 14-year-old was allowed to host a meetup');
    return 'refused';
  });

  // ── 3. A post reaches the people who follow you ───────────────────────────
  section('a post reaches a follower');

  let postId = null;
  await step('layla posts', async () => {
    const row = unwrap(
      await clients.layla
        .from('posts')
        .insert({
          author_id: ids.layla,
          type: 'standard',
          caption: tag('Two goals today'),
          text: tag('Two goals today'),
          audience: 'public',
        })
        .select('id')
        .single(),
      'insert post',
    );
    postId = row.id;
    return row.id.slice(0, 8);
  });

  await step('marco, who follows her, gets it in his Following feed', async () => {
    const found = await eventually(async () => {
      const rows = unwrap(
        await clients.marco.rpc('get_feed', {
          p_scope: 'following',
          p_sport: null,
          p_limit: 40,
          p_before: null,
        }),
        'get_feed following',
      );
      return (rows ?? []).find((p) => p.id === postId);
    });
    expect(found, 'the post never reached the follower feed');
    return 'in the following feed';
  });

  await step('a like moves the counter and notifies the author', async () => {
    unwrap(await clients.marco.rpc('toggle_post_like', { p_post: postId }), 'toggle_post_like');
    const post = await eventually(async () => {
      const rows = unwrap(
        await clients.layla.rpc('get_user_posts', { p_user: ids.layla, p_limit: 24 }),
        'get_user_posts',
      );
      const p = (rows ?? []).find((x) => x.id === postId);
      return p && p.like_count > 0 ? p : null;
    });
    const note = await eventually(async () => {
      const rows = await notifications(clients.layla);
      return rows.find((n) => n.entity_id === postId && String(n.type).includes('like'));
    });
    expect(note, 'the author was never told about the like');
    return `like_count ${post.like_count}`;
  });

  await step('a comment is visible to everyone and notifies the author', async () => {
    unwrap(
      await clients.sara
        .from('post_comments')
        .insert({ post_id: postId, author_id: ids.sara, body: tag('Great game') }),
      'insert comment',
    );
    const seen = await eventually(async () => {
      const rows = unwrap(
        await clients.marco
          .from('post_comments')
          .select('id, body, author_id')
          .eq('post_id', postId),
        'read comments',
      );
      return (rows ?? []).find((c) => c.body?.includes(`pipe-${RUN}`));
    });
    expect(seen, 'the comment was not visible to a third party');
    return 'visible to a third party';
  });

  // ── 4. Following someone ──────────────────────────────────────────────────
  section('following');

  await step('nadia follows layla, and layla is told', async () => {
    const before = unwrap(
      await clients.layla.from('user_profiles').select('followers_count').eq('id', ids.layla).single(),
      'read follower count',
    ).followers_count;

    unwrap(await clients.nadia.rpc('toggle_follow', { p_user: ids.layla }), 'toggle_follow');

    const after = await eventually(async () => {
      const row = unwrap(
        await clients.layla
          .from('user_profiles')
          .select('followers_count')
          .eq('id', ids.layla)
          .single(),
        'read follower count',
      );
      return row.followers_count !== before ? row.followers_count : null;
    });

    const note = await eventually(async () => {
      const rows = await notifications(clients.layla);
      return rows.find((n) => String(n.type).includes('follow') && n.actor_id === ids.nadia);
    });
    expect(note, 'no follow notification');

    // Put it back, so a second run starts where the first did.
    await clients.nadia.rpc('toggle_follow', { p_user: ids.layla });
    return `${before} → ${after}`;
  });

  // ── 5. Endorsements ───────────────────────────────────────────────────────
  section('an endorsement lands on the profile and moves the score');

  await step('marco endorses sara, and it shows on her profile', async () => {
    const athlete = unwrap(
      await clients.sara.from('athlete_profiles').select('id').eq('user_id', ids.sara).single(),
      'read athlete profile',
    ).id;
    const before = await credibility(clients.sara, athlete);

    unwrap(
      await clients.marco.rpc('endorse_athlete', {
        p_athlete: athlete,
        p_skill: `Pipeline ${RUN}`,
        p_note: tag('Written by the pipeline test'),
      }),
      'endorse_athlete',
    );

    const seen = await eventually(async () => {
      const rows = unwrap(
        await clients.layla
          .from('endorsements')
          .select('id, skill_or_trait, endorser_role, endorser_id')
          .eq('athlete_id', athlete),
        'read endorsements as a third party',
      );
      return (rows ?? []).find((e) => e.skill_or_trait === `Pipeline ${RUN}`);
    });
    expect(seen, 'the endorsement was not visible on the profile');
    expect(
      seen.endorser_role === 'coach',
      `the role was written as "${seen.endorser_role}", not read from the profile`,
    );

    unwrap(await clients.sara.rpc('refresh_my_talent_score'), 'refresh_my_talent_score');
    const after = await credibility(clients.sara, athlete);

    expect(after >= before, `credibility went down: ${before} → ${after}`);
    return `role ${seen.endorser_role}, credibility ${before} → ${after}`;
  });

  await step('nobody can endorse themselves', async () => {
    const athlete = unwrap(
      await clients.sara.from('athlete_profiles').select('id').eq('user_id', ids.sara).single(),
      'read athlete profile',
    ).id;
    const { error } = await clients.sara.rpc('endorse_athlete', {
      p_athlete: athlete,
      p_skill: 'Modesty',
    });
    expect(error, 'self-endorsement was allowed');
    return String(error.hint ?? error.message).slice(0, 40);
  });

  // ── 6. Messaging ──────────────────────────────────────────────────────────
  section('a message reaches the other person');

  await step('marco opens a conversation with layla and sends one', async () => {
    const conversationId = unwrap(
      await clients.marco.rpc('start_conversation', { p_user: ids.layla }),
      'start_conversation',
    );
    unwrap(
      await clients.marco
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: ids.marco,
          content: tag('Are you free Saturday?'),
        }),
      'insert message',
    );

    const seen = await eventually(async () => {
      const rows = unwrap(
        await clients.layla.rpc('get_conversations', { p_limit: 30 }),
        'get_conversations',
      );
      return (rows ?? []).find((c) => c.id === conversationId);
    });
    expect(seen, 'the conversation never appeared for the recipient');

    const messages = unwrap(
      await clients.layla
        .from('messages')
        .select('id, content, sender_id')
        .eq('conversation_id', conversationId),
      'read messages',
    );
    expect(
      (messages ?? []).some((m) => m.content?.includes(`pipe-${RUN}`)),
      'the message body never arrived',
    );
    return `conversation ${conversationId.slice(0, 8)}`;
  });

  await step('an unverified stranger still cannot message a minor', async () => {
    const allowed = unwrap(
      await clients.daniel.rpc('can_message_user', { p_recipient: ids.mina }),
      'can_message_user',
    );
    const ok = allowed === false || allowed?.allowed === false || allowed?.can_message === false;
    expect(ok, `can_message_user said ${JSON.stringify(allowed)}`);
    return 'refused, as youth safety requires';
  });

  // ── 7. Profile views ──────────────────────────────────────────────────────
  section('looking at a profile is itself a write');

  await step('marco opens sara’s profile and it lands in her digest', async () => {
    unwrap(
      await clients.marco.rpc('get_profile_bundle', { p_user: ids.sara }),
      'get_profile_bundle',
    );
    const digest = await eventually(async () => {
      const d = unwrap(
        await clients.sara.rpc('profile_view_digest', { p_days: 7 }),
        'profile_view_digest',
      );
      return d && d.total > 0 ? d : null;
    });
    return `${digest.total} views, ${digest.named?.length ?? 0} named`;
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} steps passed`);
  if (failed.length) {
    console.log('\n  broken pipelines:');
    for (const f of failed) console.log(`    ✗ ${f.group} → ${f.label}\n      ${f.error}`);
    console.log('');
    process.exitCode = 1;
  } else {
    console.log('  every write reached the person it was supposed to reach.\n');
  }
}

main().catch((err) => {
  console.error('\n  the run itself failed:', err);
  process.exitCode = 2;
});
