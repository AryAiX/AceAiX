-- ============================================================
-- 0008 — RLS helper functions + policies + grants
-- Authorization boundary. SECURITY DEFINER helpers live in `private`
-- (not exposed via Data API) and bypass RLS to avoid recursion.
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (private schema, SECURITY DEFINER, STABLE)
-- ------------------------------------------------------------
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.owns_athlete(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.athlete_profiles ap where ap.id = p_athlete and ap.user_id = auth.uid());
$$;

create or replace function private.has_medical_consent(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.medical_consents mc
    where mc.athlete_id = p_athlete
      and mc.status = 'granted'
      and mc.grantee_user_id = auth.uid()
  );
$$;

create or replace function private.is_verified_partner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.medical_partners mp
    where mp.user_id = auth.uid() and mp.accreditation_status = 'approved'
  );
$$;

create or replace function private.owns_watchlist(p_wl uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.watchlists w where w.id = p_wl and w.user_id = auth.uid());
$$;

create or replace function private.in_conversation(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conv and (c.participant_1_id = auth.uid() or c.participant_2_id = auth.uid())
  );
$$;

create or replace function private.owns_ai_session(p_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ai_chat_sessions s where s.id = p_session and s.user_id = auth.uid());
$$;

-- ============================================================
-- POLICIES
-- ============================================================

-- ---- user_profiles (public-safe) ----
create policy up_select  on public.user_profiles for select to anon, authenticated using (true);
create policy up_insert  on public.user_profiles for insert to authenticated with check (id = auth.uid());
create policy up_update  on public.user_profiles for update to authenticated using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());
create policy up_delete  on public.user_profiles for delete to authenticated using (private.is_admin());

-- ---- user_private (sensitive PII) ----
create policy upv_select on public.user_private for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy upv_insert on public.user_private for insert to authenticated with check (user_id = auth.uid());
create policy upv_update on public.user_private for update to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());

-- ---- athlete_profiles ----
create policy ap_select on public.athlete_profiles for select to anon, authenticated using (true);
create policy ap_insert on public.athlete_profiles for insert to authenticated with check (user_id = auth.uid());
create policy ap_update on public.athlete_profiles for update to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());
create policy ap_delete on public.athlete_profiles for delete to authenticated using (user_id = auth.uid() or private.is_admin());

-- ---- athlete_attributes ----
create policy aa_select on public.athlete_attributes for select to anon, authenticated using (true);
create policy aa_write  on public.athlete_attributes for all to authenticated using (private.owns_athlete(athlete_id) or private.is_admin()) with check (private.owns_athlete(athlete_id) or private.is_admin());

-- ---- scout_profiles ----
create policy sp_select on public.scout_profiles for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy sp_insert on public.scout_profiles for insert to authenticated with check (user_id = auth.uid());
create policy sp_update on public.scout_profiles for update to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());

-- ---- organizations (org-admin role deferred to P2 -> admin-managed for now) ----
create policy org_select on public.organizations for select to anon, authenticated using (true);
create policy org_write  on public.organizations for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---- athlete_media ----
create policy am_select on public.athlete_media for select to anon, authenticated using (is_public = true or private.owns_athlete(athlete_id) or private.is_admin());
create policy am_write  on public.athlete_media for all to authenticated using (private.owns_athlete(athlete_id) or private.is_admin()) with check (private.owns_athlete(athlete_id) or private.is_admin());

-- ---- match_records ----
create policy mr_select on public.match_records for select to anon, authenticated using (true);
create policy mr_write  on public.match_records for all to authenticated using (private.owns_athlete(athlete_id) or private.is_admin()) with check (private.owns_athlete(athlete_id) or private.is_admin());

-- ---- medical_partners (public discovery; clinic user manages own) ----
create policy mp_select on public.medical_partners for select to anon, authenticated using (true);
create policy mp_insert on public.medical_partners for insert to authenticated with check (user_id = auth.uid() or private.is_admin());
create policy mp_update on public.medical_partners for update to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());
create policy mp_delete on public.medical_partners for delete to authenticated using (private.is_admin());

-- ---- medical_consents (athlete-controlled) ----
create policy mc_select on public.medical_consents for select to authenticated using (private.owns_athlete(athlete_id) or grantee_user_id = auth.uid() or private.is_admin());
create policy mc_insert on public.medical_consents for insert to authenticated with check (private.owns_athlete(athlete_id));
create policy mc_update on public.medical_consents for update to authenticated using (private.owns_athlete(athlete_id)) with check (private.owns_athlete(athlete_id));
create policy mc_delete on public.medical_consents for delete to authenticated using (private.owns_athlete(athlete_id));

-- ---- medical_records (CONSENT-GATED, APPEND-ONLY: select+insert only) ----
create policy med_select on public.medical_records for select to authenticated using (private.owns_athlete(athlete_id) or private.has_medical_consent(athlete_id) or private.is_admin());
create policy med_insert on public.medical_records for insert to authenticated with check (private.is_verified_partner() or private.is_admin());

-- ---- medical_clearances (consent-gated, append-only) ----
create policy mcl_select on public.medical_clearances for select to authenticated using (private.owns_athlete(athlete_id) or private.has_medical_consent(athlete_id) or private.is_admin());
create policy mcl_insert on public.medical_clearances for insert to authenticated with check (private.is_verified_partner() or private.is_admin());

-- ---- injuries (consent-gated, append-only) ----
create policy inj_select on public.injuries for select to authenticated using (private.owns_athlete(athlete_id) or private.has_medical_consent(athlete_id) or private.is_admin());
create policy inj_insert on public.injuries for insert to authenticated with check (private.is_verified_partner() or private.is_admin());

-- ---- medical_access_log (append-only) ----
create policy mal_select on public.medical_access_log for select to authenticated using (private.owns_athlete(athlete_id) or private.is_admin());
create policy mal_insert on public.medical_access_log for insert to authenticated with check (viewer_user_id = auth.uid() or private.is_admin());

-- ---- endorsements ----
create policy end_select on public.endorsements for select to anon, authenticated using (true);
create policy end_insert on public.endorsements for insert to authenticated with check (endorser_id = auth.uid());
create policy end_update on public.endorsements for update to authenticated using (endorser_id = auth.uid() or private.is_admin()) with check (endorser_id = auth.uid() or private.is_admin());
create policy end_delete on public.endorsements for delete to authenticated using (endorser_id = auth.uid() or private.is_admin());

-- ---- follows ----
create policy fol_select on public.follows for select to anon, authenticated using (true);
create policy fol_insert on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy fol_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

-- ---- recommendations ----
create policy rec_select on public.recommendations for select to anon, authenticated using (is_public = true or author_id = auth.uid() or recipient_id = auth.uid());
create policy rec_insert on public.recommendations for insert to authenticated with check (author_id = auth.uid());
create policy rec_update on public.recommendations for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy rec_delete on public.recommendations for delete to authenticated using (author_id = auth.uid() or private.is_admin());

-- ---- user_blocks ----
create policy blk_select on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy blk_insert on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blk_delete on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

-- ---- career_milestones ----
create policy cm_select on public.career_milestones for select to anon, authenticated using (true);
create policy cm_write  on public.career_milestones for all to authenticated using (private.owns_athlete(athlete_id) or private.is_admin()) with check (private.owns_athlete(athlete_id) or private.is_admin());

-- ---- saved_searches ----
create policy ss_all on public.saved_searches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- watchlists ----
create policy wl_all on public.watchlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- watchlist_athletes ----
create policy wla_all on public.watchlist_athletes for all to authenticated using (private.owns_watchlist(watchlist_id)) with check (private.owns_watchlist(watchlist_id));

-- ---- contact_requests ----
create policy cr_select on public.contact_requests for select to authenticated using (scout_id = auth.uid() or private.owns_athlete(athlete_id) or private.is_admin());
create policy cr_insert on public.contact_requests for insert to authenticated with check (scout_id = auth.uid());
create policy cr_update on public.contact_requests for update to authenticated using (scout_id = auth.uid() or private.owns_athlete(athlete_id)) with check (scout_id = auth.uid() or private.owns_athlete(athlete_id));

-- ---- opportunities ----
create policy opp_select on public.opportunities for select to anon, authenticated using (is_active = true or created_by_id = auth.uid() or private.is_admin());
create policy opp_insert on public.opportunities for insert to authenticated with check (created_by_id = auth.uid());
create policy opp_update on public.opportunities for update to authenticated using (created_by_id = auth.uid() or private.is_admin()) with check (created_by_id = auth.uid() or private.is_admin());
create policy opp_delete on public.opportunities for delete to authenticated using (created_by_id = auth.uid() or private.is_admin());

-- ---- conversations ----
create policy conv_select on public.conversations for select to authenticated using (participant_1_id = auth.uid() or participant_2_id = auth.uid());
create policy conv_insert on public.conversations for insert to authenticated with check (participant_1_id = auth.uid() or participant_2_id = auth.uid());
create policy conv_update on public.conversations for update to authenticated using (participant_1_id = auth.uid() or participant_2_id = auth.uid()) with check (participant_1_id = auth.uid() or participant_2_id = auth.uid());

-- ---- messages ----
create policy msg_select on public.messages for select to authenticated using (private.in_conversation(conversation_id));
create policy msg_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and private.in_conversation(conversation_id));
create policy msg_update on public.messages for update to authenticated using (private.in_conversation(conversation_id)) with check (private.in_conversation(conversation_id));

-- ---- notifications ----
create policy ntf_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy ntf_insert on public.notifications for insert to authenticated with check (auth.uid() is not null);
create policy ntf_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ntf_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ---- success_stories ----
create policy sst_select on public.success_stories for select to anon, authenticated using (is_published = true or private.is_admin());
create policy sst_write  on public.success_stories for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---- ai_chat_sessions ----
create policy acs_select on public.ai_chat_sessions for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy acs_insert on public.ai_chat_sessions for insert to authenticated with check (user_id = auth.uid());
create policy acs_update on public.ai_chat_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy acs_delete on public.ai_chat_sessions for delete to authenticated using (user_id = auth.uid() or private.is_admin());

-- ---- ai_chat_messages ----
create policy acm_select on public.ai_chat_messages for select to authenticated using (private.owns_ai_session(session_id) or private.is_admin());
create policy acm_insert on public.ai_chat_messages for insert to authenticated with check (private.owns_ai_session(session_id));

-- ---- audit_logs (append-only; admin read) ----
create policy al_select on public.audit_logs for select to authenticated using (private.is_admin());
create policy al_insert on public.audit_logs for insert to authenticated with check (auth.uid() is not null);

-- ---- platform_settings ----
create policy pst_select on public.platform_settings for select to anon, authenticated using (true);
create policy pst_write  on public.platform_settings for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---- verification_requests ----
create policy vr_select on public.verification_requests for select to authenticated using (subject_user_id = auth.uid() or private.is_admin());
create policy vr_insert on public.verification_requests for insert to authenticated with check (subject_user_id = auth.uid());
create policy vr_update on public.verification_requests for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- ============================================================
-- GRANTS — privilege layer (RLS is the real gate)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
