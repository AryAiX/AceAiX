-- Saved mention offsets go stale when the text they point into changes.
-- authenticated can update that text and cannot update mentions
-- (20260904000005), so the old offsets would land on the wrong
-- characters. Clear them, unless the same update also writes mentions
-- (a trusted writer re-tagging the new text). Audience, media, and tags are not in the
-- column list, so those updates keep the mentions.
--
-- Which text. createPost writes the caption into both posts.caption
-- and posts.text. private.validate_mentions measures start/length
-- against coalesce(caption, text): the caption when it is set, and
-- the text column only when caption is null. The feed shows that
-- same string. A comment is measured against body.
--
-- The functions only assign NEW, so they run as the invoker.
--
-- Re-runnable. Functions are replaced in place. Triggers are dropped
-- and created. Nothing here drops a function.

create or replace function private.trg_clear_post_mentions()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.caption, new.text, '')
       is distinct from coalesce(old.caption, old.text, '')
     and new.mentions is not distinct from old.mentions then
    new.mentions := '[]'::jsonb;
  end if;
  return new;
end;
$$;

create or replace function private.trg_clear_comment_mentions()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.body is distinct from old.body
     and new.mentions is not distinct from old.mentions then
    new.mentions := '[]'::jsonb;
  end if;
  return new;
end;
$$;

revoke all on function private.trg_clear_post_mentions() from public, anon, authenticated;
revoke all on function private.trg_clear_comment_mentions() from public, anon, authenticated;
grant execute on function private.trg_clear_post_mentions() to service_role;
grant execute on function private.trg_clear_comment_mentions() to service_role;

drop trigger if exists trg_posts_clear_mentions_on_edit on public.posts;
create trigger trg_posts_clear_mentions_on_edit
  before update of caption, text on public.posts
  for each row execute function private.trg_clear_post_mentions();

drop trigger if exists trg_comments_clear_mentions_on_edit on public.post_comments;
create trigger trg_comments_clear_mentions_on_edit
  before update of body on public.post_comments
  for each row execute function private.trg_clear_comment_mentions();
