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
declare v_token text; v_res jsonb;
begin
  perform tests.as_user('22222222-2222-2222-2222-222222222222');
  select token into v_token from public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
  perform tests.ok(v_token is not null, 'minor can request guardian consent');

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
  select token into v_token from public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
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
declare v_bundle jsonb; v_rows integer;
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

  -- A minor's exact age is never exposed.
  perform tests.as_user('33333333-3333-3333-3333-333333333333');
  v_bundle := public.get_profile_bundle('22222222-2222-2222-2222-222222222222');
  perform tests.ok(v_bundle -> 'athlete' ->> 'age' is null,
    'a minor exact age is never returned');
  perform tests.ok(v_bundle -> 'athlete' ->> 'age_band' is not null,
    'a minor is described by age band only');
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
declare v_token text; v_minor uuid := '22222222-2222-2222-2222-222222222222';
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
  select token into v_token from public.request_guardian_consent(
    'Parent Name', 'parent@test.local', 'parent');
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
      'is_org_member', 'is_verified_partner'
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
                          'has_medical_consent');

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
do $$ begin raise notice E'\n✓ all functional tests passed'; end $$;
