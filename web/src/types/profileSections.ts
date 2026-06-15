export interface CareerSpell {
  club: string;
  clubInitials: string;
  clubColor: string;
  role: string;
  from: string;
  to: string;
  appearances: number;
  goals: number;
  assists: number;
  honors: string[];
  description: string;
}

export interface AcademyEntry {
  name: string;
  location: string;
  years: string;
  scholarship: boolean;
  description: string;
}

export interface Certification {
  title: string;
  issuer: string;
  date: string;
  verified: boolean;
  expiry?: string;
}

export interface Honor {
  title: string;
  org: string;
  year: string;
  type: 'team' | 'individual' | 'national';
}

export interface Language {
  name: string;
  level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Elementary';
}

export interface FollowingItem {
  name: string;
  type: 'Club' | 'Federation' | 'Platform' | 'Athlete';
  followers: string;
  color: string;
  initials: string;
}

export interface MatchEntry {
  date: string;
  opponent: string;
  competition: string;
  result: string;
  minutes: number;
  goals: number;
  assists: number;
  rating: number;
}

export interface TrajectoryPoint {
  season: string;
  goals?: number;
  forecast?: number;
}

export interface AttributeData {
  label: string;
  value: number;
  endorsements: number;
  topEndorser: string;
  topEndorserVerified: boolean;
}

export interface HighlightClip {
  id: string;
  thumbnail: string;
  title: string;
  duration: string;
  tags: string[];
  views: string;
}

export interface ActivityPost {
  id: string;
  type: 'achievement' | 'match' | 'milestone' | 'media';
  text: string;
  time: string;
  reactions: number;
  image?: string;
}

export interface AthleteProfileData {
  id: string;
  name: string;
  position: string;
  positionSecondary: string;
  sport: string;
  club: string;
  clubInitials: string;
  clubColor: string;
  country: string;
  nationality: string;
  age: number;
  height: string;
  weight: string;
  preferredFoot: string;
  score: number;
  visibilityScore: number;
  performanceScore: number;
  fitnessScore: number;
  isVerified: boolean;
  isOpenToTrials: boolean;
  image: string;
  coverImage: string;
  followersCount: number;
  connectionsCount: number;
  bio: string;
  attributes: AttributeData[];
  career: CareerSpell[];
  academy: AcademyEntry[];
  certifications: Certification[];
  honors: Honor[];
  languages: Language[];
  following: FollowingItem[];
  recentMatches: MatchEntry[];
  trajectory: TrajectoryPoint[];
  highlights: HighlightClip[];
  activity: ActivityPost[];
}
