import { supabase } from './supabase';

export interface AthleteEvent {
  id: string;
  user_id: string;
  title: string;
  type: string;
  event_date: string;
  event_time: string;
  location: string;
  description?: string;
  color: string;
  is_public: boolean;
  created_at: string;
  attendee_count?: number;
}

export interface CreateEventInput {
  title: string;
  type: string;
  event_date: string;
  event_time: string;
  location: string;
  description?: string;
  color: string;
  is_public: boolean;
}

export async function fetchMyEvents(): Promise<{ data: AthleteEvent[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('athlete_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', today)
    .order('event_date', { ascending: true });

  if (error) return { data: data ?? [], error: error.message };
  if (!data || data.length === 0) return { data: [], error: null };

  const publicEventIds = data.filter((e) => e.is_public).map((e) => e.id);
  if (publicEventIds.length === 0) return { data, error: null };

  const { data: attendeeRows } = await supabase
    .from('event_attendees')
    .select('event_id')
    .in('event_id', publicEventIds);

  const countMap = new Map<string, number>();
  for (const row of attendeeRows ?? []) {
    countMap.set(row.event_id, (countMap.get(row.event_id) ?? 0) + 1);
  }

  const mapped: AthleteEvent[] = data.map((e) =>
    e.is_public ? { ...e, attendee_count: countMap.get(e.id) ?? 0 } : e
  );

  return { data: mapped, error: null };
}

export async function createEvent(input: CreateEventInput): Promise<{ data: AthleteEvent | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('athlete_events')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('athlete_events').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export interface PlatformEvent extends AthleteEvent {
  attendee_count: number;
  is_attending: boolean;
}

export async function fetchPlatformEvents(): Promise<{ data: PlatformEvent[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const today = new Date().toISOString().slice(0, 10);

  const { data: events, error } = await supabase
    .from('athlete_events')
    .select('*')
    .eq('is_public', true)
    .neq('user_id', user.id)
    .gte('event_date', today)
    .order('event_date', { ascending: true });

  if (error) return { data: [], error: error.message };
  if (!events || events.length === 0) return { data: [], error: null };

  const eventIds = events.map((e) => e.id);
  const { data: attendeeRows } = await supabase
    .from('event_attendees')
    .select('event_id, user_id')
    .in('event_id', eventIds);

  const countMap = new Map<string, number>();
  const attendingSet = new Set<string>();
  for (const row of attendeeRows ?? []) {
    countMap.set(row.event_id, (countMap.get(row.event_id) ?? 0) + 1);
    if (row.user_id === user.id) attendingSet.add(row.event_id);
  }

  const mapped: PlatformEvent[] = events.map((e) => ({
    ...e,
    attendee_count: countMap.get(e.id) ?? 0,
    is_attending: attendingSet.has(e.id),
  }));

  return { data: mapped, error: null };
}

export async function toggleEventAttendance(
  eventId: string,
  currentlyAttending: boolean
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (currentlyAttending) {
    const { error } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('event_attendees')
    .upsert({ event_id: eventId, user_id: user.id }, { onConflict: 'event_id,user_id' });
  return { error: error?.message ?? null };
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
