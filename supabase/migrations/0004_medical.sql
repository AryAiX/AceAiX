-- ============================================================
-- 0004 — Medical intelligence (consent-gated, append-only, provenance)
-- The most security-sensitive domain. See docs/03 §5 and docs/06 §8.
-- ============================================================

-- ------------------------------------------------------------
-- medical_partners  (clinic entity; public read of verified partners)
-- ------------------------------------------------------------
create table public.medical_partners (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.user_profiles(id) on delete set null, -- managing clinic user
  organization_id     uuid references public.organizations(id) on delete set null,
  name                varchar(255) not null,
  license_number      varchar(255),
  accreditation_status verification_status not null default 'pending',
  commission_rate     numeric(5,2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.medical_partners enable row level security;
create index idx_medical_partners_user_id on public.medical_partners(user_id);
create trigger trg_medical_partners_updated_at before update on public.medical_partners
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- medical_consents  (athlete grants/revokes access)
-- ------------------------------------------------------------
create table public.medical_consents (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  grantee_user_id uuid references public.user_profiles(id) on delete cascade,
  grantee_org_id uuid references public.organizations(id) on delete cascade,
  scope          varchar(50) not null default 'medical_full', -- medical_full | clearance_only
  status         consent_status not null default 'granted',
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.medical_consents enable row level security;
create index idx_medical_consents_athlete on public.medical_consents(athlete_id);
create index idx_medical_consents_grantee on public.medical_consents(grantee_user_id);
create trigger trg_medical_consents_updated_at before update on public.medical_consents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- medical_records  (APPEND-ONLY, tamper-evident)
-- ------------------------------------------------------------
create table public.medical_records (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athlete_profiles(id) on delete cascade,
  partner_id  uuid references public.medical_partners(id) on delete set null,
  record_type varchar(100) not null,
  title       varchar(255),
  summary     text,
  file_url    varchar(1000),
  hash        varchar(255),          -- SHA-256 of the record payload/file
  anchor_ref  varchar(500),          -- provenance ledger reference
  issued_at   date not null default current_date,
  is_verified boolean not null default false,
  is_deleted  boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.medical_records enable row level security;
create index idx_medical_records_athlete on public.medical_records(athlete_id);

-- ------------------------------------------------------------
-- medical_clearances  (append-only history with effective dates)
-- ------------------------------------------------------------
create table public.medical_clearances (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  partner_id     uuid references public.medical_partners(id) on delete set null,
  status         clearance_status not null default 'pending',
  issued_by      varchar(255),
  effective_from date,
  effective_to   date,
  notes          text,
  created_at     timestamptz not null default now()
);
alter table public.medical_clearances enable row level security;
create index idx_medical_clearances_athlete on public.medical_clearances(athlete_id);

-- ------------------------------------------------------------
-- injuries
-- ------------------------------------------------------------
create table public.injuries (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athlete_profiles(id) on delete cascade,
  partner_id      uuid references public.medical_partners(id) on delete set null,
  injury_type     varchar(255),
  body_area       varchar(255),
  severity        varchar(50),
  occurred_at     date,
  recovery_status varchar(50),
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.injuries enable row level security;
create index idx_injuries_athlete on public.injuries(athlete_id);

-- ------------------------------------------------------------
-- medical_access_log  (append-only — who viewed records)
-- ------------------------------------------------------------
create table public.medical_access_log (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  viewer_user_id uuid references public.user_profiles(id) on delete set null,
  record_id      uuid,
  ip_address     inet,
  accessed_at    timestamptz not null default now()
);
alter table public.medical_access_log enable row level security;
create index idx_medical_access_log_athlete on public.medical_access_log(athlete_id);
