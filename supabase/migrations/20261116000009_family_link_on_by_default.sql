-- ============================================================
-- A parent-child link is shown by default (QA-209)
--
-- QA-206 added show_on_profile with false as the default. The
-- decision (Tooraj, 17 November) is that a new link is shown
-- by default and a parent can switch it off. Links that already
-- exist stay hidden until the parent switches them on, so this
-- migration only changes the default and updates no rows.
-- private.can_see_family still decides who sees the link (the
-- child and the parent, otherwise only a coach, club, scout or
-- sponsor, only while the child is discoverable, with no
-- suspension and no block), so a hidden child is still never
-- revealed.
--
-- NEEDS TOORAJ'S OK because it shows new parent-child links by default.
-- ============================================================

alter table public.guardian_consents
  alter column show_on_profile set default true;
