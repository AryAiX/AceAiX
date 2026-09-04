import {
  Award,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Crown,
  Film,
  Flame,
  Medal,
  PenLine,
  Send,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from 'lucide-react-native';

import type { Theme } from '@/theme/ThemeProvider';
import { TierColors } from '@/theme/tokens';
import { ACHIEVEMENT_KEYS, type AchievementKey } from '@/types/models';

/**
 * The achievement catalogue.
 *
 * The database stores only which keys a person has earned. Everything a human
 * reads — the name, the icon, the "how you got it" line — lives here, so it can
 * be translated and reworded without a migration.
 *
 * Two rules this file exists to keep:
 *
 *   1. Every hint is TRUE. The condition written here is the condition in
 *      `private.check_achievements`. If the two ever disagree, a teenager is
 *      chasing something that will not arrive, which is worse than having no
 *      achievement at all.
 *   2. Nothing here can be bought, claimed or farmed, so nothing here is
 *      phrased as a task list. A hint says what the achievement marks, not what
 *      you owe us.
 *
 * The order below is the canonical order of the wall. The screen floats earned
 * ones to the front within each group; this array decides everything else.
 */

/** How rare an achievement is. Cosmetic — it changes the medallion, nothing else. */
export type Rarity = 'common' | 'rare' | 'epic';

/** Which band of the wall an achievement belongs to. */
export type AchievementGroup = 'start' | 'seen' | 'score' | 'streak';

export interface AchievementMeta {
  key: AchievementKey;
  icon: LucideIcon;
  rarity: Rarity;
  group: AchievementGroup;
  /** `progress.achievements.<key>.title` */
  titleKey: string;
  /** `progress.achievements.<key>.hint` — the "how you got it" line. */
  hintKey: string;
}

/** The groups, in the order they appear on the wall. */
export const ACHIEVEMENT_GROUPS: AchievementGroup[] = ['start', 'seen', 'score', 'streak'];

export const GROUP_TITLE_KEYS: Record<AchievementGroup, string> = {
  start: 'progress.groupStart',
  seen: 'progress.groupSeen',
  score: 'progress.groupScore',
  streak: 'progress.groupStreak',
};

export const RARITY_LABEL_KEYS: Record<Rarity, string> = {
  common: 'progress.rarityCommon',
  rare: 'progress.rarityRare',
  epic: 'progress.rarityEpic',
};

export const ACHIEVEMENTS: AchievementMeta[] = [
  // ── Getting started ────────────────────────────────────────────────────────
  {
    key: 'first_post',
    icon: PenLine,
    rarity: 'common',
    group: 'start',
    titleKey: 'progress.achievements.first_post.title',
    hintKey: 'progress.achievements.first_post.hint',
  },
  {
    key: 'first_clip',
    icon: Video,
    rarity: 'common',
    group: 'start',
    titleKey: 'progress.achievements.first_clip.title',
    hintKey: 'progress.achievements.first_clip.hint',
  },
  {
    key: 'three_clips',
    icon: Film,
    rarity: 'rare',
    group: 'start',
    titleKey: 'progress.achievements.three_clips.title',
    hintKey: 'progress.achievements.three_clips.hint',
  },
  {
    key: 'first_match',
    icon: ClipboardList,
    rarity: 'common',
    group: 'start',
    titleKey: 'progress.achievements.first_match.title',
    hintKey: 'progress.achievements.first_match.hint',
  },
  {
    key: 'ten_matches',
    icon: CalendarCheck,
    rarity: 'rare',
    group: 'start',
    titleKey: 'progress.achievements.ten_matches.title',
    hintKey: 'progress.achievements.ten_matches.hint',
  },
  {
    key: 'first_application',
    icon: Send,
    rarity: 'common',
    group: 'start',
    titleKey: 'progress.achievements.first_application.title',
    hintKey: 'progress.achievements.first_application.hint',
  },

  // ── Being seen ─────────────────────────────────────────────────────────────
  {
    key: 'first_follower',
    icon: UserPlus,
    rarity: 'common',
    group: 'seen',
    titleKey: 'progress.achievements.first_follower.title',
    hintKey: 'progress.achievements.first_follower.hint',
  },
  {
    key: 'ten_followers',
    icon: Users,
    rarity: 'rare',
    group: 'seen',
    titleKey: 'progress.achievements.ten_followers.title',
    hintKey: 'progress.achievements.ten_followers.hint',
  },
  {
    key: 'fifty_followers',
    icon: UsersRound,
    rarity: 'epic',
    group: 'seen',
    titleKey: 'progress.achievements.fifty_followers.title',
    hintKey: 'progress.achievements.fifty_followers.hint',
  },
  {
    key: 'first_endorsement',
    icon: Award,
    rarity: 'rare',
    group: 'seen',
    titleKey: 'progress.achievements.first_endorsement.title',
    hintKey: 'progress.achievements.first_endorsement.hint',
  },
  {
    key: 'verified',
    icon: ShieldCheck,
    rarity: 'epic',
    group: 'seen',
    titleKey: 'progress.achievements.verified.title',
    hintKey: 'progress.achievements.verified.hint',
  },

  // ── Your score ─────────────────────────────────────────────────────────────
  {
    key: 'profile_complete',
    icon: UserCheck,
    rarity: 'rare',
    group: 'score',
    titleKey: 'progress.achievements.profile_complete.title',
    hintKey: 'progress.achievements.profile_complete.hint',
  },
  {
    key: 'tier_bronze',
    icon: Medal,
    rarity: 'common',
    group: 'score',
    titleKey: 'progress.achievements.tier_bronze.title',
    hintKey: 'progress.achievements.tier_bronze.hint',
  },
  {
    key: 'tier_silver',
    icon: Medal,
    rarity: 'rare',
    group: 'score',
    titleKey: 'progress.achievements.tier_silver.title',
    hintKey: 'progress.achievements.tier_silver.hint',
  },
  {
    key: 'tier_gold',
    icon: Trophy,
    rarity: 'epic',
    group: 'score',
    titleKey: 'progress.achievements.tier_gold.title',
    hintKey: 'progress.achievements.tier_gold.hint',
  },
  {
    key: 'tier_elite',
    icon: Crown,
    rarity: 'epic',
    group: 'score',
    titleKey: 'progress.achievements.tier_elite.title',
    hintKey: 'progress.achievements.tier_elite.hint',
  },

  // ── Turning up ─────────────────────────────────────────────────────────────
  {
    key: 'streak_3',
    icon: Flame,
    rarity: 'common',
    group: 'streak',
    titleKey: 'progress.achievements.streak_3.title',
    hintKey: 'progress.achievements.streak_3.hint',
  },
  {
    key: 'streak_7',
    icon: CalendarDays,
    rarity: 'rare',
    group: 'streak',
    titleKey: 'progress.achievements.streak_7.title',
    hintKey: 'progress.achievements.streak_7.hint',
  },
  {
    key: 'streak_30',
    icon: BadgeCheck,
    rarity: 'epic',
    group: 'streak',
    titleKey: 'progress.achievements.streak_30.title',
    hintKey: 'progress.achievements.streak_30.hint',
  },
];

const BY_KEY = new Map<AchievementKey, AchievementMeta>(
  ACHIEVEMENTS.map((entry) => [entry.key, entry]),
);

/** Every key the database can award has an entry above. */
export const CATALOGUE_IS_COMPLETE = ACHIEVEMENT_KEYS.every((key) => BY_KEY.has(key));

/**
 * The catalogue entry for a key, or null.
 *
 * Null is a real answer: the server may award a key from a newer migration than
 * this build knows about, and an unknown achievement should be skipped quietly
 * rather than crash a celebration.
 */
export function achievementFor(key: string): AchievementMeta | null {
  return BY_KEY.get(key as AchievementKey) ?? null;
}

/** The catalogue entries in one group, in wall order. */
export function achievementsInGroup(group: AchievementGroup): AchievementMeta[] {
  return ACHIEVEMENTS.filter((entry) => entry.group === group);
}

export interface RaritySkin {
  /** Icon and ring colour. */
  fg: string;
  /** Medallion fill. */
  bg: string;
  /** Medallion ring. */
  ring: string;
}

/**
 * How each rarity band is painted.
 *
 * Rarity borrows from the tier ramp rather than inventing a second colour
 * language: silver for common, gold for rare, Ace Orange for epic. Everything
 * is mixed against the current palette so both schemes stay deliberate.
 */
export function raritySkin(rarity: Rarity, theme: Theme, earned = true): RaritySkin {
  const { colors, alpha } = theme;

  if (!earned) {
    return {
      fg: colors.textMuted,
      bg: colors.surfaceSunken,
      ring: colors.border,
    };
  }

  const base: Record<Rarity, string> = {
    common: TierColors.silver,
    rare: TierColors.gold,
    epic: colors.primary,
  };

  const fg = base[rarity];
  return {
    fg,
    bg: alpha(fg, colors.scheme === 'dark' ? 0.18 : 0.12),
    ring: alpha(fg, colors.scheme === 'dark' ? 0.42 : 0.3),
  };
}
