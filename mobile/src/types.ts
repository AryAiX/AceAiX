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
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  sport: string | null;
  positions: string[] | null;
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
  highlighted_stats: Record<string, unknown> | null;
  attributes: AttributeData[] | null;
  trajectory: TrajectoryPoint[] | null;
  analytics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface AttributeData {
  label: string;
  value: number;
  endorsements?: number;
  topEndorser?: string;
  topEndorserVerified?: boolean;
}

export interface TrajectoryPoint {
  season: string;
  goals?: number;
  score?: number;
  forecast?: number;
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
  ai_tags: string[] | null;
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
  stats: Record<string, unknown> | null;
  source: 'self' | 'verified' | 'cv';
  notes: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  league: string | null;
  country: string | null;
  city: string | null;
  is_verified: boolean;
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

export interface MedicalClearance {
  id: string;
  athlete_id: string;
  status: 'cleared' | 'restricted' | 'not_cleared' | 'pending';
  effective_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProfileViewCount {
  count: number;
}
