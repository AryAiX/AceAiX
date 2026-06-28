export type Archetype =
  | 'team_match'
  | 'rated_ladder'
  | 'timed_measured'
  | 'judged_scored'
  | 'handicap_niche'
  | 'combat';

export type MetricType = 'number' | 'time' | 'percent' | 'rating' | 'text';

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  type: MetricType;
  higherIsBetter: boolean;
}

export interface SportConfig {
  sport: string;
  displayName: string;
  archetype: Archetype;
  metrics: MetricDef[];
  supportsAutoSync: boolean;
  syncNote?: string;
}

const SPORTS_CONFIG: Record<string, SportConfig> = {
  volleyball: {
    sport: 'volleyball',
    displayName: 'Volleyball',
    archetype: 'team_match',
    supportsAutoSync: false,
    metrics: [
      { key: 'kills', label: 'Kills', unit: '', type: 'number', higherIsBetter: true },
      { key: 'blocks', label: 'Blocks', unit: '', type: 'number', higherIsBetter: true },
      { key: 'digs', label: 'Digs', unit: '', type: 'number', higherIsBetter: true },
      { key: 'aces', label: 'Aces', unit: '', type: 'number', higherIsBetter: true },
      { key: 'assists', label: 'Assists', unit: '', type: 'number', higherIsBetter: true },
      { key: 'points', label: 'Points', unit: '', type: 'number', higherIsBetter: true },
      { key: 'sets_played', label: 'Sets Played', unit: '', type: 'number', higherIsBetter: false },
      { key: 'attack_pct', label: 'Attack %', unit: '%', type: 'percent', higherIsBetter: true },
    ],
  },
  basketball: {
    sport: 'basketball',
    displayName: 'Basketball',
    archetype: 'team_match',
    supportsAutoSync: false,
    metrics: [
      { key: 'points', label: 'Points', unit: 'ppg', type: 'number', higherIsBetter: true },
      { key: 'rebounds', label: 'Rebounds', unit: 'rpg', type: 'number', higherIsBetter: true },
      { key: 'assists', label: 'Assists', unit: 'apg', type: 'number', higherIsBetter: true },
      { key: 'steals', label: 'Steals', unit: 'spg', type: 'number', higherIsBetter: true },
      { key: 'blocks', label: 'Blocks', unit: 'bpg', type: 'number', higherIsBetter: true },
      { key: 'fg_pct', label: 'FG%', unit: '%', type: 'percent', higherIsBetter: true },
      { key: 'three_pct', label: '3PT%', unit: '%', type: 'percent', higherIsBetter: true },
      { key: 'minutes', label: 'Minutes', unit: 'mpg', type: 'number', higherIsBetter: false },
    ],
  },
  swimming: {
    sport: 'swimming',
    displayName: 'Swimming',
    archetype: 'timed_measured',
    supportsAutoSync: false,
    syncNote: 'Enter personal bests manually. Import meet results via CSV.',
    metrics: [
      { key: '50m_free', label: '50m Free', unit: 's', type: 'time', higherIsBetter: false },
      { key: '100m_free', label: '100m Free', unit: 's', type: 'time', higherIsBetter: false },
      { key: '200m_free', label: '200m Free', unit: 's', type: 'time', higherIsBetter: false },
      { key: '100m_fly', label: '100m Fly', unit: 's', type: 'time', higherIsBetter: false },
      { key: '100m_back', label: '100m Back', unit: 's', type: 'time', higherIsBetter: false },
      { key: '100m_breast', label: '100m Breast', unit: 's', type: 'time', higherIsBetter: false },
      { key: '200m_im', label: '200m IM', unit: 's', type: 'time', higherIsBetter: false },
    ],
  },
  polo: {
    sport: 'polo',
    displayName: 'Polo',
    archetype: 'handicap_niche',
    supportsAutoSync: false,
    syncNote: 'Polo handicap is published by national federations. Enter your official handicap.',
    metrics: [
      { key: 'handicap', label: 'Handicap', unit: 'goals', type: 'number', higherIsBetter: true },
      { key: 'tournaments_played', label: 'Tournaments', unit: '', type: 'number', higherIsBetter: false },
      { key: 'goals_scored', label: 'Goals Scored', unit: '', type: 'number', higherIsBetter: true },
      { key: 'season', label: 'Season', unit: '', type: 'text', higherIsBetter: false },
    ],
  },
  chess: {
    sport: 'chess',
    displayName: 'Chess',
    archetype: 'rated_ladder',
    supportsAutoSync: true,
    syncNote: 'Auto-syncs from Chess.com and Lichess via public APIs. Enter your usernames in Settings.',
    metrics: [
      { key: 'rapid_rating', label: 'Rapid', unit: '', type: 'rating', higherIsBetter: true },
      { key: 'blitz_rating', label: 'Blitz', unit: '', type: 'rating', higherIsBetter: true },
      { key: 'bullet_rating', label: 'Bullet', unit: '', type: 'rating', higherIsBetter: true },
      { key: 'classical_rating', label: 'Classical', unit: '', type: 'rating', higherIsBetter: true },
      { key: 'fide_rating', label: 'FIDE', unit: '', type: 'rating', higherIsBetter: true },
      { key: 'wins', label: 'Wins', unit: '', type: 'number', higherIsBetter: true },
      { key: 'losses', label: 'Losses', unit: '', type: 'number', higherIsBetter: false },
      { key: 'draws', label: 'Draws', unit: '', type: 'number', higherIsBetter: false },
      { key: 'title', label: 'Title', unit: '', type: 'text', higherIsBetter: false },
      { key: 'peak_rating', label: 'Peak Rating', unit: '', type: 'rating', higherIsBetter: true },
    ],
  },
  football: {
    sport: 'football',
    displayName: 'Football',
    archetype: 'team_match',
    supportsAutoSync: false,
    metrics: [
      { key: 'goals', label: 'Goals', unit: '', type: 'number', higherIsBetter: true },
      { key: 'assists', label: 'Assists', unit: '', type: 'number', higherIsBetter: true },
      { key: 'appearances', label: 'Appearances', unit: '', type: 'number', higherIsBetter: false },
      { key: 'pass_acc', label: 'Pass Acc.', unit: '%', type: 'percent', higherIsBetter: true },
      { key: 'shots_per_game', label: 'Shots/Game', unit: '', type: 'number', higherIsBetter: true },
      { key: 'avg_rating', label: 'Avg Rating', unit: '', type: 'number', higherIsBetter: true },
    ],
  },
};

export default SPORTS_CONFIG;

export function getSportConfig(sport: string | null | undefined): SportConfig | null {
  if (!sport) return null;
  return SPORTS_CONFIG[sport.toLowerCase()] ?? null;
}

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  team_match: 'Team Match',
  rated_ladder: 'Rated Ladder',
  timed_measured: 'Timed / Measured',
  judged_scored: 'Judged / Scored',
  handicap_niche: 'Handicap',
  combat: 'Combat',
};
