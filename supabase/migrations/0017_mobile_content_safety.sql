-- Mobile content-safety actions and complete story insights.
-- The local Supabase CLI could not generate this file because the installed
-- x64 CLI crashes under the arm64 host, so this follows the repository's
-- existing sequential migration convention.

grant insert on table public.moderation_reports to authenticated;

drop policy if exists moderation_reports_user_insert on public.moderation_reports;
create policy moderation_reports_user_insert
  on public.moderation_reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and severity in ('low', 'medium', 'high')
    and resolved_by is null
    and resolution is null
  );

drop policy if exists story_views_select on public.story_views;
create policy story_views_select
  on public.story_views
  for select
  to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (
      select 1
      from public.stories
      where stories.id = story_views.story_id
        and stories.author_id = (select auth.uid())
    )
  );
