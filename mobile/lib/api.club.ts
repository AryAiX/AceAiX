import { decode } from 'base64-arraybuffer';

import { AppError } from '@/lib/errors';
import { Buckets, supabase } from '@/lib/supabase';
import { uploadAvatar, type AvatarUploadInput } from '@/lib/api.auth';
import type {
  AwardPlacement,
  AwardRecipientKind,
  BroadcastAudience,
  ClubEventKind,
  ClubRole,
  ClubType,
  InvitableRole,
  MatchEventKind,
  MatchSide,
  MatchStatus,
  StaffRole,
} from '@/lib/club';

/**
 * Club and academy pages (1014/01). Reads and writes go through RPCs: the
 * tables refuse direct writes, permissions (owner / manager / editor /
 * scorekeeper) and the youth naming rule are applied in the database.
 * `map_url` is the exception: it is readable on `organizations` and written
 * with `set_club_map_url`.
 *
 * Posts and stories are the exception: they are written exactly as before,
 * and a club account's own posts are tagged with its page by a trigger.
 */

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw new AppError(result.error);
  return result.data as T;
}

// ── Shapes ───────────────────────────────────────────────────────────────────

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'more_info';

export interface ClubSocials {
  instagram?: string;
  x?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  snapchat?: string;
}

export interface ClubOrganization {
  id: string;
  name: string;
  name_local: string | null;
  type: ClubType | 'federation';
  logo_url: string | null;
  cover_url: string | null;
  /** The short bio under the name (≤ 300). */
  description: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  socials: ClubSocials;
  facilities: string[];
  league: string | null;
  founded_year: number | null;
  ceo_name: string | null;
  /** The long About text (≤ 5000). */
  about_story: string | null;
  mission: string | null;
  philosophy: string | null;
  is_verified: boolean;
  verification_status: VerificationStatus;
  followers_count: number;
  primary_color: string | null;
}

export interface ClubSport {
  sport: string;
  categories: string[];
}

export interface ClubLocation {
  id: string;
  label: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
}

export interface SquadLinkForMe {
  /** club_squad_members.id — pass to respondSquadLink. */
  id: string;
  kind: 'player' | 'staff';
  sport: string;
  category: string;
  status: 'invited' | 'accepted';
}

export interface ClubViewer {
  following: boolean;
  role: ClubRole | null;
  can_manage: boolean;
  can_post: boolean;
  can_score: boolean;
  pending_invite: { role: ClubRole } | null;
  squad_links: SquadLinkForMe[];
}

export interface ClubVerificationInfo {
  license_number: string | null;
  has_document: boolean;
  contact_person_name: string | null;
  contact_person_title: string | null;
  terms_accepted: boolean;
  submitted_at: string | null;
  review_note: string | null;
}

export interface ClubMatch {
  id: string;
  organization_id: string;
  sport: string;
  squad_id: string | null;
  category: string | null;
  competition: string | null;
  opponent_name: string;
  opponent_org_id: string | null;
  is_home: boolean;
  venue: string | null;
  kickoff_at: string;
  status: MatchStatus;
  our_score: number;
  their_score: number;
  period: string | null;
  minute: number | null;
  stream_url: string | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface ClubPage {
  organization: ClubOrganization;
  sports: ClubSport[];
  locations: ClubLocation[];
  viewer: ClubViewer;
  /** Only for the owner and managers. */
  verification: ClubVerificationInfo | null;
  /** A live story posted for the page: open `Routes.storyOf(author_id)`. */
  story: { author_id: string; unseen: number } | null;
  live_match: ClubMatch | null;
  next_match: ClubMatch | null;
  counts: {
    posts: number;
    awards: number;
    players: number;
    open_events: number;
    open_challenges: number;
  };
}

export interface ClubPost {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  type: string;
  caption: string | null;
  media: unknown;
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  created_at: string;
}

export interface ClubBroadcast {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  /** Only the page team sees how many people it reached. */
  recipients: number | null;
  created_at: string;
}

export interface ClubTeamMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: ClubRole;
  status: 'active' | 'pending';
  is_self: boolean;
  created_at: string;
}

export interface MyClubPage {
  id: string;
  name: string;
  type: ClubType | 'federation';
  logo_url: string | null;
  is_verified: boolean;
  verification_status: VerificationStatus;
  role: ClubRole;
  status: 'active' | 'pending';
}

export interface ClubChallenge {
  id: string;
  title: string;
  brief: string;
  sport: string;
  metric_label: string | null;
  metric_unit: string | null;
  closes_at: string;
  status: 'open' | 'judging' | 'closed';
  entry_count: number;
  age_min: number | null;
  age_max: number | null;
  is_open: boolean;
}

export interface ClubEventSummary {
  id: string;
  kind: ClubEventKind;
  title: string;
  sport: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  age_min: number | null;
  age_max: number | null;
  capacity: number | null;
  registration_count: number;
  registration_open: boolean;
  status: 'scheduled' | 'cancelled';
  price: number | null;
  currency: string;
  is_upcoming: boolean;
  registered: boolean;
}

export type ClubEventGate =
  | 'ok'
  | 'not_signed_in'
  | 'own_club'
  | 'cancelled'
  | 'past'
  | 'closed'
  | 'age_out_of_range'
  | 'full'
  | 'minor_needs_verified_club'
  | 'guardian_consent_required';

export interface ClubEventRegistration {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_minor: boolean;
  note: string | null;
  created_at: string;
}

export interface ClubEventPage {
  event: Omit<ClubEventSummary, 'is_upcoming' | 'registered'> & {
    organization_id: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  organization: { id: string; name: string; logo_url: string | null; is_verified: boolean };
  /** null when the event has no cap. */
  spots_left: number | null;
  gate: ClubEventGate;
  can_manage: boolean;
  my_registration: { id: string; note: string | null; created_at: string } | null;
  /** Only for the page team. */
  registrations: ClubEventRegistration[] | null;
}

export interface SquadPerson {
  id: string;
  kind: 'player' | 'staff';
  shirt_number: number | null;
  position: string | null;
  staff_role: StaffRole | null;
  sort: number;
  /** Already shortened to "First L." for outsiders on a youth roster. */
  display_name: string;
  /** Set only when the link is accepted and the profile may be shown. */
  user_id: string | null;
  avatar_url: string | null;
  /** Page team only. */
  link_status: 'none' | 'invited' | 'accepted' | 'declined' | null;
  /** Page team only: who the line is linked to, accepted or not. */
  linked_user_id: string | null;
}

export interface ClubSquad {
  id: string;
  sport: string;
  category: string;
  name: string | null;
  is_youth: boolean;
  players: SquadPerson[];
  staff: SquadPerson[];
}

export interface ClubSeason {
  id: string;
  label: string;
  is_current: boolean;
}

export interface ClubSquadsPage {
  can_edit: boolean;
  season_id: string | null;
  seasons: ClubSeason[];
  squads: ClubSquad[];
}

export interface ClubMatches {
  live: ClubMatch[];
  upcoming: ClubMatch[];
  results: ClubMatch[];
}

export interface MatchEvent {
  id: string;
  minute: number | null;
  kind: MatchEventKind;
  side: MatchSide;
  points: number;
  detail: string | null;
  created_at: string;
  player_name: string | null;
  player_user_id: string | null;
}

export interface ClubMatchPage {
  match: ClubMatch;
  organization: { id: string; name: string; logo_url: string | null; is_verified: boolean };
  can_score: boolean;
  can_edit: boolean;
  events: MatchEvent[];
  /** Scorekeepers only: the squad's players, to tap a scorer. */
  lineup: { id: string; display_name: string; shirt_number: number | null }[] | null;
}

export interface ClubAward {
  id: string;
  title: string;
  competition: string | null;
  year: number | null;
  season_label: string | null;
  sport: string | null;
  category: string | null;
  placement: AwardPlacement;
  recipient_kind: AwardRecipientKind;
  recipient_name: string | null;
  recipient_user_id: string | null;
  image_url: string | null;
  description: string | null;
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export interface ClubBasicsInput {
  type: ClubType;
  name: string;
  name_local?: string | null;
  founded_year: number;
  ceo_name: string;
  country?: string | null;
  city?: string | null;
}

/** Any subset: only the keys present are changed. */
export interface ClubPageUpdate {
  type?: ClubType;
  name?: string;
  name_local?: string | null;
  founded_year?: number;
  ceo_name?: string;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  socials?: ClubSocials;
  facilities?: string[];
  description?: string | null;
  about_story?: string | null;
  mission?: string | null;
  philosophy?: string | null;
  league?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  primary_color?: string | null;
  /** Replaces every sport and its categories. At least one. */
  sports?: ClubSport[];
  /** Replaces every non-primary branch. The primary one follows the address fields. */
  locations?: Omit<ClubLocation, 'id' | 'is_primary'>[];
}

export interface ClubVerificationInput {
  license_number?: string | null;
  /** From uploadClubDocument. */
  document_path?: string | null;
  contact_person_name: string;
  contact_person_title?: string | null;
  accept_terms: boolean;
}

export interface ClubEventInput {
  kind: ClubEventKind;
  title: string;
  description?: string | null;
  sport?: string | null;
  category?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  capacity?: number | null;
  registration_open?: boolean;
  price?: number | null;
  currency?: string;
}

export interface ClubSquadInput {
  season_id: string;
  sport: string;
  category: string;
  name?: string | null;
}

export interface SquadMemberInput {
  kind: 'player' | 'staff';
  display_name?: string | null;
  /** Link an AceAiX profile; they are asked to accept. */
  user_id?: string | null;
  shirt_number?: number | null;
  position?: string | null;
  staff_role?: StaffRole | null;
  sort?: number;
}

export interface ClubMatchInput {
  sport: string;
  squad_id?: string | null;
  category?: string | null;
  competition?: string | null;
  opponent_name: string;
  is_home: boolean;
  venue?: string | null;
  kickoff_at: string;
  stream_url?: string | null;
  notes?: string | null;
  /** Only 'scheduled' | 'postponed' | 'cancelled' here; live states go through updateMatchLive. */
  status?: 'scheduled' | 'postponed' | 'cancelled';
}

export interface MatchLiveUpdate {
  status?: MatchStatus;
  our_score?: number;
  their_score?: number;
  minute?: number | null;
  period?: string | null;
  stream_url?: string | null;
}

export interface MatchEventInput {
  kind: MatchEventKind;
  side: MatchSide;
  minute?: number | null;
  /** For 'point' (basketball, rugby…): 1–6. */
  points?: number;
  squad_member_id?: string | null;
  player_name?: string | null;
  detail?: string | null;
}

export interface ClubAwardInput {
  title: string;
  competition?: string | null;
  year?: number | null;
  season_label?: string | null;
  sport?: string | null;
  category?: string | null;
  placement: AwardPlacement;
  recipient_kind: AwardRecipientKind;
  recipient_name?: string | null;
  /** Only someone who accepted a place on one of the club's squads. */
  recipient_user_id?: string | null;
  image_url?: string | null;
  description?: string | null;
}

// ── The page ─────────────────────────────────────────────────────────────────

export async function getClubPage(orgId: string): Promise<ClubPage | null> {
  return unwrap<ClubPage | null>(await supabase.rpc('club_page', { p_org: orgId }));
}

/** The club's map link. Not part of `club_page`; `organizations` is readable directly. */
export async function getClubMapUrl(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('map_url')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw new AppError(error);
  const row = data as { map_url: string | null } | null;
  const url = row?.map_url?.trim() ?? '';
  return url || null;
}

/** Writes `organizations.map_url`. Null clears it. Same permission as `update_club_page`. */
export async function setClubMapUrl(orgId: string, url: string | null): Promise<void> {
  unwrap(await supabase.rpc('set_club_map_url', { p_org: orgId, p_url: url }));
}

export async function getClubPosts(orgId: string, before?: string | null): Promise<ClubPost[]> {
  return (
    unwrap<ClubPost[] | null>(
      await supabase.rpc('club_posts', { p_org: orgId, p_limit: 24, p_before: before ?? null }),
    ) ?? []
  );
}

export async function getMyClubPages(): Promise<MyClubPage[]> {
  return unwrap<MyClubPage[] | null>(await supabase.rpc('my_club_pages')) ?? [];
}

/** The page this account runs as owner or manager, if any. */
export async function getMyManagedClub(): Promise<MyClubPage | null> {
  const pages = await getMyClubPages();
  return (
    pages.find((p) => p.status === 'active' && p.role === 'owner') ??
    pages.find((p) => p.status === 'active' && p.role === 'manager') ??
    null
  );
}

// ── Setting up and editing ───────────────────────────────────────────────────

export async function createClubPage(input: ClubBasicsInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('create_club_page', { p: input }));
}

export async function updateClubPage(orgId: string, patch: ClubPageUpdate): Promise<void> {
  unwrap(await supabase.rpc('update_club_page', { p_org: orgId, p: patch }));
}

/** Returns the page's verification status afterwards. */
export async function submitClubVerification(
  orgId: string,
  input: ClubVerificationInput,
): Promise<VerificationStatus> {
  return unwrap<VerificationStatus>(
    await supabase.rpc('submit_club_verification', { p_org: orgId, p: input }),
  );
}

/** Logo and cover go to the public avatars bucket, under the uploader's folder. */
export async function uploadClubImage(input: AvatarUploadInput): Promise<string> {
  return uploadAvatar(input);
}

const DOC_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Upload a licence (photo or PDF) to the PRIVATE `club-documents` bucket.
 * Returns the storage path to pass as `document_path` — never a public URL.
 */
export async function uploadClubDocument(input: AvatarUploadInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const declared = (input.mimeType ?? '').toLowerCase();
  const contentType = DOC_EXTENSIONS[declared] ? declared : 'image/jpeg';
  const path = `${auth.user.id}/licence-${Date.now()}.${DOC_EXTENSIONS[contentType]}`;
  const { error } = await supabase.storage
    .from(Buckets.clubDocuments)
    .upload(path, decode(input.base64), { contentType, upsert: false });
  if (error) throw new AppError(error);
  return path;
}

// ── Following ────────────────────────────────────────────────────────────────

export { setOrganizationFollow as setClubFollow } from '@/lib/api.opportunities';

// ── Team ─────────────────────────────────────────────────────────────────────

export async function getClubTeam(orgId: string): Promise<ClubTeamMember[]> {
  return unwrap<ClubTeamMember[] | null>(await supabase.rpc('club_team', { p_org: orgId })) ?? [];
}

export async function inviteClubMember(
  orgId: string,
  email: string,
  role: InvitableRole,
): Promise<{ user_id: string; status: 'active' | 'pending' }> {
  return unwrap(
    await supabase.rpc('invite_club_member', { p_org: orgId, p_email: email.trim(), p_role: role }),
  );
}

export async function respondClubInvite(orgId: string, accept: boolean): Promise<void> {
  unwrap(await supabase.rpc('respond_club_invite', { p_org: orgId, p_accept: accept }));
}

export async function setClubMemberRole(orgId: string, userId: string, role: InvitableRole): Promise<void> {
  unwrap(await supabase.rpc('set_club_member_role', { p_org: orgId, p_user: userId, p_role: role }));
}

/** Remove someone; pass your own id to leave. */
export async function removeClubMember(orgId: string, userId: string): Promise<void> {
  unwrap(await supabase.rpc('remove_club_member', { p_org: orgId, p_user: userId }));
}

// ── Announcements ────────────────────────────────────────────────────────────

export async function sendClubBroadcast(
  orgId: string,
  title: string,
  body: string,
  audience: BroadcastAudience,
): Promise<{ id: string; recipients: number }> {
  return unwrap(
    await supabase.rpc('send_club_broadcast', {
      p_org: orgId,
      p_title: title.trim(),
      p_body: body.trim(),
      p_audience: audience,
    }),
  );
}

export async function getClubBroadcasts(orgId: string, limit = 10): Promise<ClubBroadcast[]> {
  return (
    unwrap<ClubBroadcast[] | null>(await supabase.rpc('club_broadcasts_for', { p_org: orgId, p_limit: limit })) ?? []
  );
}

// ── Challenges ───────────────────────────────────────────────────────────────

export async function getClubChallenges(orgId: string): Promise<ClubChallenge[]> {
  return unwrap<ClubChallenge[] | null>(await supabase.rpc('club_challenges', { p_org: orgId })) ?? [];
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getClubEvents(orgId: string): Promise<ClubEventSummary[]> {
  return unwrap<ClubEventSummary[] | null>(await supabase.rpc('club_events_for', { p_org: orgId })) ?? [];
}

export async function getClubEventPage(eventId: string): Promise<ClubEventPage | null> {
  return unwrap<ClubEventPage | null>(await supabase.rpc('club_event_page', { p_event: eventId }));
}

export async function saveClubEvent(orgId: string, id: string | null, input: ClubEventInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_club_event', { p_org: orgId, p_id: id, p: input }));
}

export async function cancelClubEvent(eventId: string): Promise<void> {
  unwrap(await supabase.rpc('cancel_club_event', { p_id: eventId }));
}

export async function registerForClubEvent(eventId: string, note: string): Promise<string> {
  return unwrap<string>(
    await supabase.rpc('register_for_club_event', { p_event: eventId, p_note: note.trim() || null }),
  );
}

/** Cancel my registration — or, as a guardian, my child's (`userId`). */
export async function cancelClubEventRegistration(eventId: string, userId?: string | null): Promise<void> {
  unwrap(await supabase.rpc('cancel_club_event_registration', { p_event: eventId, p_user: userId ?? null }));
}

// ── Squads ───────────────────────────────────────────────────────────────────

export async function getClubSquads(orgId: string, seasonId?: string | null): Promise<ClubSquadsPage> {
  return unwrap<ClubSquadsPage>(
    await supabase.rpc('club_squads_page', { p_org: orgId, p_season: seasonId ?? null }),
  );
}

export async function saveClubSeason(
  orgId: string,
  id: string | null,
  label: string,
  current: boolean,
): Promise<string> {
  return unwrap<string>(
    await supabase.rpc('save_club_season', { p_org: orgId, p_id: id, p_label: label.trim(), p_current: current }),
  );
}

export async function saveClubSquad(orgId: string, id: string | null, input: ClubSquadInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_club_squad', { p_org: orgId, p_id: id, p: input }));
}

export async function deleteClubSquad(squadId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_club_squad', { p_id: squadId }));
}

export async function saveSquadMember(squadId: string, id: string | null, input: SquadMemberInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_squad_member', { p_squad: squadId, p_id: id, p: input }));
}

export async function deleteSquadMember(memberId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_squad_member', { p_id: memberId }));
}

/** The linked athlete or coach answers the club's request. */
export async function respondSquadLink(memberId: string, accept: boolean): Promise<void> {
  unwrap(await supabase.rpc('respond_squad_link', { p_member: memberId, p_accept: accept }));
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getClubMatches(orgId: string): Promise<ClubMatches> {
  return unwrap<ClubMatches>(await supabase.rpc('club_matches_for', { p_org: orgId }));
}

export async function getClubMatchPage(matchId: string): Promise<ClubMatchPage | null> {
  return unwrap<ClubMatchPage | null>(await supabase.rpc('club_match_page', { p_match: matchId }));
}

export async function saveClubMatch(orgId: string, id: string | null, input: ClubMatchInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_club_match', { p_org: orgId, p_id: id, p: input }));
}

export async function deleteClubMatch(matchId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_club_match', { p_id: matchId }));
}

export async function updateMatchLive(matchId: string, patch: MatchLiveUpdate): Promise<void> {
  unwrap(await supabase.rpc('update_match_live', { p_match: matchId, p: patch }));
}

export async function addMatchEvent(matchId: string, input: MatchEventInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('add_match_event', { p_match: matchId, p: input }));
}

export async function deleteMatchEvent(eventId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_match_event', { p_event: eventId }));
}

/**
 * Live updates for one match. The scoreboard row (`club_matches`) is the
 * public signal; on any change, re-read `getClubMatchPage` (which applies the
 * naming rule to the timeline). Returns an unsubscribe function.
 */
export function subscribeToMatch(matchId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`club-match-${matchId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'club_matches', filter: `id=eq.${matchId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Awards ───────────────────────────────────────────────────────────────────

export async function getClubAwards(orgId: string): Promise<ClubAward[]> {
  return unwrap<ClubAward[] | null>(await supabase.rpc('club_awards_for', { p_org: orgId })) ?? [];
}

export async function saveClubAward(orgId: string, id: string | null, input: ClubAwardInput): Promise<string> {
  return unwrap<string>(await supabase.rpc('save_club_award', { p_org: orgId, p_id: id, p: input }));
}

export async function deleteClubAward(awardId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_club_award', { p_id: awardId }));
}
