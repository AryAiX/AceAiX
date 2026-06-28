import { supabase } from '@/lib/supabase';

export type OpportunityType = 'Trial' | 'Contract' | 'Academy' | 'Loan' | 'Tryout';
export type AppStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'trial_offered'
  | 'accepted'
  | 'not_selected';

export interface OpportunityRequirements {
  age_min?: number;
  age_max?: number;
  positions?: string[];
  attributes?: string[];
  nationality?: string;
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  posted_by: string | null;
  club: string;
  club_abbr: string | null;
  sport: string;
  position: string;
  type: OpportunityType;
  location: string;
  level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  description: string | null;
  requirements: OpportunityRequirements;
  deadline: string | null;
  status: string;
  created_at: string;
  // joined
  match_score?: number;
  match_reasons?: string[];
  saved?: boolean;
  applied?: boolean;
  application_status?: AppStatus;
  application_id?: string;
}

export interface Application {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  status: AppStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  opportunity?: Opportunity;
}

export interface OpportunityFilters {
  sport?: string;
  type?: OpportunityType;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  search?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRow(
  row: any,
  savedIds: Set<string>,
  matchMap: Map<string, { score: number; reasons: string[] }>,
  appliedMap: Map<string, { id: string; status: AppStatus }>
): Opportunity {
  const m = matchMap.get(row.id);
  const a = appliedMap.get(row.id);
  const org = row.organization ?? row.organizations;
  return {
    id: row.id,
    posted_by: row.posted_by ?? row.created_by_id ?? null,
    club: row.club ?? org?.name ?? row.title ?? 'Club opportunity',
    club_abbr: row.club_abbr ?? org?.short_name ?? org?.initials ?? null,
    sport: row.sport,
    position: row.position ?? 'Open role',
    type: (row.type ?? 'Trial') as OpportunityType,
    location: row.location ?? org?.city ?? org?.country ?? 'Location TBD',
    level: row.level ?? null,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    currency: row.currency,
    description: row.description,
    requirements: row.requirements ?? {},
    deadline: row.deadline ?? row.application_deadline ?? null,
    status: row.status ?? (row.is_active ? 'active' : 'closed'),
    created_at: row.created_at,
    match_score: m?.score,
    match_reasons: m?.reasons,
    saved: savedIds.has(row.id),
    applied: !!a,
    application_status: a?.status,
    application_id: a?.id,
  };
}

async function fetchSupportData(
  opportunityIds: string[],
  athleteId: string
): Promise<{
  savedIds: Set<string>;
  matchMap: Map<string, { score: number; reasons: string[] }>;
  appliedMap: Map<string, { id: string; status: AppStatus }>;
}> {
  if (!opportunityIds.length) {
    return { savedIds: new Set(), matchMap: new Map(), appliedMap: new Map() };
  }

  const [{ data: saves }, { data: matches }, { data: apps }] = await Promise.all([
    supabase
      .from('opportunity_saves')
      .select('opportunity_id')
      .eq('athlete_id', athleteId)
      .in('opportunity_id', opportunityIds),
    supabase
      .from('opportunity_matches')
      .select('opportunity_id, match_score, reasons')
      .eq('athlete_id', athleteId)
      .in('opportunity_id', opportunityIds),
    supabase
      .from('applications')
      .select('id, opportunity_id, status')
      .eq('athlete_id', athleteId)
      .in('opportunity_id', opportunityIds),
  ]);

  const savedIds = new Set((saves ?? []).map((s: any) => s.opportunity_id));
  const matchMap = new Map(
    (matches ?? []).map((m: any) => [
      m.opportunity_id,
      { score: m.match_score, reasons: m.reasons ?? [] },
    ])
  );
  const appliedMap = new Map(
    (apps ?? []).map((a: any) => [a.opportunity_id, { id: a.id, status: a.status as AppStatus }])
  );

  return { savedIds, matchMap, appliedMap };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function fetchForYouOpportunities(
  athleteId: string,
  filters?: OpportunityFilters
): Promise<Opportunity[]> {
  let q = supabase
    .from('opportunities')
    .select('*, organization:organizations(name, short_name, initials, city, country)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  q = applyFilters(q, filters);

  const { data, error } = await q;
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const { savedIds, matchMap, appliedMap } = await fetchSupportData(ids, athleteId);

  const mapped = data.map((r: any) => mapRow(r, savedIds, matchMap, appliedMap));

  // Sort by match_score desc, falling back to date
  return mapped.sort((a, b) => {
    const sa = a.match_score ?? 0;
    const sb = b.match_score ?? 0;
    if (sb !== sa) return sb - sa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function fetchAllOpportunities(
  athleteId: string,
  cursor?: string,
  filters?: OpportunityFilters,
  limit = 20
): Promise<Opportunity[]> {
  let q = supabase
    .from('opportunities')
    .select('*, organization:organizations(name, short_name, initials, city, country)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) q = q.lt('created_at', cursor);
  q = applyFilters(q, filters);

  const { data, error } = await q;
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const { savedIds, matchMap, appliedMap } = await fetchSupportData(ids, athleteId);

  return data.map((r: any) => mapRow(r, savedIds, matchMap, appliedMap));
}

export async function fetchSavedOpportunities(athleteId: string): Promise<Opportunity[]> {
  const { data: saves } = await supabase
    .from('opportunity_saves')
    .select('opportunity_id, opportunities(*, organization:organizations(name, short_name, initials, city, country))')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (!saves?.length) return [];

  const rows = saves.map((s: any) => s.opportunities).filter(Boolean);
  const ids = rows.map((r: any) => r.id);
  const { matchMap, appliedMap } = await fetchSupportData(ids, athleteId);
  const savedIds = new Set(ids);

  return rows.map((r: any) => mapRow(r, savedIds, matchMap, appliedMap));
}

export async function fetchMyApplications(athleteId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, opportunities(*, organization:organizations(name, short_name, initials, city, country))')
    .eq('athlete_id', athleteId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((a: any) => ({
    id: a.id,
    opportunity_id: a.opportunity_id,
    athlete_id: a.athlete_id,
    status: a.status as AppStatus,
    message: a.message,
    created_at: a.created_at,
    updated_at: a.updated_at,
    opportunity: a.opportunities
      ? mapRow(a.opportunities, new Set([]), new Map(), new Map([
          [a.opportunity_id, { id: a.id, status: a.status }],
        ]))
      : undefined,
  }));
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function applyToOpportunity(
  opportunityId: string,
  athleteId: string,
  message?: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      opportunity_id: opportunityId,
      athlete_id: athleteId,
      message: message ?? null,
      status: 'applied',
    })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error?.message ?? 'Unknown error' };
  return { id: data.id, error: null };
}

export async function toggleOpportunitySave(
  opportunityId: string,
  athleteId: string,
  currentlySaved: boolean
): Promise<void> {
  if (currentlySaved) {
    await supabase
      .from('opportunity_saves')
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('athlete_id', athleteId);
  } else {
    await supabase
      .from('opportunity_saves')
      .upsert({ opportunity_id: opportunityId, athlete_id: athleteId });
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatSalary(opp: Opportunity): string | null {
  const { salary_min, salary_max, currency } = opp;
  if (!salary_min && !salary_max) return null;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (salary_min && salary_max) return `${sym}${fmt(salary_min)} – ${sym}${fmt(salary_max)}/yr`;
  if (salary_max) return `Up to ${sym}${fmt(salary_max)}/yr`;
  return `${sym}${fmt(salary_min!)}/yr`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SAR: '﷼',
};

export function deadlineLabel(deadline: string | null): string {
  if (!deadline) return 'Open';
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return 'Closed';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `${diff}d left`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function oppTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m < 1 ? 'Just now' : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  trial_offered: 'Trial Offered',
  accepted: 'Accepted',
  not_selected: 'Not Selected',
};

export const APP_STATUS_COLORS: Record<AppStatus, string> = {
  applied: '#2E8BFF',
  viewed: '#8A97A8',
  shortlisted: '#FFB020',
  trial_offered: '#C6F23A',
  accepted: '#34D399',
  not_selected: '#FF5D5D',
};

export const OPP_SPORTS = [
  'Football', 'Basketball', 'Cricket', 'Athletics', 'Tennis', 'Rugby',
  'Swimming', 'Cycling', 'Boxing', 'Volleyball',
];

export const OPP_TYPES: OpportunityType[] = ['Trial', 'Contract', 'Academy', 'Loan', 'Tryout'];

// internal helper — applyFilters is not exported; used above
function applyFilters(q: any, filters?: OpportunityFilters): any {
  if (!filters) return q;
  if (filters.sport) q = q.eq('sport', filters.sport);
  if (filters.type) q = q.eq('type', filters.type);
  if (filters.location) q = q.ilike('location', `%${filters.location}%`);
  if (filters.salary_min) q = q.gte('salary_max', filters.salary_min);
  if (filters.salary_max) q = q.lte('salary_min', filters.salary_max);
  if (filters.search) {
    q = q.or(
      `title.ilike.%${filters.search}%,position.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
    );
  }
  return q;
}
