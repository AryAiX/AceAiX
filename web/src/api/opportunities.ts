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
