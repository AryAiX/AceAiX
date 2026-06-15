import { supabase, unwrap } from './_helpers';
import type { Organization } from '../types';

export interface OrgFilters {
  type?: string;
  q?: string;
  limit?: number;
}

export async function listOrganizations(filters: OrgFilters = {}): Promise<Organization[]> {
  let q = supabase.from('organizations').select('*').order('followers_count', { ascending: false });
  if (filters.type && filters.type !== 'All') q = q.eq('type', filters.type);
  if (filters.limit) q = q.limit(filters.limit);
  let rows = unwrap(await q) as Organization[];
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    rows = rows.filter((o) => o.name.toLowerCase().includes(needle) || o.city?.toLowerCase().includes(needle) || o.league?.toLowerCase().includes(needle));
  }
  return rows;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  return unwrap(await supabase.from('organizations').select('*').eq('id', id).maybeSingle()) as Organization | null;
}
