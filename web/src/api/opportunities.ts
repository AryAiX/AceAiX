import { supabase, unwrap } from './_helpers';
import type { Opportunity } from '../types';

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

export async function listSavedOpportunityIds(userId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase.from('opportunity_saves').select('opportunity_id').eq('athlete_id', userId),
  ) as Array<{ opportunity_id: string }>;
  return rows.map(row => row.opportunity_id);
}

export async function listAppliedOpportunityIds(userId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase.from('applications').select('opportunity_id').eq('athlete_id', userId),
  ) as Array<{ opportunity_id: string }>;
  return rows.map(row => row.opportunity_id);
}

export async function applyToOpportunity(opportunityId: string, userId: string): Promise<void> {
  unwrap(
    await supabase.from('applications').insert({
      opportunity_id: opportunityId,
      athlete_id: userId,
      status: 'applied',
    }),
  );
}

export async function setOpportunitySaved(opportunityId: string, userId: string, saved: boolean): Promise<void> {
  if (saved) {
    unwrap(
      await supabase.from('opportunity_saves').insert({
        opportunity_id: opportunityId,
        athlete_id: userId,
      }),
    );
    return;
  }

  unwrap(
    await supabase
      .from('opportunity_saves')
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('athlete_id', userId),
  );
}
