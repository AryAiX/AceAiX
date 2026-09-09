-- ============================================================
-- 0909/02 — "See translation"
--
-- The app ships in seven languages, and the people in it do not all write in
-- the same one. A Brazilian coach posts in Portuguese, a fourteen-year-old in
-- Dubai reads Arabic, and today one of them simply cannot read the other. The
-- language gate solved the *interface*; it did nothing for the content.
--
-- So: a line under any post, comment or message — "See translation" — the way
-- Instagram does it. Tap, read, tap again to see the original.
--
-- ------------------------------------------------------------
-- THE CACHE IS THE WHOLE DESIGN
--
-- Machine translation is billed per character, and a post on a feed is read by
-- hundreds of people. Translating on every view would mean paying for the same
-- sentence over and over, which is both wasteful and slow.
--
-- A translation is a pure function of (text, target language). So it is stored
-- exactly once, keyed by a hash of the source text rather than by the row it
-- came from:
--
--   * two people who post "Great game today" share one row
--   * an edited post is a different hash, so it is retranslated, and the old
--     translation is not silently shown against new words
--   * nothing needs to be invalidated when a post is deleted
--
-- The hash is sha256 of the trimmed source, hex-encoded. `pgcrypto` is already
-- an extension in this database.
--
-- ------------------------------------------------------------
-- NO PROVIDER YET, ON PURPOSE
--
-- Which engine translates — Google, DeepL, Azure — is a commercial decision
-- with a key attached to it, and it is not one this migration should make. The
-- edge function `translate` holds a single `callProvider()` boundary; until a
-- key is configured it answers `provider: 'none'` and the client keeps showing
-- the original text. Everything else — the cache, the RPC, the button, the
-- language detection, the seven catalogues — works today and will not change
-- when the key arrives.
--
-- That means this ships as a complete, tested, inert feature. Turning it on is
-- one environment variable.
-- ============================================================

create table if not exists public.translations (
  /* sha256 of btrim(source), hex. Not a row id: identical text is one row. */
  source_hash   text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  target_lang   text not null check (target_lang ~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'),

  translated    text not null,
  /* What the provider thought the source was. Null when it would not say. */
  detected_lang text check (detected_lang is null or detected_lang ~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'),
  provider      text not null,

  created_at    timestamptz not null default now(),

  primary key (source_hash, target_lang)
);
alter table public.translations enable row level security;

comment on table public.translations is
  'Machine translations, keyed by a hash of the source text rather than by the '
  'row it came from — so identical text is translated once for everyone, and an '
  'edit retranslates rather than showing stale words.';

/*
 * Readable by any signed-in account. There is nothing here that is not already
 * visible to somebody: a translation is only ever created for text the caller
 * could already read, and the table holds no author, no post id and no reader.
 * Writes go through the edge function as `service_role`.
 */
drop policy if exists translations_read on public.translations;
create policy translations_read on public.translations
  for select to authenticated using (true);

revoke insert, update, delete on public.translations from authenticated, anon;
grant select on public.translations to authenticated;   -- see 0909/01 on why explicitly

-- ------------------------------------------------------------
-- Ask the cache
--
-- The client calls this first. A hit costs one index lookup and no money; a
-- miss sends the client to the edge function, which translates, stores, and
-- answers. Splitting it this way keeps the common case entirely inside the
-- database.
-- ------------------------------------------------------------
create or replace function public.cached_translation(p_source text, p_target text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  t      public.translations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_source, '')), '') is null then
    return null;
  end if;

  v_hash := encode(digest(btrim(p_source), 'sha256'), 'hex');

  select * into t from public.translations
   where source_hash = v_hash and target_lang = p_target;

  if t.source_hash is null then
    return null;                       -- a miss; the client calls the function
  end if;

  return jsonb_build_object(
    'translated',    t.translated,
    'detected_lang', t.detected_lang,
    'provider',      t.provider,
    'cached',        true
  );
end;
$$;

revoke all on function public.cached_translation(text, text) from public, anon;
grant execute on function public.cached_translation(text, text) to authenticated;

-- ------------------------------------------------------------
-- Store one
--
-- Called by the edge function as `service_role` after a provider answers.
-- Deliberately not callable by a signed-in account: a client that could write
-- here could put any words under anyone's post.
-- ------------------------------------------------------------
create or replace function public.store_translation(
  p_source        text,
  p_target        text,
  p_translated    text,
  p_provider      text,
  p_detected_lang text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Translations are written by the translate function only'
      using errcode = '42501';
  end if;

  insert into public.translations (
    source_hash, target_lang, translated, detected_lang, provider
  )
  values (
    encode(digest(btrim(p_source), 'sha256'), 'hex'),
    p_target, p_translated, p_detected_lang, p_provider
  )
  on conflict (source_hash, target_lang) do update
    set translated    = excluded.translated,
        detected_lang = excluded.detected_lang,
        provider      = excluded.provider,
        created_at    = now();
end;
$$;

revoke all on function public.store_translation(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.store_translation(text, text, text, text, text)
  to service_role;

-- ------------------------------------------------------------
-- Housekeeping
--
-- A translation is cheap to recompute and the table only grows, so anything
-- nobody has asked for in three months is not worth storing. Run from a
-- scheduled job; it is written to be safe to run at any time.
-- ------------------------------------------------------------
create or replace function private.prune_translations(p_older_than interval default '90 days')
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gone integer;
begin
  delete from public.translations where created_at < now() - p_older_than;
  get diagnostics v_gone = row_count;
  return v_gone;
end;
$$;

/*
 * Service role only. This deletes rows, and `authenticated` inherits an
 * explicit grant on the private schema from an earlier migration, so without
 * this revoke any signed-in account could empty the cache — which is not a
 * data breach, but it is a free way to run up a translation bill.
 */
revoke all on function private.prune_translations(interval) from public, anon, authenticated;
grant execute on function private.prune_translations(interval) to service_role;
