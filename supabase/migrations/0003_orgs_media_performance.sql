-- ============================================================
-- 0003 — Organizations, media, performance
-- ============================================================

-- ------------------------------------------------------------
-- organizations  (public read; clubs/federations/academies)
-- ------------------------------------------------------------
create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                varchar(255) not null,
  type                org_type not null,
  logo_url            varchar(1000),
  description         text,
  country             varchar(100),
  city                varchar(100),
  website             varchar(500),
  license_tier        varchar(50),
  verification_status verification_status not null default 'pending',
  is_verified         boolean not null default false,
  branding            jsonb not null default '{}'::jsonb,
  founded_year        integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.organizations enable row level security;
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- Deferred FKs now that organizations exists
alter table public.athlete_profiles
  add constraint athlete_profiles_current_club_fk
  foreign key (current_club_id) references public.organizations(id) on delete set null;
alter table public.scout_profiles
  add constraint scout_profiles_org_fk
  foreign key (organization_id) references public.organizations(id) on delete set null;

-- ------------------------------------------------------------
-- athlete_media
-- ------------------------------------------------------------
create table public.athlete_media (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       uuid not null references public.athlete_profiles(id) on delete cascade,
  title            varchar(255) not null,
  description      text,
  media_type       media_type_enum not null default 'video',
  storage_url      varchar(1000) not null,
  thumbnail_url    varchar(1000),
  duration_seconds integer,
  transcode_status varchar(30) not null default 'pending',
  is_featured      boolean not null default false,
  is_public        boolean not null default true,
  views_count      integer not null default 0,
  ai_tags          jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
alter table public.athlete_media enable row level security;
create index idx_athlete_media_athlete_id on public.athlete_media(athlete_id);

-- ------------------------------------------------------------
-- match_records  (public — part of performance portfolio)
-- ------------------------------------------------------------
create table public.match_records (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  match_date     date not null,
  competition    varchar(255),
  opponent       varchar(255),
  result         varchar(20),
  minutes_played integer,
  goals          integer not null default 0,
  assists        integer not null default 0,
  stats          jsonb not null default '{}'::jsonb,
  source         record_source not null default 'self',
  notes          text,
  created_at     timestamptz not null default now()
);
alter table public.match_records enable row level security;
create index idx_match_records_athlete_id on public.match_records(athlete_id);
