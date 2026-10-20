import { supabase } from './supabase';

// ── Shapes returned by the admin_* RPCs (supabase/migrations/20261013000002_admin_console.sql)

export interface Person {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_minor: boolean;
  age_band: string | null;
  is_suspended: boolean;
  country: string | null;
}

export interface AdminMe extends Person {
  is_super_admin: boolean;
  email: string | null;
}

export interface Dashboard {
  users_total: number;
  signups_7d: number;
  signups_prev_7d: number;
  active_7d: number;
  minors: number;
  suspended: number;
  pending_verifications: number;
  unverified_pros: number;
  open_reports: number;
  urgent_reports: number;
  content_under_review: number;
  pending_consents: number;
  minors_without_consent: number;
  posts_7d: number;
  stories_live: number;
  deals_pending: number;
  bookings_upcoming: number;
  roles: Record<string, number>;
  signups_by_day: { day: string; count: number }[];
  reports_by_reason: Record<string, number>;
}

export interface MediaItem {
  url: string;
  type: 'photo' | 'video' | string;
  thumbnail?: string;
}

export interface ReportTarget {
  kind: string;
  id: string;
  deleted?: boolean;
  text?: string | null;
  media?: MediaItem[];
  media_url?: string | null;
  media_type?: string | null;
  image_url?: string | null;
  card?: Record<string, unknown>;
  state?: string;
  is_hidden?: boolean;
  created_at?: string;
  author?: Person | null;
  conversation_id?: string;
  post_id?: string;
}

export interface Report {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  details: string | null;
  severity: string;
  status: string;
  is_minor_related: boolean;
  resolution: string | null;
  action_taken: string | null;
  created_at: string;
  urgent: boolean;
  reporter: Person | null;
  reported_user: Person | null;
  resolved_by: Person | null;
  target: ReportTarget | null;
  duplicates: number;
  prior_reports_against_user: number;
}

export type ReportAction =
  | 'dismiss'
  | 'remove_content'
  | 'warn_user'
  | 'suspend_user'
  | 'ban_user'
  | 'escalate'
  | 'reviewing';

export interface ExtraProfile {
  sponsor?: { company_name: string | null; industry: string | null; website: string | null } | null;
  coach?: { specialty: string | null; years_experience: number | null; licenses: unknown; current_club: string | null } | null;
}

export interface VerificationRequest extends ExtraProfile {
  id: string;
  type: string;
  status: string;
  documents: { name?: string; kind?: string; url?: string; bucket?: string; path?: string }[];
  decision_reason: string | null;
  created_at: string;
  user: Person | null;
  email: string | null;
  bio: string | null;
  city: string | null;
  reviewed_by: Person | null;
  organization: { id: string; name: string; type: string; country: string | null; website: string | null } | null;
}

export interface UnrequestedPro extends ExtraProfile {
  user: Person;
  email: string | null;
  bio: string | null;
  city: string | null;
  created_at: string;
}

export interface ContentItem {
  kind: 'post' | 'story' | 'clip' | 'comment';
  id: string;
  type?: string;
  text: string | null;
  media?: MediaItem[];
  media_url?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
  image_url?: string | null;
  card?: Record<string, unknown>;
  audience?: string;
  state: string;
  removed_reason?: string | null;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  open_reports?: number;
  expires_at?: string;
  created_at: string;
  author: Person | null;
}

export interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  email: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_minor: boolean;
  age_band: string | null;
  is_discoverable: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_until: string | null;
  warning_count: number;
  followers_count: number;
  last_active_at: string | null;
  created_at: string;
  reports_against: number;
  open_reports: number;
}

export interface GuardianConsent {
  id: string;
  status: string;
  guardian_name: string | null;
  guardian_email: string | null;
  relationship: string;
  guardian: Person | null;
  allow_discovery: boolean;
  allow_messaging: boolean;
  allow_media: boolean;
  allow_assessments: boolean;
  allow_sponsorship: boolean;
  allow_bookings: boolean;
  allow_mindset: boolean;
  granted_at: string | null;
  revoked_at?: string | null;
  created_at: string;
  delivery_count?: number;
  last_delivery_at?: string | null;
}

export interface UserDetail extends ExtraProfile {
  profile: Record<string, unknown> & {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    bio: string | null;
    city: string | null;
    country: string | null;
    is_verified: boolean;
    is_minor: boolean;
    age_band: string | null;
    is_discoverable: boolean;
    is_suspended: boolean;
    suspended_reason: string | null;
    suspended_at: string | null;
    suspended_until: string | null;
    warning_count: number;
    created_at: string;
    last_active_at: string | null;
  };
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  suspended_by: Person | null;
  athlete: { sport: string | null; position: string | null; level: string | null; club: string | null; nationality: string | null; talent_score: number | null; tier: string | null } | null;
  stats: Record<string, number>;
  guardian_consents: GuardianConsent[];
  wards: Person[];
  reports_against: { id: string; reason: string; entity_type: string; status: string; severity: string; action_taken: string | null; created_at: string }[];
  verification_requests: { id: string; type: string; status: string; decision_reason: string | null; created_at: string }[];
  recent_posts: ContentItem[];
  history: { id: string; action: string; created_at: string; by: Person | null; note: string | null }[];
}

export interface MinorRow {
  user: Person;
  email: string | null;
  is_discoverable: boolean;
  created_at: string;
  consent_state: string;
  consent: GuardianConsent | null;
  adult_conversations: number;
  open_reports: number;
  deals: number;
  bookings: number;
}

export interface MinorContact {
  conversation_id: string;
  minor: Person;
  adult: Person;
  messages: number;
  messages_from_adult: number;
  messages_from_minor: number;
  last_message_at: string | null;
  created_at: string;
  is_guardian: boolean;
  adult_verified: boolean;
  reports: number;
}

export interface SponsorshipData {
  deals: {
    id: string; status: string; initiated_by: string; message: string | null; amount: number | null; currency: string;
    created_at: string; responded_at: string | null; sponsor: Person; company: string | null; athlete: Person;
    guardian_ok: boolean | null; request_title: string | null; call_title: string | null;
  }[];
  requests: {
    id: string; title: string; event_name: string | null; event_date: string | null; sport: string | null;
    amount: number | null; currency: string; status: string; pitch: string | null; created_at: string; athlete: Person;
  }[];
  calls: {
    id: string; title: string; description: string | null; sport: string | null; country: string | null;
    amount_min: number | null; amount_max: number | null; currency: string; slots: number; deadline: string | null;
    open_to_minors: boolean; is_active: boolean; created_at: string; sponsor: Person; company: string | null;
  }[];
}

export interface Booking {
  id: string;
  status: string;
  cancelled_by: string | null;
  note: string | null;
  location: string | null;
  created_at: string;
  cancelled_at: string | null;
  starts_at: string;
  ends_at: string;
  service: { title: string | null; kind: string | null; price: number | null; currency: string | null; location_mode: string | null; duration_minutes: number | null };
  coach: Person;
  athlete: Person;
  guardian_ok: boolean | null;
}

export interface AuditRow {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_value: unknown;
  new_value: Record<string, unknown> | null;
  created_at: string;
  by: Person | null;
  subject: Person | null;
}

export const SF_DIMENSIONS = ['drive', 'composure', 'focus', 'resilience', 'boldness', 'discipline', 'reading', 'speed'] as const;
export type SfDimension = (typeof SF_DIMENSIONS)[number];

export interface SportFitSport {
  sport: string;
  weights: Record<SfDimension, number>;
  team_target: number;
  active: boolean;
  reviewed_by: string | null;
  updated_at: string;
}

export interface SportFitOverview {
  players: number;
  players_minor: number;
  with_game_intelligence: number;
  last_30d: number;
  submissions: number;
  quality: Record<string, number>;
  top_sports: { sport: string; count: number | null; hidden: boolean }[];
  by_age_band: { band: string; count: number; hidden: boolean; dimensions?: Record<string, number> }[];
  by_day: { day: string; count: number }[];
  pending_consents: number;
  sports: SportFitSport[];
  items: { id: string; dimension: string; reverse: boolean; sort: number }[];
}

// ── Calls

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** A short-lived link to a document in a private bucket (club licences
 * live in club-documents). Admins can read it; nobody else can. */
export async function signedDocumentUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error('Could not open the document');
  return data.signedUrl;
}

export const api = {
  me: () => rpc<AdminMe>('admin_me'),
  dashboard: () => rpc<Dashboard>('admin_dashboard'),

  reports: (status: string, urgentOnly: boolean) =>
    rpc<Report[]>('admin_list_reports', { p_status: status, p_urgent_only: urgentOnly, p_limit: 100, p_offset: 0 }),
  resolveReport: (id: string, action: ReportAction, note?: string, suspendDays?: number) =>
    rpc<{ status: string; duplicates_closed: number }>('admin_resolve_report', {
      p_report: id, p_action: action, p_note: note ?? null, p_suspend_days: suspendDays ?? 7,
    }),

  verificationQueue: (status: string) =>
    rpc<{ requests: VerificationRequest[]; unrequested: UnrequestedPro[] }>('admin_verification_queue', { p_status: status }),
  decideVerification: (id: string, decision: 'approved' | 'rejected' | 'more_info', reason?: string) =>
    rpc<void>('admin_decide_verification', { p_request: id, p_decision: decision, p_reason: reason ?? null }),

  content: (kind: string, state: string, q: string, minorsOnly: boolean, offset = 0) =>
    rpc<ContentItem[]>('admin_list_content', {
      p_kind: kind, p_state: state, p_q: q || null, p_minors_only: minorsOnly, p_limit: 40, p_offset: offset,
    }),
  moderateContent: (kind: string, id: string, action: 'remove' | 'restore' | 'hide', reason?: string) =>
    rpc<void>('admin_moderate_content', { p_kind: kind, p_id: id, p_action: action, p_reason: reason ?? null, p_notify: true }),

  users: (q: string, role: string, status: string, offset = 0) =>
    rpc<{ total: number; rows: UserRow[] }>('admin_list_users', {
      p_q: q || null, p_role: role, p_status: status, p_limit: 50, p_offset: offset,
    }),
  user: (id: string) => rpc<UserDetail>('admin_get_user', { p_user: id }),
  setSuspension: (id: string, suspend: boolean, reason?: string, days?: number | null) =>
    rpc<void>('admin_set_suspension', { p_user: id, p_suspend: suspend, p_reason: reason ?? null, p_days: days ?? null }),
  warnUser: (id: string, message: string) => rpc<void>('admin_warn_user', { p_user: id, p_message: message }),
  setVerified: (id: string, verified: boolean, reason?: string) =>
    rpc<void>('admin_set_verified', { p_user: id, p_verified: verified, p_reason: reason ?? null }),
  setRole: (id: string, role: string) => rpc<void>('admin_set_role', { p_user: id, p_role: role }),

  minors: (filter: string) => rpc<MinorRow[]>('admin_list_minors', { p_filter: filter }),
  minorContacts: () => rpc<MinorContact[]>('admin_minor_contacts', { p_limit: 200 }),

  sponsorship: () => rpc<SponsorshipData>('admin_list_sponsorship', { p_status: 'all' }),
  sponsorshipAction: (kind: 'deal' | 'call' | 'request', id: string, reason: string) =>
    rpc<void>('admin_sponsorship_action', { p_kind: kind, p_id: id, p_reason: reason }),

  bookings: (scope: string) => rpc<Booking[]>('admin_list_bookings', { p_scope: scope }),
  cancelBooking: (id: string, reason: string) => rpc<void>('admin_cancel_booking', { p_booking: id, p_reason: reason }),

  sportFit: () => rpc<SportFitOverview>('admin_sport_fit_overview'),
  updateSportFitSport: (sport: string, weights: Record<SfDimension, number>, teamTarget: number, active: boolean) =>
    rpc<SportFitSport>('admin_update_sport_fit_sport', {
      p_sport: sport, p_weights: weights, p_team_target: teamTarget, p_active: active,
    }),
  reviewSportFitSport: (sport: string, reviewedBy: string | null) =>
    rpc<SportFitSport>('admin_review_sport_fit_sport', { p_sport: sport, p_reviewed_by: reviewedBy }),

  audit: (prefix: string, offset = 0) =>
    rpc<AuditRow[]>('admin_audit_log', { p_action_prefix: prefix || null, p_limit: 100, p_offset: offset }),
};
