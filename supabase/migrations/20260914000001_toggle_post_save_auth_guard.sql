create or replace function public.toggle_post_save(p_post uuid)
returns jsonb
language plpgsql
security definer
as $$
declare v_saved boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select exists (select 1 from public.post_saves
                 where post_id = p_post and user_id = auth.uid()) into v_saved;
  if v_saved then
    delete from public.post_saves where post_id = p_post and user_id = auth.uid();
  else
    insert into public.post_saves (post_id, user_id)
    values (p_post, auth.uid()) on conflict do nothing;
  end if;
  return jsonb_build_object('saved', not v_saved);
end;
$$;