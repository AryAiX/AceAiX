-- Server-enforced quota for uncached athlete recommendation generations.
-- The table is intentionally inaccessible through the client API; authenticated
-- users can only consume their own quota through the security-definer function.

create table if not exists public.athlete_ai_usage (
  user_id           uuid primary key references public.user_profiles(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count     integer not null default 0 check (request_count >= 0),
  updated_at        timestamptz not null default now()
);

alter table public.athlete_ai_usage enable row level security;

revoke all on table public.athlete_ai_usage from anon, authenticated;

create or replace function public.consume_athlete_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_user_id is null then
    return false;
  end if;

  insert into public.athlete_ai_usage (user_id, window_started_at, request_count, updated_at)
  values (v_user_id, now(), 1, now())
  on conflict (user_id) do update
    set window_started_at = case
          when athlete_ai_usage.window_started_at <= now() - interval '1 hour' then now()
          else athlete_ai_usage.window_started_at
        end,
        request_count = case
          when athlete_ai_usage.window_started_at <= now() - interval '1 hour' then 1
          else athlete_ai_usage.request_count + 1
        end,
        updated_at = now()
    where athlete_ai_usage.window_started_at <= now() - interval '1 hour'
       or athlete_ai_usage.request_count < 6
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_athlete_ai_quota() from public;
grant execute on function public.consume_athlete_ai_quota() to authenticated;
