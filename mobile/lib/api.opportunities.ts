import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import {
  myApplications,
  myPostedOpportunities,
  opportunityApplicants,
  recommendedOpportunities,
} from '@/lib/api';
import type {
  Applicant,
  ApplicationStatus,
  Opportunity,
  Organization,
} from '@/types/models';

/**
 * Opportunity calls that lib/api.ts does not cover.
 *
 * `recommended_opportunities` is the only source of a match percentage, and it
 * returns nothing but live, unexpired postings. Every other view of an
 * opportunity — a saved one, one you already applied to, a closed one — has to
 * come from the table, which is why the shapes below exist: a screen must be
 * able to render an opportunity it can no longer be matched against.
 */

const ORG_COLUMNS =
  'id, name, type, logo_url, cover_url, description, city, country, league, is_verified, followers_count';

const OPPORTUNITY_COLUMNS =
  'id, title, type, description, location, sport, position, application_deadline, organization_id, created_by_id, is_active, created_at';

interface OpportunityRow {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  location: string | null;
  sport: string | null;
  position: string | null;
  application_deadline: string | null;
  organization_id: string | null;
  created_by_id: string;
  is_active: boolean;
  created_at: string;
}

export interface OpportunityDetail extends Opportunity {
  created_by_id: string;
  is_active: boolean;
  organization: Organization | null;
  /** The viewer's own application, when they have one. */
  application: { id: string; status: ApplicationStatus; created_at: string } | null;
  /** Only meaningful for the posting's owner; zero for everybody else. */
  applicant_count: number;
}

export interface PostedOpportunity {
  id: string;
  title: string;
  type: string | null;
  sport: string | null;
  position: string | null;
  location: string | null;
  deadline: string | null;
  is_active: boolean;
  applicant_count: number;
  created_at: string;
}

export interface AppliedOpportunity {
  application_id: string;
  status: ApplicationStatus;
  message: string | null;
  applied_at: string;
  opportunity: Opportunity;
}

/** An applicant carried together with the posting they applied to. */
export interface RankedApplicant extends Applicant {
  opportunity_id: string;
  opportunity_title: string;
}

export type ApplicantsResult =
  | { allowed: true; applicants: Applicant[] }
  | { allowed: false };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AppError('Not signed in');
  return data.user.id;
}

/** PostgREST returns an embedded row as an object, or an array on some joins. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function toOpportunity(
  row: OpportunityRow,
  org: Organization | null,
  extras: Partial<Pick<Opportunity, 'match_percent' | 'reasons' | 'has_applied' | 'is_saved'>> = {},
): Opportunity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    location: row.location,
    sport: row.sport,
    position: row.position,
    deadline: row.application_deadline,
    org_id: org?.id ?? row.organization_id,
    org_name: org?.name ?? null,
    org_logo: org?.logo_url ?? null,
    org_verified: org?.is_verified ?? false,
    match_percent: extras.match_percent ?? 0,
    reasons: extras.reasons ?? [],
    has_applied: extras.has_applied ?? false,
    is_saved: extras.is_saved ?? false,
    created_at: row.created_at,
  };
}

/**
 * Match percentage and reasons for every opportunity currently open to this
 * athlete, keyed by id. Used to enrich rows that came from the table.
 */
async function matchIndex(): Promise<Map<string, { percent: number; reasons: string[] }>> {
  const index = new Map<string, { percent: number; reasons: string[] }>();
  try {
    const rows = await recommendedOpportunities(50);
    for (const row of rows) {
      index.set(row.id, {
        percent: Number(row.match_percent) || 0,
        reasons: toStringArray(row.reasons),
      });
    }
  } catch {
    /* A recruiter account has no athlete profile to match against, and a
       missing match must never take the list down with it. */
  }
  return index;
}

// ── One opportunity ──────────────────────────────────────────────────────────
/**
 * Returns null when the posting is gone, or closed and not the viewer's own —
 * RLS hides an inactive posting from everyone but its owner.
 */
export async function getOpportunity(id: string): Promise<OpportunityDetail | null> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from('opportunities')
    .select(`${OPPORTUNITY_COLUMNS}, organization:organizations(${ORG_COLUMNS})`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new AppError(error);
  if (!data) return null;

  const row = data as OpportunityRow & { organization?: Organization | Organization[] | null };
  const organization = one<Organization>(row.organization ?? null);

  const [application, save, count] = await Promise.all([
    supabase
      .from('applications')
      .select('id, status, created_at')
      .eq('opportunity_id', id)
      .eq('athlete_id', uid)
      .maybeSingle(),
    supabase
      .from('opportunity_saves')
      .select('opportunity_id')
      .eq('opportunity_id', id)
      .eq('athlete_id', uid)
      .maybeSingle(),
    row.created_by_id === uid
      ? supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('opportunity_id', id)
      : Promise.resolve({ count: 0 }),
  ]);

  const mine = (application.data ?? null) as
    | { id: string; status: ApplicationStatus; created_at: string }
    | null;

  return {
    ...toOpportunity(row, organization, {
      has_applied: !!mine && mine.status !== 'withdrawn',
      is_saved: !!save.data,
    }),
    created_by_id: row.created_by_id,
    is_active: row.is_active,
    organization,
    application: mine,
    applicant_count: Number(count.count ?? 0),
  };
}

/** The match for one opportunity, or null when it cannot be explained. */
export async function getOpportunityMatch(
  id: string,
): Promise<{ percent: number; reasons: string[] } | null> {
  const index = await matchIndex();
  return index.get(id) ?? null;
}

/**
 * Re-open an application the athlete withdrew.
 *
 * `applications` is unique on (opportunity_id, athlete_id), so a second insert
 * comes back as "That already exists" — the withdrawn row has to be revived
 * instead. Without this, withdrawing is a one-way door.
 */
export async function reapplyToOpportunity(applicationId: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ status: 'applied', message })
    .eq('id', applicationId);
  if (error) throw new AppError(error);
}

// ── Saved ────────────────────────────────────────────────────────────────────
export async function savedOpportunities(): Promise<Opportunity[]> {
  const uid = await requireUserId();

  const [savesResult, matches] = await Promise.all([
    supabase
      .from('opportunity_saves')
      .select(
        `created_at, opportunity:opportunities(${OPPORTUNITY_COLUMNS}, organization:organizations(${ORG_COLUMNS}))`,
      )
      .eq('athlete_id', uid)
      .order('created_at', { ascending: false })
      .limit(100),
    matchIndex(),
  ]);

  if (savesResult.error) throw new AppError(savesResult.error);

  const rows = (savesResult.data ?? []) as unknown as {
    opportunity?:
      | (OpportunityRow & { organization?: Organization | Organization[] | null })
      | (OpportunityRow & { organization?: Organization | Organization[] | null })[]
      | null;
  }[];

  return rows
    .map((r) => one(r.opportunity ?? null))
    .filter((row): row is OpportunityRow & { organization?: Organization | Organization[] | null } => !!row)
    .map((row) => {
      const match = matches.get(row.id);
      return toOpportunity(row, one<Organization>(row.organization ?? null), {
        is_saved: true,
        match_percent: match?.percent ?? 0,
        reasons: match?.reasons ?? [],
      });
    });
}

// ── Applied ──────────────────────────────────────────────────────────────────
/**
 * `myApplications()` embeds the raw opportunity row without its organisation,
 * so the clubs are fetched in one follow-up query rather than one per card.
 */
export async function myApplicationsDetailed(): Promise<AppliedOpportunity[]> {
  const rows = (await myApplications()) as unknown as {
    id: string;
    status: ApplicationStatus;
    message: string | null;
    created_at: string;
    opportunity?: OpportunityRow | OpportunityRow[] | null;
  }[];

  const withOpportunity = rows
    .map((r) => ({ ...r, opportunity: one<OpportunityRow>(r.opportunity ?? null) }))
    .filter((r): r is typeof r & { opportunity: OpportunityRow } => !!r.opportunity);

  const orgIds = Array.from(
    new Set(
      withOpportunity
        .map((r) => r.opportunity.organization_id)
        .filter((id): id is string => !!id),
    ),
  );

  const orgs = new Map<string, Organization>();
  if (orgIds.length > 0) {
    const { data, error } = await supabase
      .from('organizations')
      .select(ORG_COLUMNS)
      .in('id', orgIds);
    if (error) throw new AppError(error);
    for (const org of (data ?? []) as Organization[]) orgs.set(org.id, org);
  }

  return withOpportunity.map((r) => ({
    application_id: r.id,
    status: r.status,
    message: r.message,
    applied_at: r.created_at,
    opportunity: toOpportunity(
      r.opportunity,
      r.opportunity.organization_id ? orgs.get(r.opportunity.organization_id) ?? null : null,
      { has_applied: r.status !== 'withdrawn' },
    ),
  }));
}

// ── Recruiter side ───────────────────────────────────────────────────────────
export async function myPostings(): Promise<PostedOpportunity[]> {
  const rows = (await myPostedOpportunities()) as unknown as (OpportunityRow & {
    applications?: { count: number }[] | { count: number } | null;
  })[];

  return rows.map((row) => {
    const counts = row.applications;
    const applicant_count = Array.isArray(counts)
      ? Number(counts[0]?.count ?? 0)
      : Number(counts?.count ?? 0);

    return {
      id: row.id,
      title: row.title,
      type: row.type,
      sport: row.sport,
      position: row.position,
      location: row.location,
      deadline: row.application_deadline,
      is_active: row.is_active,
      applicant_count,
      created_at: row.created_at,
    };
  });
}

/** True when the database refused the read because the viewer is not the owner. */
function isPermissionDenied(error: unknown): boolean {
  const raw = (error as { raw?: { code?: string } })?.raw;
  return raw?.code === '42501';
}

/**
 * Applicants for one posting.
 *
 * `opportunity_applicants` raises 42501 for anybody who is not the poster or an
 * org member with a review role. That is a normal, expected answer for a shared
 * link — not a failure — so it comes back as data the screen can render.
 */
export async function reviewApplicants(opportunityId: string): Promise<ApplicantsResult> {
  try {
    const applicants = await opportunityApplicants(opportunityId);
    return { allowed: true, applicants };
  } catch (err) {
    if (isPermissionDenied(err)) return { allowed: false };
    throw err;
  }
}

/**
 * Every applicant across every posting this recruiter owns, best fit first.
 *
 * Capped at the most recent postings: a scout who has posted for years does not
 * want forty round trips before the first name appears.
 */
export async function allApplicants(maxPostings = 12): Promise<RankedApplicant[]> {
  const postings = (await myPostings()).slice(0, maxPostings);
  if (postings.length === 0) return [];

  const batches = await Promise.all(
    postings.map(async (posting) => {
      const result = await reviewApplicants(posting.id).catch(() => ({ allowed: false }) as const);
      if (!result.allowed) return [];
      return result.applicants.map((applicant) => ({
        ...applicant,
        opportunity_id: posting.id,
        opportunity_title: posting.title,
      }));
    }),
  );

  return batches
    .flat()
    .sort(
      (a, b) =>
        b.match_percent - a.match_percent ||
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
    );
}

/** The organisation this account posts on behalf of, if any. */
export async function myOrganization(): Promise<Organization | null> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from('organization_members')
    .select(`organization:organizations(${ORG_COLUMNS})`)
    .eq('user_id', uid)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(error);
  if (!data) return null;

  return one<Organization>(
    (data as { organization?: Organization | Organization[] | null }).organization ?? null,
  );
}

// ── Organisations ────────────────────────────────────────────────────────────
export interface OrganizationPage {
  organization: Organization;
  following: boolean;
}

export async function getOrganizationPage(id: string): Promise<OrganizationPage | null> {
  const { data: auth } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('organizations')
    .select(ORG_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new AppError(error);
  if (!data) return null;

  let following = false;
  if (auth.user) {
    const { data: follow } = await supabase
      .from('organization_follows')
      .select('organization_id')
      .eq('organization_id', id)
      .eq('follower_id', auth.user.id)
      .maybeSingle();
    following = !!follow;
  }

  return { organization: data as Organization, following };
}

/** Follow or unfollow a club. Returns the state the viewer ends up in. */
export async function setOrganizationFollow(
  organizationId: string,
  follow: boolean,
): Promise<boolean> {
  const uid = await requireUserId();

  if (!follow) {
    const { error } = await supabase
      .from('organization_follows')
      .delete()
      .eq('organization_id', organizationId)
      .eq('follower_id', uid);
    if (error) throw new AppError(error);
    return false;
  }

  const { error } = await supabase
    .from('organization_follows')
    .insert({ organization_id: organizationId, follower_id: uid });
  // 23505: already following. A double tap from a stale card is not a failure.
  if (error && (error as { code?: string }).code !== '23505') throw new AppError(error);
  return true;
}

/** A club's open postings, newest first. */
export async function organizationOpenings(
  organization: Organization,
): Promise<Opportunity[]> {
  const [result, matches] = await Promise.all([
    supabase
      .from('opportunities')
      .select(OPPORTUNITY_COLUMNS)
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30),
    matchIndex(),
  ]);

  if (result.error) throw new AppError(result.error);

  return ((result.data ?? []) as OpportunityRow[]).map((row) => {
    const match = matches.get(row.id);
    return toOpportunity(row, organization, {
      match_percent: match?.percent ?? 0,
      reasons: match?.reasons ?? [],
    });
  });
}
