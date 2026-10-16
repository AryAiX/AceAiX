/**
 * Club and academy pages (1014/01): the fixed lists the screens choose from,
 * and the small pure helpers the screens and tests share. Stored values are
 * English keys; only the labels people read are translated.
 */

export type ClubType = 'club' | 'academy';
export type ClubRole = 'owner' | 'manager' | 'editor' | 'scorekeeper' | 'coach' | 'scout' | 'staff';
/** Roles a manager can hand out from the Team screen. */
export const INVITABLE_ROLES = ['manager', 'editor', 'scorekeeper', 'coach', 'staff'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export type BroadcastAudience = 'followers' | 'squad' | 'all';
export const BROADCAST_AUDIENCES: BroadcastAudience[] = ['followers', 'squad', 'all'];
/** The database refuses a fourth in 24 hours. */
export const BROADCASTS_PER_DAY = 3;

export const EVENT_KINDS = ['trial', 'camp', 'clinic', 'tournament', 'open_day', 'showcase', 'other'] as const;
export type ClubEventKind = (typeof EVENT_KINDS)[number];

export const STAFF_ROLES = [
  'head_coach',
  'assistant_coach',
  'goalkeeper_coach',
  'fitness_coach',
  'physio',
  'analyst',
  'team_manager',
  'other',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const AWARD_PLACEMENTS = ['winner', 'runner_up', 'third', 'finalist', 'individual', 'other'] as const;
export type AwardPlacement = (typeof AWARD_PLACEMENTS)[number];
export type AwardRecipientKind = 'club' | 'player' | 'coach';

export const MATCH_STATUSES = ['scheduled', 'live', 'half_time', 'finished', 'postponed', 'cancelled'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_EVENT_KINDS = [
  'goal',
  'penalty_goal',
  'own_goal',
  'point',
  'yellow_card',
  'red_card',
  'substitution',
  'timeout',
  'period',
  'note',
] as const;
export type MatchEventKind = (typeof MATCH_EVENT_KINDS)[number];
export type MatchSide = 'us' | 'them';

/** Event kinds that move the score. Mirrors `add_match_event` in SQL. */
export const SCORING_KINDS: MatchEventKind[] = ['goal', 'penalty_goal', 'own_goal', 'point'];

/**
 * Categories offered as one-tap chips when a club picks its age groups. The
 * club can type its own as well ("U9 girls", "Elite"), up to 30 characters.
 */
export const CATEGORY_PRESETS = [
  'U8',
  'U10',
  'U12',
  'U14',
  'U16',
  'U18',
  'U21',
  'Senior',
  'Women',
  'Girls',
  'Para',
  'Masters',
] as const;

/** Facilities offered as chips; free text is allowed too. */
export const FACILITY_PRESETS = [
  'Grass pitch',
  'Artificial pitch',
  'Indoor court',
  'Swimming pool',
  'Gym',
  'Running track',
  'Physio room',
  'Changing rooms',
  'Parking',
  'Cafeteria',
] as const;

export const SOCIAL_KEYS = ['instagram', 'x', 'facebook', 'youtube', 'tiktok', 'linkedin', 'snapchat'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** Platforms a live stream may link to. Mirrors `private.club_stream_url`. */
export const STREAM_HOSTS = [
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'twitch.tv',
  'facebook.com',
  'fb.watch',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'kick.com',
  'vimeo.com',
];

export function isAllowedStreamUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  const m = /^https:\/\/([^/\s]+)(\/\S*)?$/i.exec(v);
  if (!m) return false;
  const host = m[1].toLowerCase();
  return STREAM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function isLive(status: MatchStatus | string | null | undefined): boolean {
  return status === 'live' || status === 'half_time';
}

/**
 * Mirrors `private.is_youth_category`: U-anything up to 18, or a youth word.
 * The client uses it only to explain the naming rule; the database applies it.
 */
export function isYouthCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  if (/(youth|junior|kids|mini|cadet|براعم|ناشئين|شباب)/i.test(category)) return true;
  const m = /^\s*u\s*-?\s*(\d{1,2})/i.exec(category);
  return !!m && Number(m[1]) <= 18;
}

/** "Al Jadaf Academy" → "AJ". For a logo placeholder. */
export function clubInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Score from the club's side, ordered home–away for display. */
export function scoreLine(m: { is_home: boolean; our_score: number; their_score: number }): {
  home: number;
  away: number;
} {
  return m.is_home
    ? { home: m.our_score, away: m.their_score }
    : { home: m.their_score, away: m.our_score };
}

export type MatchOutcome = 'win' | 'draw' | 'loss' | null;

export function matchOutcome(m: { status: string; our_score: number; their_score: number }): MatchOutcome {
  if (m.status !== 'finished') return null;
  if (m.our_score > m.their_score) return 'win';
  if (m.our_score < m.their_score) return 'loss';
  return 'draw';
}

/** Trim, drop blanks and case-insensitive duplicates, keep the first spelling. */
export function cleanList(values: readonly string[], max = 20, maxLength = 30): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().slice(0, maxLength);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return /^\+?[0-9 ()-]{6,30}$/.test(value.trim());
}

export function isValidFoundedYear(value: number, now = new Date()): boolean {
  return Number.isInteger(value) && value >= 1800 && value <= now.getFullYear();
}
