alter function public.toggle_media_like(uuid) set search_path = public, pg_temp;
revoke execute on function public.toggle_media_like(uuid) from public, anon;
grant execute on function public.toggle_media_like(uuid) to authenticated;
