-- ============================================================
-- Translation cache: hash with the built-in sha256()
--
-- Both functions pin search_path to `public, pg_temp`, but on hosted Supabase
-- pgcrypto lives in the `extensions` schema. The bare digest() call failed
-- with 42883, so every lookup missed and every store was lost — each view of
-- a translated post went back to the provider and spent quota.
--
-- pg_catalog.sha256() gives the same hex for UTF-8 text and resolves the same
-- way on hosted Supabase and a plain local Postgres.
-- ============================================================

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

  v_hash := encode(sha256(convert_to(btrim(p_source), 'UTF8')), 'hex');

  select * into t from public.translations
   where source_hash = v_hash and target_lang = p_target;

  if t.source_hash is null then
    return null;
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
    encode(sha256(convert_to(btrim(p_source), 'UTF8')), 'hex'),
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
