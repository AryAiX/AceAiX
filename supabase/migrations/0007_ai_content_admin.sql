-- ============================================================
-- 0007 — AI, content, admin
-- ============================================================

-- ------------------------------------------------------------
-- success_stories  (public read of published; admin-managed)
-- ------------------------------------------------------------
create table public.success_stories (
  id              uuid primary key default gen_random_uuid(),
  title           varchar(255) not null,
  slug            varchar(255) unique,
  content         text,
  athlete_id      uuid references public.athlete_profiles(id) on delete set null,
  athlete_name    varchar(255),
  sport           varchar(100),
  cover_image_url varchar(1000),
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.success_stories enable row level security;

-- ------------------------------------------------------------
-- ai_chat_sessions  (owner; guests handled by edge function via service role)
-- ------------------------------------------------------------
create table public.ai_chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.user_profiles(id) on delete cascade, -- nullable for guests
  session_token varchar(255),
  title         varchar(255),
  context_type  varchar(100),
  context       jsonb not null default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.ai_chat_sessions enable row level security;
create index idx_ai_chat_sessions_user on public.ai_chat_sessions(user_id);
create trigger trg_ai_chat_sessions_updated_at before update on public.ai_chat_sessions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ai_chat_messages  (via session ownership)
-- ------------------------------------------------------------
create table public.ai_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.ai_chat_sessions(id) on delete cascade,
  sender_role varchar(20) not null,   -- user | assistant | system
  content     text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.ai_chat_messages enable row level security;
create index idx_ai_chat_messages_session on public.ai_chat_messages(session_id);

-- ------------------------------------------------------------
-- audit_logs  (APPEND-ONLY; admin read only)
-- ------------------------------------------------------------
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.user_profiles(id) on delete set null,
  action     varchar(100) not null,
  table_name varchar(100),
  record_id  uuid,
  old_value  jsonb,
  new_value  jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create index idx_audit_logs_created on public.audit_logs(created_at);

-- ------------------------------------------------------------
-- platform_settings  (public read flags; admin write)
-- ------------------------------------------------------------
create table public.platform_settings (
  key        varchar(100) primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

-- ------------------------------------------------------------
-- verification_requests  (onboarding/verification queue)
-- ------------------------------------------------------------
create table public.verification_requests (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id uuid references public.user_profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type            varchar(50) not null,   -- athlete_id | recruiter | medical_partner | club | federation
  status          verification_status not null default 'pending',
  documents       jsonb not null default '[]'::jsonb,
  reviewed_by     uuid references public.user_profiles(id) on delete set null,
  decision_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.verification_requests enable row level security;
create index idx_verification_requests_status on public.verification_requests(status);
create trigger trg_verification_requests_updated_at before update on public.verification_requests
  for each row execute function public.set_updated_at();
