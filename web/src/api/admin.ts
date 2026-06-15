import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { UserProfile, VerificationRequest } from '../types';

export async function listUsers(opts: { role?: string; q?: string; limit?: number } = {}): Promise<UserProfile[]> {
  let q = supabase.from('user_profiles').select(USER_FIELDS).order('created_at', { ascending: false });
  if (opts.role && opts.role !== 'All') q = q.eq('role', opts.role);
  if (opts.limit) q = q.limit(opts.limit);
  let rows = unwrap(await q) as UserProfile[];
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    rows = rows.filter((u) => u.full_name?.toLowerCase().includes(needle));
  }
  return rows;
}

export async function listVerificationRequests(status?: string): Promise<VerificationRequest[]> {
  let q = supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  return unwrap(await q) as VerificationRequest[];
}

export async function decideVerification(id: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
  unwrap(await supabase.from('verification_requests').update({ status, decision_reason: reason }).eq('id', id).select('id'));
}

export interface PlatformStats {
  users: number;
  athletes: number;
  organizations: number;
  opportunities: number;
  pendingVerifications: number;
}

async function countRows(table: string): Promise<number> {
  const res = await supabase.from(table).select('id', { count: 'exact', head: true });
  return res.count ?? 0;
}

export async function platformStats(): Promise<PlatformStats> {
  const [users, athletes, organizations, opportunities, pending] = await Promise.all([
    countRows('user_profiles'),
    countRows('athlete_profiles'),
    countRows('organizations'),
    countRows('opportunities'),
    supabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    users,
    athletes,
    organizations,
    opportunities,
    pendingVerifications: pending.count ?? 0,
  };
}
