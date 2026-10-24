/**
 * Sport Fit — the statements, the dimensions and the sports.
 *
 * The order and the ids mirror `public.sport_fit_items` in
 * `20261019000001_sport_fit.sql` (a unit test reads the migration and checks
 * they agree). Scoring lives on the server; this file only says what to ask
 * and how to label what comes back.
 */
export const SF_ITEMS = [
  'drive1',
  'composure1',
  'team1',
  'focus1',
  'boldness1',
  'resilience1',
  'discipline1',
  'drive2',
  'composure2',
  'team2',
  'focus2',
  'check1',
  'boldness2',
  'resilience2',
  'discipline2',
  'drive3',
  'composure3',
  'team3',
  'focus3',
  'boldness3',
  'resilience3',
  'discipline3',
] as const;

export type SfItem = (typeof SF_ITEMS)[number];

/** 1 strongly disagree … 5 strongly agree. */
export type SfAnswer = 1 | 2 | 3 | 4 | 5;
export const SF_SCALE: readonly SfAnswer[] = [1, 2, 3, 4, 5];

export type SfAnswers = Partial<Record<SfItem, SfAnswer>>;

/** Mindset dimensions, from the questionnaire. `team` is a preference, shown as a spectrum. */
export const SF_MINDSET = ['drive', 'composure', 'focus', 'resilience', 'boldness', 'discipline', 'team'] as const;
/** Signals taken from Game Intelligence when the player has played. */
export const SF_GAME = ['reading', 'speed'] as const;

export type SfDimension = (typeof SF_MINDSET)[number] | (typeof SF_GAME)[number];

/** A play hue (theme/tokens `Play`) per dimension, so bars keep their colour everywhere. */
export const SF_HUE: Record<SfDimension, 'flame' | 'azure' | 'violet' | 'mint' | 'magenta' | 'cyan' | 'amber'> = {
  drive: 'flame',
  composure: 'azure',
  focus: 'violet',
  resilience: 'mint',
  boldness: 'magenta',
  discipline: 'amber',
  team: 'cyan',
  reading: 'violet',
  speed: 'cyan',
};

/** The sports the server ranks — the app's own sport keys (i18n `sports.*`). */
export const SF_SPORTS = [
  'football',
  'basketball',
  'volleyball',
  'handball',
  'cricket',
  'padel',
  'esports',
  'tennis',
  'martialArts',
  'chess',
  'swimming',
  'athletics',
] as const;

export type SfSport = (typeof SF_SPORTS)[number];

export function isComplete(answers: SfAnswers): boolean {
  return SF_ITEMS.every((id) => answers[id] != null);
}

/** The first statement without an answer, or the last one when all are answered. */
export function firstUnanswered(answers: SfAnswers): number {
  const i = SF_ITEMS.findIndex((id) => answers[id] == null);
  return i === -1 ? SF_ITEMS.length - 1 : i;
}

export function answeredCount(answers: SfAnswers): number {
  return SF_ITEMS.filter((id) => answers[id] != null).length;
}

/** Whether the retake date has passed (or there is nothing to retake). */
export function canRetake(state: { next_retake_at: string | null }, now: Date = new Date()): boolean {
  return !state.next_retake_at || new Date(state.next_retake_at).getTime() <= now.getTime();
}
