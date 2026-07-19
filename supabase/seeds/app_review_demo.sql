-- Idempotent production seed for the App Store review athlete account.
-- This script adds representative, non-sensitive demo content without changing
-- authentication credentials. Run with psql against the AceAiX database.

do $$
declare
  v_review_user uuid;
  v_athlete_profile uuid;
  v_scout_user uuid;
  v_medical_partner uuid;
  v_opportunity uuid;
begin
  select id into v_review_user
  from auth.users
  where lower(email) = lower('athlete1@aryaix.com');

  if v_review_user is null then
    raise exception 'App Review user athlete1@aryaix.com does not exist';
  end if;

  select id into v_athlete_profile
  from public.athlete_profiles
  where user_id = v_review_user;

  select id into v_scout_user
  from auth.users
  where lower(email) = lower('scout@aceaix.demo');

  select mp.id into v_medical_partner
  from public.medical_partners mp
  join auth.users u on u.id = mp.user_id
  where lower(u.email) = lower('medical@aceaix.demo');

  select id into v_opportunity
  from public.opportunities
  where is_active = true
  order by created_at desc
  limit 1;

  update public.user_profiles
  set full_name = 'Rudy Fuller',
      bio = 'Competitive midfielder focused on intelligent movement, chance creation, and continuous development.',
      city = 'Dubai',
      country = 'United Arab Emirates',
      is_verified = true
  where id = v_review_user;

  update public.user_private
  set email = 'athlete1@aryaix.com',
      phone = '+971501234567',
      date_of_birth = date '2001-05-14'
  where user_id = v_review_user;

  update public.athlete_profiles
  set sport = 'Football',
      positions = '["Central Midfielder", "Right Winger"]'::jsonb,
      position = 'Central Midfielder',
      position_primary = 'Central Midfielder',
      position_secondary = 'Right Winger',
      height_cm = 180,
      weight_kg = 74,
      birth_date = date '2001-05-14',
      nationality = 'United Arab Emirates',
      dominant_foot = 'Right',
      current_club = 'Dubai Athletic Club',
      level = 'Semi-professional',
      bio = 'Competitive midfielder focused on intelligent movement, chance creation, and continuous development.',
      is_open_to_offers = true,
      visibility_score = 86,
      profile_completeness = 96,
      performance_score = 82,
      fitness_score = 88,
      followers_count = 128,
      connections_count = 43,
      highlighted_stats = '{"appearances": 18, "goals": 7, "assists": 11, "pass_accuracy": 87}'::jsonb,
      attributes = '{"pace": 82, "passing": 88, "vision": 90, "dribbling": 84, "defending": 71}'::jsonb,
      languages = '[{"language": "English", "proficiency": "Fluent"}, {"language": "Arabic", "proficiency": "Conversational"}]'::jsonb
  where id = v_athlete_profile;

  -- Replace the reviewer's placeholder posts with meaningful content.
  update public.posts
  set caption = case
        when id = (select id from public.posts where author_id = v_review_user order by created_at asc limit 1)
          then 'Great team session today. We focused on transitions, scanning before receiving, and creating space between the lines.'
        else 'Match preparation complete. Ready to put this week''s work into action.'
      end,
      text = case
        when id = (select id from public.posts where author_id = v_review_user order by created_at asc limit 1)
          then 'Great team session today. We focused on transitions, scanning before receiving, and creating space between the lines.'
        else 'Match preparation complete. Ready to put this week''s work into action.'
      end,
      tags = '["training", "football", "development"]'::jsonb,
      audience = 'public',
      like_count = greatest(like_count, 18),
      reactions_count = greatest(reactions_count, 18),
      comments_count = greatest(comments_count, 3),
      view_count = greatest(view_count, 146)
  where author_id = v_review_user
    and coalesce(caption, text) = 'Test';

  insert into public.posts (
    id, author_id, athlete_id, type, text, caption, image_url, media, tags,
    audience, is_featured, reactions_count, comments_count, like_count,
    view_count, created_at
  )
  values
    (
      'f0000000-0000-4000-8000-000000000001', v_review_user, v_athlete_profile,
      'post',
      'Proud of our result tonight. One goal, two assists, and an even better team performance.',
      'Proud of our result tonight. One goal, two assists, and an even better team performance.',
      'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1200',
      '[]'::jsonb, '["matchday", "performance"]'::jsonb, 'public', true,
      42, 6, 42, 318, now() - interval '2 days'
    ),
    (
      'f0000000-0000-4000-8000-000000000002', v_review_user, v_athlete_profile,
      'post',
      'Recovery, review, repeat. Studying yesterday''s match and preparing the next development targets.',
      'Recovery, review, repeat. Studying yesterday''s match and preparing the next development targets.',
      'https://images.pexels.com/photos/607780/pexels-photo-607780.jpeg?auto=compress&cs=tinysrgb&w=1200',
      '[]'::jsonb, '["recovery", "analysis"]'::jsonb, 'public', false,
      27, 4, 27, 204, now() - interval '5 days'
    )
  on conflict (id) do update
  set text = excluded.text,
      caption = excluded.caption,
      image_url = excluded.image_url,
      tags = excluded.tags,
      audience = excluded.audience,
      is_featured = excluded.is_featured,
      reactions_count = excluded.reactions_count,
      comments_count = excluded.comments_count,
      like_count = excluded.like_count,
      view_count = excluded.view_count,
      created_at = excluded.created_at;

  if v_scout_user is not null then
    insert into public.conversations (
      id, participant_1_id, participant_2_id, subject,
      last_message_at, last_message_preview, created_at
    )
    values (
      'c0000000-0000-4000-8000-000000000001',
      v_review_user, v_scout_user, 'Sergio Mendes · Scout',
      now() - interval '3 hours',
      'Thanks, Rudy. I will share the trial schedule tomorrow.',
      now() - interval '3 days'
    )
    on conflict (id) do update
    set participant_1_id = excluded.participant_1_id,
        participant_2_id = excluded.participant_2_id,
        subject = excluded.subject,
        last_message_at = excluded.last_message_at,
        last_message_preview = excluded.last_message_preview;

    insert into public.messages (
      id, conversation_id, sender_id, content, is_read, read_at, created_at
    )
    values
      (
        'd0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000001',
        v_scout_user,
        'Hi Rudy, your recent match footage and passing data stood out to our recruitment team.',
        true, now() - interval '3 days', now() - interval '3 days'
      ),
      (
        'd0000000-0000-4000-8000-000000000002',
        'c0000000-0000-4000-8000-000000000001',
        v_review_user,
        'Thank you. I am available for a trial and happy to provide any additional information.',
        true, now() - interval '2 days', now() - interval '2 days'
      ),
      (
        'd0000000-0000-4000-8000-000000000003',
        'c0000000-0000-4000-8000-000000000001',
        v_scout_user,
        'Thanks, Rudy. I will share the trial schedule tomorrow.',
        false, null, now() - interval '3 hours'
      )
    on conflict (id) do update
    set content = excluded.content,
        is_read = excluded.is_read,
        read_at = excluded.read_at,
        created_at = excluded.created_at;

    insert into public.follows (follower_id, following_id)
    values (v_review_user, v_scout_user)
    on conflict (follower_id, following_id) do nothing;
  end if;

  insert into public.notifications (
    id, user_id, type, title, body, is_read, read, action_url, data, created_at
  )
  values
    (
      'e0000000-0000-4000-8000-000000000001', v_review_user, 'opportunity',
      'New opportunity match', 'A new midfield trial matches your profile.',
      false, false, '/opportunities', '{"match_score": 92}'::jsonb, now() - interval '4 hours'
    ),
    (
      'e0000000-0000-4000-8000-000000000002', v_review_user, 'message',
      'New message from Sergio', 'Your trial schedule will be shared tomorrow.',
      false, false, '/messages', '{}'::jsonb, now() - interval '3 hours'
    ),
    (
      'e0000000-0000-4000-8000-000000000003', v_review_user, 'profile',
      'Profile visibility improved', 'Your completed profile is ready for scouts to review.',
      true, true, '/profile', '{"visibility_score": 86}'::jsonb, now() - interval '1 day'
    )
  on conflict (id) do update
  set title = excluded.title,
      body = excluded.body,
      is_read = excluded.is_read,
      read = excluded.read,
      action_url = excluded.action_url,
      data = excluded.data,
      created_at = excluded.created_at;

  insert into public.performance_records (
    id, athlete_id, sport, season_or_period, stats, source, last_synced_at
  )
  values (
    'a0000000-0000-4000-8000-000000000001',
    v_review_user,
    'Football',
    '2025/26',
    '{"appearances": 18, "minutes": 1420, "goals": 7, "assists": 11, "pass_accuracy": 87, "chances_created": 34, "average_rating": 8.1}'::jsonb,
    'self_reported',
    now() - interval '1 day'
  )
  on conflict (athlete_id, sport, season_or_period) do update
  set stats = excluded.stats,
      source = excluded.source,
      last_synced_at = excluded.last_synced_at;

  insert into public.athlete_events (
    id, user_id, title, type, event_date, event_time, location,
    description, color, is_public
  )
  values
    (
      'a0000000-0000-4000-8000-000000000002', v_review_user,
      'League Match vs. Marina FC', 'match', current_date + 3, '19:30',
      'Dubai Sports City', 'Upcoming league fixture.', '#2E8BFF', true
    ),
    (
      'a0000000-0000-4000-8000-000000000003', v_review_user,
      'Technical Training', 'training', current_date + 1, '17:00',
      'Dubai Athletic Club', 'Passing and transition session.', '#C6F23A', false
    )
  on conflict (id) do update
  set event_date = excluded.event_date,
      event_time = excluded.event_time,
      location = excluded.location,
      description = excluded.description;

  if v_opportunity is not null then
    insert into public.opportunity_matches (
      opportunity_id, athlete_id, match_score, reasons
    )
    values (
      v_opportunity, v_review_user, 92,
      '["Position fit", "Location match", "Strong recent performance"]'::jsonb
    )
    on conflict (opportunity_id, athlete_id) do update
    set match_score = excluded.match_score,
        reasons = excluded.reasons;

    insert into public.opportunity_saves (opportunity_id, athlete_id)
    values (v_opportunity, v_review_user)
    on conflict (opportunity_id, athlete_id) do nothing;

    insert into public.applications (
      id, opportunity_id, athlete_id, status, message, created_at, updated_at
    )
    values (
      'a1000000-0000-4000-8000-000000000001',
      v_opportunity, v_review_user, 'shortlisted',
      'I am interested in this opportunity and available for the proposed trial dates.',
      now() - interval '2 days', now() - interval '1 day'
    )
    on conflict (opportunity_id, athlete_id) do update
    set status = excluded.status,
        message = excluded.message,
        updated_at = excluded.updated_at;
  end if;

  if v_medical_partner is not null and v_athlete_profile is not null then
    insert into public.medical_clearances (
      id, athlete_id, partner_id, status, issued_by,
      effective_from, effective_to, notes, created_at
    )
    values (
      'b0000000-0000-4000-8000-000000000001',
      v_athlete_profile, v_medical_partner, 'cleared',
      'Dr. Yousuf Rahimi', current_date - 30, current_date + 335,
      'Cleared for training and competition.', now() - interval '30 days'
    )
    on conflict (id) do update
    set status = excluded.status,
        effective_from = excluded.effective_from,
        effective_to = excluded.effective_to,
        notes = excluded.notes;

    insert into public.medical_records (
      id, athlete_id, partner_id, record_type, title, summary,
      issued_at, is_verified, is_deleted
    )
    values
      (
        'b0000000-0000-4000-8000-000000000002',
        v_athlete_profile, v_medical_partner, 'assessment',
        'Pre-season fitness assessment',
        'Completed successfully with no restrictions.',
        current_date - 30, true, false
      ),
      (
        'b0000000-0000-4000-8000-000000000003',
        v_athlete_profile, v_medical_partner, 'screening',
        'Movement screening',
        'Normal range of movement. Continue current strength program.',
        current_date - 14, true, false
      )
    on conflict (id) do update
    set title = excluded.title,
        summary = excluded.summary,
        issued_at = excluded.issued_at,
        is_verified = excluded.is_verified,
        is_deleted = excluded.is_deleted;
  end if;
end
$$;
