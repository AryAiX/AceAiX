-- ============================================================
-- 0010 — Profile richness, posts/feed, coach profiles, CMS, profile views
-- Adds the structures the UI needs so ALL displayed data comes from the DB.
-- Rich free-form portfolio sections are stored as JSONB on the profile rows;
-- entities with their own pages/RLS stay normalized (matches, media, etc.).
-- ============================================================

-- ---- athlete_profiles: display + portfolio columns ----
alter table public.athlete_profiles
  add column if not exists position          varchar(100),
  add column if not exists cover_url         varchar(1000),
  add column if not exists performance_score integer not null default 0,
  add column if not exists fitness_score     integer not null default 0,
  add column if not exists followers_count   integer not null default 0,
  add column if not exists connections_count integer not null default 0,
  add column if not exists attributes        jsonb not null default '[]'::jsonb,
  add column if not exists academy           jsonb not null default '[]'::jsonb,
  add column if not exists certifications    jsonb not null default '[]'::jsonb,
  add column if not exists honors            jsonb not null default '[]'::jsonb,
  add column if not exists languages         jsonb not null default '[]'::jsonb,
  add column if not exists following         jsonb not null default '[]'::jsonb,
  add column if not exists trajectory        jsonb not null default '[]'::jsonb,
  add column if not exists analytics         jsonb not null default '{}'::jsonb;

-- ---- organizations: club profile fields ----
alter table public.organizations
  add column if not exists short_name       varchar(100),
  add column if not exists initials         varchar(8),
  add column if not exists league           varchar(150),
  add column if not exists stadium          varchar(200),
  add column if not exists stadium_capacity integer,
  add column if not exists primary_color    varchar(16),
  add column if not exists secondary_color  varchar(16),
  add column if not exists cover_url        varchar(1000),
  add column if not exists followers_count  integer not null default 0,
  add column if not exists values           jsonb not null default '[]'::jsonb,
  add column if not exists profile          jsonb not null default '{}'::jsonb;

-- ---- success_stories: featured flag + excerpt ----
alter table public.success_stories
  add column if not exists is_featured boolean not null default false,
  add column if not exists excerpt     text;

-- ============================================================
-- posts  (social feed + athlete activity)
-- ============================================================
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.user_profiles(id) on delete cascade,
  athlete_id      uuid references public.athlete_profiles(id) on delete set null,
  type            varchar(40) not null default 'standard',
  text            text,
  image_url       varchar(1000),
  reactions_count integer not null default 0,
  comments_count  integer not null default 0,
  created_at      timestamptz not null default now()
);
alter table public.posts enable row level security;
create index if not exists idx_posts_author  on public.posts(author_id);
create index if not exists idx_posts_athlete on public.posts(athlete_id);
create index if not exists idx_posts_created  on public.posts(created_at desc);

-- ============================================================
-- coach_profiles
-- ============================================================
create table if not exists public.coach_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references public.user_profiles(id) on delete cascade,
  specialty                varchar(150),
  current_club             varchar(200),
  current_club_id          uuid references public.organizations(id) on delete set null,
  country                  varchar(100),
  nationality              varchar(100),
  years_experience         integer not null default 0,
  score                    integer not null default 0,
  win_rate                 numeric(5,1),
  total_trophies           integer not null default 0,
  total_matches            integer not null default 0,
  is_open_to_opportunities boolean not null default true,
  cover_url                varchar(1000),
  philosophy               text,
  coaching_spells          jsonb not null default '[]'::jsonb,
  licenses                 jsonb not null default '[]'::jsonb,
  attributes               jsonb not null default '[]'::jsonb,
  honors                   jsonb not null default '[]'::jsonb,
  languages                jsonb not null default '[]'::jsonb,
  activity                 jsonb not null default '[]'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table public.coach_profiles enable row level security;
create index if not exists idx_coach_profiles_user on public.coach_profiles(user_id);
create trigger trg_coach_profiles_updated_at before update on public.coach_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- cms_content  (marketing / static content served from DB)
-- ============================================================
create table if not exists public.cms_content (
  key        varchar(100) primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.cms_content enable row level security;
create trigger trg_cms_content_updated_at before update on public.cms_content
  for each row execute function public.set_updated_at();

-- ============================================================
-- profile_views  (scout interest + analytics, real rows)
-- ============================================================
create table if not exists public.profile_views (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  viewer_user_id uuid references public.user_profiles(id) on delete set null,
  viewer_name    varchar(200),
  viewer_role    varchar(40),
  viewer_org     varchar(200),
  viewer_verified boolean not null default false,
  created_at     timestamptz not null default now()
);
alter table public.profile_views enable row level security;
create index if not exists idx_profile_views_athlete on public.profile_views(athlete_id, created_at desc);

-- ============================================================
-- POLICIES
-- ============================================================
-- posts: public read; author writes
create policy posts_select on public.posts for select to anon, authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_update on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid() or private.is_admin());

-- coach_profiles: public read; owner writes
create policy coach_select on public.coach_profiles for select to anon, authenticated using (true);
create policy coach_insert on public.coach_profiles for insert to authenticated with check (user_id = auth.uid());
create policy coach_update on public.coach_profiles for update to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());

-- cms_content: public read; admin write
create policy cms_select on public.cms_content for select to anon, authenticated using (true);
create policy cms_write  on public.cms_content for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- profile_views: athlete owner + admin read; any authenticated insert
create policy pv_select on public.profile_views for select to authenticated using (private.owns_athlete(athlete_id) or private.is_admin());
create policy pv_insert on public.profile_views for insert to authenticated with check (auth.uid() is not null);

-- ---- grants (RLS still gates) ----
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
