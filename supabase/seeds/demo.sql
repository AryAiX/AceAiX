-- ============================================================
-- Demo data
--
-- Populates a project with a believable slice of AceAiX: athletes across
-- several sports and ages (including minors, with and without guardian
-- consent), verified and unverified coaches, two clubs, open trials,
-- applications, conversations and a feed.
--
-- Use it for local development, for screenshots, and for the review account
-- Apple and Google require. Every seeded account uses the same password:
--
--     AceAiX-Demo-2026
--
-- Review account:  layla.demo@aceaix.com  (athlete, 19, complete profile)
-- Recruiter view:  marco.demo@aceaix.com  (verified coach)
--
-- Safe to re-run: everything is keyed on fixed UUIDs and upserts.
-- ============================================================

-- Seeding writes verification flags and other service-managed columns, so the
-- session identifies itself as the service role for the duration of the file.
select set_config('request.jwt.claim.role', 'service_role', false);

-- ------------------------------------------------------------
-- Accounts
-- ------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('a0000000-0000-4000-8000-000000000001', 'layla.demo@aceaix.com',   crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Layla Haddad","first_name":"Layla","last_name":"Haddad","role":"athlete"}'),
  ('a0000000-0000-4000-8000-000000000002', 'omar.demo@aceaix.com',    crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Omar Farouk","first_name":"Omar","last_name":"Farouk","role":"athlete"}'),
  ('a0000000-0000-4000-8000-000000000003', 'yusuf.demo@aceaix.com',   crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Yusuf Rahimi","first_name":"Yusuf","last_name":"Rahimi","role":"athlete"}'),
  ('a0000000-0000-4000-8000-000000000004', 'sara.demo@aceaix.com',    crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Sara Nouri","first_name":"Sara","last_name":"Nouri","role":"athlete"}'),
  ('a0000000-0000-4000-8000-000000000005', 'daniel.demo@aceaix.com',  crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Daniel Okoro","first_name":"Daniel","last_name":"Okoro","role":"athlete"}'),
  ('a0000000-0000-4000-8000-000000000006', 'mina.demo@aceaix.com',    crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Mina Karimi","first_name":"Mina","last_name":"Karimi","role":"athlete"}'),
  ('b0000000-0000-4000-8000-000000000001', 'marco.demo@aceaix.com',   crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Marco Silva","first_name":"Marco","last_name":"Silva","role":"coach"}'),
  ('b0000000-0000-4000-8000-000000000002', 'hana.demo@aceaix.com',    crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Hana Tanaka","first_name":"Hana","last_name":"Tanaka","role":"coach"}'),
  ('c0000000-0000-4000-8000-000000000001', 'academy.demo@aceaix.com', crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Al Jadaf Academy","first_name":"Al Jadaf","last_name":"Academy","role":"club"}'),
  ('d0000000-0000-4000-8000-000000000001', 'parent.demo@aceaix.com',  crypt('AceAiX-Demo-2026', gen_salt('bf')), '{"full_name":"Reza Karimi","first_name":"Reza","last_name":"Karimi","role":"guardian"}')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Ages. The trigger derives is_minor / age_band / discoverability from these.
-- ------------------------------------------------------------
update public.user_private set date_of_birth = current_date - interval '19 years' where user_id = 'a0000000-0000-4000-8000-000000000001';
update public.user_private set date_of_birth = current_date - interval '17 years' where user_id = 'a0000000-0000-4000-8000-000000000002';
update public.user_private set date_of_birth = current_date - interval '15 years' where user_id = 'a0000000-0000-4000-8000-000000000003';
update public.user_private set date_of_birth = current_date - interval '22 years' where user_id = 'a0000000-0000-4000-8000-000000000004';
update public.user_private set date_of_birth = current_date - interval '24 years' where user_id = 'a0000000-0000-4000-8000-000000000005';
update public.user_private set date_of_birth = current_date - interval '14 years' where user_id = 'a0000000-0000-4000-8000-000000000006';
update public.user_private set date_of_birth = current_date - interval '41 years' where user_id = 'b0000000-0000-4000-8000-000000000001';
update public.user_private set date_of_birth = current_date - interval '36 years' where user_id = 'b0000000-0000-4000-8000-000000000002';
update public.user_private set date_of_birth = current_date - interval '30 years' where user_id = 'c0000000-0000-4000-8000-000000000001';
update public.user_private set date_of_birth = current_date - interval '45 years' where user_id = 'd0000000-0000-4000-8000-000000000001';

-- ------------------------------------------------------------
-- Public profiles
-- ------------------------------------------------------------
update public.user_profiles set
  bio = 'Left-footed forward. Fast between the lines, working on my weak foot.',
  city = 'Dubai', country = 'United Arab Emirates',
  onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000001';

update public.user_profiles set
  bio = 'Midfielder. I read the game before I run.',
  city = 'Sharjah', country = 'United Arab Emirates', onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000002';

update public.user_profiles set
  bio = 'Goalkeeper at school and club. Training six days a week.',
  city = 'Tehran', country = 'Iran', onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000003';

update public.user_profiles set
  bio = '400m and 800m. Two seconds off my target this season.',
  city = 'Abu Dhabi', country = 'United Arab Emirates', onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000004';

update public.user_profiles set
  bio = 'Point guard. Small, quick, annoying to mark.',
  city = 'Lagos', country = 'Nigeria', onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000005';

update public.user_profiles set
  bio = 'Swimmer — freestyle and butterfly.',
  city = 'Dubai', country = 'United Arab Emirates', onboarding_completed = true
where id = 'a0000000-0000-4000-8000-000000000006';

update public.user_profiles set
  bio = 'Youth coach, 14 years. I look for decision-making before athleticism.',
  city = 'Dubai', country = 'United Arab Emirates',
  is_verified = true, onboarding_completed = true
where id = 'b0000000-0000-4000-8000-000000000001';

update public.user_profiles set
  bio = 'Swim coach. National age-group programme.',
  city = 'Dubai', country = 'United Arab Emirates', onboarding_completed = true
where id = 'b0000000-0000-4000-8000-000000000002';

update public.user_profiles set
  bio = 'Academy recruitment for boys and girls U14–U21.',
  city = 'Dubai', country = 'United Arab Emirates',
  is_verified = true, onboarding_completed = true
where id = 'c0000000-0000-4000-8000-000000000001';

update public.user_profiles set
  city = 'Dubai', country = 'United Arab Emirates', onboarding_completed = true
where id = 'd0000000-0000-4000-8000-000000000001';

-- ------------------------------------------------------------
-- Organisations
-- ------------------------------------------------------------
insert into public.organizations (id, name, type, description, country, city, league, is_verified, verification_status, founded_year)
values
  ('e0000000-0000-4000-8000-000000000001', 'Al Jadaf Academy', 'academy',
   'A Dubai academy developing players from U12 to U21, with a pathway into the first-team squad.',
   'United Arab Emirates', 'Dubai', 'UAE Youth League', true, 'approved', 2011),
  ('e0000000-0000-4000-8000-000000000002', 'Marina Sports Club', 'club',
   'Multi-sport club on the Dubai Marina with football, basketball and swimming programmes.',
   'United Arab Emirates', 'Dubai', 'UAE Division 1', true, 'approved', 1998)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, member_role, status)
values ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'owner', 'active')
on conflict (organization_id, user_id) do update set status = 'active', member_role = 'owner';

-- ------------------------------------------------------------
-- Athlete profiles
-- ------------------------------------------------------------
update public.athlete_profiles set
  sport = 'Football', position_primary = 'Striker', position = 'Striker',
  level = 'academy', league = 'UAE Youth League', height_cm = 172, weight_kg = 61,
  nationality = 'Lebanese', dominant_foot = 'Left',
  birth_date = current_date - interval '19 years',
  current_club_id = 'e0000000-0000-4000-8000-000000000001',
  bio = 'Left-footed forward. Fast between the lines, working on my weak foot.',
  is_open_to_offers = true
where user_id = 'a0000000-0000-4000-8000-000000000001';

update public.athlete_profiles set
  sport = 'Football', position_primary = 'Central midfielder', position = 'Central midfielder',
  level = 'academy', height_cm = 176, weight_kg = 66, nationality = 'Emirati',
  dominant_foot = 'Right', birth_date = current_date - interval '17 years',
  current_club = 'Sharjah Youth FC', is_open_to_offers = true
where user_id = 'a0000000-0000-4000-8000-000000000002';

update public.athlete_profiles set
  sport = 'Football', position_primary = 'Goalkeeper', position = 'Goalkeeper',
  level = 'grassroots', height_cm = 180, weight_kg = 68, nationality = 'Iranian',
  dominant_foot = 'Right', birth_date = current_date - interval '15 years',
  current_club = 'Tehran Youth Academy'
where user_id = 'a0000000-0000-4000-8000-000000000003';

update public.athlete_profiles set
  sport = 'Athletics', position_primary = 'Middle distance', position = 'Middle distance',
  level = 'semi_pro', height_cm = 168, weight_kg = 54, nationality = 'Iranian',
  birth_date = current_date - interval '22 years',
  current_club_id = 'e0000000-0000-4000-8000-000000000002', is_open_to_offers = true
where user_id = 'a0000000-0000-4000-8000-000000000004';

update public.athlete_profiles set
  sport = 'Basketball', position_primary = 'Point guard', position = 'Point guard',
  level = 'semi_pro', height_cm = 183, weight_kg = 78, nationality = 'Nigerian',
  birth_date = current_date - interval '24 years',
  current_club = 'Lagos City Ballers', is_open_to_offers = true
where user_id = 'a0000000-0000-4000-8000-000000000005';

update public.athlete_profiles set
  sport = 'Swimming', position_primary = 'Freestyle', position = 'Freestyle',
  level = 'academy', height_cm = 165, weight_kg = 52, nationality = 'Iranian',
  birth_date = current_date - interval '14 years',
  current_club_id = 'e0000000-0000-4000-8000-000000000002'
where user_id = 'a0000000-0000-4000-8000-000000000006';

update public.coach_profiles set
  specialty = 'Youth development', current_club = 'Al Jadaf Academy',
  current_club_id = 'e0000000-0000-4000-8000-000000000001',
  country = 'United Arab Emirates', years_experience = 14,
  philosophy = 'Decisions before dribbles. I coach players to see the picture early.',
  licenses = '["UEFA B", "AFC Youth C"]'::jsonb
where user_id = 'b0000000-0000-4000-8000-000000000001';

update public.coach_profiles set
  specialty = 'Swimming — age group', current_club = 'Marina Sports Club',
  country = 'United Arab Emirates', years_experience = 9
where user_id = 'b0000000-0000-4000-8000-000000000002';

-- ------------------------------------------------------------
-- Guardian consent
--  Omar (17) and Yusuf (15) are approved and therefore discoverable.
--  Mina (14) has a request outstanding, so she stays hidden — the state a
--  reviewer should be able to see.
-- ------------------------------------------------------------
insert into public.guardian_consents
  (id, minor_user_id, guardian_name, guardian_email, relationship, status,
   allow_discovery, allow_messaging, allow_media, granted_at, token)
values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'Nadia Farouk', 'parent.omar@example.com', 'parent', 'granted', true, true, true, now(),
   'demo-token-omar-0000000000000000000000'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   'Ali Rahimi', 'parent.yusuf@example.com', 'parent', 'granted', true, true, true, now(),
   'demo-token-yusuf-000000000000000000000'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006',
   'Reza Karimi', 'parent.demo@aceaix.com', 'parent', 'pending', true, true, true, null,
   'demo-token-mina-0000000000000000000000')
on conflict (id) do nothing;

update public.guardian_consents set guardian_user_id = 'd0000000-0000-4000-8000-000000000001'
where minor_user_id = 'a0000000-0000-4000-8000-000000000006';

-- ------------------------------------------------------------
-- Evidence: matches, media, endorsements — this is what moves the score
-- ------------------------------------------------------------
insert into public.match_records (athlete_id, match_date, competition, opponent, result, minutes_played, goals, assists, source)
select ap.id, current_date - (n * 11 || ' days')::interval, 'UAE Youth League',
       (array['Marina SC','Sharjah Youth','Dubai United','Ajman Stars','Fujairah FC'])[1 + (n % 5)],
       (array['W 2-1','D 1-1','W 3-0','L 0-2','W 1-0'])[1 + (n % 5)],
       90, (n % 3), ((n + 1) % 2),
       case when n <= 3 then 'verified'::record_source else 'self'::record_source end
from public.athlete_profiles ap, generate_series(1, 11) n
where ap.user_id = 'a0000000-0000-4000-8000-000000000001'
on conflict do nothing;

insert into public.match_records (athlete_id, match_date, competition, opponent, result, minutes_played, goals, assists, source)
select ap.id, current_date - (n * 16 || ' days')::interval, 'Sharjah Youth Cup',
       'Opponent ' || n, 'W 2-0', 75, 0, (n % 2), 'self'::record_source
from public.athlete_profiles ap, generate_series(1, 6) n
where ap.user_id = 'a0000000-0000-4000-8000-000000000002'
on conflict do nothing;

insert into public.athlete_media (athlete_id, title, description, media_type, storage_url, is_featured, is_public, views_count)
select ap.id, t.title, t.descr, 'highlight_reel'::media_type_enum, t.url, t.featured, true, t.views
from public.athlete_profiles ap,
  (values
    ('Season highlights', 'Nine goals from the first half of the season.', 'https://demo.aceaix.com/media/layla-1.mp4', true, 420),
    ('Finishing session', 'Left-foot finishing, close range.', 'https://demo.aceaix.com/media/layla-2.mp4', false, 180),
    ('Pressing triggers', 'Front-foot defending from the front.', 'https://demo.aceaix.com/media/layla-3.mp4', false, 96)
  ) as t(title, descr, url, featured, views)
where ap.user_id = 'a0000000-0000-4000-8000-000000000001'
on conflict do nothing;

insert into public.endorsements (athlete_id, endorser_id, endorser_role, skill_or_trait, note)
select ap.id, 'b0000000-0000-4000-8000-000000000001', 'coach',
       'Movement in the box', 'Times her runs better than most players two years older.'
from public.athlete_profiles ap
where ap.user_id = 'a0000000-0000-4000-8000-000000000001'
on conflict do nothing;

-- ------------------------------------------------------------
-- Social graph
-- ------------------------------------------------------------
insert into public.follows (follower_id, following_id) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- ------------------------------------------------------------
-- Feed
-- ------------------------------------------------------------
insert into public.posts (id, author_id, type, caption, text, audience, created_at)
values
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'standard',
   'Two goals away. Third clean win in a row and the movement is finally clicking.',
   'Two goals away. Third clean win in a row and the movement is finally clicking.',
   'public', now() - interval '3 hours'),
  ('90000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'standard',
   'Open trial at Al Jadaf on the 20th for 2008–2010 born. Bring boots and a water bottle, nothing else.',
   'Open trial at Al Jadaf on the 20th for 2008–2010 born. Bring boots and a water bottle, nothing else.',
   'public', now() - interval '9 hours'),
  ('90000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'standard',
   '2:09 over 800m this morning. Still two seconds off, but the last 200 felt strong.',
   '2:09 over 800m this morning. Still two seconds off, but the last 200 felt strong.',
   'public', now() - interval '1 day'),
  ('90000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 'standard',
   'Back in the gym after six weeks out. Slow is fine, backwards is not.',
   'Back in the gym after six weeks out. Slow is fine, backwards is not.',
   'public', now() - interval '2 days'),
  ('90000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'standard',
   'First full 90 of the season. Legs are gone, worth it.',
   'First full 90 of the season. Legs are gone, worth it.',
   'public', now() - interval '3 days')
on conflict (id) do nothing;

insert into public.post_likes (post_id, user_id) values
  ('90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'),
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'),
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005'),
  ('90000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'),
  ('90000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002')
on conflict do nothing;

insert into public.post_comments (post_id, author_id, body) values
  ('90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'The second run across the near post is the one. Keep doing that.'),
  ('90000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'That last 200 was quick. You will get the two seconds.')
on conflict do nothing;

-- ------------------------------------------------------------
-- Opportunities
-- ------------------------------------------------------------
insert into public.opportunities
  (id, organization_id, created_by_id, title, description, type, location, sport, position,
   application_deadline, is_active, created_at)
values
  ('80000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   'U19 open trial — forwards and wingers',
   E'Two sessions over one weekend at our Al Jadaf pitches.\n\nWe are looking at forwards and wide players born 2007–2009. Bring boots, shin pads and water. Parents and guardians are welcome to stay and watch — for anyone under 18 we ask that a parent or guardian attends or signs our consent form before the session.\n\nNo fee. We do not charge to trial.',
   'trial', 'Al Jadaf, Dubai', 'Football', 'Striker',
   current_date + interval '18 days', true, now() - interval '2 days'),
  ('80000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
   'c0000000-0000-4000-8000-000000000001',
   'Swimming scholarship — age group squad',
   E'Places in our age-group squad for the 2026/27 season, including pool time, strength work and competition entries.\n\nOpen to swimmers born 2010–2013. A parent or guardian must complete the registration with the swimmer.',
   'scholarship', 'Dubai Marina', 'Swimming', 'Freestyle',
   current_date + interval '30 days', true, now() - interval '5 days'),
  ('80000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   'Goalkeeper trial — U16',
   'One session, 90 minutes, for goalkeepers born 2010–2011. Distribution and one-v-one work.',
   'trial', 'Al Jadaf, Dubai', 'Football', 'Goalkeeper',
   current_date + interval '9 days', true, now() - interval '1 day')
on conflict (id) do nothing;

insert into public.applications (opportunity_id, athlete_id, status, message)
values
  ('80000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'shortlisted',
   'I play left-footed off the right and I have eleven league games this season. Happy to travel.'),
  ('80000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'applied',
   'I usually play centre midfield but I have played off the front this season and enjoyed it.')
on conflict (opportunity_id, athlete_id) do nothing;

-- ------------------------------------------------------------
-- A conversation, so the inbox is not empty on first open
-- ------------------------------------------------------------
insert into public.conversations (id, participant_1_id, participant_2_id, created_at)
values ('70000000-0000-4000-8000-000000000001',
        least('a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid),
        greatest('a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid),
        now() - interval '2 days')
on conflict (id) do nothing;

insert into public.messages (conversation_id, sender_id, content, created_at)
values
  ('70000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Watched your season clips. The near-post movement is the reason I am writing.',
   now() - interval '2 days'),
  ('70000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Thank you — that run is the one I have been drilling all pre-season.',
   now() - interval '47 hours'),
  ('70000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'We have an open trial on the 20th. Apply through the app and I will make sure your name is on the list.',
   now() - interval '46 hours')
on conflict do nothing;

-- ------------------------------------------------------------
-- What a recruiter is looking for
-- ------------------------------------------------------------
insert into public.match_preferences
  (user_id, organization_id, sports, positions, levels, countries, age_min, age_max, min_score)
values
  ('b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   array['Football'], array['Striker','Winger','Central midfielder'],
   array['academy','semi_pro'], array['United Arab Emirates'], 15, 21, 0),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   array['Football'], array['Goalkeeper','Striker'], array['grassroots','academy'],
   array['United Arab Emirates','Iran'], 14, 19, 0)
on conflict (user_id) do update set
  sports = excluded.sports, positions = excluded.positions, levels = excluded.levels,
  countries = excluded.countries, age_min = excluded.age_min, age_max = excluded.age_max;

-- ------------------------------------------------------------
-- Recompute every score now that the evidence is in place
-- ------------------------------------------------------------

-- ============================================================
-- Fandom, challenges and the people who have been looking
-- ============================================================

-- Two teams get fixed ids so demo deep links and the recorded preview have a
-- team page to point at. Reference data normally lets the database choose.
update public.teams set id = 'd1000000-0000-4000-8000-000000000001'
  where name = 'Real Madrid' and sport = 'Football';
update public.teams set id = 'd1000000-0000-4000-8000-000000000002'
  where name = 'Al Ain FC' and sport = 'Football';

-- Who they support. Layla's Real Madrid shirt is not her club; Al Jadaf is.
insert into public.favorite_teams (user_id, team_id, rank)
select u.user_id, t.id, u.rank
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Real Madrid',   1),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Al Ain FC',     2),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Al Hilal SFC',  1),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Liverpool FC',  2),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Persepolis FC', 1),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'Iran',          1),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'Los Angeles Lakers', 1),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'Nigeria',       2),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'Esteghlal FC',  1),
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'FC Porto',      1)
) as u(user_id, team_name, rank)
join public.teams t on t.name = u.team_name and t.is_curated
on conflict do nothing;

update public.user_profiles set favorite_venue = 'Santiago Bernabéu'
  where id = 'a0000000-0000-4000-8000-000000000001';
update public.user_profiles set favorite_venue = 'Kingdom Arena'
  where id = 'a0000000-0000-4000-8000-000000000002';
update public.user_profiles set favorite_venue = 'Azadi Stadium'
  where id in ('a0000000-0000-4000-8000-000000000003',
               'a0000000-0000-4000-8000-000000000004',
               'a0000000-0000-4000-8000-000000000006');
update public.user_profiles set favorite_venue = 'Crypto.com Arena'
  where id = 'a0000000-0000-4000-8000-000000000005';


-- A clip each for the athletes who enter a challenge below. Without footage
-- there is nothing to enter with, and nothing for the media pillar to see.
insert into public.athlete_media
  (athlete_id, title, description, media_type, storage_url, thumbnail_url,
   duration_seconds, transcode_status, is_public, views_count)
select ap.id, v.title, v.description, 'highlight_reel',
       'posts/demo/' || v.slug || '.mp4', 'posts/demo/' || v.slug || '.jpg',
       v.seconds, 'ready', true, v.views
from (values
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Keep-ups on the roof pitch',
   'One take, Thursday evening.', 'omar-keepups', 34, 41),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Ball control drill',
   'Thirty seconds, feet only.', 'yusuf-control', 31, 18),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'Pull-up jumper, both sides',
   'Practice, no defender.', 'daniel-jumper', 46, 12)
) as v(user_id, title, description, slug, seconds, views)
join public.athlete_profiles ap on ap.user_id = v.user_id
where not exists (select 1 from public.athlete_media m where m.athlete_id = ap.id);

-- Two challenges: one measured, one judged.
insert into public.challenges (
  id, created_by, organization_id, sport, title, brief, rules,
  metric_label, metric_unit, metric_better, age_min, age_max, closes_at
) values
  ('c1000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'Football',
   'Thirty seconds of keep-ups',
   'One take, feet and thighs only, phone on the ground so we can see your whole body. Count out loud.',
   'No cuts. If the ball touches the floor the attempt is over — send the best of three, not a montage.',
   'Touches', 'touches', 'higher', 13, 19,
   now() + interval '5 days'),
  ('c1000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'Football',
   'First touch under pressure',
   'Have someone throw or pass you five balls at pace. Kill each one and move it into space in two touches.',
   'Judged, not measured: we are watching the second touch, not the first.',
   null, null, 'higher', 13, 21,
   now() + interval '12 days')
on conflict (id) do nothing;

-- Entries, using clips the athletes already have.
insert into public.challenge_entries
  (challenge_id, athlete_id, media_id, claimed_value, note, status, verified_value, verified_by, verified_at)
select
  'c1000000-0000-4000-8000-000000000001',
  ap.id,
  (select m.id from public.athlete_media m
    where m.athlete_id = ap.id and m.is_public
      and m.media_type in ('video','highlight_reel')
    order by m.created_at limit 1),
  v.claimed, v.note, v.status, v.verified,
  case when v.status = 'verified' then 'b0000000-0000-4000-8000-000000000001'::uuid end,
  case when v.status = 'verified' then now() - interval '1 day' end
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 214, 'Best of three. Left foot is still the weak one.', 'verified', 214),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 168, 'Windy on the roof pitch.',                        'verified', 161),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 141, null,                                              'submitted', null)
) as v(user_id, claimed, note, status, verified)
join public.athlete_profiles ap on ap.user_id = v.user_id
where exists (
  select 1 from public.athlete_media m
  where m.athlete_id = ap.id and m.is_public and m.media_type in ('video','highlight_reel')
)
on conflict do nothing;

-- Somebody has been reading Layla's profile. This is what the digest is for.
insert into public.profile_views
  (athlete_id, viewer_user_id, viewer_name, viewer_role, viewer_org, viewer_verified, created_at)
select ap.id, v.viewer, v.name, v.role, v.org, v.verified, now() - v.ago
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'Marco Silva',    'coach', 'Al Jadaf Academy',   true,  interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'Marco Silva',    'coach', 'Al Jadaf Academy',   true,  interval '3 days'),
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Al Jadaf Academy','club', 'Al Jadaf Academy',   true,  interval '1 day'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'Nadia Rahman',   'scout', 'Tehran Youth Academy', true, interval '4 days'),
  (null,                                          'Someone',       'athlete', null,               false, interval '5 days'),
  (null,                                          'Someone',       'athlete', null,               false, interval '6 days')
) as v(viewer, name, role, org, verified, ago)
join public.athlete_profiles ap on ap.user_id = 'a0000000-0000-4000-8000-000000000001';

do $$
declare r record;
begin
  for r in select id from public.athlete_profiles loop
    perform private.refresh_talent_score(r.id);
  end loop;
end;
$$;

-- Seeded history is not news. Achievements awarded by the triggers above are
-- marked as already celebrated so a demo account does not open onto a stack of
-- congratulation cards.
update public.user_achievements set seen = true where not seen;

select
  up.full_name,
  ap.sport,
  ts.overall as talent_score,
  ts.tier,
  up.is_minor,
  up.is_discoverable
from public.talent_scores ts
join public.athlete_profiles ap on ap.id = ts.athlete_id
join public.user_profiles up on up.id = ap.user_id
order by ts.overall desc;
