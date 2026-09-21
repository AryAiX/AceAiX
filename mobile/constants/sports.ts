/**
 * Sport catalogue.
 *
 * Kept deliberately small and concrete: a 13-year-old picking their sport
 * should find it in the first screenful, not scroll through eighty options.
 * Positions are the ones scouts actually filter on.
 */

export interface SportConfig {
  key: string;
  label: string;
  emoji: string;
  positions: string[];
  /** Stats a scout expects to see for this sport. */
  metrics: { key: string; label: string; unit?: string }[];
}

export const SPORTS: SportConfig[] = [
  {
    key: 'Football',
    label: 'Football',
    emoji: '⚽️',
    positions: [
      'Goalkeeper',
      'Centre-back',
      'Full-back',
      'Wing-back',
      'Defensive midfielder',
      'Central midfielder',
      'Attacking midfielder',
      'Winger',
      'Striker',
    ],
    metrics: [
      { key: 'appearances', label: 'Appearances' },
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'minutes', label: 'Minutes', unit: 'min' },
      { key: 'clean_sheets', label: 'Clean sheets' },
    ],
  },
  {
    key: 'Basketball',
    label: 'Basketball',
    emoji: '🏀',
    positions: ['Point guard', 'Shooting guard', 'Small forward', 'Power forward', 'Centre'],
    metrics: [
      { key: 'games', label: 'Games' },
      { key: 'points', label: 'Points per game' },
      { key: 'rebounds', label: 'Rebounds per game' },
      { key: 'assists', label: 'Assists per game' },
    ],
  },
  {
    key: 'Tennis',
    label: 'Tennis',
    emoji: '🎾',
    positions: ['Singles', 'Doubles'],
    metrics: [
      { key: 'ranking', label: 'Ranking' },
      { key: 'matches', label: 'Matches' },
      { key: 'win_rate', label: 'Win rate', unit: '%' },
    ],
  },
  {
    key: 'Athletics',
    label: 'Athletics',
    emoji: '🏃',
    positions: ['Sprints', 'Middle distance', 'Long distance', 'Jumps', 'Throws', 'Hurdles'],
    metrics: [
      { key: 'personal_best', label: 'Personal best' },
      { key: 'season_best', label: 'Season best' },
      { key: 'competitions', label: 'Competitions' },
    ],
  },
  {
    key: 'Swimming',
    label: 'Swimming',
    emoji: '🏊',
    positions: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual medley'],
    metrics: [
      { key: 'personal_best', label: 'Personal best' },
      { key: 'meets', label: 'Meets' },
      { key: 'medals', label: 'Medals' },
    ],
  },
  {
    key: 'Cricket',
    label: 'Cricket',
    emoji: '🏏',
    positions: ['Batter', 'Bowler', 'All-rounder', 'Wicket-keeper'],
    metrics: [
      { key: 'matches', label: 'Matches' },
      { key: 'runs', label: 'Runs' },
      { key: 'wickets', label: 'Wickets' },
      { key: 'average', label: 'Average' },
    ],
  },
  {
    key: 'Volleyball',
    label: 'Volleyball',
    emoji: '🏐',
    positions: ['Setter', 'Outside hitter', 'Opposite', 'Middle blocker', 'Libero'],
    metrics: [
      { key: 'matches', label: 'Matches' },
      { key: 'kills', label: 'Kills' },
      { key: 'blocks', label: 'Blocks' },
    ],
  },
  {
    key: 'Handball',
    label: 'Handball',
    emoji: '🤾',
    positions: ['Goalkeeper', 'Left wing', 'Left back', 'Centre back', 'Right back', 'Right wing', 'Pivot'],
    metrics: [
      { key: 'matches', label: 'Matches' },
      { key: 'goals', label: 'Goals' },
      { key: 'saves', label: 'Saves' },
    ],
  },
  {
    key: 'Padel',
    label: 'Padel',
    emoji: '🎾',
    positions: ['Right side', 'Left side'],
    metrics: [
      { key: 'ranking', label: 'Ranking' },
      { key: 'matches', label: 'Matches' },
      { key: 'win_rate', label: 'Win rate', unit: '%' },
    ],
  },
  {
    key: 'Chess',
    label: 'Chess',
    emoji: '♟️',
    positions: ['Classical', 'Rapid', 'Blitz'],
    metrics: [
      { key: 'rating', label: 'Rating' },
      { key: 'games', label: 'Games' },
      { key: 'title', label: 'Title' },
    ],
  },
  {
    key: 'Esports',
    label: 'Esports',
    emoji: '🎮',
    positions: ['Entry', 'Support', 'IGL', 'Mid', 'Jungle', 'Duelist'],
    metrics: [
      { key: 'rank', label: 'Rank' },
      { key: 'tournaments', label: 'Tournaments' },
      { key: 'kd', label: 'K/D' },
    ],
  },
  {
    key: 'Martial Arts',
    label: 'Martial arts',
    emoji: '🥋',
    positions: ['Judo', 'Karate', 'Taekwondo', 'Boxing', 'Wrestling', 'MMA'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'belt', label: 'Belt / grade' },
    ],
  },
];

export const SPORT_KEYS = SPORTS.map((s) => s.key);

export function sportConfig(sport: string | null | undefined): SportConfig | undefined {
  if (!sport) return undefined;
  return SPORTS.find((s) => s.key.toLowerCase() === sport.toLowerCase());
}

export function positionsFor(sport: string | null | undefined): string[] {
  return sportConfig(sport)?.positions ?? [];
}

export function sportEmoji(sport: string | null | undefined): string {
  return sportConfig(sport)?.emoji ?? '🏅';
}

/** Competitive level, from playground to professional. */
export const LEVELS = [
  { key: 'grassroots', label: 'Grassroots', hint: 'School or community team' },
  { key: 'academy', label: 'Academy', hint: 'Club academy or development squad' },
  { key: 'amateur', label: 'Amateur', hint: 'Registered amateur competition' },
  { key: 'semi_pro', label: 'Semi-pro', hint: 'Paid, part-time' },
  { key: 'professional', label: 'Professional', hint: 'Full-time contract' },
] as const;

export type LevelKey = (typeof LEVELS)[number]['key'];

export function levelLabel(key: string | null | undefined): string {
  return LEVELS.find((l) => l.key === key)?.label ?? 'Grassroots';
}

export const DOMINANT_SIDE = ['Right', 'Left', 'Both'] as const;

/** Countries that matter first for this launch, then the long tail. */
export const PRIORITY_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Iran',
  'Egypt',
  'Jordan',
  'Lebanon',
  'Morocco',
  'Tunisia',
  'Turkey',
  'United Kingdom',
  'Spain',
  'Portugal',
  'Germany',
  'France',
  'Italy',
  'Netherlands',
  'Brazil',
  'Argentina',
  'United States',
  'Canada',
  'Australia',
  'India',
  'Pakistan',
  'Nigeria',
  'Ghana',
  'South Africa',
];

export const OPPORTUNITY_TYPES = [
  { key: 'trial', label: 'Trial', hint: 'Open session or assessment day' },
  { key: 'scholarship', label: 'Scholarship', hint: 'Academy or university place' },
  { key: 'contract', label: 'Contract', hint: 'Playing contract or offer' },
  { key: 'camp', label: 'Camp', hint: 'Training camp or showcase' },
] as const;

// ── Translation keys ─────────────────────────────────────────────────────────
/**
 * Sports, positions and levels are stored in the database in English — an
 * athlete's sport has to mean the same thing to a coach in Madrid and a coach
 * in Dubai. Only the label a person reads is translated, through these maps.
 *
 * An unmapped value falls back to itself, so a sport added to the database
 * before it is added here shows its English name rather than a blank chip.
 */
const SPORT_LABEL_KEYS: Record<string, string> = {
  Football: 'sports.football',
  Basketball: 'sports.basketball',
  Tennis: 'sports.tennis',
  Athletics: 'sports.athletics',
  Swimming: 'sports.swimming',
  Cricket: 'sports.cricket',
  Volleyball: 'sports.volleyball',
  Handball: 'sports.handball',
  Padel: 'sports.padel',
  Chess: 'sports.chess',
  Esports: 'sports.esports',
  'Martial Arts': 'sports.martialArts',
};

const POSITION_KEYS: Record<string, string> = {
  Goalkeeper: 'sports.position.goalkeeper',
  'Centre-back': 'sports.position.centreBack',
  'Full-back': 'sports.position.fullBack',
  'Wing-back': 'sports.position.wingBack',
  'Defensive midfielder': 'sports.position.defensiveMidfielder',
  'Central midfielder': 'sports.position.centralMidfielder',
  'Attacking midfielder': 'sports.position.attackingMidfielder',
  Winger: 'sports.position.winger',
  Striker: 'sports.position.striker',
  'Point guard': 'sports.position.pointGuard',
  'Shooting guard': 'sports.position.shootingGuard',
  'Small forward': 'sports.position.smallForward',
  'Power forward': 'sports.position.powerForward',
  Centre: 'sports.position.centre',
  Singles: 'sports.position.singles',
  Doubles: 'sports.position.doubles',
  Sprints: 'sports.position.sprints',
  'Middle distance': 'sports.position.middleDistance',
  'Long distance': 'sports.position.longDistance',
  Jumps: 'sports.position.jumps',
  Throws: 'sports.position.throws',
  Hurdles: 'sports.position.hurdles',
  Freestyle: 'sports.position.freestyle',
  Backstroke: 'sports.position.backstroke',
  Breaststroke: 'sports.position.breaststroke',
  Butterfly: 'sports.position.butterfly',
  'Individual medley': 'sports.position.individualMedley',
  Batter: 'sports.position.batter',
  Bowler: 'sports.position.bowler',
  'All-rounder': 'sports.position.allRounder',
  'Wicket-keeper': 'sports.position.wicketKeeper',
  Setter: 'sports.position.setter',
  'Outside hitter': 'sports.position.outsideHitter',
  Opposite: 'sports.position.opposite',
  'Middle blocker': 'sports.position.middleBlocker',
  Libero: 'sports.position.libero',
  'Left wing': 'sports.position.leftWing',
  'Left back': 'sports.position.leftBack',
  'Centre back': 'sports.position.centreBackHandball',
  'Right back': 'sports.position.rightBack',
  'Right wing': 'sports.position.rightWing',
  Pivot: 'sports.position.pivot',
  'Right side': 'sports.position.rightSide',
  'Left side': 'sports.position.leftSide',
  Classical: 'sports.position.classical',
  Rapid: 'sports.position.rapid',
  Blitz: 'sports.position.blitz',
  Entry: 'sports.position.entry',
  Support: 'sports.position.support',
  IGL: 'sports.position.igl',
  Mid: 'sports.position.mid',
  Jungle: 'sports.position.jungle',
  Duelist: 'sports.position.duelist',
  Judo: 'sports.position.judo',
  Karate: 'sports.position.karate',
  Taekwondo: 'sports.position.taekwondo',
  Boxing: 'sports.position.boxing',
  Wrestling: 'sports.position.wrestling',
  MMA: 'sports.position.mma',
};

const LEVEL_KEYS: Record<string, { label: string; hint: string }> = {
  grassroots: { label: 'sports.level.grassroots', hint: 'sports.level.grassrootsHint' },
  academy: { label: 'sports.level.academy', hint: 'sports.level.academyHint' },
  amateur: { label: 'sports.level.amateur', hint: 'sports.level.amateurHint' },
  semi_pro: { label: 'sports.level.semiPro', hint: 'sports.level.semiProHint' },
  professional: { label: 'sports.level.professional', hint: 'sports.level.professionalHint' },
};

const SIDE_KEYS: Record<string, string> = {
  Right: 'sports.side.right',
  Left: 'sports.side.left',
  Both: 'sports.side.both',
};

const OPPORTUNITY_TYPE_KEYS: Record<string, { label: string; hint: string }> = {
  trial: { label: 'sports.opportunityType.trial', hint: 'sports.opportunityType.trialHint' },
  scholarship: {
    label: 'sports.opportunityType.scholarship',
    hint: 'sports.opportunityType.scholarshipHint',
  },
  contract: { label: 'sports.opportunityType.contract', hint: 'sports.opportunityType.contractHint' },
  camp: { label: 'sports.opportunityType.camp', hint: 'sports.opportunityType.campHint' },
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Translate a stored sport name, falling back to the stored value. */
export function sportLabel(t: Translate, sport: string | null | undefined): string {
  if (!sport) return '';
  const key = SPORT_LABEL_KEYS[sport];
  return key ? t(key) : sport;
}

export function positionLabel(t: Translate, position: string | null | undefined): string {
  if (!position) return '';
  const key = POSITION_KEYS[position];
  return key ? t(key) : position;
}

export function levelLabelI18n(t: Translate, level: string | null | undefined): string {
  const entry = LEVEL_KEYS[level ?? ''];
  return entry ? t(entry.label) : levelLabel(level);
}

export function levelHint(t: Translate, level: string | null | undefined): string {
  const entry = LEVEL_KEYS[level ?? ''];
  return entry ? t(entry.hint) : '';
}

export function sideLabel(t: Translate, side: string | null | undefined): string {
  if (!side) return '';
  const key = SIDE_KEYS[side];
  return key ? t(key) : side;
}

export function opportunityTypeLabel(t: Translate, type: string | null | undefined): string {
  const entry = OPPORTUNITY_TYPE_KEYS[type ?? ''];
  return entry ? t(entry.label) : (type ?? '');
}

export function opportunityTypeHint(t: Translate, type: string | null | undefined): string {
  const entry = OPPORTUNITY_TYPE_KEYS[type ?? ''];
  return entry ? t(entry.hint) : '';
}

const COUNTRY_KEYS: Record<string, string> = {
  'United Arab Emirates': 'countries.unitedArabEmirates',
  'Saudi Arabia': 'countries.saudiArabia',
  'Qatar': 'countries.qatar',
  'Kuwait': 'countries.kuwait',
  'Bahrain': 'countries.bahrain',
  'Oman': 'countries.oman',
  'Iran': 'countries.iran',
  'Egypt': 'countries.egypt',
  'Jordan': 'countries.jordan',
  'Lebanon': 'countries.lebanon',
  'Morocco': 'countries.morocco',
  'Tunisia': 'countries.tunisia',
  'Turkey': 'countries.turkey',
  'United Kingdom': 'countries.unitedKingdom',
  'Spain': 'countries.spain',
  'Portugal': 'countries.portugal',
  'Germany': 'countries.germany',
  'France': 'countries.france',
  'Italy': 'countries.italy',
  'Netherlands': 'countries.netherlands',
  'Brazil': 'countries.brazil',
  'Argentina': 'countries.argentina',
  'United States': 'countries.unitedStates',
  'Canada': 'countries.canada',
  'Australia': 'countries.australia',
  'India': 'countries.india',
  'Pakistan': 'countries.pakistan',
  'Nigeria': 'countries.nigeria',
  'Ghana': 'countries.ghana',
  'South Africa': 'countries.southAfrica',
};

/** Translate a stored country name, falling back to the stored value. */
export function countryLabel(t: Translate, country: string | null | undefined): string {
  if (!country) return '';
  const key = COUNTRY_KEYS[country];
  return key ? t(key) : country;
}
