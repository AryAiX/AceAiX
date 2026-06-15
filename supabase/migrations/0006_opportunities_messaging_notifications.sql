-- ============================================================
-- 0006 — Opportunities, messaging, notifications
-- ============================================================

-- ------------------------------------------------------------
-- opportunities  (public read of active; created by orgs/recruiters)
-- ------------------------------------------------------------
create table public.opportunities (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid references public.organizations(id) on delete cascade,
  created_by_id        uuid not null references public.user_profiles(id) on delete cascade,
  title                varchar(255) not null,
  description          text,
  type                 varchar(50),       -- trial | offer
  location             varchar(255),
  sport                varchar(100),
  position             varchar(100),
  salary_min           numeric(12,2),
  salary_max           numeric(12,2),
  currency             varchar(3) not null default 'AED',
  application_deadline date,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.opportunities enable row level security;
create index idx_opportunities_sport  on public.opportunities(sport);
create index idx_opportunities_active on public.opportunities(is_active);
create trigger trg_opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- conversations  (1:1; participants only)
-- ------------------------------------------------------------
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  participant_1_id     uuid not null references public.user_profiles(id) on delete cascade,
  participant_2_id     uuid not null references public.user_profiles(id) on delete cascade,
  subject              varchar(255),
  last_message_at      timestamptz,
  last_message_preview varchar(255),
  created_at           timestamptz not null default now()
);
alter table public.conversations enable row level security;
create index idx_conversations_p1 on public.conversations(participant_1_id);
create index idx_conversations_p2 on public.conversations(participant_2_id);

-- ------------------------------------------------------------
-- messages  (participants only)
-- ------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.user_profiles(id) on delete cascade,
  content         text not null,
  is_read         boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.messages enable row level security;
create index idx_messages_conversation on public.messages(conversation_id);

-- ------------------------------------------------------------
-- notifications  (owner only)
-- ------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  type       varchar(50) not null,
  title      varchar(255) not null,
  body       text,
  is_read    boolean not null default false,
  action_url varchar(500),
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index idx_notifications_user    on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(is_read);
