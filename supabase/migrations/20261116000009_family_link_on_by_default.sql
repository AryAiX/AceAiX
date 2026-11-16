-- ============================================================
-- A parent-child link is shown by default (QA-209)
--
-- QA-206 added show_on_profile with false as the default. The
-- decision is that the link is shown by default and a parent
-- can switch it off. The default becomes true and every
-- existing link is set to shown once here. A parent who wants
-- it hidden switches it off in Parent and guardian settings
-- through set_guardian_on_profile. Nothing else changes.
-- private.can_see_family still decides who sees the link (the
-- child and the parent, otherwise only a coach, club, scout or
-- sponsor, only while the child is discoverable, with no
-- suspension and no block), so a hidden child is still never
-- revealed. show_on_profile is not watched by any notification
-- trigger, so this update sends nobody a notice.
--
-- NEEDS TOORAJ'S OK because it shows existing parent-child links by default.
-- ============================================================

alter table public.guardian_consents
  alter column show_on_profile set default true;

update public.guardian_consents
   set show_on_profile = true
 where show_on_profile is distinct from true;
