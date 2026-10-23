-- Remove stray notification triggers (QA-109)
--
-- Dev had four notification triggers that are not in any migration:
-- trg_notify_on_follow, trg_notify_on_like, trg_notify_on_comment and
-- trg_notify_on_message, calling public.notify_on_*(). They were added by
-- hand and ran next to the real triggers from
-- 20260904000004_notifications_and_counters.sql, so every follow, like,
-- comment and message wrote two notification rows. Their rows have no
-- actor or target, and they bypass private.notify, so notification
-- settings and blocks were not respected for them.
--
-- prd does not have them (checked 2026-10-23). Every statement is
-- "if exists", so on a clean database this does nothing.

drop trigger if exists trg_notify_on_follow  on public.follows;
drop trigger if exists trg_notify_on_like    on public.post_likes;
drop trigger if exists trg_notify_on_comment on public.post_comments;
drop trigger if exists trg_notify_on_message on public.messages;

drop function if exists public.notify_on_follow();
drop function if exists public.notify_on_like();
drop function if exists public.notify_on_comment();
drop function if exists public.notify_on_message();