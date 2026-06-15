-- ============================================================
-- 0005 — Network, career, discovery
-- ============================================================

-- ------------------------------------------------------------
-- endorsements  (public)
-- ------------------------------------------------------------
create table public.endorsements (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athlete_profiles(id) on delete cascade,
  endorser_id     uuid not null references public.user_profiles(id) on delete cascade,
  endorser_role   user_role,
  skill_or_trait  varchar(255) not null,
  note            text,
  created_at      timestamptz not null default now()
);
alter table public.endorsements enable row level security;
create index idx_endorsements_athlete on public.endorsements(athlete_id);

-- ------------------------------------------------------------
-- follows  (public graph)
-- ------------------------------------------------------------
create table public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.user_profiles(id) on delete cascade,
  following_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create index idx_follows_follower  on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);

-- ------------------------------------------------------------
-- recommendations
-- ------------------------------------------------------------
create table public.recommendations (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.user_profiles(id) on delete cascade,
  recipient_id      uuid not null references public.user_profiles(id) on delete cascade,
  relationship_type varchar(50) not null default 'colleague',
  body              text not null,
  is_public         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (author_id, recipient_id),
  constraint no_self_recommend check (author_id <> recipient_id)
);
alter table public.recommendations enable row level security;
create index idx_recommendations_recipient on public.recommendations(recipient_id);
create trigger trg_recommendations_updated_at before update on public.recommendations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- user_blocks  (owner only)
-- ------------------------------------------------------------
create table public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.user_profiles(id) on delete cascade,
  blocked_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create index idx_user_blocks_blocker on public.user_blocks(blocker_id);

-- ------------------------------------------------------------
-- career_milestones  (public — portfolio)
-- ------------------------------------------------------------
create table public.career_milestones (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  milestone_type varchar(100),
  club_or_event  varchar(255),
  achieved_at    date,
  notes          text,
  created_at     timestamptz not null default now()
);
alter table public.career_milestones enable row level security;
create index idx_career_milestones_athlete on public.career_milestones(athlete_id);

-- ------------------------------------------------------------
-- saved_searches  (owner/scout)
-- ------------------------------------------------------------
create table public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  name        varchar(255) not null,
  query       jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
create index idx_saved_searches_user on public.saved_searches(user_id);

-- ------------------------------------------------------------
-- watchlists  +  watchlist_athletes  (owner)
-- ------------------------------------------------------------
create table public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  name        varchar(255) not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.watchlists enable row level security;
create index idx_watchlists_user on public.watchlists(user_id);
create trigger trg_watchlists_updated_at before update on public.watchlists
  for each row execute function public.set_updated_at();

create table public.watchlist_athletes (
  id           uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  athlete_id   uuid not null references public.athlete_profiles(id) on delete cascade,
  notes        text,
  rating       integer,
  added_at     timestamptz not null default now(),
  unique (watchlist_id, athlete_id)
);
alter table public.watchlist_athletes enable row level security;
create index idx_watchlist_athletes_watchlist on public.watchlist_athletes(watchlist_id);

-- ------------------------------------------------------------
-- contact_requests  (scout -> athlete; tier-limited outreach)
-- ------------------------------------------------------------
create table public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  scout_id   uuid not null references public.user_profiles(id) on delete cascade,
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  message    text,
  status     contact_status not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;
create index idx_contact_requests_scout   on public.contact_requests(scout_id);
create index idx_contact_requests_athlete on public.contact_requests(athlete_id);
create trigger trg_contact_requests_updated_at before update on public.contact_requests
  for each row execute function public.set_updated_at();
