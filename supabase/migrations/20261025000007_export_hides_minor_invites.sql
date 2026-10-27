-- "Download my data" lists the people someone invited, and who invited
-- them. A minor appears there only once a guardian has allowed discovery,
-- the same rule as referral_my_circle (20261025000001). Otherwise the
-- export would name a minor the circle hides.
-- Same signature as 20261023000001_referrals.sql.

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'included_data', jsonb_build_array(
      'account profile', 'private account details', 'athlete profile',
      'authored posts', 'authored comments', 'following relationships',
      'opportunity applications', 'owned athlete media',
      'game intelligence results', 'sport fit answers and results',
      'invites and tokens'
    ),
    'account', jsonb_build_object(
      'id', v_user,
      'email', (select au.email from auth.users au where au.id = v_user)
    ),
    'profile', (select to_jsonb(up) from public.user_profiles up where up.id = v_user),
    'private', (select to_jsonb(pr) from public.user_private pr where pr.user_id = v_user),
    'athlete', (select to_jsonb(ap) from public.athlete_profiles ap where ap.user_id = v_user),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at)
      from public.posts p where p.author_id = v_user
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at)
      from public.post_comments c where c.author_id = v_user
    ), '[]'::jsonb),
    'following', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.created_at)
      from public.follows f where f.follower_id = v_user
    ), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at)
      from public.applications a where a.athlete_id = v_user
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.athlete_media m
      join public.athlete_profiles ap on ap.id = m.athlete_id
      where ap.user_id = v_user
    ), '[]'::jsonb),
    'game_intelligence', jsonb_build_object(
      'profile', (select to_jsonb(g) from public.gi_profiles g where g.user_id = v_user),
      'results', coalesce((
        select jsonb_agg(to_jsonb(r) order by r.created_at)
        from public.gi_results r where r.user_id = v_user
      ), '[]'::jsonb)
    ),
    'sport_fit', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at)
      from public.sport_fit_results s where s.user_id = v_user
    ), '[]'::jsonb),
    'invites', jsonb_build_object(
      'code', (select code from public.referral_codes where user_id = v_user),
      'invited_by', (select private.referral_person(r.referrer_id) - 'is_minor'
                       from public.referrals r
                       join public.user_profiles up on up.id = r.referrer_id
                      where r.referred_id = v_user
                        and (not coalesce(up.is_minor, false)
                             or private.has_guardian_consent(r.referrer_id, 'discovery'))),
      'invited', coalesce((select jsonb_agg(
                   (private.referral_person(r.referred_id) - 'is_minor' - 'avatar_url')
                   || jsonb_build_object('status', r.status, 'joined_at', r.created_at) order by r.created_at)
                 from public.referrals r
                 join public.user_profiles up on up.id = r.referred_id
                where r.referrer_id = v_user
                  and (not coalesce(up.is_minor, false)
                       or private.has_guardian_consent(r.referred_id, 'discovery'))), '[]'::jsonb),
      'tokens', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id' order by l.created_at)
                 from public.token_ledger l where l.user_id = v_user), '[]'::jsonb)
    )
  );
end;
$$;


