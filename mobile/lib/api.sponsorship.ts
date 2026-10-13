import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { DealStatus, RequestStatus } from '@/lib/sponsorship';

/**
 * Sponsorship. Every read and write is an RPC (1008/02): the tables refuse
 * direct writes, and the lists apply the verified-sponsor, guardian-scope and
 * block rules in the database. Nothing here may read the tables instead.
 */

export interface SponsorProfile {
  user_id: string;
  company_name: string | null;
  industry: string | null;
  website: string | null;
  about: string | null;
  sports: string[];
  countries: string[];
  offers: string[];
  budget_min?: number | null;
  budget_max?: number | null;
  currency: string;
}

export interface SponsorshipRequest {
  id: string;
  title: string;
  event_name: string | null;
  event_date: string | null;
  location: string | null;
  sport?: string | null;
  needs: string[];
  gives: string[];
  amount: number | null;
  currency: string;
  pitch: string | null;
  status?: RequestStatus;
  created_at?: string;
  pending_offers?: number;
  my_offer_status?: DealStatus | null;
}

export interface SponsorCall {
  id: string;
  title: string;
  description: string | null;
  sport: string | null;
  country: string | null;
  offers: string[];
  amount_min: number | null;
  amount_max: number | null;
  currency: string;
  slots: number;
  deadline: string | null;
  open_to_minors: boolean;
  is_active: boolean;
  created_at: string;
  pending_applications: number;
}

export interface CallFeedItem {
  call_id: string;
  sponsor_user_id: string;
  sponsor_name: string | null;
  sponsor_avatar: string | null;
  company_name: string | null;
  industry: string | null;
  title: string;
  description: string | null;
  sport: string | null;
  country: string | null;
  offers: string[];
  amount_min: number | null;
  amount_max: number | null;
  currency: string;
  slots: number;
  deadline: string | null;
  open_to_minors: boolean;
  created_at: string;
  is_mine: boolean;
  my_status: DealStatus | null;
}

export interface Seeker {
  request_id: string;
  athlete_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  athlete_position: string | null;
  country: string | null;
  is_minor: boolean;
  talent_score: number;
  tier: string;
  title: string;
  event_name: string | null;
  event_date: string | null;
  location: string | null;
  needs: string[];
  gives: string[];
  amount: number | null;
  currency: string;
  pitch: string | null;
  created_at: string;
  my_offer_status: DealStatus | null;
}

export interface SponsorListing {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  industry: string | null;
  about: string | null;
  sports: string[];
  offers: string[];
  is_verified: boolean;
  open_calls: number;
}

export interface Deal {
  id: string;
  initiated_by: 'sponsor' | 'athlete';
  status: DealStatus;
  message: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
  responded_at: string | null;
  request_id: string | null;
  call_id: string | null;
  request_title: string | null;
  call_title: string | null;
  my_side: 'sponsor' | 'athlete' | 'guardian';
  athlete_user_id: string;
  athlete_name: string | null;
  athlete_avatar: string | null;
  athlete_is_minor: boolean;
  sponsor_user_id: string;
  sponsor_name: string | null;
  sponsor_avatar: string | null;
  sponsor_verified: boolean;
  can_respond: boolean;
  can_withdraw: boolean;
}

export type SponsorshipGate = 'ok' | 'sponsor_not_verified' | 'guardian_consent_required';

export interface MySponsorship {
  role: string;
  gate: SponsorshipGate;
  is_verified: boolean;
  profile: SponsorProfile | null;
  requests: (SponsorshipRequest & { status: RequestStatus; created_at: string; pending_offers: number })[];
  calls: SponsorCall[];
  deals: Deal[];
}

export type SponsorshipCard =
  | {
      kind: 'athlete';
      is_self: boolean;
      can_offer: boolean;
      requests: SponsorshipRequest[];
    }
  | {
      kind: 'sponsor';
      is_verified: boolean;
      profile: SponsorProfile | null;
      calls: {
        call_id: string;
        title: string;
        sport: string | null;
        offers: string[];
        deadline: string | null;
        my_status: DealStatus | null;
      }[];
    };

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw new AppError(result.error);
  return result.data as T;
}

export async function getMySponsorship(): Promise<MySponsorship> {
  return unwrap<MySponsorship>(await supabase.rpc('my_sponsorship'));
}

export async function getSponsorshipCard(userId: string): Promise<SponsorshipCard | null> {
  return unwrap<SponsorshipCard | null>(await supabase.rpc('sponsorship_card', { p_user: userId }));
}

export async function getSeekers(
  params: { sport?: string | null; query?: string; limit?: number; offset?: number } = {},
): Promise<Seeker[]> {
  return (
    unwrap<Seeker[] | null>(
      await supabase.rpc('sponsorship_seekers', {
        p_sport: params.sport ?? null,
        p_country: null,
        p_query: params.query?.trim() || null,
        p_limit: params.limit ?? 30,
        p_offset: params.offset ?? 0,
      }),
    ) ?? []
  );
}

export async function getSponsorCalls(
  params: { sport?: string | null; query?: string; limit?: number } = {},
): Promise<CallFeedItem[]> {
  return (
    unwrap<CallFeedItem[] | null>(
      await supabase.rpc('sponsor_calls_feed', {
        p_sport: params.sport ?? null,
        p_query: params.query?.trim() || null,
        p_limit: params.limit ?? 30,
        p_offset: 0,
      }),
    ) ?? []
  );
}

export async function getSponsors(query?: string): Promise<SponsorListing[]> {
  return (
    unwrap<SponsorListing[] | null>(
      await supabase.rpc('sponsor_directory', { p_query: query?.trim() || null, p_limit: 30 }),
    ) ?? []
  );
}

export interface RequestInput {
  title: string;
  event_name: string;
  event_date: string | null;
  location: string;
  needs: string[];
  gives: string[];
  amount: number | null;
  pitch: string;
}

export async function saveSponsorshipRequest(id: string | null, input: RequestInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_sponsorship_request', { p_id: id, p: input }));
}

export async function setSponsorshipRequestStatus(id: string, status: RequestStatus): Promise<void> {
  unwrap(await supabase.rpc('set_sponsorship_request_status', { p_id: id, p_status: status }));
}

export interface CallInput {
  title: string;
  description: string;
  sport: string | null;
  offers: string[];
  amount_min: number | null;
  amount_max: number | null;
  slots: number;
  deadline: string | null;
  open_to_minors: boolean;
}

export async function saveSponsorCall(id: string | null, input: CallInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_sponsor_call', { p_id: id, p: input }));
}

export async function setSponsorCallActive(id: string, active: boolean): Promise<void> {
  unwrap(await supabase.rpc('set_sponsor_call_active', { p_id: id, p_active: active }));
}

export interface BrandInput {
  company_name: string;
  industry: string;
  website: string;
  about: string;
  sports: string[];
  offers: string[];
  budget_min: number | null;
  budget_max: number | null;
}

export async function saveSponsorProfile(input: BrandInput): Promise<void> {
  unwrap(await supabase.rpc('save_sponsor_profile', { p: input }));
}

export async function makeSponsorOffer(requestId: string, message: string, amount: number | null): Promise<string> {
  return unwrap<string>(
    await supabase.rpc('sponsor_make_offer', {
      p_request: requestId,
      p_message: message.trim() || null,
      p_amount: amount,
    }),
  );
}

export async function applyToSponsorCall(callId: string, message: string): Promise<string> {
  return unwrap<string>(
    await supabase.rpc('apply_to_sponsor_call', { p_call: callId, p_message: message.trim() || null }),
  );
}

export async function respondSponsorship(dealId: string, accept: boolean): Promise<DealStatus> {
  return unwrap<DealStatus>(await supabase.rpc('respond_sponsorship', { p_deal: dealId, p_accept: accept }));
}

export async function withdrawSponsorship(dealId: string): Promise<void> {
  unwrap(await supabase.rpc('withdraw_sponsorship', { p_deal: dealId }));
}
