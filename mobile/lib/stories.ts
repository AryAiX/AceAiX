/**
 * Story playback rules, kept free of React so they can be tested.
 *
 * The viewer holds two cursors — which author in the rail, which story of
 * theirs — and every tap, hold-release and timer completion asks one of these
 * functions where to go next.
 */

export type StoryKind = 'photo' | 'video' | 'card';

export type CardBackground = 'hero' | 'action' | 'cool' | 'warm' | 'party' | 'score';

export const CARD_BACKGROUNDS: CardBackground[] = ['hero', 'action', 'cool', 'warm', 'party', 'score'];

export type StickerKey = 'goal' | 'trial' | 'pb' | 'gameiq' | 'star';

export const STICKERS: StickerKey[] = ['goal', 'trial', 'pb', 'gameiq', 'star'];

/** How long a photo or a card stays up. */
export const STORY_STILL_MS = 5000;
/** The longest a video story is allowed to hold the screen. */
export const STORY_VIDEO_CAP_MS = 15000;
/** Card text limit — the database enforces the same. */
export const STORY_CARD_MAX = 140;
export const STORY_STAT_MAX = 16;
export const STORY_CAPTION_MAX = 200;

/**
 * Milliseconds a story is on screen. A video plays for its own length, capped;
 * until its length is known (or if it never reports one) it gets the cap.
 */
export function storyDurationMs(kind: StoryKind, videoSeconds?: number | null): number {
  if (kind !== 'video') return STORY_STILL_MS;
  if (!videoSeconds || !Number.isFinite(videoSeconds) || videoSeconds <= 0) {
    return STORY_VIDEO_CAP_MS;
  }
  return Math.min(Math.round(videoSeconds * 1000), STORY_VIDEO_CAP_MS);
}

export interface StoryCursor {
  /** Index into the ordered author queue. */
  author: number;
  /** Index into the current author's stories. */
  story: number;
}

export type StoryStep =
  | { type: 'story'; cursor: StoryCursor }
  | { type: 'author'; cursor: StoryCursor }
  | { type: 'close' };

/**
 * Forward: the next story of this author, else the first story of the next
 * author, else close.
 */
export function nextStory(cursor: StoryCursor, storyCount: number, authorCount: number): StoryStep {
  if (cursor.story + 1 < storyCount) {
    return { type: 'story', cursor: { author: cursor.author, story: cursor.story + 1 } };
  }
  if (cursor.author + 1 < authorCount) {
    return { type: 'author', cursor: { author: cursor.author + 1, story: 0 } };
  }
  return { type: 'close' };
}

/**
 * Back: the previous story of this author, else the previous author (from
 * their first story — we do not know how many they have until they load),
 * else restart the current one.
 */
export function previousStory(cursor: StoryCursor): StoryStep {
  if (cursor.story > 0) {
    return { type: 'story', cursor: { author: cursor.author, story: cursor.story - 1 } };
  }
  if (cursor.author > 0) {
    return { type: 'author', cursor: { author: cursor.author - 1, story: 0 } };
  }
  return { type: 'story', cursor: { ...cursor } };
}

/** Which third of the screen a tap landed in decides direction. */
export function tapDirection(x: number, width: number, rtl = false): 'back' | 'forward' {
  if (width <= 0) return 'forward';
  /* Reading direction decides which edge is "before". */
  const back = rtl ? x > (width * 2) / 3 : x < width / 3;
  return back ? 'back' : 'forward';
}

/** Fill of one segmented bar: done, current (0–1), or not reached. */
export function segmentFill(index: number, current: number, progress: number): number {
  if (index < current) return 1;
  if (index > current) return 0;
  return Math.max(0, Math.min(1, progress));
}

/** The author queue travels as one comma-separated route param. */
export function parseQueue(raw: string | string[] | undefined, current: string): string[] {
  const joined = Array.isArray(raw) ? raw.join(',') : raw ?? '';
  const ids = joined
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const unique = [...new Set(ids)];
  if (!unique.includes(current)) return [current, ...unique];
  return unique;
}

/** Unknown or missing card backgrounds fall back to the hero gradient. */
export function cardBackground(value: unknown): CardBackground {
  return typeof value === 'string' && (CARD_BACKGROUNDS as string[]).includes(value)
    ? (value as CardBackground)
    : 'hero';
}

/** A sticker we can draw, or null for "use the generic sparkle". */
export function stickerKey(value: unknown): StickerKey | null {
  return typeof value === 'string' && (STICKERS as string[]).includes(value)
    ? (value as StickerKey)
    : null;
}
