import { supabase, unwrap } from './_helpers';
import type { ProfileView } from '../types';

export async function listProfileViews(athleteId: string, limit = 8): Promise<ProfileView[]> {
  return unwrap(
    await supabase.from('profile_views').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(limit),
  ) as ProfileView[];
}

export async function profileViewCount(athleteId: string): Promise<number> {
  const res = await supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId);
  return res.count ?? 0;
}

/** Views grouped by day for the last `days` days (oldest first). */
export async function weeklyViews(athleteId: string, days = 7): Promise<{ label: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const rows = unwrap(
    await supabase.from('profile_views').select('created_at').eq('athlete_id', athleteId).gte('created_at', since.toISOString()),
  ) as { created_at: string }[];
  const buckets: { label: string; count: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.push({ label: dayNames[d.getDay()], count: 0 });
  }
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - since.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx].count++;
  });
  return buckets;
}
