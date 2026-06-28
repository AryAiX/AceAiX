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

  const { data, error } = await supabase
    .from('athlete_events')
    .select('*')
    .eq('user_id', user.id)
    .order('event_date', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
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

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
