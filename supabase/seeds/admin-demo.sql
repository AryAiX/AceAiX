-- ============================================================
-- Admin console demo data — LOCAL ONLY, never production.
-- Load after supabase/seeds/demo.sql:
--   psql -d aceaix_local -f supabase/seeds/admin-demo.sql
--
-- Adds a super admin and a moderator (password AceAiX-Demo-2026), a few
-- reports filed the way the app files them (through report_content), and
-- verification requests waiting for review.
-- ============================================================

select set_config('request.jwt.claim.role', 'service_role', false);

insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('ad000000-0000-4000-8000-000000000001', 'admin.demo@aceaix.com', crypt('AceAiX-Demo-2026', gen_salt('bf')),
   '{"full_name":"Parnia (Super Admin)","first_name":"Parnia","last_name":"Admin"}'),
  ('ad000000-0000-4000-8000-000000000002', 'mod.demo@aceaix.com', crypt('AceAiX-Demo-2026', gen_salt('bf')),
   '{"full_name":"Rezhina (Moderator)","first_name":"Rezhina","last_name":"Moderator"}')
on conflict (id) do nothing;

update public.user_profiles set role = 'super_admin', is_verified = true, onboarding_completed = true
 where id = 'ad000000-0000-4000-8000-000000000001';
update public.user_profiles set role = 'admin', is_verified = true, onboarding_completed = true
 where id = 'ad000000-0000-4000-8000-000000000002';
delete from public.athlete_profiles
 where user_id in ('ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000002');

-- Reports, filed as the app files them -----------------------------------
do $$
declare
  v_post uuid;
  v_post2 uuid;
  v_comment uuid;
  v_story uuid;
  v_msg uuid;
begin
  select id into v_post  from public.posts where author_id = 'a0000000-0000-4000-8000-000000000004' order by created_at desc limit 1;
  select id into v_post2 from public.posts where author_id = 'b0000000-0000-4000-8000-000000000001' order by created_at desc limit 1;
  select id into v_comment from public.post_comments order by created_at limit 1;
  select id into v_story from public.stories order by created_at limit 1;
  select id into v_msg from public.messages order by created_at limit 1;

  -- Layla reports a post as spam
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  if v_post is not null then
    perform public.report_content('post', v_post::text, 'spam', 'Same promo posted again and again.');
  end if;

  -- Omar (17) reports a coach's message — enters as high severity
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
  if v_msg is not null then
    perform public.report_content('message', v_msg::text, 'harassment', 'Keeps asking me to move to WhatsApp.');
  end if;
  if v_post2 is not null then
    perform public.report_content('post', v_post2::text, 'child_safety', 'Photo of younger players without permission.');
  end if;

  -- Sara reports a comment and a story
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
  if v_comment is not null then
    perform public.report_content('comment', v_comment::text, 'hate', 'Insulting comment about my country.');
  end if;
  if v_story is not null then
    perform public.report_content('story', v_story::text, 'nudity', null);
  end if;

  -- Daniel reports an unverified sponsor as an impersonator
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000005', true);
  perform public.report_content('user', '60000000-0000-4000-8000-000000000002', 'impersonation',
                                'Says they are Nike Middle East.');
end;
$$;

select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'service_role', false);

-- Verification requests waiting for review ---------------------------------
insert into public.verification_requests (subject_user_id, type, status, documents, created_at)
values
  ('b0000000-0000-4000-8000-000000000002', 'recruiter', 'pending',
   '[{"name":"UEFA B licence.pdf","kind":"licence"},{"name":"Passport.jpg","kind":"id"}]', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000002', 'sponsor', 'pending',
   '[{"name":"Trade licence.pdf","kind":"trade_licence"}]', now() - interval '5 hours')
on conflict do nothing;

-- Spread sign-up dates so the dashboard chart has a shape --------------------
update public.user_profiles set created_at = now() - (random() * interval '28 days')
 where id::text not like 'ad000000%';

select 'admin demo ready' as status,
       (select count(*) from public.moderation_reports) as reports,
       (select count(*) from public.verification_requests where status = 'pending') as pending_verifications;

-- Sport Fit totals for the admin console --------------------------------------
-- Thirty demo athletes (sf.demo.N@aceaix.com, LOCAL ONLY) answer Sport Fit with
-- varied answers, so the Sport Fit page has totals large enough to show.
do $$
declare
  n int;
  v_id uuid;
  v_answers jsonb;
  v_band int;
begin
  for n in 1..30 loop
    v_id := ('5f000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    perform set_config('request.jwt.claim.role', 'service_role', true);
    perform set_config('request.jwt.claim.sub', '', true);
    insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
    values (v_id, 'sf.demo.' || n || '@aceaix.com', crypt('AceAiX-Demo-2026', gen_salt('bf')),
            jsonb_build_object('full_name', 'Demo Player ' || n, 'role', 'athlete'))
    on conflict (id) do nothing;
    v_band := case when n % 3 = 0 then 16 when n % 3 = 1 then 20 else 27 end;
    update public.user_private set date_of_birth = current_date - make_interval(years => v_band)
     where user_id = v_id;

    select jsonb_object_agg(i.id,
             case when i.expected is not null then i.expected
                  else 1 + (('x' || substr(md5('sf' || n || i.id), 1, 6))::bit(24)::int % 5) end)
      into v_answers from public.sport_fit_items i;

    perform set_config('request.jwt.claim.sub', v_id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    begin
      if n % 8 = 0 then
        perform public.sport_fit_submit(v_answers, 20);   -- too fast: not scored
      end if;
      perform public.sport_fit_submit(v_answers, 120 + n);
    exception when others then null;
    end;
  end loop;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);
  /* Spread the dates over the last month. */
  update public.sport_fit_results set created_at = now() - (random() * interval '25 days')
   where user_id::text like '5f000000%';
end;
$$;
