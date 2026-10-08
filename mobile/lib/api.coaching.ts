import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { LocationMode, ServiceKind } from '@/lib/coaching';

/**
 * Booking a coach (1009/01). Every read and write is an RPC: the tables refuse
 * direct writes, places are counted under a lock in the database, and the
 * minor rules (verified coach, guardian scope) are checked there.
 */

export interface CoachingService {
  id: string;
  kind: ServiceKind;
  title: string;
  description: string | null;
  duration_minutes: number;
  capacity: number;
  price: number | null;
  currency: string;
  location_mode: LocationMode;
  location: string | null;
  is_active?: boolean;
  upcoming_slots?: number;
}

export interface BookableSlot {
  id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  spots_left: number;
  my_booking_id: string | null;
}

export type CoachingGate =
  | 'ok'
  | 'own_calendar'
  | 'coach_not_accepting'
  | 'minor_needs_verified_coach'
  | 'guardian_consent_required';

export interface CoachBookingPage {
  coach: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    accepting: boolean;
    headline: string | null;
  };
  gate: CoachingGate;
  services: CoachingService[];
  slots: BookableSlot[];
}

export interface SlotBooking {
  id: string;
  athlete_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_minor: boolean;
  note: string | null;
  location: string | null;
}

export interface CoachSlot {
  id: string;
  service_id: string;
  service_title: string;
  kind: ServiceKind;
  starts_at: string;
  ends_at: string;
  capacity: number;
  location_mode: LocationMode;
  service_location: string | null;
  bookings: SlotBooking[];
}

export interface MyBooking {
  id: string;
  status: 'booked' | 'cancelled';
  cancelled_by: 'athlete' | 'coach' | 'guardian' | null;
  note: string | null;
  location: string | null;
  created_at: string;
  starts_at: string;
  ends_at: string;
  service_title: string;
  kind: ServiceKind;
  location_mode: LocationMode;
  price: number | null;
  currency: string;
  duration_minutes: number;
  coach_user_id: string;
  coach_name: string | null;
  coach_avatar: string | null;
  coach_verified: boolean;
  athlete_user_id: string;
  athlete_name: string | null;
  for_child: boolean;
}

export interface MyCoaching {
  role: string;
  is_verified: boolean;
  is_minor: boolean;
  has_bookings_scope: boolean;
  accepting: boolean;
  headline: string | null;
  services: (CoachingService & { is_active: boolean; upcoming_slots: number })[];
  slots: CoachSlot[];
  bookings: MyBooking[];
}

export interface BookableCoach {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  city: string | null;
  country: string | null;
  specialty: string | null;
  headline: string | null;
  kinds: ServiceKind[];
  price_from: number | null;
  currency: string | null;
  next_slot: string | null;
  open_slots: number | null;
}

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw new AppError(result.error);
  return result.data as T;
}

export async function getMyCoaching(): Promise<MyCoaching> {
  return unwrap<MyCoaching>(await supabase.rpc('my_coaching'));
}

export async function getCoachBookingPage(coachId: string): Promise<CoachBookingPage | null> {
  return unwrap<CoachBookingPage | null>(await supabase.rpc('coach_booking_page', { p_coach: coachId }));
}

export async function getBookableCoaches(query?: string): Promise<BookableCoach[]> {
  return (
    unwrap<BookableCoach[] | null>(
      await supabase.rpc('bookable_coaches', { p_query: query?.trim() || null, p_limit: 30 }),
    ) ?? []
  );
}

export async function setCoachingStatus(accepting: boolean, headline: string): Promise<void> {
  unwrap(await supabase.rpc('set_coaching_status', { p_accepting: accepting, p_headline: headline.trim() || null }));
}

export interface ServiceInput {
  kind: ServiceKind;
  title: string;
  description: string;
  duration_minutes: number;
  capacity: number;
  price: number | null;
  location_mode: LocationMode;
  location: string;
}

export async function saveCoachingService(id: string | null, input: ServiceInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_coaching_service', { p_id: id, p: input }));
}

export async function setCoachingServiceActive(id: string, active: boolean): Promise<void> {
  unwrap(await supabase.rpc('set_coaching_service_active', { p_id: id, p_active: active }));
}

/** Returns how many were opened; past or overlapping starts are skipped by the database. */
export async function addCoachingSlots(serviceId: string, starts: string[]): Promise<number> {
  return unwrap<number>(await supabase.rpc('add_coaching_slots', { p_service: serviceId, p_starts: starts }));
}

export async function cancelCoachingSlot(slotId: string): Promise<void> {
  unwrap(await supabase.rpc('cancel_coaching_slot', { p_slot: slotId }));
}

export async function bookCoachingSlot(slotId: string, note: string, location: string): Promise<string> {
  return unwrap<string>(
    await supabase.rpc('book_coaching_slot', {
      p_slot: slotId,
      p_note: note.trim() || null,
      p_location: location.trim() || null,
    }),
  );
}

export async function cancelCoachingBooking(bookingId: string): Promise<void> {
  unwrap(await supabase.rpc('cancel_coaching_booking', { p_booking: bookingId }));
}
