/**
 * Shapes returned by the AceAiX database.
 *
 * These mirror the RPC signatures in supabase/migrations one-for-one. When you
 * change an RPC, change the type in the same commit — the type is the contract
 * the whole UI is written against.
 */

export type UserRole =
  | 'athlete'
  | 'scout'
  | 'club'
  | 'coach'
  | 'medical_partner'
  | 'federation'
  | 'guardian'
  | 'org_admin'
  | 'admin'
  | 'guest';

/** The four roles a person can choose at signup. */
export const SIGNUP_ROLES = ['athlete', 'coach', 'club', 'guardian'] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export type Tier = 'rising' | 'bronze' | 'silver' | 'gold' | 'elite';
export type AgeBand = '13_15' | '16_17' | '18_24' | '25_plus';
export type MessagePrivacy = 'everyone' | 'verified' | 'following' | 'nobody';
export type PostAudience = 'public' | 'followers' | 'connections';

// ── Profiles ─────────────────────────────────────────────────────────────────
export interface UserSummary {
  id: string;
  role: UserRole;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  /** The wallpaper behind the profile header. Null falls back to a gradient. */
  cover_url?: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_minor: boolean;
  followers_count: number;
  following_count: number;
  allow_messages_from: MessagePrivacy;
  created_at: string;
}

export interface AthleteProfile {
  id: string;
  sport: string | null;
  position: string | null;
  position_secondary: string | null;
  level: string | null;
  league: string | null;
  club: string | null;
  club_id: string | null;
  nationality: string | null;
  dominant_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  /** Null for minors — only `age_band` is exposed for under-18 accounts. */
  age: number | null;
  age_band: AgeBand | null;
  is_open_to_offers: boolean;
  honors: unknown[];
  languages: unknown[];
  certifications: unknown[];
}

export interface CoachProfile {
  id: string;
  specialty: string | null;
  years_experience: number;
  philosophy: string | null;
  licenses: unknown[];
  current_club: string | null;
  is_open_to_opportunities: boolean;
}

export interface ScorePillars {
  profile: number;
  performance: number;
  media: number;
  credibility: number;
  engagement: number;
}

export interface TalentScore {
  overall: number;
  tier: Tier;
  percentile: number | null;
  previous_overall: number | null;
  pillars: ScorePillars;
  computed_at: string;
}

export interface ScoreTip {
  key: string;
  label: string;
  detail: string;
  points: number;
  pillar: keyof ScorePillars;
}

export interface FullTalentScore extends TalentScore {
  athlete_id: string;
  profile_score: number;
  performance_score: number;
  media_score: number;
  credibility_score: number;
  engagement_score: number;
  tips: ScoreTip[];
  inputs: Record<string, string | number | boolean>;
  ai_summary: string | null;
}

export interface Organization {
  id: string;
  name: string;
  type: 'club' | 'federation' | 'academy';
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  league: string | null;
  is_verified: boolean;
  followers_count: number;
}

export interface ProfileBundle {
  user: UserSummary;
  athlete: AthleteProfile | null;
  coach: CoachProfile | null;
  score: TalentScore | null;
  organization: Organization | null;
  stats: { posts: number; media: number; matches: number; endorsements: number };
  viewer: {
    is_self: boolean;
    is_following: boolean;
    follows_you: boolean;
    can_message: boolean;
    has_blocked: boolean;
  };
  blocked?: boolean;
  suspended?: boolean;
}

// ── Feed ─────────────────────────────────────────────────────────────────────
export interface PostMedia {
  url: string;
  type: 'photo' | 'video';
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface FeedPost {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_role: UserRole;
  author_verified: boolean;
  author_score: number;
  author_tier: Tier;
  athlete_sport: string | null;
  athlete_position: string | null;
  type: string;
  caption: string | null;
  media: PostMedia[];
  tags: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  viewer_liked: boolean;
  viewer_saved: boolean;
  viewer_follows: boolean;
  created_at: string;
}

export interface UserPost {
  id: string;
  type: string;
  caption: string | null;
  media: PostMedia[];
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  like_count: number;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null; is_verified: boolean };
}

// ── Discovery ────────────────────────────────────────────────────────────────
export interface DiscoveredAthlete {
  athlete_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  position: string | null;
  level: string | null;
  league: string | null;
  club: string | null;
  city: string | null;
  country: string | null;
  /** Null for anyone under 18 — the server returns only the band for minors. */
  age: number | null;
  age_band: AgeBand | null;
  height_cm: number | null;
  is_verified: boolean;
  is_minor: boolean;
  open_to_offers: boolean;
  talent_score: number;
  tier: Tier;
  match_percent: number;
  reasons: string[];
  total_count: number;
}

export interface DiscoveryFilters {
  query?: string;
  sport?: string;
  positions?: string[];
  levels?: string[];
  countries?: string[];
  ageMin?: number;
  ageMax?: number;
  minScore?: number;
  openOnly?: boolean;
  sort?: 'match' | 'score' | 'recent' | 'name';
}

// ── Opportunities ────────────────────────────────────────────────────────────
export interface Opportunity {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  location: string | null;
  sport: string | null;
  position: string | null;
  deadline: string | null;
  org_id: string | null;
  org_name: string | null;
  org_logo: string | null;
  org_verified: boolean;
  match_percent: number;
  reasons: string[];
  has_applied: boolean;
  is_saved: boolean;
  created_at: string;
}

export type ApplicationStatus =
  | 'applied'
  | 'in_review'
  | 'shortlisted'
  | 'invited'
  | 'rejected'
  | 'withdrawn';

export interface Applicant {
  application_id: string;
  athlete_user_id: string;
  athlete_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  /** Null for anyone under 18 — read `age_band` instead. */
  age: number | null;
  age_band: AgeBand | null;
  is_minor: boolean;
  country: string | null;
  talent_score: number;
  tier: Tier;
  match_percent: number;
  status: ApplicationStatus;
  message: string | null;
  applied_at: string;
}

// ── Messaging ────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  other_user_id: string;
  other_name: string | null;
  other_avatar: string | null;
  other_role: UserRole;
  other_verified: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_blocked: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export type MessageBlockReason =
  | 'minor_requires_verified_sender'
  | 'minor_requires_guardian_consent'
  | 'recipient_messages_off'
  | 'recipient_only_accepts_followed'
  | 'recipient_only_accepts_verified'
  | 'not_permitted'
  | 'not_found';

export interface MessagePermission {
  allowed: boolean;
  reason?: MessageBlockReason;
}

// ── Notifications ────────────────────────────────────────────────────────────
export type NotificationType =
  | 'follow'
  | 'message'
  | 'comment'
  | 'reply'
  | 'like'
  | 'application_received'
  | 'application_status'
  | 'profile_view'
  | 'endorsement'
  | 'score_tier_up'
  | 'opportunity';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  actor_id: string | null;
  entity_type: 'user' | 'post' | 'conversation' | 'opportunity' | 'score' | 'challenge' | null;
  entity_id: string | null;
  actor_count: number;
  data: Record<string, unknown>;
  created_at: string;
  actor?: { full_name: string | null; avatar_url: string | null };
}

// ── People search ────────────────────────────────────────────────────────────
/**
 * A row from `search_people`. Searching is discovery, so this RPC applies the
 * same gate as the recruiter search: a minor whose guardian has not approved
 * discovery is not in the result set at all.
 */
export interface PersonResult {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_minor: boolean;
  followers_count: number;
  sport: string | null;
  position: string | null;
  talent_score: number;
  tier: Tier;
  is_following: boolean;
}

// ── Guardian consent ─────────────────────────────────────────────────────────
/** A young person a signed-in guardian account is linked to. */
export interface LinkedMinor {
  minor_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  age_band: AgeBand | null;
  consent_id: string;
  status: GuardianConsent['status'];
  allow_discovery: boolean;
  allow_messaging: boolean;
  allow_media: boolean;
  granted_at: string | null;
}

/**
 * What a guardian may see of a minor's messages: that a conversation exists,
 * who it is with, and how busy it is — never its contents.
 */
export interface GuardianConversation {
  conversation_id: string;
  other_name: string | null;
  other_role: UserRole;
  other_verified: boolean;
  message_count: number;
  last_message_at: string | null;
}

export interface GuardianConsent {
  id: string;
  minor_user_id: string;
  guardian_name: string;
  guardian_email: string;
  relationship: 'parent' | 'guardian' | 'coach_guardian' | 'other';
  status: 'pending' | 'granted' | 'revoked' | 'expired';
  allow_discovery: boolean;
  allow_messaging: boolean;
  allow_media: boolean;
  granted_at: string | null;
  created_at: string;
}

// ── Preferences ──────────────────────────────────────────────────────────────
export interface NotificationPreferences {
  user_id: string;
  follows: boolean;
  messages: boolean;
  comments: boolean;
  likes: boolean;
  opportunities: boolean;
  applications: boolean;
  scout_interest: boolean;
  score_updates: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export interface MatchPreferences {
  user_id: string;
  organization_id: string | null;
  sports: string[];
  positions: string[];
  levels: string[];
  countries: string[];
  age_min: number | null;
  age_max: number | null;
  min_score: number;
  open_to_offers_only: boolean;
  notify_on_match: boolean;
}

export interface UnreadCounts {
  notifications: number;
  messages: number;
}

// ── Streaks and achievements ─────────────────────────────────────────────────
/**
 * The fast loop that sits under the Talent Score: something to notice today.
 * All of it is derived server-side from rows that prove it — none of it can be
 * claimed by the client.
 */
export interface Streak {
  current: number;
  longest: number;
  total_days: number;
  last_active_on: string | null;
  active_today: boolean;
}

export interface ScoreProgress {
  overall: number;
  tier: Tier;
  previous_overall: number | null;
  /** Null once someone is Elite — there is nothing above it. */
  next_tier: Tier | null;
  next_tier_at: number | null;
  points_to_next: number | null;
}

export interface UnlockedAchievement {
  key: AchievementKey;
  unlocked_at: string;
  seen: boolean;
}

export interface Progress {
  streak: Streak;
  score: ScoreProgress | null;
  achievements: UnlockedAchievement[];
  /** Earned but not yet celebrated. */
  unseen: AchievementKey[];
  /** ISO dates within the last week the person opened the app. */
  last_7_days: string[];
}

export interface ActivityResult {
  current_streak: number;
  longest_streak: number;
  total_days: number;
  first_visit_today: boolean;
}

/** Must match the keys awarded by `private.check_achievements`. */
export const ACHIEVEMENT_KEYS = [
  'first_post',
  'first_clip',
  'three_clips',
  'first_match',
  'ten_matches',
  'first_application',
  'first_follower',
  'ten_followers',
  'fifty_followers',
  'first_endorsement',
  'verified',
  'profile_complete',
  'tier_bronze',
  'tier_silver',
  'tier_gold',
  'tier_elite',
  'streak_3',
  'streak_7',
  'streak_30',
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

// ── Teams somebody supports ──────────────────────────────────────────────────
/**
 * Fandom, not employment. `Team` is a club or national side a person likes;
 * where an athlete actually plays is `AthleteProfile.current_club`, and the two
 * must never be shown in the same place.
 */
export interface Team {
  id: string;
  name: string;
  short_name: string | null;
  sport: string;
  country: string | null;
  city?: string | null;
  crest_url: string | null;
  is_curated?: boolean;
  followers?: number;
  rank?: number;
}

export interface TeamFan {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  sport: string | null;
  position: string | null;
  /** Null for anyone under 18 — read `age_band` instead. */
  age: number | null;
  age_band: string | null;
  talent_score: number | null;
  tier: Tier | null;
  is_verified: boolean;
}

// ── Challenges ───────────────────────────────────────────────────────────────
export type ChallengeStatus = 'open' | 'judging' | 'closed';
export type EntryStatus = 'submitted' | 'verified' | 'rejected';

export interface Challenge {
  id: string;
  title: string;
  brief: string;
  sport: string;
  /** Null on a judged challenge, where the coach simply orders the entries. */
  metric_label: string | null;
  metric_unit: string | null;
  metric_better: 'higher' | 'lower';
  closes_at: string;
  status: ChallengeStatus;
  entry_count: number;
  age_min: number | null;
  age_max: number | null;
  setter_id: string;
  setter_name: string | null;
  setter_avatar: string | null;
  setter_verified: boolean;
  org_id: string | null;
  org_name: string | null;
  my_entry_id: string | null;
  my_entry_status: EntryStatus | null;
}

export interface ChallengeEntry {
  entry_id: string;
  rank: number;
  athlete_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  age_band: string | null;
  sport: string | null;
  position: string | null;
  talent_score: number | null;
  tier: Tier | null;
  media_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  /** What the athlete says they did. */
  claimed_value: number | null;
  /** What a coach confirmed, or null while it is still just a claim. */
  verified_value: number | null;
  status: EntryStatus;
  note: string | null;
  created_at: string;
}

// ── Who has been looking ─────────────────────────────────────────────────────
export interface ProfileViewer {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization: string | null;
  views: number;
  last_viewed_at: string;
}

export interface ViewDigest {
  is_athlete: boolean;
  days: number;
  total: number;
  /** Views from coaches, scouts and clubs — the ones worth telling them about. */
  professional: number;
  clubs: number;
  new_since_seen: number;
  /** Only verified professionals are named; everybody else is in `unnamed`. */
  named: ProfileViewer[];
  unnamed: number;
}

// ── "What would it take?" ────────────────────────────────────────────────────
/** The inputs the simulator will move. Anything else is read from real rows. */
export const SIMULATABLE = [
  'profile_fields_filled',
  'matches_last_year',
  'matches_verified',
  'goal_contributions',
  'media_items',
  'video_items',
  'endorsements',
  'endorsements_expert',
  'posts_last_30_days',
  'followers',
  'account_verified',
  'club_linked',
] as const;

export type SimulatableInput = (typeof SIMULATABLE)[number];

export interface SimulatedScore {
  overall: number;
  tier: Tier;
  profile_score: number;
  performance_score: number;
  media_score: number;
  credibility_score: number;
  engagement_score: number;
  inputs: Record<string, number | boolean>;
}

export interface Simulation {
  current: SimulatedScore;
  projected: SimulatedScore;
  limits: { profile_fields_total: number; keys: SimulatableInput[] };
}
