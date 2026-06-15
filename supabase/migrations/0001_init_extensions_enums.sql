-- ============================================================
-- 0001 — Extensions, schemas, enums, shared functions
-- AceAiX foundation (P1 core). Source of truth: docs/03-data-model.md
-- ============================================================

-- Private schema for SECURITY DEFINER helpers (NOT exposed via Data API)
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Extensions
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;      -- pgvector (semantic search, later phases)

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type user_role          as enum ('athlete','scout','club','coach','medical_partner','federation','guardian','org_admin','admin','guest');
create type verification_status as enum ('pending','approved','rejected','expired','more_info');
create type subscription_tier   as enum ('free','pro','elite','enterprise');
create type media_type_enum     as enum ('video','image','highlight_reel','document');
create type connection_status   as enum ('pending','accepted','blocked');
create type clearance_status    as enum ('cleared','restricted','not_cleared','pending');
create type org_type            as enum ('club','federation','academy');
create type contact_status      as enum ('sent','accepted','declined','expired');
create type consent_status      as enum ('granted','revoked','pending');
create type record_source       as enum ('self','verified','cv');

-- ------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
