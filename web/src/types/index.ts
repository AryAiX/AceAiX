export type UserRole =
  | 'athlete' | 'scout' | 'club' | 'coach' | 'medical_partner'
  | 'federation' | 'guardian' | 'org_admin' | 'admin' | 'guest';
export type SubscriptionTier = 'free' | 'pro' | 'elite' | 'enterprise';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'more_info';
export type ClearanceStatus = 'cleared' | 'restricted' | 'not_cleared' | 'pending';
export type RecommendationRelationship =
  | 'coach' | 'teammate' | 'manager' | 'scout' | 'medical_staff' | 'colleague';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  locale: string | null;
  is_verified: boolean;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
  // sensitive (from user_private; only present for the owner)
  email?: string | null;
  phone?: string | null;
}

export interface UserPrivate {
  user_id: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notification_preferences: Record<string, unknown>;
}

export interface AttributeData {
  label: string;
  value: number;
  endorsements: number;
  topEndorser: string;
  topEndorserVerified: boolean;
}

export interface TrajectoryPoint {
  season: string;
  goals?: number;
  score?: number;
  forecast?: number;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  sport: string | null;
  positions: string[];
  position: string | null;
  position_primary: string | null;
  position_secondary: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  nationality: string | null;
  dominant_foot: string | null;
  current_club_id: string | null;
  current_club: string | null;
  level: string;
  bio: string | null;
  cover_url: string | null;
  is_open_to_offers: boolean;
  visibility_score: number;
  performance_score: number;
  fitness_score: number;
  profile_completeness: number;
  followers_count: number;
  connections_count: number;
  highlighted_stats: Record<string, unknown>;
  attributes: AttributeData[];
  academy: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  honors: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  following: Array<Record<string, unknown>>;
  trajectory: TrajectoryPoint[];
  analytics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface AthleteAttribute {
  id: string;
  athlete_id: string;
  attribute_key: string;
  value: number | null;
  source: 'self' | 'verified' | 'cv';
  recorded_at: string;
}

export interface AthleteMedia {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  media_type: 'video' | 'image' | 'highlight_reel' | 'document';
  storage_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  transcode_status: string;
  is_featured: boolean;
  is_public: boolean;
  views_count: number;
  ai_tags: string[];
  created_at: string;
}

export interface MatchRecord {
  id: string;
  athlete_id: string;
  match_date: string;
  opponent: string | null;
  competition: string | null;
  result: string | null;
  minutes_played: number | null;
  goals: number;
  assists: number;
  stats: Record<string, unknown>;
  source: 'self' | 'verified' | 'cv';
  notes: string | null;
  created_at: string;
}

export interface MedicalPartner {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  name: string;
  license_number: string | null;
  accreditation_status: VerificationStatus;
  commission_rate: number;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  athlete_id: string;
  partner_id: string | null;
  record_type: string;
  title: string | null;
  summary: string | null;
  file_url: string | null;
  hash: string | null;
  anchor_ref: string | null;
  issued_at: string;
  is_verified: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface MedicalClearance {
  id: string;
  athlete_id: string;
  partner_id: string | null;
  status: ClearanceStatus;
  issued_by: string | null;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface Injury {
  id: string;
  athlete_id: string;
  partner_id: string | null;
  injury_type: string | null;
  body_area: string | null;
  severity: string | null;
  occurred_at: string | null;
  recovery_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicalConsent {
  id: string;
  athlete_id: string;
  grantee_user_id: string | null;
  grantee_org_id: string | null;
  scope: string;
  status: 'granted' | 'revoked' | 'pending';
  granted_at: string;
  revoked_at: string | null;
}

export interface Endorsement {
  id: string;
  athlete_id: string;
  endorser_id: string;
  endorser_role: UserRole | null;
  skill_or_trait: string;
  note: string | null;
  created_at: string;
  endorser?: UserProfile;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower?: UserProfile;
  following?: UserProfile;
}

export interface Recommendation {
  id: string;
  author_id: string;
  recipient_id: string;
  relationship_type: RecommendationRelationship;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  recipient?: UserProfile;
}

export interface CareerMilestone {
  id: string;
  athlete_id: string;
  milestone_type: string | null;
  club_or_event: string | null;
  achieved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  athletes?: WatchlistAthlete[];
}

export interface WatchlistAthlete {
  id: string;
  watchlist_id: string;
  athlete_id: string;
  notes: string | null;
  rating: number | null;
  added_at: string;
  athlete?: AthleteProfile & { user?: UserProfile };
}

export interface ContactRequest {
  id: string;
  scout_id: string;
  athlete_id: string;
  message: string | null;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  initials: string | null;
  type: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  league: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  stadium: string | null;
  stadium_capacity: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  verification_status: VerificationStatus;
  is_verified: boolean;
  followers_count: number;
  founded_year: number | null;
  values: string[];
  profile: Record<string, unknown>;
  created_at: string;
}

export interface Opportunity {
  id: string;
  organization_id: string | null;
  created_by_id: string;
  title: string;
  description: string | null;
  type: string | null;
  location: string | null;
  sport: string | null;
  position: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  application_deadline: string | null;
  is_active: boolean;
  created_at: string;
  organization?: Organization;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  other_user?: UserProfile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: UserProfile;
}

export interface AiChatSession {
  id: string;
  user_id: string | null;
  title: string | null;
  context_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiChatMessage {
  id: string;
  session_id: string;
  sender_role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface SuccessStory {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  excerpt: string | null;
  athlete_id: string | null;
  athlete_name: string | null;
  sport: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  athlete_id: string | null;
  type: string;
  text: string | null;
  image_url: string | null;
  reactions_count: number;
  comments_count: number;
  created_at: string;
  author?: UserProfile;
}

export interface CoachProfile {
  id: string;
  user_id: string;
  specialty: string | null;
  current_club: string | null;
  current_club_id: string | null;
  country: string | null;
  nationality: string | null;
  years_experience: number;
  score: number;
  win_rate: number | null;
  total_trophies: number;
  total_matches: number;
  is_open_to_opportunities: boolean;
  cover_url: string | null;
  philosophy: string | null;
  coaching_spells: Array<Record<string, unknown>>;
  licenses: Array<Record<string, unknown>>;
  attributes: Array<Record<string, unknown>>;
  honors: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  activity: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface ProfileView {
  id: string;
  athlete_id: string;
  viewer_user_id: string | null;
  viewer_name: string | null;
  viewer_role: string | null;
  viewer_org: string | null;
  viewer_verified: boolean;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  subject_user_id: string | null;
  organization_id: string | null;
  type: string;
  status: VerificationStatus;
  documents: Array<Record<string, unknown>>;
  reviewed_by: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoutProfile {
  id: string;
  user_id: string;
  organization_id: string | null;
  credentials: string | null;
  verification_status: VerificationStatus;
  contact_quota_used: number;
  contact_quota_limit: number;
}

export interface CmsContent<T = Record<string, unknown>> {
  key: string;
  data: T;
  updated_at: string;
}
