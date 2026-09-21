create table public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  role text not null default 'athlete'
    check (role in ('athlete', 'parent', 'coach', 'club', 'scout')),
  sport text,
  city text,
  country text,
  is_adult boolean not null,
  guardian_confirmed boolean,
  consent boolean not null check (consent),
  consent_text text not null,
  source text not null default 'site-hero',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token_hash text,
  ip_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_waitlist enable row level security;

revoke all on table public.marketing_waitlist from anon, authenticated;
grant all on table public.marketing_waitlist to service_role;

create index marketing_waitlist_ip_updated_idx
  on public.marketing_waitlist (ip_hash, updated_at desc)
  where ip_hash is not null;

comment on table public.marketing_waitlist is
  'Private early-access signups submitted through the public marketing Edge Function.';
