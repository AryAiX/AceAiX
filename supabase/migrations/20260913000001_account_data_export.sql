-- Return only data owned by the authenticated account. Keeping the ownership
-- joins in PostgreSQL prevents public athlete media from leaking into exports.
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
      'opportunity applications', 'owned athlete media'
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
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
