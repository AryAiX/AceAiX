create or replace function public.toggle_media_like(p_media_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_liked boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.media_likes
    where media_id = p_media_id and user_id = auth.uid()
  ) then
    delete from public.media_likes
    where media_id = p_media_id and user_id = auth.uid();
    v_liked := false;
  else
    insert into public.media_likes (media_id, user_id)
    values (p_media_id, auth.uid());
    v_liked := true;
  end if;

  return v_liked;
end;
$$;

revoke execute on function public.toggle_media_like(uuid) from public, anon;
grant execute on function public.toggle_media_like(uuid) to authenticated;
