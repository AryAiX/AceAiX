-- ============================================================
-- 0002 — Identity & profiles
-- user_profiles (public-safe) + user_private (sensitive PII) +
-- athlete_profiles, athlete_attributes, scout_profiles
-- ============================================================

-- ------------------------------------------------------------
-- user_profiles  (public-safe columns only — browsable)
-- ------------------------------------------------------------
create table public.user_profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              user_role not null default 'athlete',
  full_name         varchar(255),
  avatar_url        varchar(1000),
  bio               text,
  city              varchar(100),
  country           varchar(100),
  locale            varchar(10) default 'en',
  is_verified       boolean not null default false,
  subscription_tier subscription_tier not null default 'free',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
create trigger trg_user_profiles_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- user_private  (sensitive PII — owner/admin only, 1:1)
-- ------------------------------------------------------------
create table public.user_private (
  user_id                  uuid primary key references public.user_profiles(id) on delete cascade,
  email                    varchar(255),
  phone                    varchar(50),
  date_of_birth            date,
  gender                   varchar(20),
  emirates_id              text,            -- store encrypted (app/edge layer); UAE Pass P3
  notification_preferences jsonb not null default '{}'::jsonb,
  stripe_customer_id       varchar(255),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table public.user_private enable row level security;
create trigger trg_user_private_updated_at before update on public.user_private
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- athlete_profiles  (public — central portfolio entity)
-- ------------------------------------------------------------
create table public.athlete_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.user_profiles(id) on delete cascade,
  sport               varchar(100),
  positions           jsonb not null default '[]'::jsonb,
  position_primary    varchar(100),
  position_secondary  varchar(100),
  height_cm           numeric(5,1),
  weight_kg           numeric(5,1),
  birth_date          date,
  nationality         varchar(100),
  dominant_foot       varchar(20),
  current_club_id     uuid,                -- FK added in 0003 after organizations exists
  current_club        varchar(255),        -- free-text fallback (legacy/prototype)
  level               varchar(50) not null default 'amateur',
  bio                 text,
  is_open_to_offers   boolean not null default true,
  visibility_score    integer not null default 0,
  profile_completeness integer not null default 0,
  highlighted_stats   jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.athlete_profiles enable row level security;
create index idx_athlete_profiles_user_id on public.athlete_profiles(user_id);
create index idx_athlete_profiles_sport   on public.athlete_profiles(sport);
create index idx_athlete_profiles_level   on public.athlete_profiles(level);
create trigger trg_athlete_profiles_updated_at before update on public.athlete_profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- athlete_attributes  (public — part of portfolio)
-- ------------------------------------------------------------
create table public.athlete_attributes (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athlete_profiles(id) on delete cascade,
  attribute_key varchar(100) not null,
  value         numeric,
  source        record_source not null default 'self',
  recorded_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
alter table public.athlete_attributes enable row level security;
create index idx_athlete_attributes_athlete_id on public.athlete_attributes(athlete_id);

-- ------------------------------------------------------------
-- scout_profiles  (owner/admin)
-- ------------------------------------------------------------
create table public.scout_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.user_profiles(id) on delete cascade,
  organization_id     uuid,                -- FK added in 0003
  credentials         text,
  verification_status verification_status not null default 'pending',
  contact_quota_used  integer not null default 0,
  contact_quota_limit integer not null default 10,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.scout_profiles enable row level security;
create index idx_scout_profiles_user_id on public.scout_profiles(user_id);
create trigger trg_scout_profiles_updated_at before update on public.scout_profiles
  for each row execute function public.set_updated_at();
