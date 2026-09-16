import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

/**
 * Meetups — finding people to play with, here or somewhere you are going.
 *
 * Every function here is eighteen-plus at the database level (see
 * `20260909000001_meetups.sql`). The client does not enforce that and must not
 * try to: `find_meetups` simply returns nothing for a minor, so the screens
 * below render their ordinary empty state without ever knowing why.
 *
 * The one place the client *does* need to know is the tab bar — there is no
 * point showing a destination that will always be empty — and `canUseMeetups`
 * answers that from the profile the app already holds.
 */

export type MeetupLevel = 'any' | 'beginner' | 'intermediate' | 'advanced' | 'competitive';
export type MeetupStatus = 'open' | 'full' | 'cancelled' | 'done';
export type MyMeetupStatus = 'requested' | 'joined' | 'declined' | 'withdrawn' | 'host';

export interface MeetupCard {
  id: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  sport: string;
  title: string;
  note: string | null;
  country: string;
  city: string;
  area: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  spots_total: number;
  spots_taken: number;
  spots_left: number;
  level: MeetupLevel;
  cost_note: string | null;
  status: MeetupStatus;
  my_status: MyMeetupStatus | null;
}

export interface MeetupPerson {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface MeetupRequestRow extends MeetupPerson {
  message: string | null;
  requested_at: string;
}

export interface MeetupDetail {
  meetup: MeetupCard & { spots_left: number };
  host: MeetupPerson;
  my_status: MyMeetupStatus | null;
  /** Only for people who are actually going. Null otherwise. */
  roster: (MeetupPerson & { status: MyMeetupStatus })[] | null;
  /** Only for the host. Null otherwise. */
  pending: MeetupRequestRow[] | null;
}

export interface MyMeetup {
  id: string;
  title: string;
  sport: string;
  city: string;
  area: string | null;
  venue: string | null;
  starts_at: string;
  spots_total: number;
  spots_taken: number;
  spots_left: number;
  status: MeetupStatus;
  my_status: MyMeetupStatus;
  /** Open requests waiting on me, when I am the host. */
  pending: number;
}

export interface MeetupSearch {
  sport?: string | null;
  country?: string | null;
  /** Matches city, area or venue — "Marbella", "Marina", "Al Jadaf Pitch 2". */
  place?: string | null;
  from?: string | null;
  to?: string | null;
  level?: MeetupLevel | null;
  limit?: number;
  offset?: number;
}

export async function findMeetups(search: MeetupSearch = {}): Promise<MeetupCard[]> {
  const { data, error } = await supabase.rpc('find_meetups', {
    p_sport: search.sport ?? null,
    p_country: search.country ?? null,
    p_place: search.place ?? null,
    p_from: search.from ?? null,
    p_to: search.to ?? null,
    p_level: search.level ?? null,
    p_limit: search.limit ?? 40,
    p_offset: search.offset ?? 0,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as MeetupCard[];
}

export interface NewMeetup {
  sport: string;
  title: string;
  country: string;
  city: string;
  startsAt: string;
  spotsTotal: number;
  area?: string | null;
  venue?: string | null;
  endsAt?: string | null;
  level?: MeetupLevel;
  note?: string | null;
  costNote?: string | null;
}

export async function createMeetup(input: NewMeetup): Promise<string> {
  const { data, error } = await supabase.rpc('create_meetup', {
    p_sport: input.sport,
    p_title: input.title,
    p_country: input.country,
    p_city: input.city,
    p_starts_at: input.startsAt,
    p_spots_total: input.spotsTotal,
    p_area: input.area ?? null,
    p_venue: input.venue ?? null,
    p_ends_at: input.endsAt ?? null,
    p_level: input.level ?? 'any',
    p_note: input.note ?? null,
    p_cost_note: input.costNote ?? null,
  });
  if (error) throw new AppError(error);
  return data as string;
}

export async function getMeetup(id: string): Promise<MeetupDetail> {
  const { data, error } = await supabase.rpc('meetup_detail', { p_meetup: id });
  if (error) throw new AppError(error);
  return data as MeetupDetail;
}

export async function requestToJoin(id: string, message?: string): Promise<MyMeetupStatus> {
  const { data, error } = await supabase.rpc('request_to_join_meetup', {
    p_meetup: id,
    p_message: message?.trim() || null,
  });
  if (error) throw new AppError(error);
  return data as MyMeetupStatus;
}

export async function decideRequest(
  meetupId: string,
  userId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('decide_meetup_request', {
    p_meetup: meetupId,
    p_user: userId,
    p_accept: accept,
  });
  if (error) throw new AppError(error);
}

export async function leaveMeetup(id: string): Promise<void> {
  const { error } = await supabase.rpc('leave_meetup', { p_meetup: id });
  if (error) throw new AppError(error);
}

export async function cancelMeetup(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_meetup', { p_meetup: id });
  if (error) throw new AppError(error);
}

export async function myMeetups(includePast = false): Promise<MyMeetup[]> {
  const { data, error } = await supabase.rpc('my_meetups', { p_include_past: includePast });
  if (error) throw new AppError(error);
  return (data ?? []) as MyMeetup[];
}

/**
 * Whether to show the feature at all.
 *
 * This is presentation only — the database refuses a minor whatever the client
 * believes, and every function above would answer with an empty list or an
 * error. It exists so a fifteen-year-old is not given a tab that is always
 * empty, which reads as a broken app rather than as a rule.
 */
export function canUseMeetups(profile: { is_minor?: boolean | null } | null): boolean {
  return profile != null && profile.is_minor === false;
}
