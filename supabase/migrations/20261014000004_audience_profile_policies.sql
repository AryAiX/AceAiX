-- ------------------------------------------------------------
-- 3. Policies that test minority themselves, instead of the helpers.
--    posts, stories, and athlete_media already call the helpers.
-- ------------------------------------------------------------
drop policy if exists up_select_authenticated on public.user_profiles;
create policy up_select_authenticated on public.user_profiles
  for select to authenticated
  using (
    (
      id = auth.uid()
      or private.is_admin()
      or (
        not coalesce(is_suspended, false)
        and (
          not coalesce(is_minor, false)
          or coalesce(is_discoverable, false)
        )
      )
      or exists (
        select 1
        from public.guardian_consents g
        where g.minor_user_id = user_profiles.id
          and g.guardian_user_id = auth.uid()
          and g.status = 'granted'
      )
    )
    and not (private.viewer_is_audience() and coalesce(is_minor, true) and id <> auth.uid())
  );

drop policy if exists ap_select_authenticated on public.athlete_profiles;
create policy ap_select_authenticated on public.athlete_profiles
  for select to authenticated
  using (
    (
      user_id = auth.uid()
      or private.is_admin()
      or exists (
        select 1
        from public.user_profiles u
        where u.id = athlete_profiles.user_id
          and not coalesce(u.is_minor, false)
          and not coalesce(u.is_suspended, false)
      )
      or exists (
        select 1
        from public.guardian_consents g
        where g.minor_user_id = athlete_profiles.user_id
          and g.guardian_user_id = auth.uid()
          and g.status = 'granted'
      )
    )
    and not (
      private.viewer_is_audience()
      and private.profile_is_minor(athlete_profiles.user_id)
      and athlete_profiles.user_id <> auth.uid()
    )
  );

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select
on public.post_comments for select
to authenticated
using (
  (
    author_id = auth.uid()
    or (
      not is_hidden
      and exists (select 1 from public.posts p where p.id = post_comments.post_id)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = post_comments.author_id)
           or (b.blocker_id = post_comments.author_id and b.blocked_id = auth.uid())
      )
    )
  )
  and not (
    private.viewer_is_audience()
    and private.profile_is_minor(post_comments.author_id)
    and post_comments.author_id <> auth.uid()
  )
);
