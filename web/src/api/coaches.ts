import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { CoachProfile, UserProfile } from '../types';

export type CoachWithUser = CoachProfile & { user?: UserProfile };

const SELECT = `*, user:user_profiles(${USER_FIELDS})`;

export async function listCoaches(limit?: number): Promise<CoachWithUser[]> {
  let q = supabase.from('coach_profiles').select(SELECT).order('score', { ascending: false });
  if (limit) q = q.limit(limit);
  return unwrap(await q) as CoachWithUser[];
}

export async function getCoachByUserId(userId: string): Promise<CoachWithUser | null> {
  return unwrap(await supabase.from('coach_profiles').select(SELECT).eq('user_id', userId).maybeSingle()) as CoachWithUser | null;
}

export async function getCoachById(id: string): Promise<CoachWithUser | null> {
  return unwrap(await supabase.from('coach_profiles').select(SELECT).eq('id', id).maybeSingle()) as CoachWithUser | null;
}
