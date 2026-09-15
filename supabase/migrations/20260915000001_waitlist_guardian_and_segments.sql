-- ============================================================================
-- The waitlist grows up: under-18s, through a guardian
--
-- The first version of this table was 18+ only, and said so with
-- `check (is_adult)` — a row that did not assert adulthood could not exist.
-- That was the right call for a form at the bottom of a marketing page, where
-- the alternative was quietly holding children's email addresses.
--
-- It is the wrong call for a dedicated early-access page, for a reason that is
-- obvious once stated: **AceAiX is for 13–25 year-olds.** A sign-up page for a
-- youth sports app that refuses everybody under eighteen turns away most of
-- the demand it exists to measure.
--
-- So minors are admitted, on one condition the database enforces: we never
-- hold a child's email address. A minor signs up by giving a parent's or
-- guardian's address, and that is the address we write to. The child's own
-- contact details are never collected, never stored, and never mailed.
--
--   is_adult = true   → `email` belongs to the person signing up
--   is_adult = false  → `email` belongs to their parent or guardian, and
--                       `guardian_email` is not null, and they are the same
--
-- That last equality is what stops a future edit quietly reintroducing a
-- child's address into `email` while leaving a guardian's in the other column.
--
-- Also adds the segmentation columns the early-access page collects, so a
-- launch email to a fifteen-year-old's parent can say something different
-- from one to a club.
--
-- See docs/25-the-waitlist.md.
-- ============================================================================

-- ── Segmentation ────────────────────────────────────────────────────────────

alter table public.waitlist add column if not exists role    text;
alter table public.waitlist add column if not exists sport   text;
alter table public.waitlist add column if not exists country text;

comment on column public.waitlist.role is
  'Self-declared, from the sign-up form: athlete, coach, club, scout or parent. Not a permission — it decides which launch email they get and nothing else.';

-- ── The guardian path ───────────────────────────────────────────────────────

alter table public.waitlist add column if not exists guardian_email text;

comment on column public.waitlist.guardian_email is
  'Set only when is_adult is false, and always equal to `email`. Kept as its own column so the constraint below can state the rule, and so a query can find guardian rows without inferring anything.';

/* The original rule, which is now too strong. */
alter table public.waitlist drop constraint if exists waitlist_is_adult_check;

/* Its replacement. A minor row must carry a guardian address, and that
   address must be the one we would actually write to — so there is no way to
   end up mailing a child while a guardian's address sits unused beside it. */
alter table public.waitlist drop constraint if exists waitlist_guardian_required;
alter table public.waitlist add constraint waitlist_guardian_required check (
  (is_adult and guardian_email is null)
  or
  (not is_adult and guardian_email is not null and lower(btrim(guardian_email)) = lower(btrim(email)))
);

/* Rows to be told apart at a glance when somebody reads the list. */
create index if not exists idx_waitlist_minor on public.waitlist (is_adult, created_at desc);
create index if not exists idx_waitlist_role  on public.waitlist (role) where role is not null;

-- ── One view, so reading the list does not mean remembering the rule ────────

create or replace view public.waitlist_readable as
select
  id,
  email,
  first_name,
  case when is_adult then 'adult' else 'guardian of a minor' end as contact_is,
  role, sport, country, status, source, locale,
  confirmed_at, created_at
from public.waitlist;

comment on view public.waitlist_readable is
  'The waitlist without the tokens or the IP hash. Same RLS as the table underneath, so it is still admin-only.';

/* A view is not covered by the table's grants, and `security_invoker` makes it
   run as the caller so the table's own policy still decides. Without that, a
   view over an RLS-protected table runs as its owner and hands everybody
   everything — the exact hole the table was written to avoid. */
alter view public.waitlist_readable set (security_invoker = true);
revoke all on public.waitlist_readable from anon, authenticated;
grant select on public.waitlist_readable to authenticated;  -- narrowed by the table's policy
