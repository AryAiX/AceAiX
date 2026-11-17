/**
 * Sport catalogue.
 *
 * Thirty sports. The pickers have search, so a 13-year-old can find theirs
 * without scrolling the whole list. Positions are the ones scouts actually
 * filter on.
 */

import { fold } from '@/lib/searchRank';

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
    positions: ['Karate', 'MMA', 'Kickboxing', 'Muay Thai', 'Kung fu'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'belt', label: 'Belt / grade' },
    ],
  },
  {
    key: 'Futsal',
    label: 'Futsal',
    emoji: '🥅',
    positions: ['Goalkeeper', 'Defender', 'Winger', 'Pivot'],
    metrics: [
      { key: 'appearances', label: 'Appearances' },
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'clean_sheets', label: 'Clean sheets' },
    ],
  },
  {
    key: 'Rugby',
    label: 'Rugby',
    emoji: '🏉',
    positions: [
      'Prop',
      'Hooker',
      'Lock',
      'Flanker',
      'Number 8',
      'Scrum-half',
      'Fly-half',
      'Inside centre',
      'Outside centre',
      'Wing',
      'Full-back',
    ],
    metrics: [
      { key: 'appearances', label: 'Appearances' },
      { key: 'tries', label: 'Tries' },
      { key: 'conversions', label: 'Conversions' },
      { key: 'tackles', label: 'Tackles' },
    ],
  },
  {
    key: 'Field Hockey',
    label: 'Field hockey',
    emoji: '🏑',
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    metrics: [
      { key: 'appearances', label: 'Appearances' },
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'clean_sheets', label: 'Clean sheets' },
    ],
  },
  {
    key: 'Badminton',
    label: 'Badminton',
    emoji: '🏸',
    positions: ['Singles', 'Doubles', 'Mixed doubles'],
    metrics: [
      { key: 'ranking', label: 'Ranking' },
      { key: 'matches', label: 'Matches' },
      { key: 'wins', label: 'Wins' },
    ],
  },
  {
    key: 'Table Tennis',
    label: 'Table tennis',
    emoji: '🏓',
    positions: ['Singles', 'Doubles', 'Mixed doubles'],
    metrics: [
      { key: 'rating', label: 'Rating' },
      { key: 'matches', label: 'Matches' },
      { key: 'wins', label: 'Wins' },
    ],
  },
  {
    key: 'Squash',
    label: 'Squash',
    emoji: '🟡',
    positions: ['Singles', 'Doubles'],
    metrics: [
      { key: 'ranking', label: 'Ranking' },
      { key: 'matches', label: 'Matches' },
      { key: 'wins', label: 'Wins' },
    ],
  },
  {
    key: 'Golf',
    label: 'Golf',
    emoji: '⛳️',
    positions: ['Stroke play', 'Match play'],
    metrics: [
      { key: 'handicap', label: 'Handicap' },
      { key: 'rounds', label: 'Rounds' },
      { key: 'best_round', label: 'Best round' },
      { key: 'tournaments', label: 'Tournaments' },
    ],
  },
  {
    key: 'Cycling',
    label: 'Cycling',
    emoji: '🚴',
    positions: ['Road', 'Track', 'Mountain bike', 'BMX'],
    metrics: [
      { key: 'races', label: 'Races' },
      { key: 'podiums', label: 'Podiums' },
      { key: 'best_time', label: 'Best time' },
    ],
  },
  {
    key: 'Gymnastics',
    label: 'Gymnastics',
    emoji: '🤸',
    positions: ['Artistic', 'Rhythmic', 'Trampoline', 'Acrobatic'],
    metrics: [
      { key: 'competitions', label: 'Competitions' },
      { key: 'medals', label: 'Medals' },
      { key: 'best_all_around', label: 'Best all-around' },
    ],
  },
  {
    key: 'Boxing',
    label: 'Boxing',
    emoji: '🥊',
    positions: [
      'Flyweight',
      'Bantamweight',
      'Featherweight',
      'Lightweight',
      'Welterweight',
      'Middleweight',
      'Light heavyweight',
      'Heavyweight',
    ],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'kos', label: 'KOs' },
    ],
  },
  {
    key: 'Wrestling',
    label: 'Wrestling',
    emoji: '🤼',
    positions: ['Freestyle', 'Greco-Roman'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'weight_class', label: 'Weight class' },
    ],
  },
  {
    key: 'Judo',
    label: 'Judo',
    emoji: '🥋',
    positions: ['Lightweight', 'Middleweight', 'Heavyweight'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'belt', label: 'Belt' },
    ],
  },
  {
    key: 'Taekwondo',
    label: 'Taekwondo',
    emoji: '🥋',
    positions: ['Sparring (Kyorugi)', 'Forms (Poomsae)'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'belt', label: 'Belt' },
    ],
  },
  {
    key: 'Jiu-Jitsu',
    label: 'Jiu-Jitsu',
    emoji: '🥋',
    positions: ['Gi', 'No-gi'],
    metrics: [
      { key: 'matches', label: 'Matches' },
      { key: 'wins', label: 'Wins' },
      { key: 'belt', label: 'Belt' },
    ],
  },
  {
    key: 'Weightlifting',
    label: 'Weightlifting',
    emoji: '🏋️',
    positions: ['Lightweight', 'Middleweight', 'Heavyweight'],
    metrics: [
      { key: 'best_snatch', label: 'Best snatch', unit: 'kg' },
      { key: 'best_clean_and_jerk', label: 'Best clean and jerk', unit: 'kg' },
      { key: 'total', label: 'Total', unit: 'kg' },
    ],
  },
  {
    key: 'Equestrian',
    label: 'Equestrian',
    emoji: '🏇',
    positions: ['Show jumping', 'Dressage', 'Eventing', 'Endurance', 'Racing'],
    metrics: [
      { key: 'competitions', label: 'Competitions' },
      { key: 'wins', label: 'Wins' },
      { key: 'best_placing', label: 'Best placing' },
    ],
  },
  {
    key: 'Fencing',
    label: 'Fencing',
    emoji: '🤺',
    positions: ['Foil', 'Épée', 'Sabre'],
    metrics: [
      { key: 'bouts', label: 'Bouts' },
      { key: 'wins', label: 'Wins' },
      { key: 'ranking', label: 'Ranking' },
    ],
  },
  {
    key: 'Triathlon',
    label: 'Triathlon',
    emoji: '🏊',
    positions: ['Sprint', 'Olympic', 'Half distance', 'Full distance'],
    metrics: [
      { key: 'races', label: 'Races' },
      { key: 'podiums', label: 'Podiums' },
      { key: 'best_time', label: 'Best time' },
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

/**
 * Saved positions, grouped under each sport they belong to.
 *
 * A name two sports share (Goalkeeper is both football and handball) is
 * listed under each of them: a search for either sport still needs it.
 * Order follows the saved list, not the catalogue.
 */
export function positionsBySport(
  sports: string[],
  positions: string[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const sport of sports) {
    const allowed = new Set(positionsFor(sport));
    out[sport] = positions.filter((position) => allowed.has(position));
  }
  return out;
}

/** Positions that belong to at least one of the sports. The rest are dropped. */
export function prunePositions(sports: string[], positions: string[]): string[] {
  const allowed = new Set(sports.flatMap((sport) => positionsFor(sport)));
  return positions.filter((position) => allowed.has(position));
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

/** How seriously someone plays a sport besides their main one. At most three. */
export const OTHER_SPORT_LEVELS = ['casual', 'club', 'competitive'] as const;
export type OtherSportLevel = (typeof OTHER_SPORT_LEVELS)[number];
export const MAX_OTHER_SPORTS = 3;

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

/**
 * Every country a person can pick: the 193 UN members, the Vatican, and
 * Palestine. Common English names, A–Z.
 *
 * Six of those names are copied from PRIORITY_COUNTRIES character for
 * character (Iran, Netherlands, Turkey, United Arab Emirates, United
 * Kingdom, United States), because discovery compares the stored country
 * with `=`.
 */
export const ALL_COUNTRIES: string[] = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Costa Rica',
  "Côte d'Ivoire",
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Republic of the Congo',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
];

/**
 * Launch markets first, in their existing order, then every other sovereign
 * state A–Z. A query keeps that order and the stored value stays the English
 * name. It matches a case-insensitive substring of that English name, or of
 * `label(country)` when a label function is passed.
 */
export function countryOptions(
  query?: string,
  label?: (country: string) => string,
): string[] {
  const seen = new Set<string>(PRIORITY_COUNTRIES);
  const ordered = [
    ...PRIORITY_COUNTRIES,
    ...ALL_COUNTRIES.filter((country) => !seen.has(country)),
  ];
  const q = query?.trim().toLowerCase();
  if (!q) return ordered;
  return ordered.filter((country) => {
    if (country.toLowerCase().includes(q)) return true;
    return label ? label(country).toLowerCase().includes(q) : false;
  });
}

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
 * An unmapped value falls back to itself, so a sport an admin approved
 * (Kabaddi, say) shows the typed name rather than a blank chip. 'Other' is
 * the private waiting value and reads as "Other sport".
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
  Futsal: 'sports.futsal',
  Rugby: 'sports.rugby',
  'Field Hockey': 'sports.fieldHockey',
  Badminton: 'sports.badminton',
  'Table Tennis': 'sports.tableTennis',
  Squash: 'sports.squash',
  Golf: 'sports.golf',
  Cycling: 'sports.cycling',
  Gymnastics: 'sports.gymnastics',
  Boxing: 'sports.boxing',
  Wrestling: 'sports.wrestling',
  Judo: 'sports.judo',
  Taekwondo: 'sports.taekwondo',
  'Jiu-Jitsu': 'sports.jiuJitsu',
  Weightlifting: 'sports.weightlifting',
  Equestrian: 'sports.equestrian',
  Fencing: 'sports.fencing',
  Triathlon: 'sports.triathlon',
  Other: 'sports.other',
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
  Defender: 'sports.position.defender',
  Prop: 'sports.position.prop',
  Hooker: 'sports.position.hooker',
  Lock: 'sports.position.lock',
  Flanker: 'sports.position.flanker',
  'Number 8': 'sports.position.number8',
  'Scrum-half': 'sports.position.scrumHalf',
  'Fly-half': 'sports.position.flyHalf',
  'Inside centre': 'sports.position.insideCentre',
  'Outside centre': 'sports.position.outsideCentre',
  Wing: 'sports.position.wing',
  Midfielder: 'sports.position.midfielder',
  Forward: 'sports.position.forward',
  'Mixed doubles': 'sports.position.mixedDoubles',
  'Stroke play': 'sports.position.strokePlay',
  'Match play': 'sports.position.matchPlay',
  Road: 'sports.position.road',
  Track: 'sports.position.track',
  'Mountain bike': 'sports.position.mountainBike',
  BMX: 'sports.position.bmx',
  Artistic: 'sports.position.artistic',
  Rhythmic: 'sports.position.rhythmic',
  Trampoline: 'sports.position.trampoline',
  Acrobatic: 'sports.position.acrobatic',
  Flyweight: 'sports.position.flyweight',
  Bantamweight: 'sports.position.bantamweight',
  Featherweight: 'sports.position.featherweight',
  Lightweight: 'sports.position.lightweight',
  Welterweight: 'sports.position.welterweight',
  Middleweight: 'sports.position.middleweight',
  'Light heavyweight': 'sports.position.lightHeavyweight',
  Heavyweight: 'sports.position.heavyweight',
  'Greco-Roman': 'sports.position.grecoRoman',
  'Sparring (Kyorugi)': 'sports.position.sparringKyorugi',
  'Forms (Poomsae)': 'sports.position.formsPoomsae',
  Gi: 'sports.position.gi',
  'No-gi': 'sports.position.noGi',
  'Show jumping': 'sports.position.showJumping',
  Dressage: 'sports.position.dressage',
  Eventing: 'sports.position.eventing',
  Endurance: 'sports.position.endurance',
  Racing: 'sports.position.racing',
  Foil: 'sports.position.foil',
  Épée: 'sports.position.epee',
  Sabre: 'sports.position.sabre',
  Sprint: 'sports.position.sprint',
  Olympic: 'sports.position.olympic',
  'Half distance': 'sports.position.halfDistance',
  'Full distance': 'sports.position.fullDistance',
  Kickboxing: 'sports.position.kickboxing',
  'Muay Thai': 'sports.position.muayThai',
  'Kung fu': 'sports.position.kungFu',
};

/**
 * Same English words, different sports, different meanings.
 * Football's full-back and swimming's freestyle keep the keys above.
 * Rugby and wrestling only take these when the sport is known.
 */
const POSITION_FOR_SPORT: Record<string, Record<string, string>> = {
  Rugby: { 'Full-back': 'sports.position.rugbyFullBack' },
  Wrestling: { Freestyle: 'sports.position.wrestlingFreestyle' },
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

/* Older rows (and the web app) stored lowercase names like "football". */
function lowercased(keys: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(keys).map(([k, v]) => [k.toLowerCase(), v]));
}
const SPORT_LABEL_KEYS_LC = lowercased(SPORT_LABEL_KEYS);
const POSITION_KEYS_LC = lowercased(POSITION_KEYS);
const POSITION_FOR_SPORT_LC: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(POSITION_FOR_SPORT).map(([sport, table]) => [sport.toLowerCase(), lowercased(table)]),
);

/** Translate a stored sport name, falling back to the stored value. */
export function sportLabel(t: Translate, sport: string | null | undefined): string {
  if (!sport) return '';
  const key = SPORT_LABEL_KEYS[sport] ?? SPORT_LABEL_KEYS_LC[sport.toLowerCase()];
  return key ? t(key) : sport;
}

/**
 * The English sport name a search should send, when `term` is a sport's
 * translated label.
 *
 * The box and the recent-search list keep the words the person typed or
 * tapped. This turns "كرة القدم" back into "Football" before it is queried.
 * The match is the whole term, ignoring case, against `sportLabel` for every
 * sport. A name, a city or a fragment is returned unchanged.
 */
export function englishSportTerm(t: Translate, term: string): string {
  const clean = term.trim();
  if (!clean) return clean;
  const folded = clean.toLowerCase();
  const sport = SPORTS.find((entry) => sportLabel(t, entry.key).toLowerCase() === folded);
  return sport ? sport.label : clean;
}

/**
 * True when `query` is empty, or it sits inside the translated label or the
 * English key. Case and accents are ignored, so "rug" finds Rugby in any language.
 */
export function sportMatchesQuery(query: string, englishKey: string, translatedLabel: string): boolean {
  const needle = fold(query);
  if (!needle) return true;
  return fold(translatedLabel).includes(needle) || fold(englishKey).includes(needle);
}

/** Collapse whitespace, then trim. Same tidy-up the server applies. */
export function cleanSportName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** Letters, spaces, apostrophes and hyphens, 2 to 40 characters once tidied. */
const SPORT_NAME = /^[\p{L}][\p{L} '\u2019-]*$/u;

export function validSportName(name: string): boolean {
  const clean = cleanSportName(name);
  return clean.length >= 2 && clean.length <= 40 && SPORT_NAME.test(clean);
}

/** The stored waiting value while an admin reviews a typed sport. */
export function isOtherSport(sport: string | null | undefined): boolean {
  return sport?.trim().toLowerCase() === 'other';
}

/**
 * A catalogue sport the typed name already is, ignoring case and accents.
 * Matches the English key, the English label, and the translated label.
 */
export function listedSportKey(t: Translate, name: string): string | null {
  const folded = fold(cleanSportName(name));
  if (!folded) return null;
  const found = SPORTS.find(
    (entry) =>
      fold(entry.key) === folded ||
      fold(entry.label) === folded ||
      fold(sportLabel(t, entry.key)) === folded,
  );
  return found?.key ?? null;
}

export function positionLabel(
  t: Translate,
  position: string | null | undefined,
  sport?: string | null,
): string {
  if (!position) return '';
  if (sport) {
    const scoped =
      POSITION_FOR_SPORT[sport]?.[position] ??
      POSITION_FOR_SPORT_LC[sport.toLowerCase()]?.[position.toLowerCase()];
    if (scoped) return t(scoped);
  }
  const key = POSITION_KEYS[position] ?? POSITION_KEYS_LC[position.toLowerCase()];
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

export function otherSportLevelLabel(t: Translate, level: string): string {
  switch (level) {
    case 'casual':
      return t('profile.otherSportLevelCasual');
    case 'club':
      return t('profile.otherSportLevelClub');
    case 'competitive':
      return t('profile.otherSportLevelCompetitive');
    default:
      return '';
  }
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

export const COUNTRY_KEYS: Record<string, string> = {
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
  'Afghanistan': 'countries.afghanistan',
  'Albania': 'countries.albania',
  'Algeria': 'countries.algeria',
  'Andorra': 'countries.andorra',
  'Angola': 'countries.angola',
  'Antigua and Barbuda': 'countries.antiguaAndBarbuda',
  'Armenia': 'countries.armenia',
  'Austria': 'countries.austria',
  'Azerbaijan': 'countries.azerbaijan',
  'Bahamas': 'countries.bahamas',
  'Bangladesh': 'countries.bangladesh',
  'Barbados': 'countries.barbados',
  'Belarus': 'countries.belarus',
  'Belgium': 'countries.belgium',
  'Belize': 'countries.belize',
  'Benin': 'countries.benin',
  'Bhutan': 'countries.bhutan',
  'Bolivia': 'countries.bolivia',
  'Bosnia and Herzegovina': 'countries.bosniaAndHerzegovina',
  'Botswana': 'countries.botswana',
  'Brunei': 'countries.brunei',
  'Bulgaria': 'countries.bulgaria',
  'Burkina Faso': 'countries.burkinaFaso',
  'Burundi': 'countries.burundi',
  'Cabo Verde': 'countries.caboVerde',
  'Cambodia': 'countries.cambodia',
  'Cameroon': 'countries.cameroon',
  'Central African Republic': 'countries.centralAfricanRepublic',
  'Chad': 'countries.chad',
  'Chile': 'countries.chile',
  'China': 'countries.china',
  'Colombia': 'countries.colombia',
  'Comoros': 'countries.comoros',
  'Costa Rica': 'countries.costaRica',
  "Côte d'Ivoire": 'countries.coteDivoire',
  'Croatia': 'countries.croatia',
  'Cuba': 'countries.cuba',
  'Cyprus': 'countries.cyprus',
  'Czechia': 'countries.czechia',
  'Democratic Republic of the Congo': 'countries.democraticRepublicOfTheCongo',
  'Denmark': 'countries.denmark',
  'Djibouti': 'countries.djibouti',
  'Dominica': 'countries.dominica',
  'Dominican Republic': 'countries.dominicanRepublic',
  'Ecuador': 'countries.ecuador',
  'El Salvador': 'countries.elSalvador',
  'Equatorial Guinea': 'countries.equatorialGuinea',
  'Eritrea': 'countries.eritrea',
  'Estonia': 'countries.estonia',
  'Eswatini': 'countries.eswatini',
  'Ethiopia': 'countries.ethiopia',
  'Fiji': 'countries.fiji',
  'Finland': 'countries.finland',
  'Gabon': 'countries.gabon',
  'Gambia': 'countries.gambia',
  'Georgia': 'countries.georgia',
  'Greece': 'countries.greece',
  'Grenada': 'countries.grenada',
  'Guatemala': 'countries.guatemala',
  'Guinea': 'countries.guinea',
  'Guinea-Bissau': 'countries.guineaBissau',
  'Guyana': 'countries.guyana',
  'Haiti': 'countries.haiti',
  'Honduras': 'countries.honduras',
  'Hungary': 'countries.hungary',
  'Iceland': 'countries.iceland',
  'Indonesia': 'countries.indonesia',
  'Iraq': 'countries.iraq',
  'Ireland': 'countries.ireland',
  'Israel': 'countries.israel',
  'Jamaica': 'countries.jamaica',
  'Japan': 'countries.japan',
  'Kazakhstan': 'countries.kazakhstan',
  'Kenya': 'countries.kenya',
  'Kiribati': 'countries.kiribati',
  'Kyrgyzstan': 'countries.kyrgyzstan',
  'Laos': 'countries.laos',
  'Latvia': 'countries.latvia',
  'Lesotho': 'countries.lesotho',
  'Liberia': 'countries.liberia',
  'Libya': 'countries.libya',
  'Liechtenstein': 'countries.liechtenstein',
  'Lithuania': 'countries.lithuania',
  'Luxembourg': 'countries.luxembourg',
  'Madagascar': 'countries.madagascar',
  'Malawi': 'countries.malawi',
  'Malaysia': 'countries.malaysia',
  'Maldives': 'countries.maldives',
  'Mali': 'countries.mali',
  'Malta': 'countries.malta',
  'Marshall Islands': 'countries.marshallIslands',
  'Mauritania': 'countries.mauritania',
  'Mauritius': 'countries.mauritius',
  'Mexico': 'countries.mexico',
  'Micronesia': 'countries.micronesia',
  'Moldova': 'countries.moldova',
  'Monaco': 'countries.monaco',
  'Mongolia': 'countries.mongolia',
  'Montenegro': 'countries.montenegro',
  'Mozambique': 'countries.mozambique',
  'Myanmar': 'countries.myanmar',
  'Namibia': 'countries.namibia',
  'Nauru': 'countries.nauru',
  'Nepal': 'countries.nepal',
  'New Zealand': 'countries.newZealand',
  'Nicaragua': 'countries.nicaragua',
  'Niger': 'countries.niger',
  'North Korea': 'countries.northKorea',
  'North Macedonia': 'countries.northMacedonia',
  'Norway': 'countries.norway',
  'Palau': 'countries.palau',
  'Palestine': 'countries.palestine',
  'Panama': 'countries.panama',
  'Papua New Guinea': 'countries.papuaNewGuinea',
  'Paraguay': 'countries.paraguay',
  'Peru': 'countries.peru',
  'Philippines': 'countries.philippines',
  'Poland': 'countries.poland',
  'Republic of the Congo': 'countries.republicOfTheCongo',
  'Romania': 'countries.romania',
  'Russia': 'countries.russia',
  'Rwanda': 'countries.rwanda',
  'Saint Kitts and Nevis': 'countries.saintKittsAndNevis',
  'Saint Lucia': 'countries.saintLucia',
  'Saint Vincent and the Grenadines': 'countries.saintVincentAndTheGrenadines',
  'Samoa': 'countries.samoa',
  'San Marino': 'countries.sanMarino',
  'Sao Tome and Principe': 'countries.saoTomeAndPrincipe',
  'Senegal': 'countries.senegal',
  'Serbia': 'countries.serbia',
  'Seychelles': 'countries.seychelles',
  'Sierra Leone': 'countries.sierraLeone',
  'Singapore': 'countries.singapore',
  'Slovakia': 'countries.slovakia',
  'Slovenia': 'countries.slovenia',
  'Solomon Islands': 'countries.solomonIslands',
  'Somalia': 'countries.somalia',
  'South Korea': 'countries.southKorea',
  'South Sudan': 'countries.southSudan',
  'Sri Lanka': 'countries.sriLanka',
  'Sudan': 'countries.sudan',
  'Suriname': 'countries.suriname',
  'Sweden': 'countries.sweden',
  'Switzerland': 'countries.switzerland',
  'Syria': 'countries.syria',
  'Tajikistan': 'countries.tajikistan',
  'Tanzania': 'countries.tanzania',
  'Thailand': 'countries.thailand',
  'Timor-Leste': 'countries.timorLeste',
  'Togo': 'countries.togo',
  'Tonga': 'countries.tonga',
  'Trinidad and Tobago': 'countries.trinidadAndTobago',
  'Turkmenistan': 'countries.turkmenistan',
  'Tuvalu': 'countries.tuvalu',
  'Uganda': 'countries.uganda',
  'Ukraine': 'countries.ukraine',
  'Uruguay': 'countries.uruguay',
  'Uzbekistan': 'countries.uzbekistan',
  'Vanuatu': 'countries.vanuatu',
  'Vatican': 'countries.vatican',
  'Venezuela': 'countries.venezuela',
  'Vietnam': 'countries.vietnam',
  'Yemen': 'countries.yemen',
  'Zambia': 'countries.zambia',
  'Zimbabwe': 'countries.zimbabwe',
};

/** Translate a stored country name, falling back to the stored value. */
export function countryLabel(t: Translate, country: string | null | undefined): string {
  if (!country) return '';
  const key = COUNTRY_KEYS[country];
  return key ? t(key) : country;
}
