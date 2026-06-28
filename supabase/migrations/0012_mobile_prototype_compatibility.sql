-- ============================================================
-- 0012 — Mobile prototype compatibility
-- Adds the additive structures required by the new Expo mobile UI
-- while preserving the existing AceAiX user_profiles/athlete_profiles model.
-- ============================================================

-- ---- posts: extend existing feed table for reels/comments/saves UI ----
alter table public.posts
  add column if not exists caption text,
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists audience text not null default 'public',
  add column if not exists is_featured boolean not null default false,
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists save_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.posts
set caption = coalesce(caption, text),
    media = case
      when jsonb_array_length(media) > 0 then media
      when image_url is not null then jsonb_build_array(jsonb_build_object('url', image_url, 'type', 'photo'))
      else media
    end
where caption is null or (image_url is not null and jsonb_array_length(media) = 0);

create index if not exists idx_posts_type_created on public.posts(type, created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;

create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_saves enable row level security;

create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references public.user_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);
alter table public.post_views enable row level security;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.user_profiles(id) on delete cascade,
  body text not null,
  parent_id uuid references public.post_comments(id) on delete cascade,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;

-- ---- mobile stories ----
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.user_profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'photo',
  caption text,
  overlays jsonb not null default '[]'::jsonb,
  audience text not null default 'connections',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
alter table public.stories enable row level security;

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.user_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);
alter table public.story_views enable row level security;

-- ---- mobile opportunity state ----
create table if not exists public.opportunity_matches (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  match_score integer not null default 70,
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, athlete_id)
);
alter table public.opportunity_matches enable row level security;

create table if not exists public.opportunity_saves (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, athlete_id)
);
alter table public.opportunity_saves enable row level security;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  status text not null default 'applied',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, athlete_id)
);
alter table public.applications enable row level security;

-- ---- performance and sport integrations ----
create table if not exists public.performance_records (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  sport text not null,
  season_or_period text,
  stats jsonb not null default '{}'::jsonb,
  source text not null default 'self_reported',
  last_synced_at timestamptz not null default now(),
  unique (athlete_id, sport, season_or_period)
);
alter table public.performance_records enable row level security;

create table if not exists public.football_stats (
  athlete_id uuid primary key references public.user_profiles(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  source text not null default 'self_reported',
  last_synced_at timestamptz not null default now()
);
alter table public.football_stats enable row level security;

create table if not exists public.chess_stats (
  athlete_id uuid primary key references public.user_profiles(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  source text not null default 'self_reported',
  last_synced_at timestamptz not null default now()
);
alter table public.chess_stats enable row level security;

-- ---- events, notifications, Sportify placeholders ----
create table if not exists public.athlete_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  type text not null,
  event_date date not null,
  event_time text not null,
  location text not null,
  description text,
  color text not null default '#2E8BFF',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.athlete_events enable row level security;

alter table public.notifications
  add column if not exists read boolean not null default false,
  add column if not exists data jsonb not null default '{}'::jsonb;
update public.notifications set read = is_read where read is distinct from is_read;

alter table public.athlete_profiles
  add column if not exists chesscom_username text,
  add column if not exists lichess_username text,
  add column if not exists external_provider text,
  add column if not exists external_player_id text,
  add column if not exists football_api_player_id text,
  add column if not exists sportify_linked boolean not null default false,
  add column if not exists sportify_athlete_id text,
  add column if not exists sportify_is_minor boolean not null default false;

create table if not exists public.push_tokens (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  token text not null,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;

create table if not exists public.sportify_consents (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  consenting_party text,
  scope text,
  granted_at timestamptz,
  revoked_at timestamptz,
  guardian_name text,
  guardian_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sportify_consents enable row level security;
create unique index if not exists idx_sportify_consents_athlete_unique on public.sportify_consents(athlete_id);

create table if not exists public.sportify_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  metric_key text,
  metric_value numeric,
  test_type text,
  method text,
  metrics jsonb not null default '{}'::jsonb,
  recommended_sports jsonb not null default '[]'::jsonb,
  tested_at timestamptz not null default now(),
  academy_location text,
  verification_ref text,
  source text,
  last_synced_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.sportify_results enable row level security;
create unique index if not exists idx_sportify_results_unique_test on public.sportify_results(athlete_id, tested_at, test_type);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null default 'Sportify appointment',
  academy_location text,
  test_type text,
  preferred_times jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.appointments enable row level security;

-- ---- RLS policies for additive mobile tables ----
drop policy if exists post_likes_select on public.post_likes;
create policy post_likes_select on public.post_likes for select to authenticated using (true);
drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists post_likes_delete on public.post_likes;
create policy post_likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists post_saves_select on public.post_saves;
create policy post_saves_select on public.post_saves for select to authenticated using (user_id = auth.uid());
drop policy if exists post_saves_insert on public.post_saves;
create policy post_saves_insert on public.post_saves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists post_saves_delete on public.post_saves;
create policy post_saves_delete on public.post_saves for delete to authenticated using (user_id = auth.uid());

drop policy if exists post_views_select on public.post_views;
create policy post_views_select on public.post_views for select to authenticated using (viewer_id = auth.uid());
drop policy if exists post_views_insert on public.post_views;
create policy post_views_insert on public.post_views for insert to authenticated with check (viewer_id = auth.uid());

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select to authenticated using (true);
drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists post_comments_update on public.post_comments;
create policy post_comments_update on public.post_comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists post_comments_delete on public.post_comments;
create policy post_comments_delete on public.post_comments for delete to authenticated using (author_id = auth.uid());

drop policy if exists comment_likes_select on public.comment_likes;
create policy comment_likes_select on public.comment_likes for select to authenticated using (true);
drop policy if exists comment_likes_insert on public.comment_likes;
create policy comment_likes_insert on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists comment_likes_delete on public.comment_likes;
create policy comment_likes_delete on public.comment_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories for select to authenticated using (author_id = auth.uid() or expires_at > now());
drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories for insert to authenticated with check (author_id = auth.uid());
drop policy if exists stories_update on public.stories;
create policy stories_update on public.stories for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories for delete to authenticated using (author_id = auth.uid());

drop policy if exists story_views_select on public.story_views;
create policy story_views_select on public.story_views for select to authenticated using (viewer_id = auth.uid());
drop policy if exists story_views_insert on public.story_views;
create policy story_views_insert on public.story_views for insert to authenticated with check (viewer_id = auth.uid());

drop policy if exists opp_matches_select on public.opportunity_matches;
create policy opp_matches_select on public.opportunity_matches for select to authenticated using (athlete_id = auth.uid());
drop policy if exists opp_matches_write on public.opportunity_matches;
create policy opp_matches_write on public.opportunity_matches for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
drop policy if exists opp_saves_select on public.opportunity_saves;
create policy opp_saves_select on public.opportunity_saves for select to authenticated using (athlete_id = auth.uid());
drop policy if exists opp_saves_insert on public.opportunity_saves;
create policy opp_saves_insert on public.opportunity_saves for insert to authenticated with check (athlete_id = auth.uid());
drop policy if exists opp_saves_delete on public.opportunity_saves;
create policy opp_saves_delete on public.opportunity_saves for delete to authenticated using (athlete_id = auth.uid());
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select to authenticated using (athlete_id = auth.uid());
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated with check (athlete_id = auth.uid());
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists perf_select on public.performance_records;
create policy perf_select on public.performance_records for select to authenticated using (athlete_id = auth.uid());
drop policy if exists perf_write on public.performance_records;
create policy perf_write on public.performance_records for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
drop policy if exists football_stats_select on public.football_stats;
create policy football_stats_select on public.football_stats for select to authenticated using (athlete_id = auth.uid());
drop policy if exists football_stats_write on public.football_stats;
create policy football_stats_write on public.football_stats for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
drop policy if exists chess_stats_select on public.chess_stats;
create policy chess_stats_select on public.chess_stats for select to authenticated using (athlete_id = auth.uid());
drop policy if exists chess_stats_write on public.chess_stats;
create policy chess_stats_write on public.chess_stats for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists athlete_events_select on public.athlete_events;
create policy athlete_events_select on public.athlete_events for select to authenticated using (user_id = auth.uid() or is_public);
drop policy if exists athlete_events_write on public.athlete_events;
create policy athlete_events_write on public.athlete_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_tokens_owner on public.push_tokens;
create policy push_tokens_owner on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists sportify_consents_owner on public.sportify_consents;
create policy sportify_consents_owner on public.sportify_consents for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
drop policy if exists sportify_results_owner on public.sportify_results;
create policy sportify_results_owner on public.sportify_results for select to authenticated using (athlete_id = auth.uid());
drop policy if exists appointments_owner on public.appointments;
create policy appointments_owner on public.appointments for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
