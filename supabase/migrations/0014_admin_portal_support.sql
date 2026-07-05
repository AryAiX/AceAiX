-- ============================================================
-- 0014 — Admin portal support tables
-- ============================================================

-- Feature flags shown in the admin System Config page.
create table if not exists public.feature_flags (
  id           uuid primary key default gen_random_uuid(),
  name         varchar(120) not null unique,
  description  text,
  enabled      boolean not null default false,
  rollout_pct  integer not null default 100 check (rollout_pct between 0 and 100),
  environment  varchar(40) not null default 'production',
  updated_by   uuid references public.user_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create trigger trg_feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- User/content moderation queue. Reports can be user-generated or admin-created.
create table if not exists public.moderation_reports (
  id                   uuid primary key default gen_random_uuid(),
  reporter_id          uuid references public.user_profiles(id) on delete set null,
  reported_entity_type varchar(40) not null,
  reported_entity_id   text not null,
  reason               text not null,
  details              text,
  severity             varchar(20) not null default 'medium',
  status               varchar(20) not null default 'open',
  is_minor_related     boolean not null default false,
  resolved_by          uuid references public.user_profiles(id) on delete set null,
  resolution           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.moderation_reports enable row level security;
create index if not exists idx_moderation_reports_status on public.moderation_reports(status);
create index if not exists idx_moderation_reports_severity on public.moderation_reports(severity);
create trigger trg_moderation_reports_updated_at before update on public.moderation_reports
  for each row execute function public.set_updated_at();

-- Billing/finance ledger records used by the admin finance page.
create table if not exists public.admin_billing_events (
  id             uuid primary key default gen_random_uuid(),
  user_id         uuid references public.user_profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type      varchar(40) not null,
  status          varchar(40) not null default 'pending',
  amount_cents    integer not null default 0,
  currency        varchar(10) not null default 'USD',
  provider_ref    text,
  metadata        jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
alter table public.admin_billing_events enable row level security;
create index if not exists idx_admin_billing_events_status on public.admin_billing_events(status);
create index if not exists idx_admin_billing_events_type on public.admin_billing_events(event_type);
create index if not exists idx_admin_billing_events_occurred on public.admin_billing_events(occurred_at desc);

-- Privacy/GDPR operational queue.
create table if not exists public.admin_data_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id        uuid references public.user_profiles(id) on delete set null,
  request_type   varchar(40) not null,
  status         varchar(40) not null default 'pending',
  has_medical    boolean not null default false,
  submitted_at   timestamptz not null default now(),
  completed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.admin_data_requests enable row level security;
create index if not exists idx_admin_data_requests_status on public.admin_data_requests(status);
create trigger trg_admin_data_requests_updated_at before update on public.admin_data_requests
  for each row execute function public.set_updated_at();

-- Optional admin-managed taxonomy. Existing app data remains authoritative when these are empty.
create table if not exists public.sports_catalog (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(120) not null unique,
  status      varchar(40) not null default 'active',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.sports_catalog enable row level security;
create trigger trg_sports_catalog_updated_at before update on public.sports_catalog
  for each row execute function public.set_updated_at();

create table if not exists public.competitions_catalog (
  id          uuid primary key default gen_random_uuid(),
  sport_id    uuid references public.sports_catalog(id) on delete set null,
  name        varchar(180) not null,
  country     varchar(120),
  status      varchar(40) not null default 'active',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (name, country)
);
alter table public.competitions_catalog enable row level security;
create index if not exists idx_competitions_catalog_sport on public.competitions_catalog(sport_id);
create trigger trg_competitions_catalog_updated_at before update on public.competitions_catalog
  for each row execute function public.set_updated_at();

-- RLS: all support tables are admin-only for now.
create policy feature_flags_admin_all on public.feature_flags
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy moderation_reports_admin_all on public.moderation_reports
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_billing_events_admin_all on public.admin_billing_events
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_data_requests_admin_all on public.admin_data_requests
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy sports_catalog_admin_all on public.sports_catalog
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy competitions_catalog_admin_all on public.competitions_catalog
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
