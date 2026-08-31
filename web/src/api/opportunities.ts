import { supabase, unwrap } from './_helpers';
import type { Application, Opportunity } from '../types';

export interface OpportunityFilters {
  sport?: string;
  type?: string;
  activeOnly?: boolean;
  limit?: number;
}

const SELECT = '*, organization:organizations(*)';

export async function listOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  let q = supabase.from('opportunities').select(SELECT).order('created_at', { ascending: false });
  if (filters.activeOnly !== false) q = q.eq('is_active', true);
  if (filters.sport && filters.sport !== 'All') q = q.eq('sport', filters.sport);
  if (filters.type) q = q.eq('type', filters.type);
  if (filters.limit) q = q.limit(filters.limit);
  return unwrap(await q) as Opportunity[];
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  return unwrap(await supabase.from('opportunities').select(SELECT).eq('id', id).maybeSingle()) as Opportunity | null;
}

export async function listSavedOpportunityIds(athleteId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase.from('saved_opportunities').select('opportunity_id').eq('athlete_id', athleteId),
  ) as { opportunity_id: string }[];
  return rows.map(r => r.opportunity_id);
}

export async function saveOpportunity(athleteId: string, opportunityId: string): Promise<void> {
  unwrap(await supabase.from('saved_opportunities').insert({ athlete_id: athleteId, opportunity_id: opportunityId }).select('id'));
}

export async function unsaveOpportunity(athleteId: string, opportunityId: string): Promise<void> {
  unwrap(
    await supabase.from('saved_opportunities').delete().eq('athlete_id', athleteId).eq('opportunity_id', opportunityId).select('id'),
  );
}

export async function listMyApplications(athleteId: string): Promise<Application[]> {
  return unwrap(
    await supabase.from('applications').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
  ) as Application[];
}

export async function applyToOpportunity(athleteId: string, opportunityId: string, message?: string): Promise<Application> {
  return unwrap(
    await supabase.from('applications').insert({ athlete_id: athleteId, opportunity_id: opportunityId, message: message || null }).select('*').single(),
  ) as Application;
}

export async function withdrawApplication(applicationId: string): Promise<Application> {
  return unwrap(
    await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', applicationId).select('*').single(),
  ) as Application;
}
