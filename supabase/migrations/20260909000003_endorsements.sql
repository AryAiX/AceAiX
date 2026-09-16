-- ============================================================
-- 0909/03 — Endorsements you can actually give
--
-- The app has told athletes to get endorsed since the Talent Score shipped:
--
--     "Ask a coach to endorse you — one endorsement from a verified coach or
--      club counts for a lot."
--
-- It is worth up to 45 of the 100 credibility points. And there has never been
-- a way for the coach to do it. `getEndorsements` reads them; nothing writes
-- them. The only endorsements in the product are the ones the seed file
-- inserted, so the tip is advice the app makes impossible to follow.
--
-- This adds the write path. Two things had to be fixed on the way, both of
-- which only mattered once anybody could actually reach the table.
--
-- ------------------------------------------------------------
-- 1. `endorser_role` was whatever the client said it was
--
-- The insert policy is `with check (endorser_id = auth.uid())` — it constrains
-- WHO you claim to be, and nothing else on the row. `endorser_role` is a
-- plain column, so a client could insert 'coach' for itself, and that column
-- is precisely what `compute_talent_score` reads to decide whether an
-- endorsement is an expert one:
--
--     count(*) filter (where e.endorser_role in ('coach','scout','club',...))
--
-- The join on `eu.is_verified` is what has been holding the line, and it holds
-- it well — an unverified account scores nothing whatever it claims. But that
-- is one condition away from a self-declared credential feeding a score, and a
-- self-declared credential is not a credential. The role is now written by the
-- server from `user_profiles.role`, and the column is no longer writable.
--
-- ------------------------------------------------------------
-- 2. The same skill could be endorsed over and over
--
-- There was no unique constraint. `least(15, v_endorsements * 3)` counts rows,
-- so five copies of "Fast" from one verified coach was fifteen points, and
-- thirty copies of anything was the cap on both terms. One row per
-- (athlete, endorser, skill) now, enforced by the database, and endorsing
-- again updates the note instead of stacking.
--
-- Six skills per endorser per athlete on top of that. A coach who genuinely
-- rates someone runs out of distinct things to say long before six; a coach
-- who is inflating a number does not.
-- ============================================================

-- ------------------------------------------------------------
-- Fold any duplicates before the constraint refuses them
--
-- Keeps the oldest row of each group — the endorsement as first given — and
-- carries a later note onto it if the older one had none.
-- ------------------------------------------------------------
with ranked as (
  select id, athlete_id, endorser_id, lower(btrim(skill_or_trait)) as skill, note, created_at,
         first_value(id) over (
           partition by athlete_id, endorser_id, lower(btrim(skill_or_trait))
           order by created_at, id
         ) as keep_id
  from public.endorsements
),
notes as (
  select keep_id, (array_agg(note order by created_at) filter (where note is not null))[1] as note
  from ranked group by keep_id
)
update public.endorsements e
   set note = coalesce(e.note, n.note)
  from notes n
 where e.id = n.keep_id;

delete from public.endorsements e
 using (
   select id, first_value(id) over (
            partition by athlete_id, endorser_id, lower(btrim(skill_or_trait))
            order by created_at, id
          ) as keep_id
   from public.endorsements
 ) d
 where e.id = d.id and d.id <> d.keep_id;

/* Case- and whitespace-insensitive: "Fast" and " fast " are one endorsement. */
create unique index if not exists idx_endorsements_one_per_skill
  on public.endorsements (athlete_id, endorser_id, lower(btrim(skill_or_trait)));

-- ------------------------------------------------------------
-- The table stops taking direct writes
--
-- Every other table added since 0904 works this way: reads through RLS, writes
-- through a function that can enforce the rules a `with check` cannot express.
-- ------------------------------------------------------------
drop policy if exists end_insert on public.endorsements;
drop policy if exists end_update on public.endorsements;
drop policy if exists end_delete on public.endorsements;

revoke insert, update, delete on public.endorsements from authenticated, anon;
grant select on public.endorsements to authenticated, anon;

-- ------------------------------------------------------------
-- Giving one
-- ------------------------------------------------------------
create or replace function public.endorse_athlete(
  p_athlete uuid,
  p_skill   text,
  p_note    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_skill    text := nullif(btrim(coalesce(p_skill, '')), '');
  v_me       public.user_profiles;
  v_owner    uuid;
  v_distinct integer;
  v_id       uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_skill is null or length(v_skill) < 2 or length(v_skill) > 60 then
    raise exception 'Say what you are endorsing, in a word or two'
      using errcode = '22023';
  end if;

  select * into v_me from public.user_profiles where id = auth.uid();
  if coalesce(v_me.is_suspended, false) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  select user_id into v_owner from public.athlete_profiles where id = p_athlete;
  if v_owner is null then
    raise exception 'No such athlete' using errcode = 'P0002';
  end if;
  if v_owner = auth.uid() then
    raise exception 'You cannot endorse yourself'
      using errcode = '22023', hint = 'endorse_self';
  end if;

  /* Six distinct skills per endorser per athlete. Counted before the insert so
     an update to an existing one is never blocked by the cap. */
  select count(distinct lower(btrim(skill_or_trait))) into v_distinct
  from public.endorsements
  where athlete_id = p_athlete
    and endorser_id = auth.uid()
    and lower(btrim(skill_or_trait)) <> lower(v_skill);

  if v_distinct >= 6 then
    raise exception 'You have already endorsed six things about this athlete'
      using errcode = '22023', hint = 'endorse_limit';
  end if;

  insert into public.endorsements (athlete_id, endorser_id, endorser_role, skill_or_trait, note)
  values (
    p_athlete, auth.uid(),
    /* From the profile, never from the caller — see the header. */
    v_me.role,
    v_skill,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  on conflict (athlete_id, endorser_id, lower(btrim(skill_or_trait))) do update
    set note          = excluded.note,
        endorser_role = excluded.endorser_role
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.endorse_athlete(uuid, text, text) from public, anon;
grant execute on function public.endorse_athlete(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- Taking one back
--
-- Yours only. An endorsement is a thing you said, so you can stop saying it;
-- the athlete cannot delete an unflattering one, and nobody can delete
-- somebody else's.
-- ------------------------------------------------------------
create or replace function public.withdraw_endorsement(p_endorsement uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.endorsements
   where id = p_endorsement and endorser_id = auth.uid();

  if not found then
    raise exception 'Not your endorsement' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.withdraw_endorsement(uuid) from public, anon;
grant execute on function public.withdraw_endorsement(uuid) to authenticated;

-- ------------------------------------------------------------
-- What I have already said about this athlete
--
-- So the button can read "Endorsed" rather than offering to do it again, and
-- so the sheet opens with the existing note in it.
-- ------------------------------------------------------------
create or replace function public.my_endorsements_of(p_athlete uuid)
returns table (id uuid, skill_or_trait text, note text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.skill_or_trait::text, e.note, e.created_at
  from public.endorsements e
  where e.athlete_id = p_athlete and e.endorser_id = auth.uid()
  order by e.created_at;
$$;

revoke all on function public.my_endorsements_of(uuid) from public, anon;
grant execute on function public.my_endorsements_of(uuid) to authenticated;
