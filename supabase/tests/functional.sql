-- ============================================================
-- Functional tests for the AceAiX data layer
--
-- Run after run-migrations.sh against the same throwaway database:
--   psql -v ON_ERROR_STOP=1 -d aceaix_test -f supabase/tests/functional.sql
--
-- Every assertion below is a rule the product depends on. The youth-safety
-- ones in particular are the difference between an approved app and a
-- pulled one, so they are asserted at the database level, not in the UI.
-- ============================================================

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists tests;

-- Seeding runs with service-role authority, the way a server-side job would.
select set_config('request.jwt.claim.role', 'service_role', false);

-- Helper: impersonate a user for RLS/auth.uid() purposes.
create or replace function tests.as_user(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

create or replace function tests.ok(p_condition boolean, p_label text) returns void
language plpgsql as $$
begin
  if p_condition then
    raise notice '  ok   %', p_label;
  else
    raise exception 'FAILED: %', p_label;
  end if;
end;
$$;

/* Request consent as the impersonated minor and hand back the token the
   guardian would receive by e-mail. The request never returns it (0904/02);
   the suite reads it from the table as the superuser it is. */
create or replace function tests.request_consent(p_name text, p_email text, p_rel text)
returns text language plpgsql as $$
declare v_req jsonb; v_token text;
begin
  v_req := public.request_guardian_consent(p_name, p_email, p_rel);
  select token into v_token from public.guardian_consents where id = (v_req ->> 'id')::uuid;
  return v_token;
end;
$$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── seeding ──'; end $$;

-- Ids are fixed so assertions can reference them directly.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'adult.athlete@test.local',
   '{"full_name":"Adult Athlete","role":"athlete"}'),
  ('22222222-2222-2222-2222-222222222222', 'minor.athlete@test.local',
   '{"full_name":"Minor Athlete","role":"athlete"}'),
  ('33333333-3333-3333-3333-333333333333', 'verified.coach@test.local',
   '{"full_name":"Verified Coach","role":"coach"}'),
  ('44444444-4444-4444-4444-444444444444', 'random.adult@test.local',
   '{"full_name":"Random Adult","role":"athlete"}')
on conflict do nothing;

-- Ages
update public.user_private set date_of_birth = current_date - interval '20 years'
  where user_id = '11111111-1111-1111-1111-111111111111';
update public.user_private set date_of_birth = current_date - interval '15 years'
  where user_id = '22222222-2222-2222-2222-222222222222';
update public.user_private set date_of_birth = current_date - interval '35 years'
  where user_id = '33333333-3333-3333-3333-333333333333';
update public.user_private set date_of_birth = current_date - interval '28 years'
  where user_id = '44444444-4444-4444-4444-444444444444';

-- The coach is verified (admins normally do this; here we bypass as owner).
update public.user_profiles set is_verified = true
  where id = '33333333-3333-3333-3333-333333333333';

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── provisioning ──'; end $$;

do $$
begin
  perform tests.ok(
    (select count(*) from public.user_profiles
     where id in ('11111111-1111-1111-1111-111111111111',
                  '22222222-2222-2222-2222-222222222222',
                  '33333333-3333-3333-3333-333333333333',
                  '44444444-4444-4444-4444-444444444444')) = 4,
    'signup trigger created a profile for every account');
  perform tests.ok(
    not (select onboarding_completed from public.user_profiles
         where id = '11111111-1111-1111-1111-111111111111'),
    'accounts created after the V2 migration still enter onboarding');

  perform tests.ok(
    (select count(*) from public.athlete_profiles
     where user_id in ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222')) = 2,
    'athlete accounts received an athlete profile');

  perform tests.ok(
    (select count(*) from public.coach_profiles
     where user_id = '33333333-3333-3333-3333-333333333333') = 1,
    'coach account received a coach profile');

  perform tests.ok(
    (select count(*) from public.notification_preferences) >= 4,
    'notification preferences were provisioned');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── age banding and minor protection ──'; end $$;

do $$
begin
  perform tests.ok(
    (select is_minor from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222'),
    '15-year-old is flagged as a minor');

  perform tests.ok(
    (select age_band from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222') = '13_15',
    'minor is placed in the 13_15 band');

  perform tests.ok(
    not (select is_minor from public.user_profiles
         where id = '11111111-1111-1111-1111-111111111111'),
    '20-year-old is not a minor');

  perform tests.ok(
    not (select is_discoverable from public.user_profiles
         where id = '22222222-2222-2222-2222-222222222222'),
    'minor is hidden from discovery until a guardian consents');

  perform tests.ok(
    (select allow_messages_from from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222') = 'verified',
    'minor inbox defaults to verified senders only');
end $$;

-- Under-13 must be impossible.
do $$
declare v_raised boolean := false;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values ('55555555-5555-5555-5555-555555555555', 'child@test.local',
            '{"full_name":"Too Young","role":"athlete"}');
    update public.user_private set date_of_birth = current_date - interval '11 years'
      where user_id = '55555555-5555-5555-5555-555555555555';
  exception when others then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'an under-13 date of birth is rejected outright');
end $$;

-- Guardian addresses must belong to an adult other than the requesting minor.
do $$
declare v_raised boolean;
begin
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_raised := false;
  begin
    perform public.request_guardian_consent(
      'Self', '  MINOR.ATHLETE@TEST.LOCAL  ', 'parent');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a minor cannot send guardian consent to their own auth email');

  insert into auth.users (id, email, raw_user_meta_data)
  values (
    '66666666-6666-6666-6666-666666666666',
    'other.minor@test.local',
    '{"full_name":"Other Minor","role":"athlete"}'
  );
  update public.user_private
  set date_of_birth = current_date - interval '16 years'
  where user_id = '66666666-6666-6666-6666-666666666666';

  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_raised := false;
  begin
    perform public.request_guardian_consent(
      'Other Minor', ' OTHER.MINOR@test.local ', 'guardian');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a known minor account cannot be named as guardian');

  delete from auth.users where id = '66666666-6666-6666-6666-666666666666';
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── who may message a minor ──'; end $$;

do $$
begin
  perform tests.ok(
    not private.can_message('44444444-4444-4444-4444-444444444444',
                            '22222222-2222-2222-2222-222222222222'),
    'an unverified adult cannot message a minor');

  perform tests.ok(
    not private.can_message('33333333-3333-3333-3333-333333333333',
                            '22222222-2222-2222-2222-222222222222'),
    'even a verified coach cannot message a minor without guardian consent');

  perform tests.ok(
    private.can_message('33333333-3333-3333-3333-333333333333',
                        '11111111-1111-1111-1111-111111111111'),
    'a verified coach can message an adult athlete');
end $$;

-- Guardian consent flow
do $$
declare
  v_token text;
  v_request jsonb;
  v_res jsonb;
  v_delivery jsonb;
begin
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_request := public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
  perform tests.ok(v_request ->> 'id' is not null, 'minor can request guardian consent');
  perform tests.ok(not (v_request ? 'token'), 'consent request never returns the approval token');
  perform tests.ok(
    not has_column_privilege('authenticated', 'public.guardian_consents', 'token', 'SELECT'),
    'authenticated clients cannot read guardian consent tokens');
  select token into v_token
  from public.guardian_consents
  where id = (v_request ->> 'id')::uuid;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_delivery := public.reserve_guardian_consent_delivery(
    (v_request ->> 'id')::uuid,
    '22222222-2222-2222-2222-222222222222');
  perform tests.ok((v_delivery ->> 'ok')::boolean,
    'the first guardian email delivery reserves atomically');
  v_delivery := public.reserve_guardian_consent_delivery(
    (v_request ->> 'id')::uuid,
    '22222222-2222-2222-2222-222222222222');
  perform tests.ok(
    not (v_delivery ->> 'ok')::boolean and v_delivery ->> 'code' = 'cooldown',
    'immediate guardian email resend is rate limited');

  update public.guardian_consents
  set last_delivery_at = null, delivery_day = current_date, delivery_count = 5
  where id = (v_request ->> 'id')::uuid;
  v_delivery := public.reserve_guardian_consent_delivery(
    (v_request ->> 'id')::uuid,
    '22222222-2222-2222-2222-222222222222');
  perform tests.ok(
    not (v_delivery ->> 'ok')::boolean and v_delivery ->> 'code' = 'daily_cap',
    'guardian email delivery enforces its daily cap');

  v_res := public.confirm_guardian_consent(v_token, true, true, true);
  perform tests.ok((v_res ->> 'ok')::boolean, 'guardian can confirm with the e-mailed token');

  perform tests.ok(
    (select is_discoverable from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222'),
    'consent makes the minor discoverable');

  perform tests.ok(
    private.can_message('33333333-3333-3333-3333-333333333333',
                        '22222222-2222-2222-2222-222222222222'),
    'a verified coach can message the minor once consent exists');

  perform tests.ok(
    not private.can_message('44444444-4444-4444-4444-444444444444',
                            '22222222-2222-2222-2222-222222222222'),
    'an unverified adult still cannot message the minor after consent');

  -- Revocation puts everything back.
  perform public.revoke_guardian_consent(
    (select id from public.guardian_consents
     where minor_user_id = '22222222-2222-2222-2222-222222222222'
       and status = 'granted'));

  perform tests.ok(
    not (select is_discoverable from public.user_profiles
         where id = '22222222-2222-2222-2222-222222222222'),
    'revoking consent hides the minor again');

  -- Re-grant for the remaining tests.
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_request := public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
  select token into v_token
  from public.guardian_consents
  where id = (v_request ->> 'id')::uuid;
  perform public.confirm_guardian_consent(v_token, true, true, true);
end $$;

-- A conversation that the rules forbid must fail at the database.
do $$
declare v_raised boolean := false;
begin
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  begin
    perform public.start_conversation('22222222-2222-2222-2222-222222222222');
  exception when others then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'start_conversation refuses a forbidden pair');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── talent score ──'; end $$;

do $$
declare v_before integer; v_after integer; v_athlete uuid;
begin
  select id into v_athlete from public.athlete_profiles
  where user_id = '11111111-1111-1111-1111-111111111111';

  select overall into v_before from public.talent_scores where athlete_id = v_athlete;
  perform tests.ok(v_before is not null, 'a score row exists for every athlete');

  update public.athlete_profiles
  set sport = 'Football', position_primary = 'Striker', birth_date = current_date - interval '20 years',
      height_cm = 181, weight_kg = 74, bio = 'Left-footed forward.', nationality = 'AE',
      current_club = 'Test FC', level = 'academy'
  where id = v_athlete;

  update public.user_profiles set avatar_url = 'https://example.test/a.jpg',
    city = 'Dubai', country = 'United Arab Emirates'
  where id = '11111111-1111-1111-1111-111111111111';

  perform private.refresh_talent_score(v_athlete);
  select overall into v_after from public.talent_scores where athlete_id = v_athlete;

  perform tests.ok(v_after > v_before, 'completing the profile raises the score');
  perform tests.ok(
    (select profile_score from public.talent_scores where athlete_id = v_athlete) = 100,
    'a fully filled profile scores 100 on the profile pillar');

  -- Verified match records must outweigh self-reported ones.
  insert into public.match_records (athlete_id, match_date, goals, assists, minutes_played, source)
  select v_athlete, current_date - (n || ' days')::interval, 1, 1, 90, 'self'
  from generate_series(1, 6) n;

  perform private.refresh_talent_score(v_athlete);
  perform tests.ok(
    (select performance_score from public.talent_scores where athlete_id = v_athlete) > 0,
    'logged matches produce a performance score');

  perform tests.ok(
    (select count(*) from public.talent_score_history where athlete_id = v_athlete) >= 1,
    'score history is recorded');

  perform tests.ok(
    jsonb_array_length((select tips from public.talent_scores where athlete_id = v_athlete)) > 0,
    'the score comes with actionable tips');
end $$;

-- The score, and every other derived field, must not be writable by its owner.
do $$
begin
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.talent_scores', 'UPDATE'),
    'an athlete cannot write their own talent score');
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.talent_scores', 'INSERT'),
    'an athlete cannot insert a talent score');

  perform tests.ok(
    not has_column_privilege('authenticated', 'public.user_profiles', 'is_minor', 'UPDATE'),
    'minor status is not client-writable');
  perform tests.ok(
    not has_column_privilege('authenticated', 'public.user_profiles', 'is_verified', 'UPDATE'),
    'verification is not client-writable');
  perform tests.ok(
    not has_column_privilege('authenticated', 'public.user_profiles', 'is_suspended', 'UPDATE'),
    'suspension is not client-writable');
  perform tests.ok(
    not has_column_privilege('authenticated', 'public.user_profiles', 'followers_count', 'UPDATE'),
    'follower counts are not client-writable');
  perform tests.ok(
    has_column_privilege('authenticated', 'public.user_profiles', 'bio', 'UPDATE'),
    'a user can still edit their own bio');
  perform tests.ok(
    has_column_privilege('authenticated', 'public.athlete_profiles', 'sport', 'UPDATE'),
    'an athlete can still edit their sport');
  perform tests.ok(
    not has_column_privilege('authenticated', 'public.athlete_profiles', 'visibility_score', 'UPDATE'),
    'derived athlete scores are not client-writable');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── social graph and notifications ──'; end $$;

do $$
declare v_res jsonb;
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_res := public.toggle_follow('11111111-1111-1111-1111-111111111111');
  perform tests.ok((v_res ->> 'following')::boolean, 'toggle_follow follows');

  perform tests.ok(
    (select followers_count from public.user_profiles
     where id = '11111111-1111-1111-1111-111111111111') = 1,
    'follower counter is maintained');

  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = '11111111-1111-1111-1111-111111111111'
              and type = 'follow'
              and actor_id = '33333333-3333-3333-3333-333333333333'
              and entity_type = 'user'),
    'a follow produces a typed notification with an actor and a target');

  v_res := public.toggle_follow('11111111-1111-1111-1111-111111111111');
  perform tests.ok(not (v_res ->> 'following')::boolean, 'toggle_follow unfollows');
  perform tests.ok(
    (select followers_count from public.user_profiles
     where id = '11111111-1111-1111-1111-111111111111') = 0,
    'unfollow decrements the counter');
end $$;

do $$
declare v_post uuid; v_conv uuid; v_res jsonb;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  insert into public.posts (author_id, type, caption, audience)
  values ('11111111-1111-1111-1111-111111111111', 'standard', 'First touch drill', 'public')
  returning id into v_post;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_res := public.toggle_post_like(v_post);
  perform tests.ok((v_res ->> 'liked')::boolean, 'a post can be liked');
  perform tests.ok((v_res ->> 'like_count')::int = 1, 'the like counter is authoritative');

  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = '11111111-1111-1111-1111-111111111111' and type = 'like'),
    'a like notifies the author');

  insert into public.post_comments (post_id, author_id, body)
  values (v_post, '33333333-3333-3333-3333-333333333333', 'Sharp.');

  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = '11111111-1111-1111-1111-111111111111'
              and type = 'comment' and entity_id = v_post::text),
    'a comment notifies the author and points at the post');

  -- Messaging end to end
  v_conv := public.start_conversation('11111111-1111-1111-1111-111111111111');
  perform tests.ok(v_conv is not null, 'a permitted conversation opens');

  insert into public.messages (conversation_id, sender_id, content)
  values (v_conv, '33333333-3333-3333-3333-333333333333', 'Interested in a trial?');

  perform tests.ok(
    (select last_message_preview from public.conversations where id = v_conv)
      = 'Interested in a trial?',
    'the conversation preview updates on send');

  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = '11111111-1111-1111-1111-111111111111'
              and type = 'message' and entity_id = v_conv::text),
    'a message notifies the recipient with the conversation id');

  -- Opening the same pair again must reuse the thread.
  perform tests.ok(
    public.start_conversation('11111111-1111-1111-1111-111111111111') = v_conv,
    'start_conversation is idempotent for a pair');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── blocking ──'; end $$;

do $$
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  perform public.block_user('44444444-4444-4444-4444-444444444444');

  perform tests.ok(
    not private.can_message('44444444-4444-4444-4444-444444444444',
                            '11111111-1111-1111-1111-111111111111'),
    'a blocked account cannot message you');

  perform tests.ok(
    (select count(*) from public.discover_athletes(
       null, null, null, null, null, null, null, null, false, 'match', 20, 0)
     d where d.user_id = '44444444-4444-4444-4444-444444444444') = 0,
    'a blocked account never appears in discovery');

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  begin
    set local role authenticated;
    insert into public.follows (follower_id, following_id)
    values (
      '44444444-4444-4444-4444-444444444444',
      '11111111-1111-1111-1111-111111111111'
    );
    reset role;
    perform tests.ok(false, 'a blocked account cannot recreate a follow directly');
  exception when insufficient_privilege then
    reset role;
    perform tests.ok(true, 'a blocked account cannot recreate a follow directly');
  end;

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  perform public.unblock_user('44444444-4444-4444-4444-444444444444');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── discovery and matching ──'; end $$;

do $$
declare v_count integer; v_match integer;
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');

  select count(*) into v_count from public.discover_athletes(
    null, 'Football', null, null, null, null, null, null, false, 'match', 20, 0);
  perform tests.ok(v_count >= 1, 'discovery finds football athletes');

  select d.match_percent into v_match from public.discover_athletes(
    null, 'Football', array['Striker'], null, null, 18, 25, null, false, 'match', 20, 0) d
  where d.user_id = '11111111-1111-1111-1111-111111111111';
  perform tests.ok(v_match > 40, 'an exact brief produces a high match percentage');

  perform tests.ok(
    (select count(*) from public.discover_athletes(
      null, 'Football', array['Goalkeeper'], null, null, null, null, null, false, 'match', 20, 0) d
     where d.user_id = '11111111-1111-1111-1111-111111111111') = 0,
    'position filters exclude non-matching athletes');

  perform tests.ok(
    (select jsonb_array_length(d.reasons) from public.discover_athletes(
      null, 'Football', array['Striker'], null, null, null, null, null, false, 'match', 20, 0) d
     where d.user_id = '11111111-1111-1111-1111-111111111111') > 0,
    'every match carries human-readable reasons');

  -- A minor without consent must never be returned.
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  perform public.revoke_guardian_consent(
    (select id from public.guardian_consents
     where minor_user_id = '22222222-2222-2222-2222-222222222222' and status = 'granted'));
  update public.athlete_profiles set sport = 'Football'
    where user_id = '22222222-2222-2222-2222-222222222222';

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform tests.ok(
    (select count(*) from public.discover_athletes(
      null, 'Football', null, null, null, null, null, null, false, 'match', 50, 0) d
     where d.user_id = '22222222-2222-2222-2222-222222222222') = 0,
    'a minor without guardian consent is absent from discovery');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── feed and profile bundle ──'; end $$;

do $$
declare
  v_bundle jsonb;
  v_rows integer;
  v_request jsonb;
  v_token text;
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');

  select count(*) into v_rows from public.get_feed('for_you', null, 20, null);
  perform tests.ok(v_rows >= 1, 'the for-you feed returns posts');

  select count(*) into v_rows from public.get_feed('following', null, 20, null);
  perform tests.ok(v_rows = 0, 'the following feed is empty when you follow nobody');

  v_bundle := public.get_profile_bundle('11111111-1111-1111-1111-111111111111');
  perform tests.ok(v_bundle -> 'user' ->> 'id' = '11111111-1111-1111-1111-111111111111',
    'the profile bundle returns the requested user');
  perform tests.ok(v_bundle -> 'athlete' is not null, 'the bundle includes the athlete profile');
  perform tests.ok(v_bundle -> 'score' ->> 'overall' is not null, 'the bundle includes the score');
  perform tests.ok((v_bundle -> 'viewer' ->> 'can_message')::boolean,
    'the bundle tells the viewer whether messaging is allowed');
  perform tests.ok(not (v_bundle -> 'viewer' ->> 'is_self')::boolean,
    'the bundle distinguishes self from other');

  -- Viewing an athlete as a coach records scout interest.
  perform tests.ok(
    exists (select 1 from public.profile_views
            where viewer_user_id = '33333333-3333-3333-3333-333333333333'),
    'a recruiter profile view is recorded');

  -- A coach has no athlete profile and no talent score. Opening one used to
  -- raise "record ts is not assigned yet" and show an error screen.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_bundle := public.get_profile_bundle('33333333-3333-3333-3333-333333333333');
  perform tests.ok(v_bundle -> 'user' ->> 'id' = '33333333-3333-3333-3333-333333333333',
    'a non-athlete profile opens without error');
  perform tests.ok(v_bundle -> 'athlete' = 'null'::jsonb,
    'a coach carries no athlete section');
  perform tests.ok(v_bundle -> 'score' = 'null'::jsonb,
    'a coach carries no talent score');
  perform tests.ok(v_bundle -> 'coach' is not null,
    'a coach carries a coach section');

  -- The viewer block flag must be real, not hardcoded.
  perform public.block_user('44444444-4444-4444-4444-444444444444');
  v_bundle := public.get_profile_bundle('44444444-4444-4444-4444-444444444444');
  perform tests.ok((v_bundle ->> 'blocked')::boolean,
    'opening a blocked profile reports the block');
  perform public.unblock_user('44444444-4444-4444-4444-444444444444');

  -- A minor's exact age is never exposed, even after discovery is granted.
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_request := public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
  select token into v_token
  from public.guardian_consents
  where id = (v_request ->> 'id')::uuid;
  perform public.confirm_guardian_consent(v_token, true, true, true);

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_bundle := public.get_profile_bundle('22222222-2222-2222-2222-222222222222');
  perform tests.ok(v_bundle -> 'athlete' ->> 'age' is null,
    'a minor exact age is never returned');
  perform tests.ok(v_bundle -> 'athlete' ->> 'age_band' is not null,
    'a minor is described by age band only');

  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  perform public.revoke_guardian_consent((v_request ->> 'id')::uuid);
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── reporting ──'; end $$;

do $$
declare v_post uuid; v_report uuid;
begin
  select id into v_post from public.posts limit 1;

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_report := public.report_content('post', v_post::text, 'child_safety', 'Test report');
  perform tests.ok(v_report is not null, 'content can be reported');

  perform tests.ok(
    (select severity from public.moderation_reports where id = v_report) = 'high',
    'a child-safety report is filed at high severity');

  perform tests.ok(
    (select is_hidden from public.posts where id = v_post),
    'high-severity reports take the content down pending review');

  perform tests.ok(
    (select count(*) from public.get_feed('for_you', null, 20, null)) = 0,
    'content under review disappears from the feed');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── no route around the discovery gate ──'; end $$;

/* Four separate surfaces can name a person. Each has to apply the same rule,
   or the guardian gate is decoration. The minor's consent was revoked at the
   end of the discovery section above, so they must be absent from all four. */
do $$
declare
  v_token text;
  v_request jsonb;
  v_minor uuid := '22222222-2222-2222-2222-222222222222';
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');

  perform tests.ok(
    (select count(*) from public.talent_leaderboard(null, null, 100) l
     where l.user_id = v_minor) = 0,
    'the leaderboard hides a minor without consent');

  perform tests.ok(
    (select count(*) from public.search_people('Minor', null, 50)) = 0,
    'name search hides a minor without consent');

  perform tests.ok(
    (select count(*) from public.discover_athletes(
      'Minor', null, null, null, null, null, null, null, false, 'match', 50, 0)) = 0,
    'discovery hides a minor without consent');

  -- With consent restored they reappear — but never with an exact age.
  perform tests.as_user(v_minor);
  v_request := public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
  select token into v_token
  from public.guardian_consents
  where id = (v_request ->> 'id')::uuid;
  perform public.confirm_guardian_consent(v_token, true, true, true);

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform tests.ok(
    (select count(*) from public.search_people('Minor', null, 50)) = 1,
    'consent puts the minor back into search');

  perform tests.ok(
    (select d.age from public.discover_athletes(
      'Minor', null, null, null, null, null, null, null, false, 'match', 50, 0) d) is null,
    'discovery never returns a minor exact age');

  perform tests.ok(
    (select d.age_band from public.discover_athletes(
      'Minor', null, null, null, null, null, null, null, false, 'match', 50, 0) d) = '13_15',
    'discovery returns the minor age band instead');

  -- An adult still comes back with a real age.
  perform tests.ok(
    (select d.age from public.discover_athletes(
      'Adult Athlete', null, null, null, null, null, null, null, false, 'match', 50, 0) d) is not null,
    'an adult athlete still returns an exact age');

  -- Age filtering must keep working on the true date of birth.
  perform tests.ok(
    (select count(*) from public.discover_athletes(
      'Minor', null, null, null, null, 13, 16, null, false, 'match', 50, 0)) = 1,
    'an age filter still matches a minor on their real age');
  perform tests.ok(
    (select count(*) from public.discover_athletes(
      'Minor', null, null, null, null, 18, 30, null, false, 'match', 50, 0)) = 0,
    'an age filter still excludes a minor outside the range');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── guardians can see what they approved ──'; end $$;

do $$
declare v_guardian uuid := '66666666-6666-6666-6666-666666666666';
begin
  -- A guardian signing up with the address the consent was sent to should be
  -- linked automatically, in either order.
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_guardian, 'parent@test.local',
          '{"full_name":"Parent Name","role":"guardian"}')
  on conflict do nothing;
  update public.user_private set date_of_birth = current_date - interval '44 years'
    where user_id = v_guardian;

  perform tests.ok(
    (select guardian_user_id from public.guardian_consents
     where minor_user_id = '22222222-2222-2222-2222-222222222222'
       and status = 'granted') = v_guardian,
    'a guardian account is linked to the consent it was sent');

  perform tests.as_user(v_guardian);
  perform tests.ok(
    (select count(*) from public.my_linked_minors()) = 1,
    'a guardian can list the young people they are responsible for');

  perform tests.ok(
    (select count(*) from public.guardian_conversation_overview(
      '22222222-2222-2222-2222-222222222222')) >= 0,
    'a guardian can see that conversations exist');
end $$;

-- A stranger must not be able to read that overview.
do $$
declare v_raised boolean := false;
begin
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  begin
    perform public.guardian_conversation_overview('22222222-2222-2222-2222-222222222222');
  exception when others then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'only a linked guardian can see that overview');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── one date of birth ──'; end $$;

do $$
begin
  -- Editing the athlete profile's birth date must feed back into the private
  -- record that decides minor status, not create a second, softer age.
  update public.athlete_profiles
  set birth_date = current_date - interval '16 years'
  where user_id = '11111111-1111-1111-1111-111111111111';

  perform tests.ok(
    (select date_of_birth from public.user_private
     where user_id = '11111111-1111-1111-1111-111111111111')
      = current_date - interval '16 years',
    'changing the profile birth date updates the private record');

  perform tests.ok(
    (select is_minor from public.user_profiles
     where id = '11111111-1111-1111-1111-111111111111'),
    'and the account becomes a minor account');

  -- Put it back.
  update public.athlete_profiles
  set birth_date = current_date - interval '20 years'
  where user_id = '11111111-1111-1111-1111-111111111111';
  perform tests.ok(
    not (select is_minor from public.user_profiles
         where id = '11111111-1111-1111-1111-111111111111'),
    'and back again when corrected');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── every RPC the client calls, called once ──'; end $$;

/* A smoke pass over the public API surface. Several bugs reached the running
   app only because a function was never executed between being written and
   being deployed — an ambiguous column or an unassigned record raises at call
   time, not at create time. Anything the client can invoke is invoked here. */
do $$
declare
  v_opp  uuid;
  v_conv uuid;
  v_post uuid;
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');

  perform tests.ok(
    (select count(*) from public.recommended_athletes(5)) >= 0,
    'recommended_athletes executes');

  perform tests.ok(
    (select count(*) from public.talent_leaderboard(null, null, 10)) >= 0,
    'talent_leaderboard executes');

  perform tests.ok(public.unread_counts() ? 'notifications', 'unread_counts executes');
  perform tests.ok(public.can_message_user('11111111-1111-1111-1111-111111111111') ? 'allowed',
    'can_message_user executes');
  perform tests.ok(public.mark_notifications_read() >= 0, 'mark_notifications_read executes');
  perform tests.ok((select count(*) from public.get_conversations(10)) >= 0,
    'get_conversations executes');

  select id into v_post from public.posts limit 1;
  perform tests.ok((select count(*) from public.get_user_posts(
    '11111111-1111-1111-1111-111111111111', 10, null)) >= 0, 'get_user_posts executes');

  -- Opportunity paths, from posting to review.
  insert into public.opportunities (created_by_id, title, description, type, sport, "position", is_active)
  values ('33333333-3333-3333-3333-333333333333', 'Smoke-test trial', 'Created by the test suite.',
          'trial', 'Football', 'Striker', true)
  returning id into v_opp;

  perform tests.ok((select count(*) from public.opportunity_applicants(v_opp)) >= 0,
    'opportunity_applicants executes for the poster');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  perform tests.ok((select count(*) from public.recommended_opportunities(10)) >= 0,
    'recommended_opportunities executes');

  insert into public.applications (opportunity_id, athlete_id, status, message)
  values (v_opp, '11111111-1111-1111-1111-111111111111', 'applied', 'Smoke test.')
  on conflict do nothing;

  -- Only the athlete may withdraw; only the club may move the status on.
  update public.applications set status = 'withdrawn'
  where opportunity_id = v_opp and athlete_id = '11111111-1111-1111-1111-111111111111';
  perform tests.ok(
    (select status from public.applications
     where opportunity_id = v_opp and athlete_id = '11111111-1111-1111-1111-111111111111')
      = 'withdrawn',
    'an athlete can withdraw their own application');

  -- `is not null` on a composite is only true when every field is set, and
  -- percentile/ai_summary are legitimately null — so assert on a field.
  perform tests.ok(
    (select overall from public.refresh_my_talent_score()) >= 0,
    'refresh_my_talent_score executes');

  v_conv := public.start_conversation('33333333-3333-3333-3333-333333333333');
  perform tests.ok(public.mark_conversation_read(v_conv) >= 0,
    'mark_conversation_read executes');

  perform tests.ok(public.toggle_post_save(v_post) ? 'saved', 'toggle_post_save executes');
  perform tests.ok(public.toggle_post_save(v_post) ? 'saved', 'toggle_post_save is reversible');
end $$;

-- An athlete must not be able to promote their own application.
do $$
declare v_raised boolean := false; v_app uuid;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  select id into v_app from public.applications
  where athlete_id = '11111111-1111-1111-1111-111111111111' limit 1;

  begin
    update public.applications set status = 'invited' where id = v_app;
  exception when others then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'an athlete cannot promote their own application');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── streaks and achievements ──'; end $$;

do $$
declare
  v_res      jsonb;
  v_progress jsonb;
  v_athlete  uuid;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');

  v_res := public.record_activity();
  perform tests.ok((v_res ->> 'current_streak')::int = 1, 'a first visit starts a streak of one');
  perform tests.ok((v_res ->> 'first_visit_today')::boolean, 'the first call of the day counts');

  v_res := public.record_activity();
  perform tests.ok((v_res ->> 'current_streak')::int = 1,
    'a second visit the same day does not extend the streak');
  perform tests.ok(not (v_res ->> 'first_visit_today')::boolean,
    'a repeat visit is not counted again');

  -- Yesterday, then today: the run continues.
  update public.user_streaks
  set last_active_on = current_date - 1, current_streak = 4, longest_streak = 4
  where user_id = '11111111-1111-1111-1111-111111111111';

  v_res := public.record_activity();
  perform tests.ok((v_res ->> 'current_streak')::int = 5, 'a consecutive day extends the streak');
  perform tests.ok((v_res ->> 'longest_streak')::int = 5, 'the longest streak keeps up');

  -- A gap resets the run but never the record.
  update public.user_streaks
  set last_active_on = current_date - 3, current_streak = 5, longest_streak = 9
  where user_id = '11111111-1111-1111-1111-111111111111';

  v_res := public.record_activity();
  perform tests.ok((v_res ->> 'current_streak')::int = 1, 'a missed day resets the run to one');
  perform tests.ok((v_res ->> 'longest_streak')::int = 9,
    'a missed day never lowers the longest streak');
end $$;

do $$
declare v_progress jsonb;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');

  -- The adult athlete has posts, matches, media and an endorsement by now.
  perform tests.ok(
    exists (select 1 from public.user_achievements
            where user_id = '11111111-1111-1111-1111-111111111111'
              and achievement_key = 'first_post'),
    'posting unlocks the first-post achievement');

  perform tests.ok(
    exists (select 1 from public.user_achievements
            where user_id = '11111111-1111-1111-1111-111111111111'
              and achievement_key = 'first_match'),
    'logging a match unlocks the first-match achievement');

  perform tests.ok(
    exists (select 1 from public.user_achievements
            where user_id = '11111111-1111-1111-1111-111111111111'
              and achievement_key = 'profile_complete'),
    'a complete profile unlocks its achievement');

  v_progress := public.my_progress();
  perform tests.ok(v_progress -> 'streak' ->> 'current' is not null, 'my_progress returns a streak');
  perform tests.ok(v_progress -> 'score' ->> 'next_tier' is not null,
    'my_progress names the next tier to aim at');
  perform tests.ok((v_progress -> 'score' ->> 'points_to_next')::int > 0,
    'my_progress says how many points are left');
  perform tests.ok(jsonb_array_length(v_progress -> 'achievements') > 0,
    'my_progress lists what has been earned');

  perform tests.ok(public.mark_achievements_seen() >= 0, 'achievements can be marked seen');
  perform tests.ok(
    jsonb_array_length(public.my_progress() -> 'unseen') = 0,
    'nothing stays unseen once acknowledged');
end $$;

-- Achievements are earned, never claimed.
do $$
begin
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.user_achievements', 'INSERT'),
    'an athlete cannot award themselves an achievement');
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.user_streaks', 'UPDATE'),
    'an athlete cannot write their own streak');
end $$;


-- ------------------------------------------------------------
do $$ begin raise notice E'\n── who you support ──'; end $$;

do $$
declare
  v_team  uuid;
  v_other uuid;
  v_ids   uuid[];
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');

  perform tests.ok(
    (select count(*) from public.search_teams(null, null, 50)) > 0,
    'the curated team catalogue ships with the migrations');

  select id into v_team from public.search_teams('Real', null, 5) limit 1;
  perform tests.ok(v_team is not null, 'searching by prefix finds a curated club');

  perform public.set_favorite_teams(array[v_team]);
  perform tests.ok(
    (select count(*) from public.favorite_teams
      where user_id = '11111111-1111-1111-1111-111111111111') = 1,
    'a team can be chosen');

  perform public.set_favorite_venue('Azadi Stadium');
  perform tests.ok(
    (select favorite_venue from public.user_profiles
      where id = '11111111-1111-1111-1111-111111111111') = 'Azadi Stadium',
    'a favourite ground is stored');

  -- The whole set is replaced, so a second call with nothing clears it.
  perform public.set_favorite_teams(array[]::uuid[]);
  perform tests.ok(
    (select count(*) from public.favorite_teams
      where user_id = '11111111-1111-1111-1111-111111111111') = 0,
    'clearing the set on a second pass sticks');

  -- Six is one too many.
  select array_agg(id) into v_ids from (select id from public.search_teams(null, null, 6)) t;
  begin
    perform public.set_favorite_teams(v_ids);
    perform tests.ok(false, 'six teams should have been refused');
  exception when others then
    perform tests.ok(true, 'no more than five teams can be followed');
  end;

  -- Somebody else's private addition stays private.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_other := public.add_custom_team('Totally Made Up FC', 'Football', 'Nowhere');
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  perform tests.ok(
    not exists (select 1 from public.search_teams('Totally', null, 20)),
    'a club somebody added is invisible to everyone else until it is curated');
end $$;

-- A minor who is not discoverable stays out of a supporters list.
do $$
declare v_team uuid;
begin
  select id into v_team from public.search_teams('Real', null, 5) limit 1;

  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  perform public.set_favorite_teams(array[v_team]);
  update public.user_profiles set is_discoverable = false
    where id = '22222222-2222-2222-2222-222222222222';

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform tests.ok(
    not exists (select 1 from public.fans_of_team(v_team, 50, 0)
                 where user_id = '22222222-2222-2222-2222-222222222222'),
    'a minor without consent is not listed among a team''s supporters');

  update public.user_profiles set is_discoverable = true
    where id = '22222222-2222-2222-2222-222222222222';
  perform tests.ok(
    exists (select 1 from public.fans_of_team(v_team, 50, 0)
             where user_id = '22222222-2222-2222-2222-222222222222'),
    'and appears once discovery is on');
  perform tests.ok(
    (select age from public.fans_of_team(v_team, 50, 0)
      where user_id = '22222222-2222-2222-2222-222222222222') is null,
    'a minor''s exact age is never returned to a supporters list');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── challenges ──'; end $$;

do $$
declare
  v_challenge uuid;
  v_media     uuid;
  v_athlete   uuid;
  v_entry     uuid;
begin
  -- Only a verified coach or club may set one.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  begin
    perform public.create_challenge('Football', 'Not allowed',
      'An athlete should not be able to set a challenge.', now() + interval '5 days');
    perform tests.ok(false, 'an athlete should not be able to set a challenge');
  exception when others then
    perform tests.ok(true, 'only verified coaches and clubs can set a challenge');
  end;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_challenge := public.create_challenge(
    'Football', 'Thirty seconds of keep-ups',
    'One take, feet and thighs only, phone on the ground.',
    now() + interval '5 days', null, 'Touches', 'touches', 'higher', 13, 30);
  perform tests.ok(v_challenge is not null, 'a verified coach can set a challenge');

  -- Entering needs a clip of your own.
  select id into v_athlete from public.athlete_profiles
    where user_id = '11111111-1111-1111-1111-111111111111';
  insert into public.athlete_media
    (athlete_id, title, media_type, storage_url, is_public)
  values (v_athlete, 'Keep-ups', 'highlight_reel', 'posts/test/keepups.mp4', true)
  returning id into v_media;

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_entry := public.enter_challenge(v_challenge, v_media, 214, 'Best of three.');
  perform tests.ok(v_entry is not null, 'an athlete can enter with their own clip');

  perform tests.ok(
    (select entry_count from public.challenges where id = v_challenge) = 1,
    'the entry counter tracks entries');

  perform tests.ok(
    (select status from public.challenge_leaderboard(v_challenge, 10, 0)
      where entry_id = v_entry) = 'submitted',
    'a fresh entry is a claim, not a verified result');

  -- Somebody else's clip is not yours to enter with.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  begin
    perform public.enter_challenge(v_challenge, v_media, 300, null);
    perform tests.ok(false, 'entering with another athlete''s clip should fail');
  exception when others then
    perform tests.ok(true, 'you can only enter with a clip of your own');
  end;

  -- Only the coach who set it can judge it.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  begin
    perform public.judge_challenge_entry(v_entry, true, 999, null);
    perform tests.ok(false, 'an athlete should not be able to confirm their own result');
  exception when others then
    perform tests.ok(true, 'an athlete cannot confirm their own result');
  end;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform public.judge_challenge_entry(v_entry, true, 210, 'Counted 210, not 214.');
  perform tests.ok(
    (select verified_value from public.challenge_leaderboard(v_challenge, 10, 0)
      where entry_id = v_entry) = 210,
    'the coach''s number is what the leaderboard shows as verified');

  -- Entering is publishing, so a minor needs the same consent as discovery.
  update public.user_profiles set is_discoverable = false
    where id = '22222222-2222-2222-2222-222222222222';
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  begin
    perform public.enter_challenge(v_challenge, v_media, 100, null);
    perform tests.ok(false, 'a minor without consent should not be able to enter');
  exception when others then
    perform tests.ok(true, 'a minor without guardian consent cannot enter a challenge');
  end;
  update public.user_profiles set is_discoverable = true
    where id = '22222222-2222-2222-2222-222222222222';
end $$;

-- Nobody writes a challenge row by hand.
do $$
begin
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.challenges', 'INSERT'),
    'challenges are created through the function, never by insert');
  perform tests.ok(
    not has_table_privilege('authenticated', 'public.challenge_entries', 'UPDATE'),
    'an entry cannot be edited around the judge');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── the score model, split in two ──'; end $$;

do $$
declare
  v_athlete uuid;
  v_direct  jsonb;
  v_split   jsonb;
  v_sim     jsonb;
begin
  select id into v_athlete from public.athlete_profiles
    where user_id = '11111111-1111-1111-1111-111111111111';

  -- The refactor is only safe if the composition equals the old whole.
  v_direct := private.compute_talent_score(v_athlete);
  v_split  := private.score_from_inputs(private.collect_score_inputs(v_athlete));
  perform tests.ok(v_direct = v_split,
    'compute_talent_score is exactly its two halves');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_sim := public.simulate_talent_score('{}'::jsonb);
  perform tests.ok(
    (v_sim -> 'current' ->> 'overall') = (v_sim -> 'projected' ->> 'overall'),
    'a simulation with no changes projects the score unchanged');

  v_sim := public.simulate_talent_score('{"video_items": 6, "account_verified": true}'::jsonb);
  perform tests.ok(
    (v_sim -> 'projected' ->> 'overall')::int > (v_sim -> 'current' ->> 'overall')::int,
    'clips and verification raise the projection');

  -- The caps are what stop the screen promising a 98 for nothing.
  v_sim := public.simulate_talent_score('{"followers": 9999999999}'::jsonb);
  perform tests.ok(
    (v_sim -> 'projected' ->> 'overall')::int <= 100,
    'no input can push the projection past 100');

  -- Inputs that depend on each other cannot be made incoherent.
  v_sim := public.simulate_talent_score('{"video_items": 9, "media_items": 1}'::jsonb);
  perform tests.ok(
    (v_sim -> 'projected' -> 'inputs' ->> 'media_items')::int >= 9,
    'a video is also a media item, whatever the caller sends');

  -- Nothing about the simulation is written down.
  perform tests.ok(
    private.compute_talent_score(v_athlete) = v_direct,
    'simulating never changes the real score');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── who has been looking ──'; end $$;

do $$
declare
  v_athlete uuid;
  v_digest  jsonb;
begin
  select id into v_athlete from public.athlete_profiles
    where user_id = '11111111-1111-1111-1111-111111111111';

  insert into public.profile_views
    (athlete_id, viewer_user_id, viewer_name, viewer_role, viewer_org, viewer_verified)
  values
    (v_athlete, '33333333-3333-3333-3333-333333333333', 'Verified Coach', 'coach', 'Test FC', true),
    (v_athlete, '44444444-4444-4444-4444-444444444444', 'Random Adult', 'athlete', null, false);

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_digest := public.profile_view_digest(7);

  perform tests.ok((v_digest ->> 'total')::int >= 2, 'the digest counts every view');
  perform tests.ok(
    jsonb_array_length(v_digest -> 'named') = 1,
    'only the verified professional is named');
  perform tests.ok(
    (v_digest -> 'named' -> 0 ->> 'user_id') = '33333333-3333-3333-3333-333333333333',
    'and it is the coach, not the other athlete');
  perform tests.ok((v_digest ->> 'unnamed')::int >= 1,
    'the rest are counted but not named');

  perform tests.ok((v_digest ->> 'new_since_seen')::int >= 2,
    'everything is new before the screen has been opened');
  perform public.mark_profile_views_seen();
  perform tests.ok(
    (public.profile_view_digest(7) ->> 'new_since_seen')::int = 0,
    'and nothing is new once it has');

  -- A coach has no Talent Score, so the digest says so rather than failing.
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform tests.ok(
    (public.profile_view_digest(7) ->> 'is_athlete')::boolean = false,
    'a coach opening the digest gets an answer, not an error');
end $$;


-- ------------------------------------------------------------
do $$ begin raise notice E'\n── a score for people who do not have one ──'; end $$;

/*
 * `refresh_my_talent_score` raised P0002 when the caller had no athlete row,
 * which PostgREST turned into a 500 — a coach or a guardian reaching the score
 * screen by a deep link produced a server error for behaving normally. The
 * client has always been typed to expect null, so null is what it gets.
 */
do $$
declare
  v_row public.talent_scores;
begin
  perform tests.as_user('33333333-3333-3333-3333-333333333333');  -- the coach
  v_row := public.refresh_my_talent_score();
  perform tests.ok(v_row.athlete_id is null,
    'a coach asking for their score gets null, not an error');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');  -- the athlete
  v_row := public.refresh_my_talent_score();
  perform tests.ok(v_row.athlete_id is not null and v_row.overall between 0 and 100,
    'and an athlete still gets a real one');
exception when others then
  perform tests.ok(false, 'refresh_my_talent_score raised: ' || sqlerrm);
end $$;


-- ------------------------------------------------------------
do $$ begin raise notice E'\n── the wallpaper ──'; end $$;

do $$
declare
  v_bundle jsonb;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');

  update public.user_profiles
     set cover_url = 'https://example.test/cover.jpg'
   where id = '11111111-1111-1111-1111-111111111111';

  v_bundle := public.get_profile_bundle('11111111-1111-1111-1111-111111111111');
  perform tests.ok(
    v_bundle -> 'user' ->> 'cover_url' = 'https://example.test/cover.jpg',
    'the profile bundle carries the cover the person set');

  /* The column is writable by its owner and by nobody else — 0904/02 revoked
     the table-wide grant, so a new column is unwritable until it is named. */
  perform tests.ok(
    has_column_privilege('authenticated', 'public.user_profiles', 'cover_url', 'UPDATE'),
    'and a signed-in person may write their own');
end $$;


-- ------------------------------------------------------------
do $$ begin raise notice E'\n── meetups, and the eighteen-plus floor ──'; end $$;

do $$
declare
  v_meetup uuid;
  v_raised boolean;
  v_rows   integer;
  v_detail jsonb;
begin
  -- The adult athlete hosts a five-a-side.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_meetup := public.create_meetup(
    'football', 'Saturday five-a-side', 'United Arab Emirates', 'Dubai',
    now() + interval '3 days', 10, 'Al Jadaf', 'Al Jadaf Pitch 2');

  perform tests.ok(v_meetup is not null, 'an adult can host a meetup');

  perform tests.ok(
    (select spots_taken from public.meetups where id = v_meetup) = 1,
    'the host occupies one of the spots');

  -- The minor must not be able to host, join, see or find one.
  perform tests.as_user('22222222-2222-2222-2222-222222222222');

  perform tests.ok(not private.may_meet(), 'a minor fails the meetup gate');

  v_raised := false;
  begin
    perform public.create_meetup('tennis', 'Hitting partner', 'Spain', 'Marbella',
                                 now() + interval '2 days', 2);
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a minor cannot host a meetup');

  v_raised := false;
  begin
    perform public.request_to_join_meetup(v_meetup, 'can I come');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a minor cannot ask to join one');

  select count(*) into v_rows from public.find_meetups();
  perform tests.ok(v_rows = 0, 'a minor searching finds nothing at all');

  /* The search function is SECURITY DEFINER, so the assertion above proves the
     gate inside it and nothing about RLS. This one drops to the `authenticated`
     role for one statement, because the tests otherwise run as the superuser,
     and a superuser bypasses row-level security entirely — which is how an
     RLS hole survives a full green suite. */
  set local role authenticated;
  select count(*) into v_rows from public.meetups;
  reset role;
  perform tests.ok(v_rows = 0, 'and RLS hides the row itself, not just the search');

  /* The trigger is the third gate: even service-role code that skipped every
     function above cannot put a minor in a place at a time. */
  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_raised := false;
  begin
    insert into public.meetup_participants (meetup_id, user_id, status)
    values (v_meetup, '22222222-2222-2222-2222-222222222222', 'joined');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'and the participant trigger refuses a minor outright');

  -- A second adult asks, and the host decides.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  perform tests.ok(
    public.request_to_join_meetup(v_meetup, 'I play left back') = 'requested',
    'another adult can ask to join');

  perform tests.ok(
    (select spots_taken from public.meetups where id = v_meetup) = 1,
    'asking does not take a spot — only the host deciding does');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_detail := public.meetup_detail(v_meetup);
  perform tests.ok(
    jsonb_array_length(v_detail -> 'pending') = 1,
    'the host sees the pending request');

  perform public.decide_meetup_request(
    v_meetup, '44444444-4444-4444-4444-444444444444', true);

  perform tests.ok(
    (select spots_taken from public.meetups where id = v_meetup) = 2,
    'accepting takes a spot');

  v_detail := public.meetup_detail(v_meetup);
  perform tests.ok(
    (v_detail -> 'meetup' ->> 'spots_left')::int = 8,
    'and eight of ten are left, which is what the card says');

  -- Someone who is not the host cannot decide.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_raised := false;
  begin
    perform public.decide_meetup_request(
      v_meetup, '44444444-4444-4444-4444-444444444444', true);
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'only the host decides who comes');

  -- Leaving gives the spot back.
  perform public.leave_meetup(v_meetup);
  perform tests.ok(
    (select spots_taken from public.meetups where id = v_meetup) = 1,
    'leaving returns the spot to the pool');

  -- A host cancels rather than leaving.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_raised := false;
  begin
    perform public.leave_meetup(v_meetup);
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a host is told to cancel rather than leave');

  perform public.cancel_meetup(v_meetup);
  perform tests.ok(
    (select status from public.meetups where id = v_meetup) = 'cancelled',
    'a host can call it off');

  select count(*) into v_rows from public.find_meetups();
  perform tests.ok(v_rows = 0, 'a cancelled meetup drops out of search');
end $$;

-- Search actually narrows.
do $$
declare v_rows integer;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  perform public.create_meetup('tennis', 'Hitting partner wanted', 'Spain', 'Marbella',
                               now() + interval '5 days', 2, 'Puerto Banus');
  perform public.create_meetup('football', 'Sunday game', 'United Arab Emirates', 'Dubai',
                               now() + interval '6 days', 12, 'Marina');

  select count(*) into v_rows from public.find_meetups(p_place => 'marbella');
  perform tests.ok(v_rows = 1, 'searching a place you are travelling to finds it');

  select count(*) into v_rows from public.find_meetups(p_sport => 'tennis');
  perform tests.ok(v_rows = 1, 'and searching by sport narrows to the sport');

  select count(*) into v_rows from public.find_meetups(
    p_from => now() + interval '7 days');
  perform tests.ok(v_rows = 0, 'a date window with nothing in it returns nothing');

  select count(*) into v_rows from public.my_meetups();
  perform tests.ok(v_rows = 2, 'my_meetups lists what I am hosting');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── translation cache ──'; end $$;

do $$
declare v_hit jsonb; v_raised boolean;
begin
  -- Only the translate function reads the cache; a client probing it with
  -- arbitrary text could learn what other people have written.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_raised := false;
  begin
    perform public.cached_translation('Bom jogo hoje', 'en');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a signed-in account cannot read the translation cache');

  -- Only the service role writes.
  v_raised := false;
  begin
    perform public.store_translation('Bom jogo hoje', 'en', 'Good game today', 'test');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'a signed-in account cannot write a translation');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform tests.ok(
    public.cached_translation('Bom jogo hoje', 'en') is null,
    'a miss is null, so the function knows to call the provider');

  perform public.store_translation('Bom jogo hoje', 'en', 'Good game today', 'test', 'pt');

  v_hit := public.cached_translation('Bom jogo hoje', 'en');
  perform tests.ok(v_hit ->> 'translated' = 'Good game today',
    'and the next reader gets it from the cache, free');
  perform tests.ok(v_hit ->> 'detected_lang' = 'pt',
    'the detected source language comes back too');

  perform tests.ok(
    public.cached_translation('  Bom jogo hoje  ', 'en') ->> 'translated' = 'Good game today',
    'whitespace does not create a second row for the same sentence');

  perform tests.ok(
    public.cached_translation('Bom jogo hoje!', 'en') is null,
    'but edited text is a different hash, so it is not answered with stale words');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── endorsements ──'; end $$;

/*
 * The Talent Score has told athletes to "ask a coach to endorse you" since it
 * shipped, and it is worth up to 45 of the 100 credibility points. Until now
 * there was no way for the coach to do it. These assert the write path, and
 * the two rules that only started mattering once anybody could reach the
 * table: the role on the row is the server's word, not the caller's, and the
 * same skill cannot be endorsed twice to stack the count.
 */
do $$
declare
  v_athlete uuid;
  v_id      uuid;
  v_role    text;
  v_rows    integer;
  v_err     text;
  v_hint    text;
begin
  select id into v_athlete from public.athlete_profiles
   where user_id = '11111111-1111-1111-1111-111111111111';

  -- The coach endorses.
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_id := public.endorse_athlete(v_athlete, 'Movement in the box', 'Times her runs well.');
  perform tests.ok(v_id is not null, 'a coach can endorse an athlete');

  select endorser_role::text into v_role from public.endorsements where id = v_id;
  perform tests.ok(v_role = 'coach',
    'the role on the endorsement comes from the endorser''s profile');

  /* The column the score reads is no longer writable by a client at all. This
     drops to the `authenticated` role for the statement: the suite runs as the
     superuser, and a superuser has every privilege regardless of what was
     revoked — which is how a missing REVOKE survives a green suite. */
  v_err := null;
  begin
    set local role authenticated;
    insert into public.endorsements (athlete_id, endorser_id, endorser_role, skill_or_trait)
    values (v_athlete, '33333333-3333-3333-3333-333333333333', 'federation', 'Vision');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null,
    'and a client cannot insert one directly to claim a role it does not have');

  -- Same skill again updates rather than stacking.
  perform public.endorse_athlete(v_athlete, '  movement in the BOX ', 'Still true.');
  select count(*) into v_rows from public.endorsements
   where athlete_id = v_athlete and endorser_id = '33333333-3333-3333-3333-333333333333';
  perform tests.ok(v_rows = 1,
    'endorsing the same skill again updates it rather than counting twice');

  select note into v_err from public.endorsements where id = v_id;
  perform tests.ok(v_err = 'Still true.', 'and the note is the newer one');

  -- Six distinct skills, and no more.
  perform public.endorse_athlete(v_athlete, 'First touch');
  perform public.endorse_athlete(v_athlete, 'Pressing');
  perform public.endorse_athlete(v_athlete, 'Left foot');
  perform public.endorse_athlete(v_athlete, 'Work rate');
  perform public.endorse_athlete(v_athlete, 'Coachability');

  v_hint := null;
  begin
    perform public.endorse_athlete(v_athlete, 'Leadership');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'endorse_limit',
    'a seventh skill from the same endorser is refused');

  perform tests.ok(
    (select count(*) from public.endorsements where athlete_id = v_athlete) = 6,
    'so six is what the athlete carries from one endorser');

  -- Nobody endorses themselves.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_hint := null;
  begin
    perform public.endorse_athlete(v_athlete, 'Modesty');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'endorse_self', 'and nobody endorses themselves');

  -- Withdrawing is the endorser's to do, and only theirs.
  v_err := null;
  begin
    perform public.withdraw_endorsement(v_id);
  exception when others then v_err := sqlerrm;
  end;
  perform tests.ok(v_err is not null,
    'the athlete cannot delete an endorsement written about them');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  select count(*) into v_rows from public.my_endorsements_of(v_athlete);
  perform tests.ok(v_rows = 6, 'my_endorsements_of tells the button what I already said');

  perform public.withdraw_endorsement(v_id);
  select count(*) into v_rows from public.my_endorsements_of(v_athlete);
  perform tests.ok(v_rows = 5, 'and the endorser can take one back');
end $$;

/* The score is the reason any of this exists, so check it moves. */
do $$
declare
  v_athlete uuid;
  v_before  integer;
  v_after   integer;
begin
  select id into v_athlete from public.athlete_profiles
   where user_id = '44444444-4444-4444-4444-444444444444';

  if v_athlete is null then
    raise notice '  ok   (no athlete profile for the control account — skipped)';
    return;
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_before := (private.compute_talent_score(v_athlete) ->> 'credibility_score')::integer;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform public.endorse_athlete(v_athlete, 'Reads the game');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_after := (private.compute_talent_score(v_athlete) ->> 'credibility_score')::integer;

  perform tests.ok(v_after > v_before,
    'an endorsement from a verified coach moves the credibility score');
end $$;

-- ------------------------------------------------------------
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── game intelligence ──'; end $$;

/*
 * docs/26. The rules worth pinning: consent is decided by age and country
 * before any test starts; the pitch-decision answer key never leaves the
 * database; a result outside human limits is stored but not scored; two
 * attempts per test per fortnight; and nobody sees a result the athlete has
 * not chosen to share — a minor's, only past the discovery gate as well.
 */
do $$
declare
  v_adult   uuid := '11111111-1111-1111-1111-111111111111';
  v_minor   uuid := '22222222-2222-2222-2222-222222222222';
  v_coach   uuid := '33333333-3333-3333-3333-333333333333';
  v_other   uuid := '44444444-4444-4444-4444-444444444444';
  v_session uuid;
  v_second  uuid;
  v_scen    jsonb;
  v_choices jsonb := '[]';
  v_best    text;
  v_res     jsonb;
  v_state   jsonb;
  v_prof    public.gi_profiles;
  v_err     text;
  v_hint    text;
  v_rows    integer;
  v_token   text;
  v_disc    boolean;
  r         record;
begin
  -- ── consent ──
  perform tests.as_user(v_adult);
  perform tests.ok((public.gi_my_state()->>'consent') = 'ok',
    'an adult athlete can consent for themselves');

  /* The minor in this suite is fifteen: at the product default of 15 she
     decides for herself… */
  perform tests.as_user(v_minor);
  perform tests.ok((public.gi_my_state()->>'consent') = 'ok',
    'a fifteen-year-old consents for herself at the default age');

  /* …but not in a country whose law says sixteen. */
  update public.user_profiles set country = 'Germany' where id = v_minor;
  perform tests.ok((public.gi_my_state()->>'consent') = 'guardian_required',
    'in Germany the same fifteen-year-old needs a guardian');
  perform tests.ok((public.gi_my_state()->>'self_consent_age')::int = 16,
    'and the screen is told the age that applies');

  v_hint := null;
  begin
    perform public.gi_start_session('test', 250, 2);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'gi_consent_required',
    'the database, not the screen, refuses to start a session without consent');

  /* A guardian ticks the new scope on a fresh request. Granting it must
     supersede the consent already in force rather than collide with it. */
  v_token := tests.request_consent('Parent Name', 'parent@test.local', 'parent');
  v_res := public.confirm_guardian_consent(v_token, true, true, true, true);
  perform tests.ok((v_res->>'ok')::boolean,
    'a second approval is accepted while an earlier one is in force');
  select count(*) into v_rows from public.guardian_consents
   where minor_user_id = v_minor and status = 'granted';
  perform tests.ok(v_rows = 1, 'and exactly one consent is live afterwards');
  perform tests.ok((public.gi_my_state()->>'consent') = 'ok',
    'with assessments approved, she can take the games');

  /* The new scope is readable by the app, which names its columns. */
  perform tests.ok(
    has_column_privilege('authenticated', 'public.guardian_consents', 'allow_assessments', 'SELECT'),
    'the app can read the new consent scope');

  v_err := null;
  begin
    set local role authenticated;
    update public.guardian_consents set allow_assessments = true
     where minor_user_id = v_minor;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.as_user(v_minor);
  perform tests.ok(v_err is not null, 'and the minor cannot tick it herself');

  /* A second guardian's approval sits beside the first rather than replacing it. */
  v_token := tests.request_consent('Other Parent', 'other.parent@test.local', 'parent');
  perform public.confirm_guardian_consent(v_token, true, false, false, false);
  select count(*) into v_rows from public.guardian_consents
   where minor_user_id = v_minor and status = 'granted';
  perform tests.ok(v_rows = 2 and (public.gi_my_state()->>'consent') = 'ok',
    'another guardian''s narrower approval does not undo the first');
  update public.guardian_consents set status = 'revoked'
   where minor_user_id = v_minor and guardian_email = 'other.parent@test.local';

  /* Approving discovery two weeks ago is not approving testing. */
  v_token := tests.request_consent('Parent Name', 'parent@test.local', 'parent');
  perform public.confirm_guardian_consent(v_token, true, true, true);
  perform tests.ok((public.gi_my_state()->>'consent') = 'guardian_required',
    'a guardian who leaves the box unticked has not approved assessments');
  update public.user_profiles set country = null where id = v_minor;

  -- ── the answer key ──
  perform tests.as_user(v_adult);
  v_session := public.gi_start_session('ios:phone', 245, 2);
  v_scen := public.gi_scenarios_for_session(v_session, 8);
  perform tests.ok(jsonb_array_length(v_scen) = 8, 'a session is handed eight scenarios');
  perform tests.ok(not (v_scen::text like '%answer_key%'),
    'and none of them carries the answer key');
  perform tests.ok(not (v_scen::text like '%"title"%'),
    'nor the authoring label, which names the answer');
  perform tests.ok(public.gi_scenarios_for_session(v_session, 8) = v_scen,
    'asking again returns the same eight, not a fresh draw to shop from');

  v_err := null;
  begin
    set local role authenticated;
    perform count(*) from public.gi_scenarios;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.as_user(v_adult);
  perform tests.ok(v_err is not null,
    'a client cannot read the scenario table directly');

  -- ── scoring ──
  v_res := public.gi_submit_result(v_session, 'reaction',
    '{"trials":16,"correct":16,"median_ms":120,"anticipations":0}');
  perform tests.ok(not (v_res->>'valid')::boolean and v_res->>'reason' = 'implausible',
    'a reaction time faster than a human hand is stored as invalid, not scored');

  v_hint := null;
  begin
    perform public.gi_submit_result(v_session, 'reaction',
      '{"trials":16,"correct":15,"median_ms":480,"anticipations":0}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'gi_already_done', 'one result per test per session');

  v_res := public.gi_submit_result(v_session, 'go_no_go',
    '{"go_trials":30,"go_hits":29,"go_median_ms":390,"nogo_trials":10,"nogo_withheld":9}');
  perform tests.ok((v_res->>'valid')::boolean and (v_res->>'score')::numeric between 0 and 100,
    'go/no-go scores between 0 and 100');

  v_res := public.gi_submit_result(v_session, 'flanker',
    '{"trials":24,"correct":23,"congruent_ms":520,"incongruent_ms":590}');
  perform tests.ok((v_res->>'valid')::boolean, 'flanker scores');

  v_res := public.gi_submit_result(v_session, 'tracking',
    '{"rounds":5,"targets_total":17,"targets_found":15,"max_level":5}');
  perform tests.ok((v_res->>'valid')::boolean, 'tracking scores');

  v_res := public.gi_submit_result(v_session, 'anticipation',
    '{"trials":10,"answered":10,"mean_error":0.06}');
  perform tests.ok((v_res->>'valid')::boolean, 'anticipation scores');

  /* Pick the best option for every issued scenario, plus one that was never
     issued: the stray must not count. */
  for r in
    select (e->>'id')::uuid as id from jsonb_array_elements(v_scen) e
  loop
    select k.key into v_best from public.gi_scenarios s, jsonb_each_text(s.answer_key) k
     where s.id = r.id order by k.value::numeric desc limit 1;
    v_choices := v_choices || jsonb_build_object('scenario', r.id, 'option', v_best, 'ms', 1200);
  end loop;
  v_choices := v_choices || jsonb_build_object(
    'scenario', (select id from public.gi_scenarios
                  where not (id = any(array(select (e->>'id')::uuid from jsonb_array_elements(v_scen) e)))
                  limit 1),
    'option', 'a', 'ms', 900);

  v_res := public.gi_submit_result(v_session, 'pitch_decision',
    jsonb_build_object('choices', v_choices));
  perform tests.ok((v_res->>'valid')::boolean and (v_res->>'score')::numeric >= 85,
    'the best answer to every scenario scores high, scored on the server');

  v_res := public.gi_finish_session(v_session);
  select * into v_prof from public.gi_profiles where user_id = v_adult;
  perform tests.ok(v_prof.tests_completed = 5 and v_prof.overall is not null,
    'five valid tests of six make an overall; the invalid one is not in it');
  perform tests.ok(not (v_prof.subscores ? 'reaction'),
    'and the invalid reaction result is not a sub-score');
  perform tests.ok(v_prof.confidence = 'medium', 'five of six is medium confidence');
  perform tests.ok(v_prof.percentile is null,
    'no percentile from a cohort of one');

  -- ── attempts ──
  v_second := public.gi_start_session('ios:phone', 250, 2);
  v_res := public.gi_submit_result(v_second, 'reaction',
    '{"trials":16,"correct":16,"median_ms":470,"anticipations":0}');

  /* Leaving a field out must not slip past the range checks: a NULL compares
     as "not out of range", and least(100, NULL) is 100. */
  v_res := public.gi_submit_result(v_second, 'tracking',
    '{"rounds":6,"targets_total":20,"max_level":8}');
  perform tests.ok(not (v_res->>'valid')::boolean,
    'a result with a metric missing is invalid, not a perfect score');
  perform public.gi_finish_session(v_second);
  select * into v_prof from public.gi_profiles where user_id = v_adult;
  perform tests.ok(v_prof.tests_completed = 6 and v_prof.confidence = 'high',
    'a retake fills the gap and the best-of window now holds all six');

  v_second := public.gi_start_session('ios:phone', 250, 2);
  v_hint := null;
  begin
    perform public.gi_submit_result(v_second, 'reaction',
      '{"trials":16,"correct":16,"median_ms":400,"anticipations":0}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'gi_attempt_limit',
    'a third attempt at the same test inside fourteen days is refused');

  -- ── nobody writes a score ──
  v_err := null;
  begin
    set local role authenticated;
    update public.gi_profiles set overall = 99 where user_id = v_adult;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null, 'an athlete cannot write their own result');

  -- ── who sees what ──
  perform tests.as_user(v_coach);
  perform tests.ok(public.get_game_intelligence(v_adult) is null,
    'a coach sees nothing until the athlete shares');

  perform tests.as_user(v_adult);
  perform public.gi_set_sharing(true, false);

  perform tests.as_user(v_coach);
  v_res := public.get_game_intelligence(v_adult);
  perform tests.ok(v_res->>'view' = 'recruiter' and v_res ? 'subscores',
    'once shared, a coach sees the overall and the sub-scores');

  perform tests.as_user(v_other);
  perform tests.ok(public.get_game_intelligence(v_adult) is null,
    'another athlete sees nothing while the badge is off');

  perform tests.as_user(v_adult);
  perform public.gi_set_sharing(true, true);
  perform tests.as_user(v_other);
  v_res := public.get_game_intelligence(v_adult);
  perform tests.ok(v_res->>'view' = 'badge' and not (v_res ? 'subscores'),
    'with the badge on, another athlete sees the badge and nothing else');

  perform tests.as_user(v_adult);
  perform public.gi_set_sharing(false, true);
  perform tests.ok(not (select show_badge from public.gi_profiles where user_id = v_adult),
    'turning sharing off takes the badge with it');

  /* A minor's shared result stays behind the discovery gate. */
  insert into public.gi_profiles (athlete_id, user_id, overall, subscores, tests_completed,
                                  share_with_clubs, show_badge)
  select id, v_minor, 61, '{"tracking":61}', 4, true, true
    from public.athlete_profiles where user_id = v_minor
  on conflict (athlete_id) do update set overall = 61, share_with_clubs = true;

  select is_discoverable into v_disc from public.user_profiles where id = v_minor;
  update public.user_profiles set is_discoverable = false where id = v_minor;
  perform tests.as_user(v_coach);
  perform tests.ok(public.get_game_intelligence(v_minor) is null,
    'a minor''s shared result is invisible while discovery is not approved');
  update public.user_profiles set is_discoverable = v_disc where id = v_minor;

  delete from public.gi_profiles where user_id = v_minor;
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── stories and reels ──'; end $$;

/*
 * 1006/03. A story is a 24-hour post, so it carries every gate a post does:
 * a hidden minor's story reaches nobody, audience and blocks are honoured,
 * and the only way in is create_story, which checks what a policy cannot.
 */
do $$
declare
  v_adult uuid := '11111111-1111-1111-1111-111111111111';
  v_minor uuid := '22222222-2222-2222-2222-222222222222';
  v_coach uuid := '33333333-3333-3333-3333-333333333333';
  v_other uuid := '44444444-4444-4444-4444-444444444444';
  v_story uuid;
  v_minor_story uuid;
  v_err   text;
  v_hint  text;
  v_disc  boolean;
  v_rows  integer;
begin
  perform tests.as_user(v_adult);
  v_story := public.create_story('card', null, null,
    '{"text":"New PB","background":"warm","sticker":"pb","stat":"2:09","extra":"dropped"}', 'public');
  perform tests.ok(v_story is not null, 'an athlete can post a card story');
  perform tests.ok(
    (select not (card ? 'extra') from public.stories where id = v_story),
    'only the card keys the app renders are kept');

  v_hint := null;
  begin
    perform public.create_story('photo', v_other::text || '/x.jpg', null, '{}', 'public');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'story_media_missing',
    'a photo story must point at the author''s own upload');

  v_err := null;
  begin
    set local role authenticated;
    insert into public.stories (author_id, media_type, card, audience)
    values (v_adult, 'card', '{"text":"sneaky"}', 'public');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null, 'stories cannot be written around create_story');

  perform tests.as_user(v_coach);
  perform tests.ok(
    (select count(*) from public.user_stories(v_adult)) = 1,
    'a public story is visible to another account');
  perform public.mark_story_viewed(v_story);
  perform tests.ok(
    (select seen from public.user_stories(v_adult)) = true,
    'and viewing it is remembered');

  perform tests.as_user(v_adult);
  perform tests.ok(
    (select view_count from public.user_stories(v_adult)) = 1,
    'the author sees how many people watched');

  /* A minor whose guardian has not approved discovery reaches nobody. */
  select is_discoverable into v_disc from public.user_profiles where id = v_minor;
  perform tests.as_user(v_minor);
  v_minor_story := public.create_story('card', null, null, '{"text":"Match day","background":"hero"}', 'public');
  update public.user_profiles set is_discoverable = false where id = v_minor;
  perform tests.as_user(v_coach);
  perform tests.ok(
    (select count(*) from public.user_stories(v_minor)) = 0,
    'a hidden minor''s story is visible to no one else');
  v_err := null;
  begin
    set local role authenticated;
    select count(*) into v_rows from public.stories where author_id = v_minor;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.as_user(v_coach);
  perform tests.ok(coalesce(v_rows, 0) = 0, 'not even by reading the table directly');
  update public.user_profiles set is_discoverable = v_disc where id = v_minor;

  /* Blocking hides stories both ways. */
  insert into public.user_blocks (blocker_id, blocked_id) values (v_adult, v_other)
  on conflict do nothing;
  perform tests.as_user(v_other);
  perform tests.ok(
    (select count(*) from public.user_stories(v_adult)) = 0,
    'someone the author blocked does not see their stories');
  delete from public.user_blocks where blocker_id = v_adult and blocked_id = v_other;

  perform tests.as_user(v_adult);
  perform tests.ok(
    (select count(*) from public.story_rail(30) where is_self) = 1,
    'my own stories lead the rail');
  perform public.delete_story(v_story);
  perform tests.ok(
    not exists (select 1 from public.stories where id = v_story),
    'and I can take one down');

  perform tests.ok((select count(*) from public.get_reels(12, null)) >= 0, 'get_reels executes');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── explore ──'; end $$;

/*
 * 1007/01. Explore shows strangers' clips, so it is the strictest read of
 * video in the app: public only, and every author gate the feed applies.
 */
do $$
declare
  v_adult uuid := '11111111-1111-1111-1111-111111111111';
  v_minor uuid := '22222222-2222-2222-2222-222222222222';
  v_coach uuid := '33333333-3333-3333-3333-333333333333';
  v_other uuid := '44444444-4444-4444-4444-444444444444';
  v_public uuid := gen_random_uuid();
  v_private uuid := gen_random_uuid();
  v_photo uuid := gen_random_uuid();
  v_minor_post uuid := gen_random_uuid();
  v_clip uuid := gen_random_uuid();
  v_secret_clip uuid := gen_random_uuid();
  v_athlete uuid;
  v_disc boolean;
  v_sport text;
  v_err text;
begin
  select id, sport into v_athlete, v_sport from public.athlete_profiles where user_id = v_adult;

  insert into public.posts (id, author_id, type, caption, text, audience, media) values
    (v_public, v_adult, 'video', 'public clip', 'public clip', 'public',
     jsonb_build_array(jsonb_build_object('url', v_adult::text || '/a.mp4', 'type', 'video'))),
    (v_private, v_adult, 'video', 'followers clip', 'followers clip', 'followers',
     jsonb_build_array(jsonb_build_object('url', v_adult::text || '/b.mp4', 'type', 'video'))),
    (v_photo, v_adult, 'standard', 'a photo', 'a photo', 'public',
     jsonb_build_array(jsonb_build_object('url', v_adult::text || '/c.jpg', 'type', 'photo'))),
    (v_minor_post, v_minor, 'video', 'minor clip', 'minor clip', 'public',
     jsonb_build_array(jsonb_build_object('url', v_minor::text || '/d.mp4', 'type', 'video')));
  insert into public.athlete_media (id, athlete_id, title, media_type, storage_url, is_public, views_count) values
    (v_clip, v_athlete, 'Highlight clip', 'highlight_reel', v_adult::text || '/highlights/h.mp4', true, 12),
    (v_secret_clip, v_athlete, 'Private clip', 'video', v_adult::text || '/highlights/p.mp4', false, 0);
  /* Following must not widen Explore: it stays public-only. */
  insert into public.follows (follower_id, following_id) values (v_coach, v_adult) on conflict do nothing;

  perform tests.as_user(v_coach);
  perform tests.ok(
    exists (select 1 from public.explore_videos(60, 0, null) where id = v_public),
    'a public video post is on Explore');
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where id = v_private),
    'a followers-only clip is not, even for a follower');
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where id = v_photo),
    'a photo post is not a clip');
  perform tests.ok(
    (select type = 'highlight' and view_count = 12 and media -> 0 ->> 'type' = 'video'
     from public.explore_videos(60, 0, null) where id = v_clip),
    'a public highlight is on Explore, in the feed''s shape');
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where id = v_secret_clip),
    'a private highlight is not');
  perform tests.ok(
    (select viewer_follows from public.explore_videos(60, 0, null) where id = v_public),
    'it knows whether I already follow the author');

  /* A minor whose guardian has not approved discovery reaches nobody. */
  select is_discoverable into v_disc from public.user_profiles where id = v_minor;
  update public.user_profiles set is_discoverable = false where id = v_minor;
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where author_id = v_minor),
    'a hidden minor''s clips are on nobody''s Explore');
  perform tests.as_user(v_minor);
  perform tests.ok(
    exists (select 1 from public.explore_videos(60, 0, null) where id = v_minor_post),
    'though the minor still sees their own');
  update public.user_profiles set is_discoverable = v_disc where id = v_minor;

  /* Blocks, both directions. */
  insert into public.user_blocks (blocker_id, blocked_id) values (v_adult, v_other) on conflict do nothing;
  perform tests.as_user(v_other);
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where author_id = v_adult),
    'someone the author blocked sees none of their clips');
  delete from public.user_blocks where blocker_id = v_adult and blocked_id = v_other;
  insert into public.user_blocks (blocker_id, blocked_id) values (v_other, v_adult) on conflict do nothing;
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where author_id = v_adult),
    'nor does someone who blocked the author');
  delete from public.user_blocks where blocker_id = v_other and blocked_id = v_adult;

  /* Reels: a clip uploaded to a profile is a reel too. */
  perform tests.as_user(v_coach);
  perform tests.ok(
    exists (select 1 from public.get_reels(30, null) where id = v_clip and type = 'highlight'),
    'a public profile clip plays in Reels');
  perform tests.ok(
    not exists (select 1 from public.get_reels(30, null) where id = v_secret_clip),
    'a private one does not');
  perform tests.ok(
    exists (select 1 from public.get_reels(30, null) where id = v_private),
    'Reels still carry a followed author''s followers-only clip, as the feed does');
  perform tests.ok(
    not exists (select 1 from public.get_reels(30, now() - interval '1 day') where id = v_clip),
    'the cursor applies to profile clips as well');
  perform tests.as_user(v_adult);
  perform tests.ok(
    exists (select 1 from public.get_reels(30, null) where id = v_clip),
    'and I see my own profile clips in Reels');
  update public.user_profiles set is_discoverable = false where id = v_minor;
  insert into public.athlete_media (athlete_id, title, media_type, storage_url, is_public)
  select ap.id, 'Minor clip', 'video', v_minor::text || '/highlights/m.mp4', true
  from public.athlete_profiles ap where ap.user_id = v_minor;
  perform tests.as_user(v_coach);
  perform tests.ok(
    not exists (select 1 from public.get_reels(30, null) where author_id = v_minor),
    'a hidden minor''s profile clips reach nobody''s Reels');
  delete from public.athlete_media where storage_url = v_minor::text || '/highlights/m.mp4';
  update public.user_profiles set is_discoverable = v_disc where id = v_minor;

  /* A hidden or moderated post drops out. */
  update public.posts set is_hidden = true where id = v_public;
  perform tests.as_user(v_coach);
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, null) where id = v_public),
    'a hidden post leaves Explore');
  update public.posts set is_hidden = false where id = v_public;

  /* Paging and the sport filter. */
  perform tests.ok(
    not exists (
      select 1 from public.explore_videos(1, 0, null) a
      join public.explore_videos(1, 1, null) b on a.id = b.id),
    'pages do not repeat a clip');
  perform tests.ok(
    not exists (select 1 from public.explore_videos(60, 0, 'no-such-sport')),
    'the sport filter narrows the grid');
  perform tests.ok(
    v_sport is null
    or exists (select 1 from public.explore_sports() where sport = v_sport and clips >= 2),
    'explore_sports counts what this viewer can watch');

  v_err := null;
  begin
    perform tests.as_user(null);
    perform public.explore_videos(10, 0, null);
  exception when others then v_err := sqlerrm;
  end;
  perform tests.ok(v_err is not null, 'Explore needs a signed-in account');

  delete from public.posts where id in (v_public, v_private, v_photo, v_minor_post);
  delete from public.athlete_media where id in (v_clip, v_secret_clip);
  delete from public.follows where follower_id = v_coach and following_id = v_adult;
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── sponsorship ──'; end $$;

/*
 * 1008/02. Money offers to young athletes: only a verified sponsor may make
 * one, only on a request the athlete opened, and a minor's side of it exists
 * only while a guardian's consent carries the sponsorship scope.
 */
do $$
declare
  v_adult    uuid := '11111111-1111-1111-1111-111111111111';
  v_minor    uuid := '22222222-2222-2222-2222-222222222222';
  v_coach    uuid := '33333333-3333-3333-3333-333333333333';
  v_other    uuid := '44444444-4444-4444-4444-444444444444';
  v_guardian uuid := '66666666-6666-6666-6666-666666666666';
  v_brand    uuid := 'aaaaaaaa-5555-4000-8000-000000000001';
  v_fake     uuid := 'aaaaaaaa-5555-4000-8000-000000000002';
  v_climber  uuid := 'aaaaaaaa-5555-4000-8000-000000000003';
  v_req      uuid;
  v_minor_req uuid;
  v_call     uuid;
  v_kids_call uuid;
  v_deal     uuid;
  v_app      uuid;
  v_hint     text;
  v_err      text;
  v_token    text;
  v_res      jsonb;
  v_disc     boolean;
  v_n        integer;
begin
  /* Signup: `sponsor` is a role a person may pick; `super_admin` is not. */
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_brand,   'brand@test.local',   '{"full_name":"Falcon Energy","role":"sponsor"}'),
    (v_fake,    'fake@test.local',    '{"full_name":"Totally A Brand","role":"sponsor"}'),
    (v_climber, 'climber@test.local', '{"full_name":"Wants Root","role":"super_admin"}')
  on conflict do nothing;
  update public.user_private set date_of_birth = current_date - interval '40 years'
   where user_id in (v_brand, v_fake, v_climber);
  update public.user_profiles set is_verified = true where id = v_brand;

  perform tests.ok(
    (select role::text from public.user_profiles where id = v_brand) = 'sponsor'
    and exists (select 1 from public.sponsor_profiles where user_id = v_brand),
    'a sponsor signs up as a sponsor and gets a brand profile');
  perform tests.ok(
    (select role::text from public.user_profiles where id = v_climber) = 'athlete',
    'signup metadata cannot claim super_admin');

  perform tests.as_user(v_brand);
  perform public.save_sponsor_profile(
    '{"company_name":"Falcon Energy","industry":"Energy drinks","website":"https://falcon.example",
      "offers":["cash","equipment","yacht"],"sports":["Tennis","Athletics"],"budget_min":2000,"budget_max":20000}');
  perform tests.ok(
    (select offers = array['cash','equipment'] and company_name = 'Falcon Energy'
     from public.sponsor_profiles where user_id = v_brand),
    'the brand profile saves, and an invented tag is dropped');
  v_hint := null;
  begin
    perform tests.as_user(v_adult);
    perform public.save_sponsor_profile('{"company_name":"Me Inc"}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsor_only', 'an athlete has no brand profile to save');

  /* ── An adult athlete asks ── */
  perform tests.as_user(v_adult);
  v_req := public.save_sponsorship_request(null,
    '{"title":"Dubai Open entry and travel","event_name":"Dubai Open","event_date":"2027-03-10",
      "needs":["entry_fee","travel","a pony"],"gives":["logo_on_kit","social_posts"],"amount":4000,
      "pitch":"Ranked third in the UAE under-21s."}');
  perform tests.ok(
    (select needs = array['entry_fee','travel'] and status = 'open' and amount = 4000
     from public.sponsorship_requests where id = v_req),
    'an athlete can ask for sponsorship');

  v_err := null;
  begin
    set local role authenticated;
    insert into public.sponsorship_requests (athlete_user_id, title) values (v_adult, 'Around the RPC');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null, 'requests cannot be written around the RPC');

  v_hint := null;
  begin
    perform tests.as_user(v_coach);
    perform public.save_sponsorship_request(null, '{"title":"A coach wants money"}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'athlete_only', 'only an athlete can ask');

  /* ── Who can browse the list of people who need money ── */
  v_hint := null;
  begin
    perform tests.as_user(v_coach);
    perform count(*) from public.sponsorship_seekers();
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsor_only', 'the list of seekers is for sponsors, not for a coach');

  perform tests.as_user(v_brand);
  perform tests.ok(
    (select amount = 4000 and my_offer_status is null
     from public.sponsorship_seekers() where request_id = v_req),
    'a verified sponsor sees the request and the amount');
  perform tests.ok(
    not exists (select 1 from public.sponsorship_seekers('Curling') where request_id = v_req)
    and exists (select 1 from public.sponsorship_seekers(null, null, 'dubai') where request_id = v_req),
    'and can filter and search it');
  perform tests.as_user(v_fake);
  perform tests.ok(
    (select amount is null from public.sponsorship_seekers() where request_id = v_req),
    'an unverified sponsor sees who is looking, not how much');
  perform tests.as_user(v_coach);
  perform tests.ok(
    (public.sponsorship_card(v_adult) ->> 'kind') = 'athlete'
    and (public.sponsorship_card(v_adult) -> 'requests' -> 0 ->> 'amount') is null
    and not (public.sponsorship_card(v_adult) ->> 'can_offer')::boolean,
    'anyone sees on the profile that she is looking, without the amount or an offer button');

  /* ── Offers ── */
  v_hint := null;
  begin
    perform tests.as_user(v_fake);
    perform public.sponsor_make_offer(v_req, 'Send us your bank details', 100);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsor_not_verified', 'an unverified sponsor cannot make an offer');

  perform tests.as_user(v_brand);
  v_deal := public.sponsor_make_offer(v_req, 'We would like to cover the entry fee.', 2500);
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_adult and type = 'sponsorship_offer' and entity_id = v_deal::text),
    'a verified sponsor can, and the athlete is told');
  v_hint := null;
  begin
    perform public.sponsor_make_offer(v_req, 'Again', 2600);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsorship_already_sent', 'one live offer per sponsor per request');

  v_err := null;
  begin
    perform tests.as_user(v_other);
    perform public.respond_sponsorship(v_deal, true);
  exception when others then v_err := sqlerrm;
  end;
  perform tests.ok(v_err is not null, 'a stranger cannot answer somebody else''s offer');
  v_err := null;
  begin
    perform tests.as_user(v_brand);
    perform public.respond_sponsorship(v_deal, true);
  exception when others then v_err := sqlerrm;
  end;
  perform tests.ok(v_err is not null, 'nor can the sponsor accept their own');

  perform tests.as_user(v_other);
  set local role authenticated;
  select count(*) into v_n from public.sponsorship_deals;
  reset role;
  perform tests.ok(v_n = 0, 'and a stranger cannot read deals from the table');

  perform tests.as_user(v_adult);
  perform tests.ok(
    (select (d ->> 'can_respond')::boolean and d ->> 'my_side' = 'athlete'
     from jsonb_array_elements(public.my_sponsorship() -> 'deals') d where d ->> 'id' = v_deal::text),
    'the athlete finds the offer in her portal, waiting for an answer');
  perform tests.ok(public.respond_sponsorship(v_deal, true) = 'accepted', 'and can accept it');
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_brand and type = 'sponsorship_response' and entity_id = v_deal::text),
    'which the sponsor hears about');
  v_hint := null;
  begin
    perform public.respond_sponsorship(v_deal, false);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsorship_already_answered', 'an answer is given once');

  /* ── Calls ── */
  v_hint := null;
  begin
    perform tests.as_user(v_fake);
    perform public.save_sponsor_call(null, '{"title":"Free money for teens"}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsor_not_verified', 'an unverified sponsor cannot post a call');

  perform tests.as_user(v_brand);
  v_call := public.save_sponsor_call(null,
    '{"title":"Five individual athletes for 2027","offers":["cash","equipment"],"amount_min":2000,
      "amount_max":8000,"slots":5}');
  v_kids_call := public.save_sponsor_call(null,
    '{"title":"Junior kit programme","offers":["equipment"],"open_to_minors":true}');
  perform tests.as_user(v_adult);
  perform tests.ok(
    (select count(*) from public.sponsor_calls_feed() where call_id in (v_call, v_kids_call)) = 2,
    'an adult athlete sees both calls');
  perform tests.ok(
    exists (select 1 from public.sponsor_directory('falcon') where user_id = v_brand and open_calls = 2),
    'and finds the sponsor in the directory');
  v_app := public.apply_to_sponsor_call(v_call, 'I race 800m and post every session.');
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_brand and type = 'sponsorship_application' and entity_id = v_app::text)
    and (select my_status from public.sponsor_calls_feed() where call_id = v_call) = 'pending',
    'she applies, and the sponsor is told');
  v_hint := null;
  begin
    perform public.apply_to_sponsor_call(v_call, 'Twice');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsorship_already_sent', 'one application per call');
  perform public.withdraw_sponsorship(v_app);
  perform tests.ok(
    (select status from public.sponsorship_deals where id = v_app) = 'withdrawn',
    'she can withdraw it while it is pending');
  v_app := public.apply_to_sponsor_call(v_call, 'On reflection, yes.');
  perform tests.as_user(v_brand);
  perform tests.ok(public.respond_sponsorship(v_app, false) = 'declined', 'the sponsor answers an application');

  /* ── A minor ── */
  select is_discoverable into v_disc from public.user_profiles where id = v_minor;
  update public.user_profiles set is_discoverable = true where id = v_minor;
  update public.guardian_consents set allow_sponsorship = false where minor_user_id = v_minor;

  perform tests.as_user(v_minor);
  perform tests.ok((public.my_sponsorship() ->> 'gate') = 'guardian_consent_required',
    'a minor is told a guardian has to approve sponsorship');
  v_hint := null;
  begin
    perform public.save_sponsorship_request(null, '{"title":"Junior nationals"}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'guardian_consent_required',
    'and the database refuses a request without it');
  perform tests.ok(
    (select count(*) from public.sponsor_calls_feed() where call_id in (v_call, v_kids_call)) = 1
    and exists (select 1 from public.sponsor_calls_feed() where call_id = v_kids_call),
    'a minor only sees calls open to under-18s');
  v_hint := null;
  begin
    perform public.apply_to_sponsor_call(v_call, 'Please');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint in ('sponsor_call_adults_only'), 'and cannot apply to an adults-only call');
  v_hint := null;
  begin
    perform public.apply_to_sponsor_call(v_kids_call, 'Please');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'guardian_consent_required', 'nor to a junior call without the scope');

  /* The guardian ticks the fifth box. */
  v_token := tests.request_consent('Parent Name', 'parent@test.local', 'parent');
  v_res := public.confirm_guardian_consent(v_token, true, true, true, false, true);
  perform tests.ok((v_res ->> 'allow_sponsorship')::boolean
                   and private.has_guardian_consent(v_minor, 'sponsorship'),
    'a guardian can approve sponsorship');
  perform tests.ok(
    has_column_privilege('authenticated', 'public.guardian_consents', 'allow_sponsorship', 'SELECT'),
    'the app can read the new scope');
  update public.guardian_consents set guardian_user_id = v_guardian
   where minor_user_id = v_minor and status = 'granted';
  update public.user_profiles set is_discoverable = true where id = v_minor;

  perform tests.as_user(v_minor);
  v_minor_req := public.save_sponsorship_request(null,
    '{"title":"Junior nationals travel","amount":1500,"event_name":"Junior nationals",
      "event_date":"2027-05-01","location":"Abu Dhabi"}');
  perform tests.ok(v_minor_req is not null, 'with it, the minor can ask');

  perform tests.as_user(v_brand);
  perform tests.ok(
    (select is_minor and event_date = '2027-05-01' and location = 'Abu Dhabi'
     from public.sponsorship_seekers() where request_id = v_minor_req),
    'and a verified sponsor sees the request, marked as a minor, with when and where');
  perform tests.as_user(v_fake);
  perform tests.ok(
    not exists (select 1 from public.sponsorship_seekers() where request_id = v_minor_req)
    and exists (select 1 from public.sponsorship_seekers() where request_id = v_req),
    'an unverified sponsor is shown adults who are looking, never a minor');
  perform tests.as_user(v_coach);
  perform tests.ok(
    public.sponsorship_card(v_minor) is null
    or (select bool_and(r ->> 'event_date' is null and r ->> 'location' is null)
        from jsonb_array_elements(public.sponsorship_card(v_minor) -> 'requests') r),
    'anyone else sees that a minor is looking, but not when or where');
  set local role authenticated;
  v_err := null;
  begin
    perform budget_min from public.sponsor_profiles limit 1;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null, 'a sponsor''s budget cannot be read from the table');

  perform tests.as_user(v_brand);
  v_deal := public.sponsor_make_offer(v_minor_req, 'Kit and travel for the season.', 1500);
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_guardian and type = 'sponsorship_offer' and entity_id = v_deal::text),
    'an offer to a minor is also sent to the guardian');
  perform tests.ok(not private.can_message(v_brand, v_minor),
    'a sponsor still cannot open a conversation with a minor');

  perform tests.as_user(v_guardian);
  perform tests.ok(
    (select (d ->> 'can_respond')::boolean and d ->> 'my_side' = 'guardian'
     from jsonb_array_elements(public.my_sponsorship() -> 'deals') d where d ->> 'id' = v_deal::text),
    'the guardian finds their child''s offer in the portal');

  /* Approving again — the way a guardian adds a scope — keeps what is still ticked. */
  perform tests.as_user(v_minor);
  v_token := tests.request_consent('Parent Name', 'parent@test.local', 'parent');
  perform public.confirm_guardian_consent(v_token, true, true, true, false, true);
  perform tests.ok(
    (select status from public.sponsorship_deals where id = v_deal) = 'pending'
    and private.has_guardian_consent(v_minor, 'sponsorship'),
    'a guardian who approves again with sponsorship ticked leaves the offer open');
  update public.guardian_consents set guardian_user_id = v_guardian
   where minor_user_id = v_minor and status = 'granted';

  /* A hidden minor is on nobody's list, whatever the scope says. */
  update public.user_profiles set is_discoverable = false where id = v_minor;
  perform tests.as_user(v_brand);
  perform tests.ok(
    not exists (select 1 from public.sponsorship_seekers() where athlete_user_id = v_minor)
    and public.sponsorship_card(v_minor) is null,
    'a minor hidden from discovery is not listed as seeking');
  update public.user_profiles set is_discoverable = true where id = v_minor;

  /* The guardian takes the scope back: the request vanishes and the offer ends. */
  update public.guardian_consents set allow_sponsorship = false
   where minor_user_id = v_minor and status = 'granted';
  perform tests.ok(
    not exists (select 1 from public.sponsorship_seekers() where athlete_user_id = v_minor),
    'when the guardian withdraws the scope the request is no longer listed');
  perform tests.ok(
    (select status from public.sponsorship_deals where id = v_deal) = 'declined',
    'and the pending offer is closed');

  /* Blocks. */
  insert into public.user_blocks (blocker_id, blocked_id) values (v_adult, v_brand) on conflict do nothing;
  perform tests.ok(
    not exists (select 1 from public.sponsorship_seekers() where athlete_user_id = v_adult),
    'an athlete who blocked a sponsor is not on that sponsor''s list');
  perform tests.as_user(v_adult);
  perform tests.ok(
    not exists (select 1 from public.sponsor_calls_feed() where sponsor_user_id = v_brand)
    and not exists (select 1 from public.sponsor_directory() where user_id = v_brand),
    'and no longer sees their calls or their name');
  delete from public.user_blocks where blocker_id = v_adult and blocked_id = v_brand;

  /* Closing things. */
  perform public.set_sponsorship_request_status(v_req, 'funded');
  perform tests.as_user(v_brand);
  v_hint := null;
  begin
    perform public.sponsor_make_offer(v_req, 'Late', 10);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'sponsorship_request_closed', 'a funded request takes no more offers');
  perform public.set_sponsor_call_active(v_call, false);
  perform tests.as_user(v_adult);
  perform tests.ok(
    not exists (select 1 from public.sponsor_calls_feed() where call_id = v_call),
    'a closed call leaves the feed');

  /* An unverified sponsor's own call never reaches anyone. */
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set is_verified = false where id = v_brand;
  perform tests.as_user(v_adult);
  perform tests.ok(
    not exists (select 1 from public.sponsor_calls_feed() where sponsor_user_id = v_brand),
    'calls from a sponsor who lost verification are hidden');

  delete from auth.users where id in (v_brand, v_fake, v_climber);
  delete from public.sponsorship_requests where athlete_user_id in (v_adult, v_minor);
  update public.user_profiles set is_discoverable = v_disc where id = v_minor;
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── booking a coach ──'; end $$;

/*
 * 1009/01. A calendar of free places, booked at once. The last place goes to
 * one person, names are for the people in the booking, and a minor meets an
 * adult coach only if the coach is verified and a guardian ticked the box.
 */
do $$
declare
  v_adult    uuid := '11111111-1111-1111-1111-111111111111';
  v_minor    uuid := '22222222-2222-2222-2222-222222222222';
  v_coach    uuid := '33333333-3333-3333-3333-333333333333';
  v_other    uuid := '44444444-4444-4444-4444-444444444444';
  v_guardian uuid := '66666666-6666-6666-6666-666666666666';
  v_newcoach uuid := 'aaaaaaaa-6666-4000-8000-000000000001';
  v_session  uuid;
  v_class    uuid;
  v_flex     uuid;
  v_theirs   uuid;
  v_slot     uuid;
  v_class_slot uuid;
  v_flex_slot uuid;
  v_their_slot uuid;
  v_booking  uuid;
  v_b2       uuid;
  v_page     jsonb;
  v_hint     text;
  v_err      text;
  v_n        integer;
  v_token    text;
  v_t        timestamptz := date_trunc('hour', now()) + interval '3 days';
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_newcoach, 'new.coach@test.local', '{"full_name":"New Coach","role":"coach"}')
  on conflict do nothing;
  update public.user_private set date_of_birth = current_date - interval '30 years' where user_id = v_newcoach;

  /* ── The coach sets up ── */
  v_hint := null;
  begin
    perform tests.as_user(v_adult);
    perform public.set_coaching_status(true, 'I coach now');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coach_only', 'only a coach can take students');

  perform tests.as_user(v_coach);
  v_session := public.save_coaching_service(null,
    '{"kind":"session","title":"One-to-one strength session","duration_minutes":60,"capacity":8,
      "price":250,"location_mode":"fixed","location":"Al Quoz Performance Gym"}');
  v_class := public.save_coaching_service(null,
    '{"kind":"class","title":"Saturday speed class","duration_minutes":90,"capacity":2,
      "price":80,"location_mode":"fixed","location":"Track 2, Dubai Sports City"}');
  v_flex := public.save_coaching_service(null,
    '{"kind":"consultation","title":"Programme consultation","duration_minutes":30,"location_mode":"flexible"}');
  perform tests.ok(
    (select capacity from public.coaching_services where id = v_session) = 1
    and (select capacity from public.coaching_services where id = v_class) = 2,
    'a one-to-one service takes one person whatever the form says; a class keeps its places');
  v_hint := null;
  begin
    perform public.save_coaching_service(null, '{"kind":"session","title":"Nowhere","location_mode":"fixed"}');
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coaching_location_required', 'a fixed-place service has to say where');

  perform tests.ok(
    public.add_coaching_slots(v_session, array[v_t, v_t + interval '1 day', now() - interval '1 hour']) = 2,
    'the coach opens times; one in the past is skipped');
  perform tests.ok(
    public.add_coaching_slots(v_class, array[v_t + interval '30 minutes', v_t + interval '5 hours']) = 1,
    'a time that overlaps one already open is skipped: a coach is in one place');
  perform tests.ok(public.add_coaching_slots(v_flex, array[v_t + interval '2 days']) = 1, 'and one for the consultation');
  select id into v_slot from public.coaching_slots where service_id = v_session and starts_at = v_t;
  select id into v_class_slot from public.coaching_slots where service_id = v_class;
  select id into v_flex_slot from public.coaching_slots where service_id = v_flex;

  v_err := null;
  begin
    set local role authenticated;
    insert into public.coaching_slots (service_id, coach_user_id, starts_at, ends_at, capacity)
    values (v_session, v_coach, v_t + interval '9 days', v_t + interval '9 days 1 hour', 1);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform tests.ok(v_err is not null, 'slots cannot be written around the RPC');

  /* ── Not taking students yet ── */
  perform tests.as_user(v_adult);
  v_page := public.coach_booking_page(v_coach);
  perform tests.ok(
    v_page ->> 'gate' = 'coach_not_accepting' and jsonb_array_length(v_page -> 'slots') = 0,
    'a coach who is not taking students shows no calendar');
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coach_not_accepting', 'and cannot be booked');

  perform tests.as_user(v_coach);
  perform public.set_coaching_status(true, 'Strength and speed for footballers.');

  /* ── An adult books ── */
  perform tests.as_user(v_adult);
  v_page := public.coach_booking_page(v_coach);
  perform tests.ok(
    v_page ->> 'gate' = 'ok'
    and jsonb_array_length(v_page -> 'services') = 3
    and jsonb_array_length(v_page -> 'slots') = 4,
    'once they are, an athlete sees the services and the free times');
  perform tests.ok(
    exists (select 1 from public.bookable_coaches('strength') where id = v_coach and open_slots = 4 and price_from = 80),
    'and finds the coach among those taking students');

  v_booking := public.book_coaching_slot(v_slot, 'Left hamstring is recovering.');
  perform tests.ok(
    (select location from public.coaching_bookings where id = v_booking) = 'Al Quoz Performance Gym'
    and exists (select 1 from public.notifications
                where user_id = v_coach and type = 'coaching_booked' and entity_id = v_booking::text),
    'she books a time at the coach''s place, and the coach is told');
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coaching_already_booked', 'the same person cannot book the same time twice');

  perform tests.as_user(v_other);
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coaching_slot_full', 'a one-to-one time that is taken is full');
  perform tests.ok(
    (select (x ->> 'spots_left')::int = 0 and x ->> 'my_booking_id' is null
     from jsonb_array_elements(public.coach_booking_page(v_coach) -> 'slots') x where x ->> 'id' = v_slot::text),
    'someone else sees that it is full, not who took it');
  set local role authenticated;
  select count(*) into v_n from public.coaching_bookings;
  reset role;
  perform tests.ok(v_n = 0, 'nor can they read bookings from the table');

  /* Flexible: the athlete names the place. */
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_flex_slot, null, null);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coaching_location_required', 'a flexible service needs the athlete to say where');
  v_b2 := public.book_coaching_slot(v_flex_slot, null, 'Kite Beach running track');
  perform tests.ok(
    (select location from public.coaching_bookings where id = v_b2) = 'Kite Beach running track',
    'and keeps the place they chose');

  /* A class fills up place by place. */
  perform public.book_coaching_slot(v_class_slot);
  perform tests.as_user(v_adult);
  perform public.book_coaching_slot(v_class_slot);
  perform tests.as_user(v_newcoach);
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_class_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'coaching_slot_full', 'a class with two places takes two people');

  /* ── The coach's calendar ── */
  perform tests.as_user(v_coach);
  perform tests.ok(
    (select jsonb_array_length(x -> 'bookings') = 1
            and x -> 'bookings' -> 0 ->> 'note' = 'Left hamstring is recovering.'
     from jsonb_array_elements(public.my_coaching() -> 'slots') x where x ->> 'id' = v_slot::text)
    and (select jsonb_array_length(x -> 'bookings') = 2
         from jsonb_array_elements(public.my_coaching() -> 'slots') x where x ->> 'id' = v_class_slot::text),
    'the coach sees who is coming to each time, with their note');
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'own_calendar', 'a coach cannot book themselves');

  /* ── Cancelling ── */
  v_err := null;
  begin
    perform tests.as_user(v_other);
    perform public.cancel_coaching_booking(v_booking);
  exception when others then v_err := sqlerrm;
  end;
  perform tests.ok(v_err is not null, 'a stranger cannot cancel somebody else''s booking');
  perform tests.as_user(v_adult);
  perform public.cancel_coaching_booking(v_booking);
  perform tests.ok(
    (select status = 'cancelled' and cancelled_by = 'athlete' from public.coaching_bookings where id = v_booking)
    and exists (select 1 from public.notifications
                where user_id = v_coach and type = 'coaching_cancelled' and entity_id = v_booking::text),
    'the athlete cancels, and the coach is told');
  perform tests.as_user(v_other);
  perform tests.ok(public.book_coaching_slot(v_slot) is not null, 'which frees the place for someone else');

  perform tests.as_user(v_coach);
  perform public.cancel_coaching_slot(v_class_slot);
  perform tests.ok(
    not exists (select 1 from public.coaching_bookings where slot_id = v_class_slot and status = 'booked')
    and (select count(*) from public.notifications
         where type = 'coaching_cancelled' and user_id in (v_adult, v_other)
           and entity_id in (select id::text from public.coaching_bookings where slot_id = v_class_slot)) = 2,
    'when the coach cancels a class, everyone booked is told');
  perform tests.as_user(v_adult);
  perform tests.ok(
    (select count(*) from jsonb_array_elements(public.my_coaching() -> 'bookings') b
     where b ->> 'status' = 'cancelled' and b ->> 'cancelled_by' = 'coach') = 1,
    'and sees it as cancelled by the coach in their own list');

  /* ── A minor ── */
  update public.guardian_consents set allow_bookings = false where minor_user_id = v_minor;
  perform tests.as_user(v_newcoach);
  perform public.set_coaching_status(true, null);
  v_theirs := public.save_coaching_service(null,
    '{"kind":"session","title":"Unverified coach session","location_mode":"online"}');
  perform public.add_coaching_slots(v_theirs, array[v_t + interval '4 days']);
  select id into v_their_slot from public.coaching_slots where service_id = v_theirs;
  perform tests.as_user(v_coach);
  perform public.add_coaching_slots(v_session, array[v_t + interval '6 days']);
  select id into v_slot from public.coaching_slots
   where service_id = v_session and starts_at = v_t + interval '6 days';

  perform tests.as_user(v_minor);
  perform tests.ok(
    (public.coach_booking_page(v_newcoach) ->> 'gate') = 'minor_needs_verified_coach'
    and not exists (select 1 from public.bookable_coaches() where id = v_newcoach),
    'a minor cannot book an unverified coach, and is not shown one');
  perform tests.ok(
    (public.coach_booking_page(v_coach) ->> 'gate') = 'guardian_consent_required',
    'and needs a guardian''s yes for a verified one');
  v_hint := null;
  begin
    perform public.book_coaching_slot(v_slot);
  exception when others then get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'guardian_consent_required', 'which the database enforces');

  update public.guardian_consents set allow_bookings = true, guardian_user_id = v_guardian
   where minor_user_id = v_minor and status = 'granted';
  perform tests.ok(
    private.has_guardian_consent(v_minor, 'bookings')
    and has_column_privilege('authenticated', 'public.guardian_consents', 'allow_bookings', 'SELECT'),
    'a guardian can approve bookings, and the app can read the scope');
  v_booking := public.book_coaching_slot(v_slot);
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_guardian and type = 'coaching_booked' and entity_id = v_booking::text),
    'with it the minor books, and the guardian is told');
  perform tests.as_user(v_guardian);
  perform tests.ok(
    (select (b ->> 'for_child')::boolean from jsonb_array_elements(public.my_coaching() -> 'bookings') b
     where b ->> 'id' = v_booking::text),
    'the guardian sees the booking');

  /* Approving again — the way a guardian adds a scope — keeps what is still ticked. */
  perform tests.as_user(v_minor);
  v_token := tests.request_consent('Parent Name', 'parent@test.local', 'parent');
  perform public.confirm_guardian_consent(v_token, true, true, true, false, false, true);
  perform tests.ok(
    (select status = 'booked' from public.coaching_bookings where id = v_booking)
    and private.has_guardian_consent(v_minor, 'bookings'),
    'a guardian who approves again with bookings ticked leaves the booking in place');
  update public.guardian_consents set guardian_user_id = v_guardian
   where minor_user_id = v_minor and status = 'granted';
  perform tests.as_user(v_guardian);

  /* The guardian takes the scope back: the booking ahead is cancelled. */
  update public.guardian_consents set allow_bookings = false
   where minor_user_id = v_minor and status = 'granted';
  perform tests.ok(
    (select status = 'cancelled' and cancelled_by = 'guardian' from public.coaching_bookings where id = v_booking),
    'when the guardian withdraws the scope, the booking ahead is cancelled');

  /* ── Blocks and retiring ── */
  insert into public.user_blocks (blocker_id, blocked_id) values (v_coach, v_adult) on conflict do nothing;
  perform tests.as_user(v_adult);
  perform tests.ok(
    public.coach_booking_page(v_coach) is null
    and not exists (select 1 from public.bookable_coaches() where id = v_coach),
    'someone the coach blocked sees no calendar and no listing');
  delete from public.user_blocks where blocker_id = v_coach and blocked_id = v_adult;

  perform tests.as_user(v_coach);
  perform public.set_coaching_service_active(v_flex, false);
  perform tests.ok(
    exists (select 1 from public.coaching_bookings where id = v_b2 and status = 'booked')
    and (select status from public.coaching_slots where id = v_flex_slot) = 'open',
    'retiring a service keeps what is already booked');

  delete from auth.users where id = v_newcoach;
  delete from public.coaching_services where coach_user_id = v_coach;
  delete from public.coaching_settings where user_id = v_coach;
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── whole-schema invariants ──'; end $$;

/*
 * These two are the ones worth having. Every assertion above tests a rule
 * somebody wrote down; these test the rules nobody remembered to write down
 * when they added the next table.
 */

-- 1. Every table in `public` has row-level security on.
do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  perform tests.ok(
    v_missing is null,
    coalesce('every public table has RLS enabled', 'tables without RLS: ' || v_missing));

  if v_missing is not null then
    raise exception 'tables without RLS: %', v_missing;
  end if;
end $$;

-- 2. Every SECURITY DEFINER function pins its search_path.
--    Without it, a caller can put their own schema in front of `public` and
--    the function runs their table instead of ours, with our privileges.
do $$
declare
  v_missing text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ' order by n.nspname || '.' || p.proname)
  into v_missing
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
      where cfg like 'search_path=%'
    );

  perform tests.ok(
    v_missing is null,
    coalesce('every SECURITY DEFINER function pins search_path',
             'unpinned: ' || v_missing));

  if v_missing is not null then
    raise exception 'SECURITY DEFINER without search_path: %', v_missing;
  end if;
end $$;

-- 3. The mutators in `private` are not reachable from a client, and the
--    predicates RLS depends on still are.
--
--    The first cut of this revoked EXECUTE on everything in `private`, which
--    reads as strictly safer and is not: an RLS policy expression runs as the
--    *querying* user, so revoking the predicates it names locks out the owner
--    of the row rather than an attacker. Both halves are asserted.
do $$
declare
  v_open text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
  into v_open
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and p.proname not in (
      'is_admin', 'owns_athlete', 'owns_watchlist', 'owns_ai_session',
      'owns_medical_partner', 'has_medical_consent', 'in_conversation',
      'is_org_member', 'is_verified_partner',
      /* 0909/01. Named in the read policies on `meetups` and
         `meetup_participants`; a policy runs as the querying user, so without
         EXECUTE every meetup read answers "permission denied for function
         may_meet". Read-only, and it answers a question about the caller. */
      'may_meet',
      /* Named in posts RLS. Must bypass profile RLS or hidden minors fail open. */
      'viewer_can_see_author',
      'viewer_can_see_public_media',
      /* Named in follows INSERT RLS. It must see blocks in either direction,
         including rows the follower cannot select directly. */
      'users_are_blocked',
      /* 1006/03. Named in the stories read policy. */
      /* 0925/01. Named in the stories read policy. */
      'viewer_can_see_story',
      /* 1014/01. Named in the read policies of the club-page tables. Answers
         whether the caller holds a role on a page; reveals nothing else. */
      'org_can'
    );

  perform tests.ok(
    v_open is null,
    coalesce('no private helper beyond the RLS predicates is callable by a client',
             'callable but should not be: ' || v_open));
  if v_open is not null then
    raise exception 'private helpers callable by authenticated: %', v_open;
  end if;

  select string_agg(p.proname, ', ' order by p.proname)
  into v_open
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and p.proname not in ('is_admin', 'owns_athlete', 'owns_medical_partner',
                          'has_medical_consent', 'viewer_can_see_author');

  perform tests.ok(
    v_open is null,
    coalesce('a signed-out visitor can call only the four predicates their policies evaluate',
             'anon can call: ' || v_open));
  if v_open is not null then
    raise exception 'private helpers callable by anon: %', v_open;
  end if;

  perform tests.ok(
    has_function_privilege('authenticated', 'private.owns_athlete(uuid)', 'EXECUTE'),
    'and the predicates RLS names are still callable, or every read breaks');
end $$;

-- 4. The reads that broke when the predicates were revoked.
--
--    Every one of these goes through PostgREST as a plain table select with RLS
--    applied — not through a SECURITY DEFINER RPC, which is why the RPC-shaped
--    tests above sailed past the regression.
do $$
declare
  v_athlete uuid;
  v_count   integer;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  select id into v_athlete from public.athlete_profiles
    where user_id = '11111111-1111-1111-1111-111111111111';

  select count(*) into v_count from public.applications
    where athlete_id = '11111111-1111-1111-1111-111111111111';
  perform tests.ok(true, 'an athlete can read their own applications');

  select count(*) into v_count from public.opportunity_saves
    where athlete_id = '11111111-1111-1111-1111-111111111111';
  perform tests.ok(true, 'an athlete can read their own saved opportunities');

  select count(*) into v_count from public.talent_score_history
    where athlete_id = v_athlete;
  perform tests.ok(true, 'an athlete can read their own score history');

  select count(*) into v_count from public.conversations;
  perform tests.ok(true, 'and their conversations');
exception when insufficient_privilege then
  raise exception 'FAILED: an RLS predicate is not callable — %', sqlerrm;
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── account data export ownership ──'; end $$;

do $$
declare
  v_owner_athlete uuid;
  v_other_athlete uuid;
  v_export jsonb;
begin
  select id into v_owner_athlete from public.athlete_profiles
    where user_id = '11111111-1111-1111-1111-111111111111';
  select id into v_other_athlete from public.athlete_profiles
    where user_id = '44444444-4444-4444-4444-444444444444';

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.athlete_media (athlete_id, title, storage_url, is_public)
  values
    (v_owner_athlete, 'Export owner fixture', 'exports/owner.mp4', false),
    (v_other_athlete, 'Export other fixture', 'exports/other.mp4', true);

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_export := public.export_my_data();

  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_export -> 'media') m
            where m ->> 'title' = 'Export owner fixture'),
    'account export includes media owned through the athlete profile');
  perform tests.ok(
    not exists (select 1 from jsonb_array_elements(v_export -> 'media') m
                where m ->> 'title' = 'Export other fixture'),
    'account export cannot include another user''s public media');
  perform tests.ok(
    v_export ? 'included_data',
    'account export describes its bounded scope honestly');
  perform tests.ok(
    not has_function_privilege('anon', 'public.export_my_data()', 'EXECUTE'),
    'signed-out callers cannot export account data');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── source-review security hardening ──'; end $$;

-- Hidden minors are absent from both broad tables and the profile RPC. Even a
-- discoverable minor's athlete row stays private because it contains exact DOB.
do $$
declare
  v_rows integer;
  v_raised boolean := false;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles
  set is_discoverable = false
  where id = '22222222-2222-2222-2222-222222222222';

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  begin
    perform public.get_profile_bundle('22222222-2222-2222-2222-222222222222');
  exception when no_data_found then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'get_profile_bundle does not enumerate a hidden minor');

  set local role authenticated;
  select count(*) into v_rows from public.user_profiles
  where id = '22222222-2222-2222-2222-222222222222';
  reset role;
  perform tests.ok(v_rows = 0, 'user_profiles RLS hides a non-discoverable minor');

  set local role authenticated;
  select count(*) into v_rows from public.athlete_profiles
  where user_id = '22222222-2222-2222-2222-222222222222';
  reset role;
  perform tests.ok(v_rows = 0, 'athlete_profiles RLS hides a minor exact DOB');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles
  set is_discoverable = true
  where id = '22222222-2222-2222-2222-222222222222';
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into v_rows from public.athlete_profiles
  where user_id = '22222222-2222-2222-2222-222222222222';
  reset role;
  perform tests.ok(v_rows = 0,
    'discovery consent does not expose a minor athlete row or birth date');

  select count(*) into v_rows
  from public.web_athletes() as w(row)
  where row ->> 'user_id' = '22222222-2222-2222-2222-222222222222'
    and row ->> 'birth_date' is null;
  perform tests.ok(v_rows = 1,
    'web redacting RPC includes a discoverable minor without exact DOB');
end $$;

-- Profile grids must not bypass post audience.
do $$
declare
  v_post uuid;
  v_rows integer;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  insert into public.posts (author_id, type, caption, audience)
  values (
    '11111111-1111-1111-1111-111111111111',
    'standard', 'Followers only source-review fixture', 'followers'
  ) returning id into v_post;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  select count(*) into v_rows
  from public.get_user_posts('11111111-1111-1111-1111-111111111111', 50, null)
  where id = v_post;
  perform tests.ok(v_rows = 0, 'get_user_posts excludes follower-only posts for strangers');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  select count(*) into v_rows
  from public.get_user_posts('11111111-1111-1111-1111-111111111111', 50, null)
  where id = v_post;
  perform tests.ok(v_rows = 1, 'post authors still see their own restricted posts');
end $$;

-- A pending request must not override another consent that remains granted.
do $$
declare
  v_request jsonb;
begin
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  v_request := public.request_guardian_consent(
    'Second Parent', 'second-parent@test.local', 'parent');
  perform tests.ok(
    (select is_discoverable from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222'),
    'a pending request does not override an active discovery consent');

  perform public.revoke_guardian_consent((v_request ->> 'id')::uuid);
  perform tests.ok(
    (select is_discoverable from public.user_profiles
     where id = '22222222-2222-2222-2222-222222222222'),
    'revoking one request recomputes all remaining active consents');
end $$;

-- Reviewer transitions follow the V2 state machine. Organization membership
-- authorizes active reviewers but cannot resurrect a withdrawal.
do $$
declare
  v_app uuid;
  v_opp uuid;
  v_org uuid;
  v_raised boolean := false;
begin
  select id, opportunity_id into v_app, v_opp
  from public.applications
  where athlete_id = '11111111-1111-1111-1111-111111111111'
  limit 1;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.applications set status = 'applied' where id = v_app;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  update public.applications set status = 'in_review' where id = v_app;
  update public.applications set status = 'shortlisted' where id = v_app;
  update public.applications set status = 'invited' where id = v_app;
  update public.applications set status = 'accepted' where id = v_app;
  perform tests.ok(
    (select status from public.applications where id = v_app) = 'accepted',
    'accepted remains distinct durable history after valid reviewer transitions');

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  begin
    update public.applications set status = 'in_review' where id = v_app;
  exception when insufficient_privilege then
    v_raised := true;
  end;
  perform tests.ok(v_raised, 'an unrelated user cannot change application status');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.organizations (name, type)
  values ('Source Review Club', 'club')
  returning id into v_org;
  insert into public.organization_members (
    organization_id, user_id, member_role, status
  ) values (
    v_org, '44444444-4444-4444-4444-444444444444', 'manager', 'active'
  );
  update public.opportunities set organization_id = v_org where id = v_opp;
  update public.applications set status = 'withdrawn' where id = v_app;

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_raised := false;
  begin
    update public.applications set status = 'in_review' where id = v_app;
  exception when others then
    v_raised := true;
  end;
  perform tests.ok(
    v_raised
    and (select status from public.applications where id = v_app) = 'withdrawn',
    'an active organization reviewer cannot resurrect a withdrawn application');
end $$;

do $$
declare v_post uuid; v_rows integer; v_rpc_rows integer; v_feed_rows integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.guardian_consents
  set status = 'revoked', revoked_at = coalesce(revoked_at, now())
  where minor_user_id = '22222222-2222-2222-2222-222222222222'
    and status = 'granted';
  insert into public.guardian_consents (
    minor_user_id, guardian_user_id, guardian_name, guardian_email,
    relationship, status, allow_discovery, allow_messaging, allow_media
  ) values (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'Linked Guardian', 'linked.guardian@test.local',
    'guardian', 'granted', false, false, false
  );
  update public.user_profiles set is_discoverable = false
  where id = '22222222-2222-2222-2222-222222222222';
  insert into public.posts (author_id, type, caption, audience)
  values (
    '22222222-2222-2222-2222-222222222222',
    'standard', 'Guardian-visible hidden minor post', 'public'
  ) returning id into v_post;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into v_rows from public.posts where id = v_post;
  reset role;
  select count(*) into v_rpc_rows
  from public.get_user_posts(
    '22222222-2222-2222-2222-222222222222', 50, null
  ) where id = v_post;
  select count(*) into v_feed_rows
  from public.get_feed('for_you', null, 50, null) where id = v_post;
  perform tests.ok(v_rows = 1 and v_rpc_rows = 1 and v_feed_rows = 1,
    'linked guardian visibility is aligned across direct posts and feed RPCs');

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  set local role authenticated;
  select count(*) into v_rows from public.posts where id = v_post;
  reset role;
  select count(*) into v_rpc_rows
  from public.get_user_posts(
    '22222222-2222-2222-2222-222222222222', 50, null
  ) where id = v_post;
  select count(*) into v_feed_rows
  from public.get_feed('for_you', null, 50, null) where id = v_post;
  perform tests.ok(v_rows = 0 and v_rpc_rows = 0 and v_feed_rows = 0,
    'other viewers cannot read a hidden minor post directly');
end $$;

do $$
declare
  v_quota jsonb;
begin
  perform tests.ok(
    not has_function_privilege('anon', 'public.fandom_of(uuid)', 'EXECUTE'),
    'anonymous users cannot invoke fandom RPCs');
  perform tests.ok(
    not has_function_privilege(
      'anon', 'public.challenge_leaderboard(uuid,integer,integer)', 'EXECUTE'),
    'anonymous users cannot invoke challenge RPCs');
  perform tests.ok(
    not has_function_privilege(
      'authenticated', 'public.consume_translation_quota(uuid,integer,boolean)', 'EXECUTE'),
    'clients cannot reserve or bypass translation quota');
  perform tests.ok(
    not has_function_privilege(
      'authenticated',
      'public.reserve_guardian_consent_delivery(uuid,uuid)',
      'EXECUTE'),
    'clients cannot bypass guardian email delivery limits');
  perform tests.ok(
    not has_column_privilege(
      'authenticated', 'public.guardian_consents', 'delivery_count', 'SELECT'),
    'guardian email delivery counters are service-role-only');
  perform tests.ok(
    not has_table_privilege(
      'authenticated', 'private.underage_account_quarantine', 'SELECT'),
    'underage quarantine is service-only');
  perform tests.ok(
    not has_function_privilege(
      'authenticated', 'private.quarantine_underage_accounts()', 'EXECUTE'),
    'clients cannot alter underage remediation state');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_quota := public.consume_translation_quota(
    '11111111-1111-1111-1111-111111111111', 100, true);
  perform tests.ok(
    (v_quota ->> 'user_character_limit')::integer = 40000,
    'service translation calls reserve per-user and project budget');

  perform tests.ok(
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'sync_user_full_name'
        and 'search_path=public, pg_temp' = any(p.proconfig)
    ),
    'restored trigger definitions keep a hardened search_path');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── source review security assertions ──'; end $$;

do $$
declare
  v_public_post uuid;
  v_private_post uuid;
  v_adult_athlete uuid;
  v_minor_athlete uuid;
  v_rows integer;
begin
  perform tests.ok(
    exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'media_authenticated_read'
    ),
    'audience-aware storage SELECT policy exists after all migrations');
  perform tests.ok(
    not (select public from storage.buckets where id = 'posts'),
    'post media bucket remains private');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.posts (author_id, type, caption, audience, media)
  values (
    '11111111-1111-1111-1111-111111111111',
    'standard', 'Storage public fixture', 'public',
    '[{"url":"11111111-1111-1111-1111-111111111111/public.jpg","thumbnail":"11111111-1111-1111-1111-111111111111/public-thumb.jpg"}]'::jsonb
  ) returning id into v_public_post;
  insert into public.posts (author_id, type, caption, audience, media)
  values (
    '11111111-1111-1111-1111-111111111111',
    'standard', 'Storage restricted fixture', 'connections',
    '[{"url":"11111111-1111-1111-1111-111111111111/restricted.jpg"}]'::jsonb
  ) returning id into v_private_post;
  insert into public.user_blocks (blocker_id, blocked_id)
  values (
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444'
  ) on conflict do nothing;

  select id into v_adult_athlete from public.athlete_profiles
  where user_id = '11111111-1111-1111-1111-111111111111';
  select id into v_minor_athlete from public.athlete_profiles
  where user_id = '22222222-2222-2222-2222-222222222222';
  insert into public.athlete_media (athlete_id, title, storage_url, is_public)
  values
    (v_adult_athlete, 'Storage adult clip',
     '11111111-1111-1111-1111-111111111111/adult-clip.mp4', true),
    (v_minor_athlete, 'Storage hidden minor clip',
     '22222222-2222-2222-2222-222222222222/minor-clip.mp4', true);
  update public.guardian_consents set allow_media = false
  where minor_user_id = '22222222-2222-2222-2222-222222222222';

  insert into storage.objects (bucket_id, name) values
    ('posts', '11111111-1111-1111-1111-111111111111/orphan.jpg'),
    ('posts', '11111111-1111-1111-1111-111111111111/public.jpg'),
    ('posts', '11111111-1111-1111-1111-111111111111/public-thumb.jpg'),
    ('posts', '11111111-1111-1111-1111-111111111111/restricted.jpg'),
    ('posts', '11111111-1111-1111-1111-111111111111/adult-clip.mp4'),
    ('posts', '22222222-2222-2222-2222-222222222222/minor-clip.mp4');

  grant select on storage.objects to authenticated;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  select count(*) into v_rows from public.athlete_media
  where storage_url = '11111111-1111-1111-1111-111111111111/adult-clip.mp4';
  reset role;
  perform tests.ok(v_rows = 1, 'signed-out visitors can list public adult athlete media');

  set local role anon;
  select count(*) into v_rows from storage.objects
  where name = '11111111-1111-1111-1111-111111111111/adult-clip.mp4';
  reset role;
  perform tests.ok(v_rows = 1, 'signed-out visitors can sign public adult athlete media');

  set local role anon;
  select count(*) into v_rows from storage.objects
  where name = '22222222-2222-2222-2222-222222222222/minor-clip.mp4';
  reset role;
  perform tests.ok(v_rows = 0, 'signed-out visitors cannot sign minor athlete media');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where name in (
    '11111111-1111-1111-1111-111111111111/public.jpg',
    '11111111-1111-1111-1111-111111111111/public-thumb.jpg'
  );
  reset role;
  perform tests.ok(v_rows = 2, 'visible post media and thumbnails can be signed');

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where name = '11111111-1111-1111-1111-111111111111/restricted.jpg';
  reset role;
  perform tests.ok(v_rows = 0, 'restricted post media cannot bypass parent post RLS');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where name = '11111111-1111-1111-1111-111111111111/adult-clip.mp4';
  reset role;
  perform tests.ok(v_rows = 1, 'public adult athlete media can be signed');

  -- User 333 is a linked guardian from the visibility fixtures above and may
  -- still review the minor's clips. A stranger must not be able to sign them
  -- when media consent is off.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where name = '22222222-2222-2222-2222-222222222222/minor-clip.mp4';
  reset role;
  perform tests.ok(v_rows = 0, 'minor clip without media consent cannot be signed');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where name = '11111111-1111-1111-1111-111111111111/orphan.jpg';
  reset role;
  perform tests.ok(v_rows = 1, 'object owners retain access to their own folder');
end $$;

do $$
declare
  v_dob date := (current_date - interval '12 years')::date;
  v_corrected_dob date := (current_date - interval '28 years')::date;
  v_before_users bigint;
  v_appeal jsonb;
  v_raised boolean := false;
begin
  perform tests.ok(
    not has_function_privilege(
      'authenticated', 'public.cached_translation(text,text)', 'EXECUTE'),
    'clients cannot probe the global translation cache with arbitrary text');
  perform tests.ok(
    has_function_privilege(
      'authenticated', 'public.translation_source(text,uuid)', 'EXECUTE'),
    'authenticated translation requests bind to a source row');
  perform tests.ok(
    not has_function_privilege(
      'anon', 'public.translation_source(text,uuid)', 'EXECUTE'),
    'signed-out callers cannot resolve translation sources');

  select count(*) into v_before_users from public.user_profiles;
  execute 'alter table public.user_private disable trigger trg_user_private_age_sync';
  update public.user_private set date_of_birth = v_dob
  where user_id = '44444444-4444-4444-4444-444444444444';
  execute 'alter table public.user_private enable trigger trg_user_private_age_sync';

  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform private.quarantine_underage_accounts();

  perform tests.ok(
    (select count(*) from public.user_profiles) = v_before_users,
    'under-13 quarantine preserves the account row');
  perform tests.ok(
    (select date_of_birth from public.user_private
     where user_id = '44444444-4444-4444-4444-444444444444') = v_dob,
    'under-13 quarantine does not mutate the declared DOB');
  perform tests.ok(
    (select is_suspended and not is_discoverable and allow_messages_from = 'nobody'
     from public.user_profiles
     where id = '44444444-4444-4444-4444-444444444444'),
    'under-13 quarantine suspends access, discovery, and messaging');
  perform tests.ok(
    exists (
      select 1 from public.audit_logs
      where action = 'account.under13_quarantined'
        and record_id = '44444444-4444-4444-4444-444444444444'
    ),
    'under-13 quarantine records its audit reason');

  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_appeal := public.request_underage_age_appeal(null);
  perform tests.ok(
    v_appeal ->> 'status' = 'appeal_requested'
    and exists (
      select 1 from private.underage_account_quarantine
      where user_id = '44444444-4444-4444-4444-444444444444'
        and remediation_status = 'appeal_requested'
    ),
    'a suspended owner can request an age correction appeal without data loss');

  begin
    perform public.resolve_underage_age_appeal(
      '44444444-4444-4444-4444-444444444444',
      v_corrected_dob,
      'unauthorized self resolution');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised,
    'an account owner or guardian cannot change DOB through the resolution RPC');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_raised := false;
  begin
    perform public.resolve_underage_age_appeal(
      '44444444-4444-4444-4444-444444444444',
      v_dob,
      'still under age');
  exception when others then v_raised := true;
  end;
  perform tests.ok(v_raised, 'resolution rejects a corrected DOB below age 13');

  perform public.resolve_underage_age_appeal(
    '44444444-4444-4444-4444-444444444444',
    v_corrected_dob,
    'verified correction');
  perform tests.ok(
    (select date_of_birth = v_corrected_dob
            and remediation_status = 'dob_corrected'
            and remediated_at is not null
     from public.user_private p
     join private.underage_account_quarantine q on q.user_id = p.user_id
     where p.user_id = '44444444-4444-4444-4444-444444444444'),
    'service resolution validates and records the corrected DOB');
  perform tests.ok(
    (select not is_suspended and suspended_reason is null
     from public.user_profiles
     where id = '44444444-4444-4444-4444-444444444444'),
    'successful age correction safely restores account access');
  perform tests.ok(
    exists (
      select 1 from public.audit_logs
      where action = 'account.under13_age_corrected'
        and record_id = '44444444-4444-4444-4444-444444444444'
    ),
    'age correction resolution is audited');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── avatars bucket listing ──'; end $$;

do $$
declare
  v_rows integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into storage.objects (bucket_id, name) values
    ('avatars', '11111111-1111-1111-1111-111111111111/avatar-a.jpg'),
    ('avatars', '22222222-2222-2222-2222-222222222222/avatar-b.jpg');

  grant select on storage.objects to authenticated;

  -- A missing table grant is the same outcome as an empty listing: signed-out
  -- callers cannot see the bucket. Either way the assertion passes.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  begin
    set local role anon;
    select count(*) into v_rows from storage.objects
    where bucket_id = 'avatars';
    reset role;
  exception when insufficient_privilege then
    reset role;
    v_rows := 0;
  end;
  perform tests.ok(v_rows = 0, 'signed-out visitors cannot list the avatars bucket');

  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = '11111111-1111-1111-1111-111111111111';
  reset role;
  perform tests.ok(
    v_rows = 0,
    'another signed-in user cannot list someone else''s folder in the avatars bucket');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  select count(*) into v_rows from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = '11111111-1111-1111-1111-111111111111';
  reset role;
  perform tests.ok(
    v_rows = 1,
    'the owner can list their own folder in the avatars bucket');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── opportunity and match preference authorization ──'; end $$;

do $$
declare
  v_org uuid;
  v_athlete_raised boolean := false;
  v_spoof_raised boolean := false;
  v_coach_opp uuid;
  v_org_opp uuid;
  v_admin_opp uuid;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    ('77777777-7777-7777-7777-777777777777', 'policy.admin@test.local',
     '{"full_name":"Policy Admin","role":"athlete"}'),
    ('88888888-8888-8888-8888-888888888888', 'policy.club@test.local',
     '{"full_name":"Policy Club","role":"club"}'),
    ('99999999-9999-9999-9999-999999999999', 'policy.scout@test.local',
     '{"full_name":"Policy Scout","role":"scout"}');

  -- Admin is a server-managed database role; signup metadata cannot grant it.
  update public.user_profiles
  set role = 'admin'
  where id = '77777777-7777-7777-7777-777777777777';

  insert into public.organizations (name, type)
  values ('Opportunity Policy Club', 'club')
  returning id into v_org;

  insert into public.organization_members (
    organization_id, user_id, member_role, status
  ) values (
    v_org, '88888888-8888-8888-8888-888888888888', 'manager', 'active'
  );

  -- Direct table writes under the API role exercise the same RLS boundary as
  -- PostgREST instead of relying only on auth claim impersonation.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  begin
    insert into public.opportunities (
      created_by_id, title, description, type, sport, is_active
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'Rejected athlete opportunity', 'Must not be created.',
      'trial', 'Football', true
    );
  exception when insufficient_privilege then
    v_athlete_raised := true;
  end;
  reset role;
  perform tests.ok(
    v_athlete_raised
    and not exists (
      select 1 from public.opportunities
      where title = 'Rejected athlete opportunity'
    ),
    'an athlete direct API-style opportunity insert is rejected');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  insert into public.opportunities (
    created_by_id, title, description, type, sport, is_active
  ) values (
    '33333333-3333-3333-3333-333333333333',
    'Coach standalone opportunity', 'Authorized standalone posting.',
    'trial', 'Football', true
  ) returning id into v_coach_opp;
  reset role;
  perform tests.ok(
    v_coach_opp is not null,
    'a coach can create a standalone opportunity');

  perform tests.as_user('88888888-8888-8888-8888-888888888888');
  set local role authenticated;
  insert into public.opportunities (
    organization_id, created_by_id, title, description, type, sport, is_active
  ) values (
    v_org, '88888888-8888-8888-8888-888888888888',
    'Organization member opportunity', 'Authorized organization posting.',
    'trial', 'Football', true
  ) returning id into v_org_opp;
  reset role;
  perform tests.ok(
    v_org_opp is not null,
    'an authorized organization member can create its opportunity');

  perform tests.as_user('77777777-7777-7777-7777-777777777777');
  set local role authenticated;
  insert into public.opportunities (
    organization_id, created_by_id, title, description, type, sport, is_active
  ) values (
    v_org, '77777777-7777-7777-7777-777777777777',
    'Admin opportunity', 'Authorized administrative posting.',
    'trial', 'Football', true
  ) returning id into v_admin_opp;

  begin
    insert into public.opportunities (
      created_by_id, title, description, type, sport, is_active
    ) values (
      '33333333-3333-3333-3333-333333333333',
      'Spoofed admin opportunity', 'Must not be created.',
      'trial', 'Football', true
    );
  exception when insufficient_privilege then
    v_spoof_raised := true;
  end;
  reset role;

  perform tests.ok(
    v_admin_opp is not null,
    'an admin can create an opportunity without organization membership');
  perform tests.ok(
    v_spoof_raised
    and not exists (
      select 1 from public.opportunities
      where title = 'Spoofed admin opportunity'
    ),
    'even an admin must set created_by_id to their own user id');
end $$;

do $$
declare
  v_athlete_raised boolean := false;
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  begin
    insert into public.match_preferences (user_id, sports)
    values ('11111111-1111-1111-1111-111111111111', array['Football']);
  exception when insufficient_privilege then
    v_athlete_raised := true;
  end;
  reset role;
  perform tests.ok(
    v_athlete_raised
    and not exists (
      select 1 from public.match_preferences
      where user_id = '11111111-1111-1111-1111-111111111111'
    ),
    'an athlete cannot write match preferences');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  insert into public.match_preferences (user_id, sports)
  values ('33333333-3333-3333-3333-333333333333', array['Football']);
  reset role;
  perform tests.ok(
    exists (
      select 1 from public.match_preferences
      where user_id = '33333333-3333-3333-3333-333333333333'
    ),
    'a coach can write their own match preferences');

  perform tests.as_user('88888888-8888-8888-8888-888888888888');
  set local role authenticated;
  update public.match_preferences
  set sports = array['Football']
  where user_id = '88888888-8888-8888-8888-888888888888';
  reset role;
  perform tests.ok(
    (select sports = array['Football']
     from public.match_preferences
     where user_id = '88888888-8888-8888-8888-888888888888'),
    'a club can write their own match preferences');

  perform tests.as_user('99999999-9999-9999-9999-999999999999');
  set local role authenticated;
  update public.match_preferences
  set sports = array['Football']
  where user_id = '99999999-9999-9999-9999-999999999999';
  reset role;
  perform tests.ok(
    (select sports = array['Football']
     from public.match_preferences
     where user_id = '99999999-9999-9999-9999-999999999999'),
    'a scout can write their own match preferences');
end $$;


-- ------------------------------------------------------------
do $$ begin raise notice E'\n── club and academy pages ──'; end $$;

/*
 * 1014/01. A club account builds its own page and runs it with a small team.
 * The rules worth a test: who may do what on a page, that a club cannot
 * verify itself, that announcements reach a minor only from a verified club,
 * that a youth roster never prints a child's full name to strangers, and that
 * the live score and the timeline cannot disagree.
 */
create or replace function tests.hint_of(p_sql text) returns text
language plpgsql as $$
declare v_hint text; v_msg text;
begin
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_msg = message_text;
  return coalesce(nullif(v_hint, ''), v_msg);
end;
$$;

do $$
declare
  v_owner    uuid := 'c1ab0000-0000-4000-8000-000000000001';
  v_editor   uuid := 'c1ab0000-0000-4000-8000-000000000002';
  v_fan      uuid := 'c1ab0000-0000-4000-8000-000000000003';
  v_kid      uuid := 'c1ab0000-0000-4000-8000-000000000004';
  v_keeper   uuid := 'c1ab0000-0000-4000-8000-000000000005';
  v_org      uuid;
  v_season   uuid;
  v_squad    uuid;
  v_senior   uuid;
  v_kid_row  uuid;
  v_fan_row  uuid;
  v_typed    uuid;
  v_match    uuid;
  v_goal     uuid;
  v_event    uuid;
  v_post     uuid;
  v_page     jsonb;
  v_res      jsonb;
  v_hint     text;
  v_n        integer;
  v_names    text;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,  'club.owner@test.local',  '{"full_name":"Harbour Academy","role":"club"}'),
    (v_editor, 'club.editor@test.local', '{"full_name":"Edith Editor","role":"coach"}'),
    (v_fan,    'club.fan@test.local',    '{"full_name":"Farid Fan","role":"athlete"}'),
    (v_kid,    'club.kid@test.local',    '{"full_name":"Kian Karimi","role":"athlete"}'),
    (v_keeper, 'club.keeper@test.local', '{"full_name":"Sami Score","role":"athlete"}')
  on conflict do nothing;
  update public.user_private set date_of_birth = current_date - interval '40 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '31 years' where user_id = v_editor;
  update public.user_private set date_of_birth = current_date - interval '22 years' where user_id = v_fan;
  update public.user_private set date_of_birth = current_date - interval '14 years' where user_id = v_kid;
  update public.user_private set date_of_birth = current_date - interval '27 years' where user_id = v_keeper;

  /* ── Setting up ── */
  perform tests.as_user(v_fan);
  perform tests.ok(
    tests.hint_of($q$select public.create_club_page('{"type":"club","name":"Fan FC","founded_year":2001,"ceo_name":"Farid"}')$q$)
      = 'club_account_only',
    'only a club or academy account can create a club page');

  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of($q$select public.create_club_page('{"type":"academy","name":"Harbour Academy","founded_year":1700,"ceo_name":"Rana"}')$q$)
      = 'club_founded_year',
    'a founding year from before 1800 is refused');
  v_org := public.create_club_page(
    '{"type":"academy","name":"Harbour Academy","name_local":"أكاديمية الميناء","founded_year":2009,"ceo_name":"Rana Saleh","country":"United Arab Emirates","city":"Dubai"}');
  perform tests.ok(
    (select verification_status = 'pending' and not is_verified and created_by = v_owner
       from public.organizations where id = v_org)
    and private.org_role(v_org) = 'owner',
    'the creator owns a new, unverified page');
  perform tests.ok(
    tests.hint_of($q$select public.create_club_page('{"type":"club","name":"Second","founded_year":2001,"ceo_name":"X"}')$q$)
      = 'club_page_exists',
    'one page per club account');

  perform public.update_club_page(v_org, jsonb_build_object(
    'address', 'Al Jadaf, Street 4', 'latitude', 25.2167, 'longitude', 55.3333,
    'contact_email', 'Info@Harbour.test', 'website', 'harbour.test',
    'socials', jsonb_build_object('instagram', '@harbour', 'myspace', 'nope'),
    'facilities', jsonb_build_array('Pitch', 'Gym', 'Pitch'),
    'sports', jsonb_build_array(
      jsonb_build_object('sport', 'Football', 'categories', jsonb_build_array('U14', 'U16', 'Senior')),
      jsonb_build_object('sport', 'Basketball', 'categories', jsonb_build_array('U18'))),
    'locations', jsonb_build_array(jsonb_build_object('label', 'North ground', 'city', 'Sharjah'))));
  perform tests.ok(
    (select contact_email = 'info@harbour.test' and website = 'https://harbour.test'
            and socials = '{"instagram":"@harbour"}'::jsonb and cardinality(facilities) = 2
       from public.organizations where id = v_org)
    and (select count(*) from public.organization_sports where organization_id = v_org) = 2
    and (select count(*) from public.organization_locations where organization_id = v_org) = 2
    and (select count(*) from public.organization_locations where organization_id = v_org and is_primary
           and address = 'Al Jadaf, Street 4') = 1,
    'the page keeps its sports, categories, branches and a cleaned-up contact block');

  perform tests.as_user(v_fan);
  perform tests.ok(
    tests.hint_of(format($q$select public.update_club_page(%L, '{"name":"Hijacked"}')$q$, v_org)) = 'club_permission',
    'a stranger cannot edit the page');

  /* ── Verification ── */
  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of(format($q$update public.organizations set is_verified = true, verification_status = 'approved' where id = %L$q$, v_org))
      like '%administrators%',
    'a club cannot verify itself');
  perform tests.ok(
    tests.hint_of(format($q$select public.submit_club_verification(%L, '{"contact_person_name":"Rana"}')$q$, v_org))
      = 'club_terms_required',
    'sending papers needs the Terms and Child Safety policy accepted');
  perform tests.ok(
    tests.hint_of(format($q$select public.submit_club_verification(%L, '{"contact_person_name":"Rana","accept_terms":true,"document_path":"someone-else/licence.pdf"}')$q$, v_org))
      = 'club_document_missing',
    'the licence must be the caller''s own upload');
  perform tests.ok(
    tests.hint_of(format($q$select public.submit_club_verification(%L, '{"contact_person_name":"Rana","accept_terms":true}')$q$, v_org))
      = 'club_document_required'
    and (select count(*) from public.verification_requests where organization_id = v_org) = 0,
    'sending papers without a licence document is refused');
  perform set_config('request.jwt.claim.role', 'service_role', true);   -- as the admin would
  update public.organizations set verification_status = 'more_info' where id = v_org;
  perform tests.as_user(v_owner);
  v_hint := public.submit_club_verification(v_org, jsonb_build_object(
      'contact_person_name', 'Rana Saleh', 'contact_person_title', 'Director', 'accept_terms', true,
      'license_number', 'DED-1234', 'document_path', v_owner::text || '/licence.pdf'));
  perform tests.ok(
    v_hint = 'pending'
    and (select verification_status = 'pending' and not is_verified from public.organizations where id = v_org),
    'resubmitting after "more info" puts the page back in the queue, unverified');
  perform tests.ok(
    (select count(*) from public.verification_requests
      where organization_id = v_org and type = 'club' and status = 'pending'
        and documents -> 0 ->> 'path' = v_owner::text || '/licence.pdf') = 1,
    'the licence lands in the admin portal''s verification queue');

  perform tests.as_user('77777777-7777-7777-7777-777777777777');   -- an admin, in the portal
  update public.verification_requests set status = 'rejected', decision_reason = 'Licence is expired'
   where organization_id = v_org;
  perform tests.as_user(v_owner);
  perform tests.ok(
    (select verification_status = 'rejected' and not is_verified from public.organizations where id = v_org)
    and (public.club_page(v_org) -> 'verification' ->> 'review_note') = 'Licence is expired'
    and exists (select 1 from public.notifications where user_id = v_owner and type = 'club_verification_rejected'),
    'an admin''s rejection reaches the page, with the reason');
  perform public.submit_club_verification(v_org, jsonb_build_object(
      'contact_person_name', 'Rana Saleh', 'accept_terms', true,
      'license_number', 'DED-5678', 'document_path', v_owner::text || '/licence-2026.pdf'));
  perform tests.ok(
    (select verification_status = 'pending' from public.organizations where id = v_org)
    and (select count(*) from public.verification_requests
          where organization_id = v_org and status = 'pending') = 1,
    'a new licence after a rejection opens one fresh request');

  /* ── The page team ── */
  perform tests.ok(
    tests.hint_of(format($q$select public.invite_club_member(%L, 'club.kid@test.local', 'editor')$q$, v_org))
      = 'club_invitee_unavailable',
    'nobody under 18 can join a page team');
  perform tests.ok(
    tests.hint_of(format($q$select public.invite_club_member(%L, 'nobody@test.local', 'editor')$q$, v_org))
      = 'club_invitee_not_found',
    'an unknown e-mail is reported, not silently dropped');
  v_res := public.invite_club_member(v_org, 'CLUB.EDITOR@test.local', 'editor');
  perform public.invite_club_member(v_org, 'club.keeper@test.local', 'scorekeeper');
  perform tests.ok(
    v_res ->> 'status' = 'pending'
    and exists (select 1 from public.notifications where user_id = v_editor and type = 'club_invite'),
    'an invitation is pending until accepted, and the invitee is told');

  perform tests.as_user(v_editor);
  perform tests.ok(not private.org_can(v_org, 'content'), 'an invitation grants nothing before it is accepted');
  perform public.respond_club_invite(v_org, true);
  perform tests.ok(private.org_can(v_org, 'content') and not private.org_can(v_org, 'manage'),
    'an editor may post for the page but not run it');
  perform tests.ok(
    tests.hint_of(format($q$select public.invite_club_member(%L, 'club.fan@test.local', 'manager')$q$, v_org))
      = 'club_permission',
    'an editor cannot invite people');
  perform tests.as_user(v_keeper);
  perform public.respond_club_invite(v_org, true);
  perform tests.ok(private.org_can(v_org, 'score') and not private.org_can(v_org, 'content'),
    'a scorekeeper keeps the score and nothing else');
  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of(format($q$select public.remove_club_member(%L, %L)$q$, v_org, v_owner)) = 'club_owner_stays',
    'the owner cannot be removed');

  /* ── Posts belong to the page ── */
  insert into public.posts (author_id, type, caption, audience)
  values (v_owner, 'standard', 'Welcome to Harbour Academy', 'followers')
  returning id into v_post;
  perform tests.ok((select organization_id = v_org from public.posts where id = v_post),
    'a club account''s post is tagged with its page');

  perform tests.as_user(v_fan);
  perform tests.ok(
    tests.hint_of(format($q$insert into public.posts (author_id, type, caption, organization_id) values (%L, 'standard', 'fake', %L)$q$, v_fan, v_org))
      = 'club_permission',
    'nobody outside the page team can post for it');
  insert into public.organization_follows (follower_id, organization_id) values (v_fan, v_org);
  perform tests.ok(
    exists (select 1 from public.get_feed('following', null, 50, null) f where f.id = v_post)
    and exists (select 1 from public.club_posts(v_org, 24, null) p where p.id = v_post),
    'following the page puts its followers-only posts in your Following feed and on the page');

  /* ── Announcements ── */
  perform tests.as_user(v_kid);
  insert into public.organization_follows (follower_id, organization_id) values (v_kid, v_org);
  perform tests.as_user(v_editor);
  perform tests.ok(
    tests.hint_of(format($q$select public.send_club_broadcast(%L, 'Trials', 'Saturday 9am', 'followers')$q$, v_org))
      = 'club_permission',
    'only the owner and managers send announcements');
  perform tests.as_user(v_owner);
  v_res := public.send_club_broadcast(v_org, 'Trials this Saturday', 'U14 and U16 trials at 9am, north ground.', 'followers');
  perform tests.ok(
    (v_res ->> 'recipients')::int = 1
    and exists (select 1 from public.notifications where user_id = v_fan and type = 'club_broadcast')
    and not exists (select 1 from public.notifications where user_id = v_kid and type = 'club_broadcast'),
    'an unverified club''s announcement does not reach a minor');
  perform set_config('request.jwt.claim.role', 'service_role', true);   -- the admin approves
  update public.organizations set is_verified = true, verification_status = 'approved' where id = v_org;
  perform tests.as_user(v_owner);
  v_res := public.send_club_broadcast(v_org, 'Kit collection', 'Collect your kit on Monday.', 'all');
  perform tests.ok(
    exists (select 1 from public.notifications where user_id = v_kid and type = 'club_broadcast'),
    'once verified, followers of any age hear it');
  perform public.send_club_broadcast(v_org, 'Third', 'Third message today.', 'followers');
  perform tests.ok(
    tests.hint_of(format($q$select public.send_club_broadcast(%L, 'Fourth', 'One too many.', 'followers')$q$, v_org))
      = 'rate_limited',
    'three announcements a day at most');
  perform tests.as_user(v_fan);
  perform tests.ok(jsonb_array_length(public.club_broadcasts_for(v_org, 10)) = 3,
    'a follower reads the announcements sent to them');

  /* ── Squads and the naming rule ── */
  perform tests.as_user(v_editor);
  v_season := public.save_club_season(v_org, null, '2026–27', true);
  v_squad  := public.save_club_squad(v_org, null, jsonb_build_object('season_id', v_season, 'sport', 'Football', 'category', 'U14'));
  v_senior := public.save_club_squad(v_org, null, jsonb_build_object('season_id', v_season, 'sport', 'Football', 'category', 'Senior'));
  v_typed   := public.save_squad_member(v_squad, null, '{"kind":"player","display_name":"Yasmin Al Amiri","shirt_number":7,"position":"Winger"}');
  perform tests.ok(
    tests.hint_of(format(
      $q$select public.save_squad_member(%L, null, jsonb_build_object('kind', 'player', 'user_id', %L, 'shirt_number', 9))$q$,
      v_squad, v_kid)) = 'club_link_unavailable',
    'a minor without guardian discovery consent cannot be put on a roster');
  /* The guardian then consents. */
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.guardian_consents (
    minor_user_id, guardian_user_id, guardian_name, guardian_email,
    relationship, status, allow_discovery, allow_messaging, allow_media
  ) values (
    v_kid, v_owner, 'Kian Parent', 'kian.parent@test.local',
    'parent', 'granted', true, false, false
  );
  perform tests.as_user(v_editor);
  v_kid_row := public.save_squad_member(v_squad, null, jsonb_build_object('kind', 'player', 'user_id', v_kid, 'shirt_number', 9));
  v_fan_row := public.save_squad_member(v_senior, null, jsonb_build_object('kind', 'player', 'user_id', v_fan, 'shirt_number', 10));
  perform public.save_squad_member(v_squad, null, '{"kind":"staff","display_name":"Coach Omar Haddad","staff_role":"head_coach"}');
  perform tests.ok(
    exists (select 1 from public.notifications where user_id = v_kid and type = 'club_squad_link'),
    'a linked athlete is asked, not just added');

  /* The guardian then withdraws consent before Kian answers. */
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.guardian_consents set status = 'revoked' where minor_user_id = v_kid;
  perform tests.as_user(v_editor);

  perform tests.as_user(v_kid);
  perform tests.ok(
    tests.hint_of(format($q$select public.respond_squad_link(%L, true)$q$, v_kid_row)) = 'guardian_consent_required',
    'a minor cannot put themselves on a public roster without a guardian');
  perform tests.as_user(v_fan);
  perform public.respond_squad_link(v_fan_row, true);

  v_page := public.club_squads_page(v_org, null);
  select string_agg(p ->> 'display_name', ',' order by p ->> 'display_name') into v_names
  from jsonb_array_elements(v_page -> 'squads') q, jsonb_array_elements(q -> 'players') p;
  perform tests.ok(
    v_names like '%Yasmin A.%' and v_names not like '%Al Amiri%'
    and v_names like '%Kian K.%' and v_names like '%Farid Fan%',
    'outsiders see "First L." on a youth roster, and full names only for visible, linked adults');
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'squads') q, jsonb_array_elements(q -> 'staff') p
            where p ->> 'display_name' = 'Coach Omar Haddad'),
    'coaching staff on a youth squad keep their full names');
  perform tests.ok(
    not exists (select 1 from jsonb_array_elements(v_page -> 'squads') q, jsonb_array_elements(q -> 'players') p
                where p ->> 'user_id' = v_kid::text),
    'an unaccepted link never exposes the minor''s profile');
  perform tests.as_user(v_editor);
  v_page := public.club_squads_page(v_org, null);
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'squads') q, jsonb_array_elements(q -> 'players') p
            where p ->> 'display_name' = 'Yasmin Al Amiri'),
    'the page team sees the roster in full');

  /* ── A match, live ── */
  v_match := public.save_club_match(v_org, null, jsonb_build_object(
    'sport', 'Football', 'squad_id', v_squad, 'opponent_name', 'Marina U14', 'competition', 'Youth League',
    'kickoff_at', now() + interval '2 hours', 'venue', 'North ground'));
  perform tests.ok(
    (select category = 'U14' from public.club_matches where id = v_match)
    and exists (select 1 from public.notifications where user_id = v_fan and type = 'club_match_scheduled'),
    'a fixture takes its category from the squad and is announced to followers');
  perform tests.ok(
    tests.hint_of(format($q$select public.save_club_match(%L, %L, '{"sport":"Football","opponent_name":"Marina U14","kickoff_at":"2030-01-01T10:00:00Z","stream_url":"https://evil.example/live"}')$q$, v_org, v_match))
      = 'club_stream_url',
    'a live stream must be a link to a known platform');

  perform tests.as_user(v_keeper);
  perform public.update_match_live(v_match, '{"status":"live","minute":0,"period":"1st half"}');
  perform public.update_match_live(v_match, '{"minute":12}');
  select count(*) into v_n from public.notifications where user_id = v_fan and type = 'club_match_live';
  perform tests.ok(v_n = 1, 'kick-off is announced once, not on every clock tick');
  v_goal := public.add_match_event(v_match, jsonb_build_object('kind', 'goal', 'side', 'us', 'minute', 14,
                                                               'squad_member_id', v_typed));
  perform public.add_match_event(v_match, '{"kind":"yellow_card","side":"them","minute":20,"player_name":"Their Number Six"}');
  perform public.add_match_event(v_match, '{"kind":"goal","side":"them","minute":33}');
  perform tests.ok(
    (select our_score = 1 and their_score = 1 from public.club_matches where id = v_match),
    'goals move the scoreboard');
  perform public.delete_match_event(v_goal);
  perform tests.ok(
    (select our_score = 0 and their_score = 1 from public.club_matches where id = v_match),
    'removing a goal takes it off the scoreboard too');
  v_goal := public.add_match_event(v_match, jsonb_build_object('kind', 'goal', 'side', 'us', 'minute', 41,
                                                               'player_name', 'Yasmin Al Amiri'));
  perform tests.ok(
    tests.hint_of(format($q$select public.save_club_match(%L, %L, '{"sport":"Football","opponent_name":"x","kickoff_at":"2030-01-01T10:00:00Z"}')$q$, v_org, v_match))
      = 'club_permission',
    'a scorekeeper cannot rewrite the fixture');

  perform tests.as_user(v_fan);
  v_page := public.club_match_page(v_match);
  perform tests.ok(
    (v_page -> 'match' ->> 'our_score')::int = 1 and (v_page ->> 'can_score')::boolean = false
    and not exists (select 1 from jsonb_array_elements(v_page -> 'events') e
                    where e ->> 'player_name' like '%Al Amiri%')
    and exists (select 1 from jsonb_array_elements(v_page -> 'events') e
                where e ->> 'player_name' = 'Yasmin A.')
    and v_page -> 'lineup' = 'null'::jsonb,
    'the public match sheet shortens youth names and hides the line-up');
  set local role authenticated;
  select count(*) into v_n from public.club_match_events where match_id = v_match;
  reset role;
  perform tests.ok(v_n = 0, 'raw match events are not readable outside the club');

  perform tests.as_user(v_keeper);
  perform public.update_match_live(v_match, '{"status":"finished"}');
  perform tests.ok(
    exists (select 1 from public.notifications where user_id = v_fan and type = 'club_match_result')
    and (public.club_matches_for(v_org) -> 'results') -> 0 ->> 'id' = v_match::text,
    'the final whistle posts the result');

  /* ── Events ── */
  perform tests.as_user(v_editor);
  v_event := public.save_club_event(v_org, null, jsonb_build_object(
    'kind', 'trial', 'title', 'U14 open trial', 'sport', 'Football', 'category', 'U14',
    'starts_at', now() + interval '5 days', 'location', 'North ground', 'age_min', 12, 'age_max', 15,
    'capacity', 1));
  perform tests.as_user(v_fan);
  perform tests.ok((public.club_event_page(v_event) ->> 'gate') = 'age_out_of_range',
    'the event''s age range is enforced');
  perform tests.as_user(v_kid);
  perform tests.ok((public.club_event_page(v_event) ->> 'gate') = 'guardian_consent_required',
    'a minor needs the guardian''s booking scope for an in-person event');
  update public.club_events set age_min = null, age_max = null where id = v_event;
  perform tests.as_user(v_fan);
  perform public.register_for_club_event(v_event, 'Left-footed winger');
  perform tests.ok(
    exists (select 1 from public.notifications where user_id = v_owner and type = 'club_event_registration')
    and (public.club_event_page(v_event) ->> 'spots_left')::int = 0,
    'registering fills the place and tells the club');
  perform tests.as_user(v_keeper);
  perform tests.ok((public.club_event_page(v_event) ->> 'gate') = 'own_club',
    'the page team does not register for its own events');
  perform tests.as_user(v_fan);
  perform public.cancel_club_event_registration(v_event, null);
  perform tests.ok((select registration_count = 0 from public.club_events where id = v_event),
    'cancelling frees the place');

  /* ── Awards and challenges ── */
  perform tests.as_user(v_editor);
  perform tests.ok(
    tests.hint_of(format($q$select public.save_club_award(%L, null, '{"title":"Player of the season","recipient_kind":"player","recipient_user_id":%s}')$q$,
                         v_org, '"' || v_keeper::text || '"'))
      = 'club_award_link',
    'only people on the club''s squads can be linked to an award');
  perform public.save_club_award(v_org, null, jsonb_build_object('title', 'Youth League', 'placement', 'winner',
    'year', 2025, 'category', 'U14', 'recipient_kind', 'club'));
  perform public.save_club_award(v_org, null, jsonb_build_object('title', 'Golden Boot', 'placement', 'individual',
    'year', 2025, 'category', 'U14', 'recipient_kind', 'player', 'recipient_name', 'Yasmin Al Amiri'));
  perform tests.as_user(v_fan);
  perform tests.ok(
    jsonb_array_length(public.club_awards_for(v_org)) = 2
    and exists (select 1 from jsonb_array_elements(public.club_awards_for(v_org)) a
                where a ->> 'recipient_name' = 'Yasmin A.'),
    'awards are public, with the same naming rule');

  perform tests.as_user(v_editor);
  perform public.create_challenge('Football', 'Harbour keep-ups', 'Thirty seconds, feet only, one take.',
                                  now() + interval '7 days', null, 'Keep-ups', null, 'higher', null, null, v_org);
  perform tests.ok(
    jsonb_array_length(public.club_challenges(v_org)) = 1,
    'an editor of a verified page can set a challenge for it');

  /* ── The page in one call ── */
  perform tests.as_user(v_fan);
  v_page := public.club_page(v_org);
  perform tests.ok(
    (v_page -> 'viewer' ->> 'following')::boolean
    and (v_page -> 'viewer' ->> 'can_manage')::boolean = false
    and v_page -> 'verification' = 'null'::jsonb
    and jsonb_array_length(v_page -> 'sports') = 2
    and (v_page -> 'counts' ->> 'awards')::int = 2,
    'the page reads in one call, and the licence stays with the page team');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── club membership cannot be self-claimed ──'; end $$;

do $$
declare
  v_owner    uuid := 'c1630000-0000-4000-8000-000000000001';
  v_stranger uuid := 'c1630000-0000-4000-8000-000000000002';
  v_org      uuid;
  v_raised   boolean := false;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,    'qa63.owner@test.local',    '{"full_name":"QA63 Owner","role":"club"}'),
    (v_stranger, 'qa63.stranger@test.local', '{"full_name":"QA63 Stranger","role":"athlete"}');
  update public.user_private
  set date_of_birth = current_date - interval '35 years'
  where user_id in (v_owner, v_stranger);

  insert into public.organizations (name, type)
  values ('QA63 Claim Club', 'club')
  returning id into v_org;
  insert into public.organization_members (
    organization_id, user_id, member_role, status
  ) values (
    v_org, v_owner, 'owner', 'active'
  );

  perform tests.as_user(v_stranger);
  set local role authenticated;
  begin
    insert into public.organization_members (
      organization_id, user_id, member_role, status, invited_by
    ) values (
      v_org, v_stranger, 'owner', 'pending', v_stranger
    );
  exception when others then
    v_raised := true;
  end;
  reset role;
  perform tests.ok(
    v_raised,
    'QA-63 regression: a stranger cannot insert a pending owner row for themselves');
  perform tests.ok(
    (select count(*) from public.organization_members
      where organization_id = v_org and user_id = v_stranger) = 0,
    'the refused self-claim leaves no membership row');

  perform tests.as_user(v_stranger);
  perform tests.ok(
    tests.hint_of(format($q$select public.respond_club_invite(%L, true)$q$, v_org))
      = 'club_invite_missing',
    'respond_club_invite refuses a stranger with no invitation');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.organization_members (
    organization_id, user_id, member_role, status, invited_by
  ) values (
    v_org, v_stranger, 'owner', 'pending', v_stranger
  );
  perform tests.as_user(v_stranger);
  perform tests.ok(
    tests.hint_of(format($q$select public.respond_club_invite(%L, true)$q$, v_org))
      = 'club_invite_missing',
    'respond_club_invite refuses a pending owner row invited by the stranger themselves');
  perform tests.ok(
    (select status from public.organization_members
      where organization_id = v_org and user_id = v_stranger) = 'pending',
    'a self-written owner invitation stays pending');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.organization_members
  set invited_by = v_owner, member_role = 'manager'
  where organization_id = v_org and user_id = v_stranger;
  perform tests.as_user(v_stranger);
  perform public.respond_club_invite(v_org, true);
  perform tests.ok(
    (select status from public.organization_members
      where organization_id = v_org and user_id = v_stranger) = 'active',
    'an invitation from the active owner still becomes active');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── club squad links and minors ──'; end $$;

do $$
declare
  v_owner     uuid := 'c1640000-0000-4000-8000-000000000001';
  v_visible   uuid := 'c1640000-0000-4000-8000-000000000002';
  v_hidden    uuid := 'c1640000-0000-4000-8000-000000000003';
  v_adult     uuid := 'c1640000-0000-4000-8000-000000000004';
  v_unverified uuid;
  v_verified   uuid;
  v_season_u   uuid;
  v_season_v   uuid;
  v_squad_u    uuid;
  v_squad_v    uuid;
  v_row        uuid;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,   'qa64.owner@test.local',   '{"full_name":"QA64 Owner","role":"club"}'),
    (v_visible, 'qa64.visible@test.local', '{"full_name":"Layla Haddad","role":"athlete"}'),
    (v_hidden,  'qa64.hidden@test.local',  '{"full_name":"Mina Noor","role":"athlete"}'),
    (v_adult,   'qa64.adult@test.local',   '{"full_name":"Noah Adult","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '35 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '22 years' where user_id = v_adult;
  update public.user_private set date_of_birth = current_date - interval '14 years'
  where user_id in (v_visible, v_hidden);
  insert into public.guardian_consents (
    minor_user_id, guardian_user_id, guardian_name, guardian_email,
    relationship, status, allow_discovery, allow_messaging, allow_media
  ) values (
    v_visible, v_owner, 'QA64 Parent', 'qa64.parent@test.local',
    'parent', 'granted', true, false, false
  );

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA64 Unverified Club', 'club', false, 'pending')
  returning id into v_unverified;
  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA64 Verified Club', 'club', true, 'approved')
  returning id into v_verified;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values
    (v_unverified, v_owner, 'owner', 'active'),
    (v_verified, v_owner, 'owner', 'active');

  insert into public.club_seasons (organization_id, label, is_current)
  values (v_unverified, '2026-27', true)
  returning id into v_season_u;
  insert into public.club_seasons (organization_id, label, is_current)
  values (v_verified, '2026-27', true)
  returning id into v_season_v;
  insert into public.club_squads (organization_id, season_id, sport, category)
  values (v_unverified, v_season_u, 'Football', 'U14')
  returning id into v_squad_u;
  insert into public.club_squads (organization_id, season_id, sport, category)
  values (v_verified, v_season_v, 'Football', 'U14')
  returning id into v_squad_v;

  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of(format(
      $q$select public.save_squad_member(%L, null, jsonb_build_object('kind', 'player', 'user_id', %L))$q$,
      v_squad_u, v_visible)) = 'club_link_unavailable',
    'QA-64 regression: an unverified club cannot link a minor');
  perform tests.ok(
    tests.hint_of(format(
      $q$select public.save_squad_member(%L, null, jsonb_build_object('kind', 'player', 'user_id', %L))$q$,
      v_squad_v, v_hidden)) = 'club_link_unavailable',
    'a verified club cannot link a minor who is not publicly visible');

  v_row := public.save_squad_member(
    v_squad_v, null, jsonb_build_object('kind', 'player', 'user_id', v_visible));
  perform tests.ok(
    (select link_status from public.club_squad_members where id = v_row) = 'invited',
    'a verified club can invite a discoverable minor');
  perform tests.ok(
    (select m.display_name = 'Layla H.' and m.display_name <> up.full_name
     from public.club_squad_members m
     join public.user_profiles up on up.id = v_visible
     where m.id = v_row),
    'a link saved without a display name stores the short form, not the full name');

  perform tests.ok(
    public.save_squad_member(
      v_squad_u, null, jsonb_build_object('kind', 'player', 'user_id', v_adult)
    ) is not null,
    'an unverified club can still link an adult');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into auth.users (id, email, raw_user_meta_data)
  select
    ('c1640000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
    'qa64.fill' || g || '@test.local',
    jsonb_build_object('full_name', 'Fill Person', 'role', 'athlete')
  from generate_series(10, 20) g;
  insert into public.club_squad_members (
    squad_id, organization_id, kind, display_name, user_id, link_status, created_at
  )
  select
    v_squad_v, v_verified, 'player', 'Fill ' || lpad(g::text, 2, '0'),
    ('c1640000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
    'invited', now()
  from generate_series(10, 20) g;

  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of(format(
      $q$select public.save_squad_member(%L, null, jsonb_build_object('kind', 'player', 'user_id', %L))$q$,
      v_squad_v, v_adult)) = 'rate_limited',
    'more than ten new squad links in a day is refused');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── youth names on both sides ──'; end $$;

/*
 * QA-65. A youth match shortens typed names on both sides. The squad's
 * is_youth flag decides that, not the match's own category text.
 */
do $$
declare
  v_owner      uuid := 'c1650000-0000-4000-8000-000000000001';
  v_stranger   uuid := 'c1650000-0000-4000-8000-000000000002';
  v_org        uuid;
  v_season     uuid;
  v_youth      uuid;
  v_adult      uuid;
  v_youth_match uuid;
  v_adult_match uuid;
  v_page       jsonb;
begin
  perform tests.ok(private.is_youth_category('Under 14'),
    'is_youth_category treats "Under 14" as youth');
  perform tests.ok(private.is_youth_category('Boys U14'),
    'is_youth_category treats "Boys U14" as youth');
  perform tests.ok(private.is_youth_category('2013 Boys'),
    'is_youth_category treats "2013 Boys" as youth');
  perform tests.ok(private.is_youth_category('تحت 14'),
    'is_youth_category treats "تحت 14" as youth');
  perform tests.ok(not private.is_youth_category('U19'),
    'is_youth_category rejects "U19"');
  perform tests.ok(not private.is_youth_category('Stadium 15'),
    'is_youth_category rejects "Stadium 15"');
  perform tests.ok(not private.is_youth_category('Stadium 2000 League'),
    'is_youth_category rejects "Stadium 2000 League"');
  perform tests.ok(not private.is_youth_category('1999 Boys'),
    'is_youth_category rejects "1999 Boys"');

  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,    'qa65.owner@test.local',    '{"full_name":"QA65 Owner","role":"club"}'),
    (v_stranger, 'qa65.stranger@test.local', '{"full_name":"QA65 Stranger","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '35 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '24 years' where user_id = v_stranger;

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA65 Youth Names', 'club', true, 'approved')
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values (v_org, v_owner, 'owner', 'active');

  insert into public.club_seasons (organization_id, label, is_current)
  values (v_org, '2026-27', true)
  returning id into v_season;
  insert into public.club_squads (organization_id, season_id, sport, category, is_youth)
  values (v_org, v_season, 'Football', 'Under 14', true)
  returning id into v_youth;
  insert into public.club_squads (organization_id, season_id, sport, category, is_youth)
  values (v_org, v_season, 'Football', 'Senior', false)
  returning id into v_adult;

  /* The youth match's own category says Senior. The squad flag must win. */
  insert into public.club_matches (
    organization_id, sport, squad_id, category, opponent_name, kickoff_at
  ) values (
    v_org, 'Football', v_youth, 'Senior', 'North Side', now() + interval '1 day'
  ) returning id into v_youth_match;
  insert into public.club_matches (
    organization_id, sport, squad_id, category, opponent_name, kickoff_at
  ) values (
    v_org, 'Football', v_adult, 'Senior', 'South Side', now() + interval '2 days'
  ) returning id into v_adult_match;

  insert into public.club_match_events (match_id, organization_id, minute, kind, side, player_name)
  values
    (v_youth_match, v_org, 12, 'yellow_card', 'them', 'Omar Saleh'),
    (v_youth_match, v_org, 20, 'goal', 'us', 'Yasmin Al Amiri'),
    (v_adult_match, v_org, 15, 'yellow_card', 'them', 'Nora Haddad'),
    (v_adult_match, v_org, 30, 'goal', 'us', 'Samir Adult');

  perform tests.as_user(v_stranger);
  v_page := public.club_match_page(v_youth_match);
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'events') e
            where e ->> 'side' = 'them' and e ->> 'player_name' = 'Omar S.'),
    'QA-65 regression: a stranger sees an opponent name shortened on a youth match');
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'events') e
            where e ->> 'side' = 'us' and e ->> 'player_name' = 'Yasmin A.'),
    'a stranger still sees our side shortened on that youth match');
  perform tests.ok(
    (v_page -> 'match' ->> 'category') = 'Senior'
    and (select q.is_youth from public.club_squads q where q.id = v_youth)
    and exists (select 1 from jsonb_array_elements(v_page -> 'events') e
                where e ->> 'player_name' = 'Omar S.'),
    'the squad flag wins over the match category: Senior text on a youth squad still shortens names');

  v_page := public.club_match_page(v_adult_match);
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'events') e
            where e ->> 'side' = 'them' and e ->> 'player_name' = 'Nora Haddad'),
    'on an adult squad match a typed opponent name is not shortened');

  perform tests.as_user(v_owner);
  v_page := public.club_match_page(v_youth_match);
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(v_page -> 'events') e
            where e ->> 'side' = 'them' and e ->> 'player_name' = 'Omar Saleh')
    and exists (select 1 from jsonb_array_elements(v_page -> 'events') e
                where e ->> 'side' = 'us' and e ->> 'player_name' = 'Yasmin Al Amiri'),
    'a club member viewing the youth match still sees full names on both sides');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── club invites do not leak ──'; end $$;

/*
 * QA-67. A minor and a suspended account raise the same hint, a successful
 * invite does not return the invitee's name, and more than 20 invites in
 * 24 hours is refused before the email is looked up.
 */
do $$
declare
  v_owner      uuid := 'c1670000-0000-4000-8000-000000000001';
  v_minor      uuid := 'c1670000-0000-4000-8000-000000000002';
  v_adult      uuid := 'c1670000-0000-4000-8000-000000000003';
  v_suspended  uuid := 'c1670000-0000-4000-8000-000000000004';
  v_org        uuid;
  v_res        jsonb;
  v_minor_hint text;
  v_suspended_hint text;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,     'qa67.owner@test.local',     '{"full_name":"QA67 Owner","role":"club"}'),
    (v_minor,     'qa67.minor@test.local',     '{"full_name":"QA67 Minor","role":"athlete"}'),
    (v_adult,     'qa67.adult@test.local',     '{"full_name":"QA67 Adult","role":"athlete"}'),
    (v_suspended, 'qa67.suspended@test.local', '{"full_name":"QA67 Suspended","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '35 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '14 years' where user_id = v_minor;
  update public.user_private set date_of_birth = current_date - interval '24 years' where user_id = v_adult;
  update public.user_private set date_of_birth = current_date - interval '30 years' where user_id = v_suspended;
  update public.user_profiles set is_suspended = true where id = v_suspended;

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA67 Invite Club', 'club', true, 'approved')
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values (v_org, v_owner, 'owner', 'active');

  perform tests.as_user(v_owner);
  v_minor_hint := tests.hint_of(format(
    $q$select public.invite_club_member(%L, 'qa67.minor@test.local', 'editor')$q$, v_org));
  v_suspended_hint := tests.hint_of(format(
    $q$select public.invite_club_member(%L, 'qa67.suspended@test.local', 'editor')$q$, v_org));
  perform tests.ok(
    v_minor_hint = 'club_invitee_unavailable',
    'QA-67 regression: inviting a minor raises club_invitee_unavailable');
  perform tests.ok(
    v_suspended_hint = 'club_invitee_unavailable',
    'inviting a suspended adult raises club_invitee_unavailable');
  perform tests.ok(
    v_minor_hint = v_suspended_hint,
    'a minor and a suspended account raise the same hint');

  perform tests.ok(
    tests.hint_of(format(
      $q$select public.invite_club_member(%L, 'qa67.nobody@test.local', 'editor')$q$, v_org))
      = 'club_invitee_not_found',
    'an email with no account still raises club_invitee_not_found');

  v_res := public.invite_club_member(v_org, 'qa67.adult@test.local', 'editor');
  perform tests.ok(
    not (v_res ? 'full_name')
    and (v_res ? 'user_id')
    and (v_res ? 'status'),
    'a successful invite returns user_id and status, and not the invitee name');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into auth.users (id, email, raw_user_meta_data)
  select
    ('c1670000-0000-4000-8000-' || lpad((g + 100)::text, 12, '0'))::uuid,
    'qa67.fill' || g || '@test.local',
    jsonb_build_object('full_name', 'Fill Person', 'role', 'athlete')
  from generate_series(1, 21) g;
  insert into public.organization_members (
    organization_id, user_id, member_role, status, invited_by, created_at
  )
  select
    v_org,
    ('c1670000-0000-4000-8000-' || lpad((g + 100)::text, 12, '0'))::uuid,
    'staff', 'pending', v_owner, now()
  from generate_series(1, 21) g;

  perform tests.as_user(v_owner);
  perform tests.ok(
    tests.hint_of(format(
      $q$select public.invite_club_member(%L, 'qa67.nobody2@test.local', 'editor')$q$, v_org))
      = 'rate_limited',
    'more than 20 invites in 24 hours is refused before the email is looked up');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── approving a club does not verify a person ──'; end $$;

/*
 * QA-68. Approving an organisation request verifies the organisation and
 * leaves the submitter unverified. A personal request, with no
 * organization_id, still verifies that person.
 * QA-70. That decision sends one notification, the club one, not also a
 * system notice to the submitter. A personal request still gets its
 * system notice.
 */
do $$
declare
  v_admin   uuid := 'c1680000-0000-4000-8000-000000000001';
  v_owner   uuid := 'c1680000-0000-4000-8000-000000000002';
  v_adult   uuid := 'c1680000-0000-4000-8000-000000000003';
  v_org     uuid;
  v_club    uuid;
  v_person  uuid;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_admin, 'qa68.admin@test.local', '{"full_name":"QA68 Admin","role":"athlete"}'),
    (v_owner, 'qa68.owner@test.local', '{"full_name":"QA68 Owner","role":"club"}'),
    (v_adult, 'qa68.adult@test.local', '{"full_name":"QA68 Adult","role":"athlete"}');
  update public.user_profiles set role = 'admin' where id = v_admin;
  update public.user_private set date_of_birth = current_date - interval '40 years' where user_id = v_admin;
  update public.user_private set date_of_birth = current_date - interval '35 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '28 years' where user_id = v_adult;

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA68 Club', 'club', false, 'pending')
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values (v_org, v_owner, 'owner', 'active');

  insert into public.verification_requests (subject_user_id, organization_id, type, status)
  values (v_owner, v_org, 'club', 'pending')
  returning id into v_club;
  insert into public.verification_requests (subject_user_id, type, status)
  values (v_adult, 'athlete_id', 'pending')
  returning id into v_person;

  perform tests.ok(
    not (select is_verified from public.user_profiles where id = v_owner)
    and not (select is_verified from public.organizations where id = v_org),
    'before the decision neither the owner nor the organisation is verified');

  perform tests.as_user(v_admin);
  perform public.admin_decide_verification(v_club, 'approved');
  perform tests.ok(
    (select status = 'approved' from public.verification_requests where id = v_club),
    'an admin can approve a club verification request');
  perform tests.ok(
    (select is_verified from public.organizations where id = v_org)
    and not (select is_verified from public.user_profiles where id = v_owner),
    'QA-68 regression: approving a club verifies the organisation and not the submitter');
  perform tests.ok(
    not private.is_verified_adult(v_owner),
    'the submitter is not a verified adult, so this route cannot message minors');
  perform tests.ok(
    (select count(*) from public.notifications
      where user_id = v_owner and type = 'club_verification_approved') = 1
    and not exists (select 1 from public.notifications
      where user_id = v_owner and type = 'system' and entity_type = 'moderation'),
    'QA-70 regression: approving a club sends the owner exactly one club_verification_approved notice and no system moderation row');
  perform tests.ok(
    (select count(*) from public.notifications
      where user_id = v_owner
        and type = 'club_verification_approved'
        and entity_type = 'organization'
        and entity_id = v_org::text) = 1,
    'the club notice has entity_type organization and the organisation id, so it opens the club page');

  perform public.admin_decide_verification(v_person, 'approved');
  perform tests.ok(
    (select is_verified from public.user_profiles where id = v_adult),
    'approving a personal request with no organisation still verifies that person');
  perform tests.ok(
    exists (select 1 from public.notifications
      where user_id = v_adult and type = 'system' and entity_type = 'moderation'),
    'approving a personal request still sends that person a system moderation notice');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── club matches are not public ──'; end $$;

/*
 * QA-71. A signed-out client cannot read club_matches. A signed-in
 * stranger still can, because live scores subscribe to that table.
 */
do $$
declare
  v_owner    uuid := 'c1710000-0000-4000-8000-000000000001';
  v_stranger uuid := 'c1710000-0000-4000-8000-000000000002';
  v_org      uuid;
  v_season   uuid;
  v_squad    uuid;
  v_match    uuid;
  v_rows     integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,    'qa71.owner@test.local',    '{"full_name":"QA71 Owner","role":"club"}'),
    (v_stranger, 'qa71.stranger@test.local', '{"full_name":"QA71 Stranger","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '35 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '28 years' where user_id = v_stranger;

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA71 Club', 'club', true, 'approved')
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values (v_org, v_owner, 'owner', 'active');

  insert into public.club_seasons (organization_id, label, is_current)
  values (v_org, '2026-27', true)
  returning id into v_season;
  insert into public.club_squads (organization_id, season_id, sport, category)
  values (v_org, v_season, 'Football', 'Senior')
  returning id into v_squad;

  insert into public.club_matches (
    organization_id, created_by, sport, squad_id, category, opponent_name, kickoff_at, notes
  ) values (
    v_org, v_owner, 'Football', v_squad, 'Senior', 'QA71 Opposition',
    now() + interval '1 day', 'QA71 meet at the north gate'
  ) returning id into v_match;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  begin
    select count(*) into v_rows from public.club_matches where id = v_match;
  exception when insufficient_privilege then
    v_rows := 0;
  end;
  reset role;
  perform tests.ok(
    v_rows = 0,
    'QA-71 regression: a signed-out client cannot read club matches, including notes and created_by');

  perform tests.as_user(v_stranger);
  set local role authenticated;
  select count(*) into v_rows from public.club_matches
   where id = v_match
     and notes = 'QA71 meet at the north gate'
     and created_by = v_owner;
  reset role;
  perform tests.ok(
    v_rows = 1,
    'a signed-in stranger can still read the match row, which is what live scores need');

  perform tests.ok(
    not has_table_privilege('anon', 'public.club_matches', 'SELECT')
    and has_table_privilege('authenticated', 'public.club_matches', 'SELECT'),
    'anon has no select on club_matches and authenticated still does');

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    perform tests.ok(
      exists (select 1 from pg_publication_tables
               where pubname = 'supabase_realtime'
                 and schemaname = 'public'
                 and tablename = 'club_matches'),
      'club_matches stays in the realtime publication so live scores keep broadcasting');
  end if;
end $$;

-- ------------------------------------------------------------
-- Admin console (20261013000002)
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── admin console ──'; end $$;

select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email, raw_user_meta_data) values
  ('ad111111-1111-1111-1111-111111111111', 'moderator@test.local', '{"full_name":"Test Moderator"}')
on conflict do nothing;
update public.user_profiles set role = 'admin' where id = 'ad111111-1111-1111-1111-111111111111';

do $$
declare
  v_raised boolean;
  v_post uuid;
  v_report uuid;
begin
  -- A non-admin is refused by every console function.
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_raised := false;
  begin perform public.admin_dashboard(); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a non-admin cannot read the admin dashboard');
  v_raised := false;
  begin perform public.admin_set_suspension('44444444-4444-4444-4444-444444444444', true, 'x', 1);
  exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a non-admin cannot suspend an account');

  -- The random adult posts; the adult athlete reports it.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  insert into public.posts (author_id, text) values ('44444444-4444-4444-4444-444444444444', 'Buy followers here')
  returning id into v_post;
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_report := public.report_content('post', v_post::text, 'spam', null);

  -- The moderator sees it, removes the post and suspends the author.
  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  perform tests.ok(
    exists (select 1 from jsonb_array_elements(public.admin_list_reports('open')) r where (r->>'id')::uuid = v_report),
    'an admin sees an open report in the queue');
  perform public.admin_resolve_report(v_report, 'suspend_user', 'Selling followers', 3);
  perform tests.ok((select moderation_state = 'removed' from public.posts where id = v_post),
    'resolving with a suspension removes the reported post');
  perform tests.ok((select is_suspended and suspended_until > now()
                    from public.user_profiles where id = '44444444-4444-4444-4444-444444444444'),
    'resolving with a suspension suspends the author until a date');
  perform tests.ok((select status = 'resolved' from public.moderation_reports where id = v_report),
    'the report is marked resolved');
  perform tests.ok(exists (select 1 from public.audit_logs where action = 'report.suspend_user'
                             and record_id = v_report and user_id = 'ad111111-1111-1111-1111-111111111111'),
    'the decision is written to the audit log with the moderator''s id');

  -- Reinstating lifts the suspension.
  perform public.admin_set_suspension('44444444-4444-4444-4444-444444444444', false, null);
  perform tests.ok((select not is_suspended from public.user_profiles where id = '44444444-4444-4444-4444-444444444444'),
    'an admin can reinstate a suspended account');

  -- An admin who is not a super admin cannot change roles.
  v_raised := false;
  begin perform public.admin_set_role('44444444-4444-4444-4444-444444444444', 'coach');
  exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'only a super admin can change a role');

  -- An admin cannot suspend themselves.
  v_raised := false;
  begin perform public.admin_set_suspension('ad111111-1111-1111-1111-111111111111', true, 'x', null);
  exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'an admin cannot suspend their own account');
end $$;

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- Console guardrails. Each refusal must be a permission error (42501), so a
-- typo or a missing function cannot pass for a refusal.
insert into auth.users (id, email, raw_user_meta_data) values
  ('ad222222-2222-2222-2222-222222222222', 'moderator2@test.local', '{"full_name":"Second Moderator"}'),
  ('ad333333-3333-3333-3333-333333333333', 'quarantined@test.local', '{"full_name":"Quarantined Child","role":"athlete"}')
on conflict do nothing;
update public.user_profiles set role = 'admin' where id = 'ad222222-2222-2222-2222-222222222222';

do $$
declare
  v_state text;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles
     set is_suspended = true, suspended_reason = 'underage_account_pending_remediation'
   where id = 'ad333333-3333-3333-3333-333333333333';
  update public.user_profiles
     set is_suspended = true, suspended_reason = 'Test suspension', suspended_until = now() + interval '7 days'
   where id = 'ad222222-2222-2222-2222-222222222222';

  perform tests.ok(
    not has_function_privilege('anon', 'public.admin_dashboard()', 'EXECUTE'),
    'signed-out callers cannot reach the admin console functions');

  -- A suspended admin loses the console and cannot reinstate themselves.
  perform tests.as_user('ad222222-2222-2222-2222-222222222222');
  v_state := null;
  begin perform public.admin_dashboard(); exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'a suspended admin is refused by the console');
  v_state := null;
  begin perform public.admin_set_suspension('ad222222-2222-2222-2222-222222222222', false, null);
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'a suspended admin cannot lift their own suspension');

  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  v_state := null;
  begin perform public.admin_set_suspension('ad222222-2222-2222-2222-222222222222', false, null);
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'only a super admin can reinstate an admin');

  -- The under-13 quarantine is left to the age appeal.
  v_state := null;
  begin perform public.admin_set_suspension('ad333333-3333-3333-3333-333333333333', false, null);
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'the console cannot lift an under-13 quarantine');
  v_state := null;
  begin perform public.admin_set_suspension('ad333333-3333-3333-3333-333333333333', true, 'x', 7);
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'the console cannot turn an under-13 quarantine into a timed suspension');

  -- A timed suspension never shortens a permanent ban.
  perform public.admin_set_suspension('44444444-4444-4444-4444-444444444444', true, 'Ban', null);
  perform public.admin_set_suspension('44444444-4444-4444-4444-444444444444', true, 'Shorter', 3);
  perform tests.ok(
    (select is_suspended and suspended_until is null
       from public.user_profiles where id = '44444444-4444-4444-4444-444444444444'),
    'a later timed suspension does not shorten a permanent ban');
  perform public.admin_set_suspension('44444444-4444-4444-4444-444444444444', false, null);

  -- No self-verification.
  v_state := null;
  begin perform public.admin_set_verified('ad111111-1111-1111-1111-111111111111', true);
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'an admin cannot verify their own account');

  -- Private messages are moderated only once reported.
  v_state := null;
  begin perform public.admin_moderate_content('message', gen_random_uuid(), 'hide', 'x');
  exception when others then v_state := sqlstate; end;
  perform tests.ok(v_state = '42501', 'an unreported private message cannot be opened by moderation');
end $$;

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── play game alerts ──'; end $$;

do $$
declare
  v_host    uuid := 'a1000000-0000-0000-0000-000000000001';
  v_adult   uuid := 'a1000000-0000-0000-0000-000000000002';
  v_unknown uuid := 'a1000000-0000-0000-0000-000000000003';
  v_minor   uuid := 'a1000000-0000-0000-0000-000000000004';
  v_other   uuid := 'a1000000-0000-0000-0000-000000000005';
  v_count   integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_host,    'alerts.host@test.local',    '{"full_name":"Alerts Host","role":"athlete"}'),
    (v_adult,   'alerts.adult@test.local',   '{"full_name":"Alerts Adult","role":"athlete"}'),
    (v_unknown, 'alerts.unknown@test.local', '{"full_name":"Alerts Unknown","role":"athlete"}'),
    (v_minor,   'alerts.minor@test.local',   '{"full_name":"Alerts Minor","role":"athlete"}'),
    (v_other,   'alerts.other@test.local',   '{"full_name":"Alerts Other","role":"athlete"}');

  update public.user_private set date_of_birth = current_date - interval '30 years'
   where user_id in (v_host, v_adult, v_other);
  update public.user_private set date_of_birth = current_date - interval '15 years'
   where user_id = v_minor;

  update public.user_profiles set city = 'Alertville'
   where id in (v_host, v_adult, v_unknown, v_minor, v_other);
  update public.athlete_profiles set sport = 'Padel'
   where user_id in (v_host, v_adult, v_unknown, v_minor, v_other);

  insert into public.meetups (host_id, sport, title, country, city, starts_at, spots_total)
  values (v_host, 'Padel', 'Evening padel', 'United Arab Emirates', 'Alertville',
          now() + interval '2 days', 4);

  perform tests.ok(
    exists (select 1 from public.notifications where user_id = v_adult and type = 'meetup_nearby'),
    'an adult with the same sport in the same city is told about a new game');
  perform tests.ok(
    not exists (select 1 from public.notifications where user_id = v_minor and type = 'meetup_nearby'),
    'a minor is never sent a game alert');
  perform tests.ok(
    not exists (select 1 from public.notifications where user_id = v_unknown and type = 'meetup_nearby'),
    'an account with no known age is treated as a minor for game alerts');
  perform tests.ok(
    not exists (select 1 from public.notifications where user_id = v_host and type = 'meetup_nearby'),
    'the host is not alerted about their own game');

  insert into public.meetups (host_id, sport, title, country, city, starts_at, spots_total)
  values (v_host, 'Padel', 'Second padel game', 'United Arab Emirates', 'Alertville',
          now() + interval '3 days', 4);
  select count(*) into v_count from public.notifications
   where user_id = v_adult and type = 'meetup_nearby';
  perform tests.ok(v_count = 1, 'one host alerts each person at most once a day');

  insert into public.meetups (host_id, sport, title, country, city, starts_at, spots_total)
  values (v_host, 'Padel', 'Third padel game', 'United Arab Emirates', 'Alertville',
          now() + interval '4 days', 4);
  delete from public.notifications where user_id = v_other and type = 'meetup_nearby';
  insert into public.meetups (host_id, sport, title, country, city, starts_at, spots_total)
  values (v_host, 'Padel', 'Fourth padel game', 'United Arab Emirates', 'Alertville',
          now() + interval '5 days', 4);
  perform tests.ok(
    not exists (select 1 from public.notifications where user_id = v_other and type = 'meetup_nearby'),
    'a host posting more than two games a day sends no further alerts');
end $$;

-- ------------------------------------------------------------
do $$ begin raise notice E'\n── play phase 2: map link and alert places ──'; end $$;

do $$
declare
  v_host  uuid := 'b2000000-0000-0000-0000-000000000001';
  v_home  uuid := 'b2000000-0000-0000-0000-000000000002';
  v_far   uuid := 'b2000000-0000-0000-0000-000000000003';
  v_game  uuid;
  v_hint  text;
  v_state text;
  v_url   text := 'https://www.google.com/maps/place/Alertville';
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_host, 'phase2.host@test.local', '{"full_name":"Phase2 Host","role":"athlete"}'),
    (v_home, 'phase2.home@test.local', '{"full_name":"Phase2 Home","role":"athlete"}'),
    (v_far,  'phase2.far@test.local',  '{"full_name":"Phase2 Far","role":"athlete"}');

  update public.user_private set date_of_birth = current_date - interval '30 years'
   where user_id in (v_host, v_home, v_far);
  update public.user_profiles set city = 'Alertville' where id in (v_host, v_home);
  update public.user_profiles set city = 'Faraway' where id = v_far;
  update public.athlete_profiles set sport = 'Padel'
   where user_id in (v_host, v_home, v_far);

  insert into public.meetups (host_id, sport, title, country, city, starts_at, spots_total)
  values (v_host, 'Padel', 'Map link game', 'United Arab Emirates', 'Alertville',
          now() + interval '2 days', 4)
  returning id into v_game;

  perform tests.as_user(v_host);
  begin
    set local role authenticated;
    perform public.set_meetup_map_url(v_game, v_url);
    reset role;
  exception when others then
    reset role;
    raise;
  end;
  perform tests.ok(
    (select map_url from public.meetups where id = v_game) = v_url,
    'the host can store a Google Maps link');

  begin
    set local role authenticated;
    perform public.set_meetup_map_url(v_game, '');
    reset role;
  exception when others then
    reset role;
    raise;
  end;
  perform tests.ok(
    (select map_url from public.meetups where id = v_game) is null,
    'an empty string clears the map link');

  v_hint := null;
  begin
    set local role authenticated;
    perform public.set_meetup_map_url(v_game, 'https://example.com/x');
    reset role;
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    reset role;
  end;
  perform tests.ok(v_hint = 'meetup_map_url_invalid',
    'a link that is not a map site is refused');

  perform tests.as_user(v_home);
  v_state := null;
  begin
    set local role authenticated;
    perform public.set_meetup_map_url(v_game, v_url);
    reset role;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    reset role;
  end;
  perform tests.ok(v_state = '42501',
    'someone who is not the host cannot change the map link');

  update public.notification_preferences
     set meetup_places = array['  Sharjah  ', 'sharjah', 'Dubai']
   where user_id = v_far;
  perform tests.ok(
    (select array_to_string(meetup_places, ',')
       from public.notification_preferences where user_id = v_far)
      = 'Sharjah,Dubai',
    'places are trimmed and a case-insensitive duplicate is dropped, keeping the original text');

  v_hint := null;
  begin
    update public.notification_preferences
       set meetup_places = array['A']
     where user_id = v_far;
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'meetup_place_invalid',
    'a place shorter than two characters is refused');

  v_hint := null;
  begin
    update public.notification_preferences
       set meetup_places = array['One', 'Two', 'Three', 'Four', 'Five', 'Six']
     where user_id = v_far;
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  perform tests.ok(v_hint = 'meetup_places_limit',
    'a sixth place is refused');

  -- Matching. The map-link game above already counted toward this host's
  -- two-a-day cap, so remove it before these inserts. Notifications are
  -- cleared between cases so the daily and per-host caps cannot hide a miss.
  delete from public.notifications
   where type = 'meetup_nearby' and user_id in (v_host, v_home, v_far);
  delete from public.meetups where host_id = v_host;

  update public.notification_preferences
     set meetup_places = array['Downtown']
   where user_id = v_far;

  insert into public.meetups
    (host_id, sport, title, country, city, area, starts_at, spots_total)
  values
    (v_host, 'Padel', 'Downtown area game', 'United Arab Emirates', 'Alertville',
     'Downtown', now() + interval '3 days', 4);

  perform tests.ok(
    not exists (select 1 from public.notifications
                 where user_id = v_far and type = 'meetup_nearby'),
    'QA-58: a Faraway player listing Downtown is not alerted about Downtown in Alertville');
  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_home and type = 'meetup_nearby'),
    'a player whose profile city is Alertville is still alerted about an Alertville game');

  delete from public.notifications
   where type = 'meetup_nearby' and user_id in (v_host, v_home, v_far);

  update public.notification_preferences
     set meetup_places = array['Alertville']
   where user_id = v_far;

  insert into public.meetups
    (host_id, sport, title, country, city, starts_at, spots_total)
  values
    (v_host, 'Padel', 'City name game', 'United Arab Emirates', 'Alertville',
     now() + interval '4 days', 4);

  perform tests.ok(
    exists (select 1 from public.notifications
            where user_id = v_far and type = 'meetup_nearby'),
    'a Faraway player listing Alertville is alerted about a game in that city');
end $$;

-- ------------------------------------------------------------
-- Sport Fit (20261019000001)
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── sport fit ──'; end $$;

do $$
declare
  v_answers jsonb;
  v_out     jsonb;
  v_raised  boolean;
  v_minor   uuid := '22222222-2222-2222-2222-222222222222';
  v_adult   uuid := '11111111-1111-1111-1111-111111111111';
  v_seen    integer;
begin
  select jsonb_object_agg(id, case when expected is not null then expected
                                   when reverse then 2 else 4 end)
    into v_answers from public.sport_fit_items;

  -- An adult athlete answers.
  perform tests.as_user(v_adult);
  perform tests.ok(public.sport_fit_my_state() ->> 'consent' = 'ok',
    'an adult athlete may take Sport Fit');
  v_out := public.sport_fit_submit(v_answers, 240);
  perform tests.ok(v_out ->> 'quality' = 'ok', 'a careful set of answers is scored');
  perform tests.ok(jsonb_array_length(v_out -> 'fits') = (select count(*) from public.sport_fit_sports where active),
    'every active sport is ranked');
  perform tests.ok(
    (v_out -> 'fits' -> 0 ->> 'fit')::int >= (v_out -> 'fits' -> 1 ->> 'fit')::int
    and (v_out -> 'fits' -> 1 ->> 'fit')::int >= (v_out -> 'fits' -> 2 ->> 'fit')::int,
    'sports come back best first');
  perform tests.ok((v_out -> 'dimensions' ->> 'drive')::int between 0 and 100,
    'dimensions are reported on 0–100');

  v_raised := false;
  begin perform public.sport_fit_submit(v_answers, 240); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a second valid result inside the retake window is refused');

  v_raised := false;
  begin perform public.sport_fit_submit(v_answers - 'drive1', 240); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a missing answer is refused');

  -- Nobody else reads it.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  set local role authenticated;
  v_seen := (select count(*) from public.sport_fit_results where user_id = v_adult);
  v_raised := false;
  begin
    update public.sport_fit_results set quality = 'ok' where user_id = v_adult;
    v_raised := not found;
  exception when others then v_raised := true; end;
  reset role;
  perform tests.ok(v_seen = 0, 'another user cannot read someone''s Sport Fit answers');
  perform tests.ok(v_raised, 'a client cannot write Sport Fit results');

  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  set local role authenticated;
  v_seen := (select count(*) from public.sport_fit_results
              where user_id <> 'ad111111-1111-1111-1111-111111111111');
  reset role;
  perform tests.ok(
    v_seen = 0
    and exists (select 1 from public.sport_fit_results
                where user_id <> 'ad111111-1111-1111-1111-111111111111'),
    'an admin selecting sport_fit_results directly sees no other player''s rows');

  -- Careless answers are not scored.
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  v_out := public.sport_fit_submit(jsonb_set(v_answers, '{check1}', '1'), 240);
  perform tests.ok(v_out ->> 'quality' = 'check_failed' and v_out -> 'fits' = '[]'::jsonb,
    'a missed attention check gives no result');
  v_out := public.sport_fit_submit(v_answers, 20);
  perform tests.ok(v_out ->> 'quality' = 'too_fast', 'answering in under 45 seconds gives no result');

  -- A 14-year-old needs the guardian's "mindset" scope, not just the games.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_private set date_of_birth = current_date - interval '14 years' where user_id = v_minor;
  update public.guardian_consents set status = 'revoked' where minor_user_id = v_minor and status = 'granted';
  insert into public.guardian_consents (minor_user_id, guardian_name, guardian_email, status, granted_at,
                                        allow_assessments, allow_mindset)
  values (v_minor, 'Parent', 'sf.parent@test.local', 'granted', now(), true, false);

  perform tests.as_user(v_minor);
  perform tests.ok(public.sport_fit_my_state() ->> 'consent' = 'guardian_required',
    'approving the games does not approve the mindset questionnaire');
  v_raised := false;
  begin perform public.sport_fit_submit(v_answers, 240); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'the server refuses a minor without the mindset scope');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.guardian_consents set allow_mindset = true
   where minor_user_id = v_minor and guardian_email = 'sf.parent@test.local';
  perform tests.as_user(v_minor);
  perform tests.ok(public.sport_fit_my_state() ->> 'consent' = 'ok',
    'a guardian''s mindset approval unlocks Sport Fit');
  perform tests.ok(
    not private.has_guardian_consent(v_minor, 'not_a_scope'),
    'has_guardian_consent of a minor with consent is false for an unknown scope');
  perform tests.ok(
    has_column_privilege('authenticated', 'public.guardian_consents', 'allow_mindset', 'SELECT')
    and not has_column_privilege('authenticated', 'public.guardian_consents', 'allow_mindset', 'UPDATE'),
    'the minor can read but not write the mindset scope');

  -- Erase.
  perform tests.as_user(v_adult);
  perform tests.ok(public.sport_fit_delete_mine() >= 1, 'a player can erase their Sport Fit answers');
  perform tests.ok(public.sport_fit_my_state() -> 'result' = 'null'::jsonb,
    'after erasing, no result remains');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_private set date_of_birth = current_date - interval '15 years' where user_id = v_minor;
  delete from public.guardian_consents where guardian_email = 'sf.parent@test.local';
end $$;

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- ------------------------------------------------------------
-- Admin console: Sport Fit (20261019000002)
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── admin sport fit ──'; end $$;

do $$
declare
  v_out    jsonb;
  v_raised boolean;
  v_w      jsonb := '{"drive":3,"composure":3,"focus":2,"resilience":3,"boldness":2,"discipline":2,"reading":2,"speed":3}';
begin
  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  v_raised := false;
  begin perform public.admin_sport_fit_overview(); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a non-admin cannot read Sport Fit totals');
  v_raised := false;
  begin perform public.admin_update_sport_fit_sport('tennis', v_w, 0, true); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a non-admin cannot edit the sport matrix');

  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  v_out := public.admin_sport_fit_overview();
  perform tests.ok(jsonb_array_length(v_out -> 'sports') = 12 and jsonb_array_length(v_out -> 'items') = 22,
    'an admin sees the sport matrix and the statements');
  perform tests.ok(position('answers' in v_out::text) = 0 and position('user_id' in v_out::text) = 0,
    'the totals carry no answers and no user ids');
  perform tests.ok(not exists (
      select 1 from jsonb_array_elements(v_out -> 'top_sports') e
      where (e ->> 'hidden')::boolean is false and (e ->> 'count')::int < 5),
    'a top-sport count under five is never shown as a number');

  -- One player's best sport is curling. Under five, so it must not be named.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.sport_fit_results
    (user_id, athlete_id, answers, duration_s, quality, fits)
  select '11111111-1111-1111-1111-111111111111', ap.id,
         '{}'::jsonb, 120, 'ok',
         '[{"sport":"curling","fit":99}]'::jsonb
  from public.athlete_profiles ap
  where ap.user_id = '11111111-1111-1111-1111-111111111111';
  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  v_out := public.admin_sport_fit_overview();
  perform tests.ok(
    not exists (
      select 1 from jsonb_array_elements(v_out -> 'top_sports') e
      where e ->> 'sport' is distinct from 'other'
        and coalesce((e ->> 'count')::int, 0) < 5)
    and not exists (
      select 1 from jsonb_array_elements(v_out -> 'top_sports') e
      where e ->> 'sport' = 'curling')
    and (select count(*) from jsonb_array_elements(v_out -> 'top_sports') e
         where e ->> 'sport' = 'other') = 1
    and exists (
      select 1 from jsonb_array_elements(v_out -> 'top_sports') e
      where e ->> 'sport' = 'other'
        and e -> 'count' = 'null'::jsonb
        and (e ->> 'hidden')::boolean),
    'top sports never names a sport with fewer than 5 players');
  perform set_config('request.jwt.claim.role', 'service_role', true);
  delete from public.sport_fit_results
   where user_id = '11111111-1111-1111-1111-111111111111'
     and fits -> 0 ->> 'sport' = 'curling';

  perform public.admin_review_sport_fit_sport('tennis', 'Dr. Test Panel');
  perform tests.ok((select reviewed_by = 'Dr. Test Panel' from public.sport_fit_sports where sport = 'tennis'),
    'an admin can mark a sport reviewed');
  perform public.admin_update_sport_fit_sport('tennis', v_w || '{"boldness":1}', 0, true);
  perform tests.ok((select reviewed_by is null and (weights ->> 'boldness')::int = 1
                    from public.sport_fit_sports where sport = 'tennis'),
    'changing a reviewed row clears its review mark');

  v_raised := false;
  begin perform public.admin_update_sport_fit_sport('tennis', v_w || '{"boldness":7}', 0, true); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a weight outside 0–3 is refused');
  v_raised := false;
  begin perform public.admin_update_sport_fit_sport('tennis', v_w - 'speed', 0, true); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a matrix row missing a dimension is refused');
  perform tests.ok(exists (select 1 from public.audit_logs where action = 'sport_fit.sport.update'),
    'matrix edits are written to the audit log');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.sport_fit_sports set weights = v_w, reviewed_by = null where sport = 'tennis';
end $$;

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- ------------------------------------------------------------
-- Invites (20261023000001)
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── invites ──'; end $$;

select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email, raw_user_meta_data)
select ('7e000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'invitee' || n || '@test.local',
       jsonb_build_object('full_name', 'Invitee' || n || ' Test', 'first_name', 'Invitee' || n, 'role', 'athlete')
from generate_series(1, 12) n
on conflict do nothing;
update public.user_private set date_of_birth = current_date - interval '20 years'
 where user_id::text like '7e000000-%' and user_id <> '7e000000-0000-4000-8000-000000000012';
update public.user_private set date_of_birth = current_date - interval '14 years'
 where user_id = '7e000000-0000-4000-8000-000000000012';

-- Invites ship switched off (20261024000001); off closes every path.
do $$
declare
  v_inviter uuid := '11111111-1111-1111-1111-111111111111';
  v_code    text;
  v_raised  boolean := false;
begin
  perform tests.ok((select value ->> 'invites' from public.platform_settings where key = 'features') = 'false',
    'invites ship switched off');
  perform tests.as_user(v_inviter);
  perform tests.ok(not (public.referral_my_circle() ->> 'can_invite')::boolean,
    'with invites off, nobody can invite');

  update public.platform_settings set value = jsonb_set(value, '{invites}', 'true') where key = 'features';
  v_code := public.referral_my_circle() ->> 'code';
  update public.platform_settings set value = jsonb_set(value, '{invites}', 'false') where key = 'features';
  perform tests.ok(public.referral_inviter(v_code) is null,
    'with invites off, a code shows no inviter');
  perform tests.as_user('7e000000-0000-4000-8000-000000000001');
  begin perform public.referral_claim(v_code); exception when others then v_raised := true; end;
  perform tests.ok(v_raised and not exists (select 1 from public.referrals where code = v_code),
    'with invites off, a code cannot be claimed');

  update public.platform_settings set value = jsonb_set(value, '{invites}', 'true') where key = 'features';
end $$;

do $$
declare
  v_inviter uuid := '11111111-1111-1111-1111-111111111111';
  v_code    text;
  v_circle  jsonb;
  v_raised  boolean;
  v_id      uuid;
  n         int;
begin
  perform tests.as_user(v_inviter);
  v_circle := public.referral_my_circle();
  v_code := v_circle ->> 'code';
  perform tests.ok(v_code ~ '^[A-HJ-NP-Z2-9]{8}$' and (v_circle ->> 'can_invite')::boolean,
    'an athlete gets a personal 8-character invite code');
  perform tests.ok(public.referral_my_circle() ->> 'code' = v_code, 'the code stays the same');

  v_raised := false;
  begin perform public.referral_claim(v_code); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'nobody can claim their own code');

  perform tests.ok((public.referral_inviter(v_code) ->> 'first_name') is not null
                   and not (public.referral_inviter(v_code) ? 'id'),
    'the landing screen gets a first name, not an id');

  -- Ten adults join; nine finish onboarding.
  for n in 1..10 loop
    v_id := ('7e000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    perform tests.as_user(v_id);
    perform public.referral_claim(lower(v_code));
  end loop;
  perform tests.ok((select count(*) from public.referrals where referrer_id = v_inviter and status = 'pending') = 10,
    'an invite starts as pending');

  perform tests.as_user('7e000000-0000-4000-8000-000000000001');
  v_raised := false;
  begin perform public.referral_claim(v_code); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'an account can be invited only once');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set onboarding_completed = true
   where id::text like '7e000000-%' and id::text <> '7e000000-0000-4000-8000-000000000010'
     and id::text <> '7e000000-0000-4000-8000-000000000011' and id::text <> '7e000000-0000-4000-8000-000000000012';
  perform tests.ok((select count(*) from public.referrals where referrer_id = v_inviter and status = 'qualified') = 9,
    'an invite counts once the friend finishes onboarding');
  perform tests.ok(coalesce((select sum(amount) from public.token_ledger where user_id = v_inviter), 0) = 0,
    'nine invites earn no token yet');

  update public.user_profiles set onboarding_completed = true where id = '7e000000-0000-4000-8000-000000000010';
  perform tests.ok((select sum(amount) from public.token_ledger where user_id = v_inviter) = 1,
    'the tenth invite that counts earns one token');
  perform tests.ok(exists (select 1 from public.notifications where user_id = v_inviter and type = 'referral_token'),
    'the inviter is told about the token');

  -- The circle and the badge.
  perform tests.as_user(v_inviter);
  v_circle := public.referral_my_circle();
  perform tests.ok((v_circle ->> 'qualified')::int = 10 and (v_circle ->> 'tokens')::int = 1
                   and (v_circle ->> 'progress')::int = 0,
    'the circle shows ten that count, one token, and a fresh start toward the next');
  perform tests.ok(not exists (select 1 from jsonb_array_elements(v_circle -> 'members') m
                                where m ? 'id' or m ? 'email' or m ? 'last_name'),
    'the circle shows first names only');
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  perform tests.ok((public.referral_badge(v_inviter) ->> 'tier')::int = 10,
    'others see a tier badge ("10+"), not a number or names');
  perform tests.as_user('44444444-4444-4444-4444-444444444444');
  perform tests.ok(public.referral_badge(v_inviter) is null,
    'someone blocked either way sees no badge');
  perform tests.as_user('7e000000-0000-4000-8000-000000000003');
  perform tests.ok(public.referral_my_circle() -> 'invited_by' ->> 'first_name' is not null,
    'the invited friend sees who invited them');

  -- A minor counts only after a guardian approves.
  perform tests.as_user('7e000000-0000-4000-8000-000000000012');
  perform public.referral_claim(v_code);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set onboarding_completed = true where id = '7e000000-0000-4000-8000-000000000012';
  perform tests.ok((select status = 'pending' from public.referrals where referred_id = '7e000000-0000-4000-8000-000000000012'),
    'a minor''s invite waits for a guardian');
  insert into public.guardian_consents (minor_user_id, guardian_name, guardian_email, status, granted_at)
  values ('7e000000-0000-4000-8000-000000000012', 'Parent', 'ref.parent@test.local', 'granted', now());
  perform tests.ok((select status = 'qualified' from public.referrals where referred_id = '7e000000-0000-4000-8000-000000000012'),
    'a guardian''s approval makes a minor''s invite count');

  -- A suspension takes the invite back, and the token with it.
  update public.user_profiles set is_suspended = true
   where id in ('7e000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000002');
  perform tests.ok((select status = 'revoked' from public.referrals where referred_id = '7e000000-0000-4000-8000-000000000001'),
    'suspending an invited account revokes the invite');
  perform tests.ok((select sum(amount) from public.token_ledger where user_id = v_inviter) = 0,
    'dropping below ten takes the token back');

  -- An admin restores one.
  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set is_suspended = false where id = '7e000000-0000-4000-8000-000000000002';
  perform tests.as_user('ad111111-1111-1111-1111-111111111111');
  perform public.admin_set_referral(
    (select id from public.referrals where referred_id = '7e000000-0000-4000-8000-000000000002'), false, null);
  perform tests.ok((select sum(amount) from public.token_ledger where user_id = v_inviter) = 1
                   and exists (select 1 from public.audit_logs where action = 'referral.restore'),
    'an admin can restore an invite; the token comes back and it is audited');

  -- Late, unknown, and direct writes.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set created_at = now() - interval '30 days' where id = '7e000000-0000-4000-8000-000000000011';
  perform tests.as_user('7e000000-0000-4000-8000-000000000011');
  v_raised := false;
  begin perform public.referral_claim(v_code); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'a code cannot be entered more than 14 days after signing up');
  v_raised := false;
  begin perform public.referral_claim('ZZZZZZZZ'); exception when others then v_raised := true; end;
  perform tests.ok(v_raised, 'an unknown code is refused');
  set local role authenticated;
  v_raised := false;
  begin
    insert into public.referrals (referrer_id, referred_id, code)
    values (v_inviter, '7e000000-0000-4000-8000-000000000011', v_code);
  exception when others then v_raised := true; end;
  reset role;
  perform tests.ok(v_raised, 'a client cannot write an invite directly');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set is_suspended = false where id::text like '7e000000-%';
end $$;

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- QA-114. A watch counts once, never for the author, never for a post
-- the viewer is not allowed to see.
do $$
declare
  v_post uuid;
  v_hidden uuid;
  v_count integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  perform tests.ok(
    not has_function_privilege('anon', 'public.record_post_view(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.record_post_view(uuid)', 'EXECUTE'),
    'only a signed-in user can record a post view');

  insert into public.posts (author_id, type, caption, audience)
  values (
    '11111111-1111-1111-1111-111111111111',
    'standard', 'QA-114 public clip', 'public'
  ) returning id into v_post;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  perform public.record_post_view(v_post);
  reset role;
  select view_count into v_count from public.posts where id = v_post;
  perform tests.ok(v_count = 1, 'a viewer''s first call adds 1 to view_count');

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  perform public.record_post_view(v_post);
  reset role;
  select view_count into v_count from public.posts where id = v_post;
  perform tests.ok(v_count = 1, 'a second call does not add another view');

  perform tests.as_user('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  perform public.record_post_view(v_post);
  reset role;
  select view_count into v_count from public.posts where id = v_post;
  perform tests.ok(v_count = 1, 'the author''s call does not count');

  insert into public.posts (author_id, type, caption, audience, is_hidden)
  values (
    '11111111-1111-1111-1111-111111111111',
    'standard', 'QA-114 hidden clip', 'public', true
  ) returning id into v_hidden;

  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  perform public.record_post_view(v_hidden);
  reset role;
  select view_count into v_count from public.posts where id = v_hidden;
  perform tests.ok(v_count = 0, 'a viewer who may not see the post does not count');
end $$;

-- ------------------------------------------------------------
-- QA-118. A highlight watch counts once, never for the owner, never for
-- a viewer who may not see a minor's clip.
do $$
declare
  v_adult uuid := '11111111-1111-1111-1111-111111111111';
  v_coach uuid := '33333333-3333-3333-3333-333333333333';
  -- The seeded minor's granted consent names this coach as guardian, so
  -- turning discoverability off does not hide that child from them.
  v_hidden uuid := 'a1180000-0000-4000-8000-000000000001';
  v_athlete uuid;
  v_hidden_athlete uuid;
  v_clip uuid := gen_random_uuid();
  v_minor_clip uuid := gen_random_uuid();
  v_count integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  perform tests.ok(
    not has_function_privilege('anon', 'public.record_highlight_view(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.record_highlight_view(uuid)', 'EXECUTE'),
    'only a signed-in user can record a highlight view');

  select id into v_athlete from public.athlete_profiles where user_id = v_adult;
  insert into public.athlete_media (id, athlete_id, title, media_type, storage_url, is_public, views_count)
  values (v_clip, v_athlete, 'QA-118 clip', 'video', v_adult::text || '/highlights/qa118.mp4', true, 0);

  perform tests.as_user(v_coach);
  set local role authenticated;
  perform public.record_highlight_view(v_clip);
  reset role;
  select views_count into v_count from public.athlete_media where id = v_clip;
  perform tests.ok(v_count = 1, 'a viewer''s first call adds 1 to views_count');

  perform tests.as_user(v_coach);
  set local role authenticated;
  perform public.record_highlight_view(v_clip);
  reset role;
  select views_count into v_count from public.athlete_media where id = v_clip;
  perform tests.ok(v_count = 1, 'a second call does not add another view');

  perform tests.as_user(v_adult);
  set local role authenticated;
  perform public.record_highlight_view(v_clip);
  reset role;
  select views_count into v_count from public.athlete_media where id = v_clip;
  perform tests.ok(v_count = 1, 'the owner''s call does not count');

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_hidden, 'qa118.hidden@test.local', '{"full_name":"QA118 Hidden","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '15 years'
   where user_id = v_hidden;
  update public.user_profiles set is_discoverable = false where id = v_hidden;
  select id into v_hidden_athlete from public.athlete_profiles where user_id = v_hidden;
  insert into public.athlete_media (id, athlete_id, title, media_type, storage_url, is_public, views_count)
  values (
    v_minor_clip, v_hidden_athlete, 'QA-118 minor clip', 'video',
    v_hidden::text || '/highlights/qa118m.mp4', true, 0
  );

  perform tests.as_user(v_coach);
  set local role authenticated;
  perform public.record_highlight_view(v_minor_clip);
  reset role;
  select views_count into v_count from public.athlete_media where id = v_minor_clip;
  perform tests.ok(v_count = 0, 'a viewer who may not see a minor''s clip does not count');

  delete from public.athlete_media where id in (v_clip, v_minor_clip);
end $$;

-- ------------------------------------------------------------
-- QA-87. Suggestions are city names from the catalogue, and only a
-- signed-in user can ask. "dubai " is the Dubai already on file.
do $$
declare
  v_adult uuid := '11111111-1111-1111-1111-111111111111';
  v_rows  integer;
  v_count integer;
  v_name  text;
begin
  perform tests.ok(
    (select pg_get_function_result(p.oid)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'search_cities')
      = 'TABLE(name text)',
    'search_cities returns names only');

  set local role anon;
  begin
    select count(*) into v_rows from public.cities;
  exception when insufficient_privilege then
    v_rows := -1;
  end;
  reset role;
  perform tests.ok(
    v_rows = -1
    and not has_table_privilege('anon', 'public.cities', 'SELECT')
    and not has_function_privilege('anon', 'public.search_cities(text, text, integer)', 'EXECUTE'),
    'anon cannot call search_cities or read public.cities');

  perform tests.as_user(v_adult);
  set local role authenticated;
  select count(*) into v_count
    from public.search_cities('United Arab Emirates', 'dub', 20) s
   where s.name = 'Dubai';
  reset role;
  perform tests.ok(v_count = 1, 'a signed-in user''s search returns the city name');

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  select count(*) into v_count
    from public.search_cities('United Arab Emirates', 'dub', 20);
  perform tests.ok(v_count = 0, 'search_cities returns nothing when nobody is signed in');

  perform tests.as_user(v_adult);
  set local role authenticated;
  v_name := public.add_custom_city('United Arab Emirates', 'dubai ');
  reset role;
  select count(*) into v_count from public.cities
   where lower(btrim(country)) = 'united arab emirates'
     and lower(btrim(name)) = 'dubai';
  perform tests.ok(
    v_name = 'Dubai' and v_count = 1,
    'add_custom_city("dubai ") returns the existing spelling and does not add a duplicate');

  perform tests.ok(
    tests.hint_of($q$select public.add_custom_city('United Arab Emirates', 'n')$q$) = 'city_length'
    and tests.hint_of($q$select public.add_custom_city('United Arab Emirates', repeat('n', 81))$q$) = 'city_length',
    'a city name under 2 or over 80 characters is refused');
end $$;

-- ------------------------------------------------------------
-- QA-96. A club map pin keeps a Google share link. Only a manager
-- (or the owner) may set it.
do $$
declare
  v_owner  uuid := 'a0960000-0000-4000-8000-000000000001';
  v_editor uuid := 'a0960000-0000-4000-8000-000000000002';
  v_org    uuid;
  v_url    text := 'https://maps.app.goo.gl/aceaixPin';
  v_set    text;
  v_saved  text;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_owner,  'qa96.owner@test.local',  '{"full_name":"QA96 Owner","role":"club"}'),
    (v_editor, 'qa96.editor@test.local', '{"full_name":"QA96 Editor","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '34 years' where user_id = v_owner;
  update public.user_private set date_of_birth = current_date - interval '29 years' where user_id = v_editor;

  insert into public.organizations (name, type, is_verified, verification_status)
  values ('QA96 Map Club', 'club', true, 'approved')
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, member_role, status)
  values
    (v_org, v_owner, 'owner', 'active'),
    (v_org, v_editor, 'editor', 'active');

  perform tests.as_user(v_owner);
  v_set := public.set_club_map_url(v_org, v_url);
  select map_url into v_saved from public.organizations where id = v_org;
  perform tests.ok(
    v_set = v_url and v_saved = v_url,
    'set_club_map_url accepts a maps.app.goo.gl link');

  perform tests.ok(
    tests.hint_of(format($q$select public.set_club_map_url(%L, 'https://example.com')$q$, v_org))
      = 'club_map_url_invalid'
    and (select map_url from public.organizations where id = v_org) = v_url,
    'https://example.com is refused');

  perform tests.as_user(v_editor);
  perform tests.ok(
    tests.hint_of(format($q$select public.set_club_map_url(%L, %L)$q$, v_org, v_url))
      = 'club_permission'
    and (select map_url from public.organizations where id = v_org) = v_url,
    'a non-manager cannot set the club map link');
end $$;

-- ------------------------------------------------------------
-- QA-109. The hand-added follow trigger is gone, so one follow
-- writes one notification row. The real trigger's type is 'follow';
-- the stray one's was 'connection'. Count only those, and only the
-- rows this follow creates: signing the recipient up already wrote
-- a score notification.
do $$
declare
  v_follower uuid := 'a1090000-0000-4000-8000-000000000001';
  v_target   uuid := 'a1090000-0000-4000-8000-000000000002';
  v_before   integer;
  v_after    integer;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_follower, 'qa109.follower@test.local', '{"full_name":"QA109 Follower","role":"athlete"}'),
    (v_target,   'qa109.target@test.local',   '{"full_name":"QA109 Target","role":"athlete"}');
  update public.user_private set date_of_birth = current_date - interval '26 years'
   where user_id in (v_follower, v_target);
  insert into public.notification_preferences (user_id, follows)
  values (v_target, true)
  on conflict (user_id) do update set follows = true;

  perform tests.as_user(v_follower);
  select count(*) into v_before from public.notifications
   where user_id = v_target and type in ('follow', 'connection');
  perform public.toggle_follow(v_target);
  select count(*) into v_after from public.notifications
   where user_id = v_target and type in ('follow', 'connection');
  perform tests.ok(v_after = v_before + 1, 'a follow writes exactly one notification row');
end $$;

-- ------------------------------------------------------------
-- QA-110. The update check can read the version record before sign-in.
do $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  select count(*) into v_count
    from public.platform_settings
   where key = 'app_version'
     and value -> 'ios' ->> 'latest' = '2.0.5'
     and value -> 'android' ->> 'latest' = '2.0.5';
  reset role;
  perform tests.ok(v_count = 1, 'the app_version row exists and a signed-out client can read it');
end $$;

-- ------------------------------------------------------------
-- QA-111. An @ in a caption notifies that adult once. A minor is
-- not mentionable, so that entry is dropped and nobody is told.
do $$
declare
  v_adult   uuid := '11111111-1111-1111-1111-111111111111';
  v_minor   uuid := '22222222-2222-2222-2222-222222222222';
  v_coach   uuid := '33333333-3333-3333-3333-333333333333';
  v_who     text;
  v_caption text;
  v_len     integer;
  v_post    uuid;
  v_kept    jsonb;
  v_count   integer;
begin
  perform tests.ok(
    not has_function_privilege('anon', 'public.mention_candidates(text, integer)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.mention_candidates(text, integer)', 'EXECUTE'),
    'only a signed-in user can search mention candidates');

  perform tests.as_user(v_adult);
  perform tests.ok(
    exists (select 1 from public.mention_candidates('Verified', 8) c where c.id = v_coach)
    and not exists (select 1 from public.mention_candidates('Minor', 8) c where c.id = v_minor),
    'mention search offers an adult and not a minor');

  select full_name into v_who from public.user_profiles where id = v_coach;
  v_caption := '@' || v_who || ' see this';
  v_len := char_length('@' || v_who);

  insert into public.posts (author_id, type, caption, audience, mentions)
  values (
    v_adult, 'standard', v_caption, 'public',
    jsonb_build_array(
      jsonb_build_object('user_id', v_coach, 'start', 0, 'length', v_len),
      jsonb_build_object('user_id', v_minor, 'start', 0, 'length', v_len)
    )
  )
  returning id, mentions into v_post, v_kept;

  select count(*) into v_count from public.notifications
   where user_id = v_coach and type = 'mention' and entity_id = v_post::text;
  perform tests.ok(
    v_count = 1
    and jsonb_array_length(v_kept) = 1
    and (v_kept -> 0 ->> 'user_id') = v_coach::text
    and not exists (
      select 1 from public.notifications
       where user_id = v_minor and type = 'mention'
    ),
    'an adult mention writes one notification and a minor mention is dropped');
end $$;

-- 20261024000002. A hidden minor cannot mention anyone, and a mention
-- reaches only someone who may see the post. A view row needs a post the
-- viewer may see.
do $$
declare
  v_adult   uuid := '11111111-1111-1111-1111-111111111111';
  v_minor   uuid := '22222222-2222-2222-2222-222222222222';
  v_coach   uuid := '33333333-3333-3333-3333-333333333333';
  v_post    uuid;
  v_kept    jsonb;
  v_raised  boolean := false;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.user_profiles set is_discoverable = false where id = v_minor;
  delete from public.follows where follower_id = v_coach and following_id = v_adult;
  perform tests.ok(not (select is_discoverable from public.user_profiles where id = v_minor),
    'the minor is hidden for this check');

  perform tests.as_user(v_minor);
  insert into public.posts (author_id, type, caption, audience, mentions)
  values (v_minor, 'standard', '@Coach hi', 'public',
          jsonb_build_array(jsonb_build_object('user_id', v_coach, 'start', 0, 'length', 6)))
  returning id, mentions into v_post, v_kept;
  perform tests.ok(
    coalesce(jsonb_array_length(v_kept), 0) = 0
    and not exists (select 1 from public.notifications
                     where user_id = v_coach and type = 'mention' and entity_id = v_post::text),
    'a hidden minor cannot mention an adult');

  perform tests.as_user(v_adult);
  insert into public.posts (author_id, type, caption, audience, mentions)
  values (v_adult, 'standard', '@Coach followers only', 'followers',
          jsonb_build_array(jsonb_build_object('user_id', v_coach, 'start', 0, 'length', 6)))
  returning id into v_post;
  perform tests.ok(
    not exists (select 1 from public.notifications
                 where user_id = v_coach and type = 'mention' and entity_id = v_post::text),
    'a mention in a followers-only post does not reach a non-follower');

  perform tests.as_user(v_coach);
  set local role authenticated;
  begin
    insert into public.post_views (post_id, viewer_id) values (v_post, v_coach);
  exception when others then v_raised := true;
  end;
  reset role;
  perform tests.ok(v_raised, 'a view cannot be written for a post the viewer may not see');

  v_raised := false;
  perform tests.as_user(v_adult);
  set local role authenticated;
  begin
    insert into public.post_views (post_id, viewer_id) values (v_post, v_adult);
  exception when others then v_raised := true;
  end;
  reset role;
  perform tests.ok(v_raised, 'an author cannot write a view of their own post');
end $$;

-- ------------------------------------------------------------
-- Invites minor privacy (20261025000001)
-- Fresh accounts only. Earlier blocks change the seeded minors.
-- ------------------------------------------------------------
do $$ begin raise notice E'\n── invites minor privacy ──'; end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('7f000000-0000-4000-8000-000000000001', 'privacy.lina@test.local',
   '{"full_name":"Lina Privacy","first_name":"Lina","role":"athlete"}'),
  ('7f000000-0000-4000-8000-000000000002', 'privacy.adult@test.local',
   '{"full_name":"Adult Privacy","first_name":"Adult","role":"athlete"}'),
  ('7f000000-0000-4000-8000-000000000003', 'privacy.noor@test.local',
   '{"full_name":"Noor Privacy","first_name":"Noor","role":"athlete"}'),
  ('7f000000-0000-4000-8000-000000000004', 'privacy.raya@test.local',
   '{"full_name":"Raya Privacy","first_name":"Raya","role":"athlete"}')
on conflict do nothing;

update public.user_private set date_of_birth = current_date - interval '14 years'
 where user_id in (
   '7f000000-0000-4000-8000-000000000001',
   '7f000000-0000-4000-8000-000000000003',
   '7f000000-0000-4000-8000-000000000004'
 );
update public.user_private set date_of_birth = current_date - interval '20 years'
 where user_id = '7f000000-0000-4000-8000-000000000002';
select tests.ok(
  (select count(*) = 3 and bool_and(is_minor) from public.user_profiles
    where id in (
      '7f000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000003',
      '7f000000-0000-4000-8000-000000000004'
    )),
  'the three new accounts are minors');
select tests.ok(
  not (select is_minor from public.user_profiles where id = '7f000000-0000-4000-8000-000000000002'),
  'the new adult account is not a minor');
update public.user_profiles set avatar_url = 'https://cdn.test/lina.png'
 where id = '7f000000-0000-4000-8000-000000000001';

do $$
declare
  v_minor  uuid := '7f000000-0000-4000-8000-000000000001';
  v_adult  uuid := '7f000000-0000-4000-8000-000000000002';
  v_hidden uuid := '7f000000-0000-4000-8000-000000000003';
  v_gated  uuid := '7f000000-0000-4000-8000-000000000004';
  v_code   text;
  v_anon   jsonb;
  v_signed jsonb;
  v_person jsonb;
  v_circle jsonb;
begin
  update public.platform_settings
     set value = jsonb_set(value, '{invites}', 'true')
   where key = 'features';
  perform tests.ok(
    (select value ->> 'invites' from public.platform_settings where key = 'features') = 'true',
    'invites are on for the minor-privacy checks');

  perform tests.ok(not private.referral_can_invite(v_minor),
    'a minor athlete without discovery consent cannot invite');

  perform tests.ok(
    (select avatar_url from public.user_profiles where id = v_minor) = 'https://cdn.test/lina.png',
    'the minor profile still has an avatar');
  select private.referral_person(v_minor) into v_person;
  perform tests.ok(
    v_person ->> 'first_name' = 'Lina' and v_person ->> 'avatar_url' is null,
    'referral_person drops a minor''s avatar without discovery consent');

  insert into public.guardian_consents (
    minor_user_id, guardian_name, guardian_email, status, granted_at, allow_discovery
  ) values (
    v_minor, 'Parent', 'privacy.lina.parent@test.local', 'granted', now(), true
  );
  perform tests.ok(private.referral_can_invite(v_minor),
    'a minor athlete with discovery consent can invite');

  perform tests.as_user(v_minor);
  select public.referral_my_circle() ->> 'code' into v_code;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  select public.referral_inviter(v_code) into v_anon;
  reset role;
  perform tests.ok(
    v_anon ? 'first_name' and v_anon -> 'first_name' = 'null'::jsonb
    and v_anon ? 'avatar_url' and v_anon -> 'avatar_url' = 'null'::jsonb
    and v_anon ? 'role' and v_anon -> 'role' = 'null'::jsonb
    and not (v_anon ? 'is_minor'),
    'a signed-out visitor learns nothing about a minor inviter');

  perform tests.as_user(v_adult);
  set local role authenticated;
  select public.referral_inviter(v_code) into v_signed;
  reset role;
  perform tests.ok(v_signed ->> 'first_name' = 'Lina',
    'a signed-in visitor sees a consented minor inviter''s first name');

  insert into public.referrals (referrer_id, referred_id, code)
  values (v_adult, v_hidden, 'PRIVHID1');
  perform tests.as_user(v_adult);
  set local role authenticated;
  select public.referral_my_circle() into v_circle;
  reset role;
  perform tests.ok(
    jsonb_array_length(v_circle -> 'members') = 0
    and (v_circle ->> 'pending')::int = 1,
    'a pending minor invitee without discovery consent is omitted from the circle and still counted');

  insert into public.referrals (referrer_id, referred_id, code)
  values (v_adult, v_gated, 'PRIVGAT1');
  update public.user_profiles set onboarding_completed = true where id = v_gated;
  insert into public.guardian_consents (
    minor_user_id, guardian_name, guardian_email, status, granted_at, allow_discovery
  ) values (
    v_gated, 'Parent', 'privacy.raya.parent@test.local', 'granted', now(), false
  );
  perform tests.ok(
    (select status = 'pending' from public.referrals where referred_id = v_gated),
    'a minor invitee with consent but discovery off stays pending');
  update public.guardian_consents
     set allow_discovery = true
   where minor_user_id = v_gated and status = 'granted';
  perform tests.ok(
    (select status = 'qualified' from public.referrals where referred_id = v_gated),
    'turning discovery consent on makes the minor invite count');
end $$;

update public.platform_settings
   set value = jsonb_set(value, '{invites}', 'false')
 where key = 'features';

reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);

-- ------------------------------------------------------------
do $$ begin raise notice E'\n✓ all functional tests passed'; end $$;
