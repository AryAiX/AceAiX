-- Match preferences describe what a recruiter is looking for.
-- Athletes must not write them (UI already gates the screen; this closes the API).

drop policy if exists mpf_all on public.match_preferences;

create policy mpf_select on public.match_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy mpf_write on public.match_preferences
  for all to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('coach', 'club', 'scout')
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('coach', 'club', 'scout')
    )
  );

-- Drop any rows athletes accidentally wrote through the open policy.
delete from public.match_preferences mp
using public.user_profiles up
where mp.user_id = up.id
  and up.role not in ('coach', 'club', 'scout');
