/**
 * Streaks, achievements, and the wall they live on.
 *
 * Tone rules for anyone translating or rewording this namespace:
 *
 *   * A streak is a nice thing that happened, never a thing you could lose.
 *     There is no "don't break it", no countdown, and no warning. `streakNo
 *     Pressure` is the load-bearing sentence in the whole file — it says out
 *     loud that missing a day costs nothing but the run, because a thirteen-
 *     year-old watching a number reset to one will assume otherwise.
 *   * Every "how you got it" line is TRUE. The conditions below are the
 *     conditions in `private.check_achievements`. Reword them freely; never
 *     change a number.
 *   * No coins, no points-you-can-spend, no ranking against other people, and
 *     nothing that reads like a slot machine. The voice is a coach noticing you
 *     did something well and saying so once.
 */
export const progress = {
  // ── The wall (app/achievements.tsx) ────────────────────────────────────────
  title: 'Achievements',
  subtitle: 'Every one of these comes from something you actually did.',
  earnedOf: '{{earned}} of {{total}}',
  unlockedOn: 'Earned {{date}}',
  tileEarnedA11y: '{{title}}. Earned {{date}}. {{hint}}',
  tileLockedA11y: '{{title}}. Not earned yet. {{hint}}',

  groupStart: 'Getting started',
  groupSeen: 'Being seen',
  groupScore: 'Your score',
  groupStreak: 'Turning up',

  rarityCommon: 'Common',
  rarityRare: 'Rare',
  rarityEpic: 'Standout',

  // ── Streak (components/celebrate/StreakChip, StreakCalendar) ───────────────
  days_one: '{{count}} day',
  days_other: '{{count}} days',

  streakChipA11y: 'Streak: {{days}}',
  streakChipHint: 'Opens what a streak is and the last seven days',
  streakSheetTitle: 'Your streak',
  streakWhat:
    'A streak counts the days in a row you opened AceAiX. That is the whole thing — turning up. It is not tied to posting, and it never changes your Talent Score.',
  streakNoPressure:
    'Miss a day and nothing is lost but the run. Your longest streak stays where it is, your score stays where it is, and the count starts again the next time you look in.',
  streakNoneTitle: 'No streak yet',
  streakNoneBody: 'It starts the first day you open the app. There is nothing to sign up for.',

  calendarTitle: 'Last 7 days',
  calendarA11y: 'The last seven days. You were here on {{count}} of them.',
  streakCurrent: 'Now',
  streakLongest: 'Longest',
  streakTotal: 'Days here',

  gotIt: 'Got it',

  // ── Next tier (components/celebrate/TierProgress) ──────────────────────────
  nextTierTitle: 'Next tier',
  pointsToNext_one: '{{count}} point to {{tier}}',
  pointsToNext_other: '{{count}} points to {{tier}}',
  tierStartsAt: '{{tier}} starts at {{score}}',
  tierTopTitle: 'Top tier',
  tierTopBody: 'There is nothing above Elite. Keep the profile current and it stays yours.',
  tierTopA11y: 'Elite tier, Talent Score {{score}}. This is the top tier.',
  scoreNotReadyTitle: 'No Talent Score yet',
  scoreNotReadyBody: 'Add your sport and position and your score appears.',

  // ── The celebration (components/celebrate/CelebrationOverlay) ──────────────
  celebrateAchievementEyebrow: 'Achievement earned',
  celebrateTierEyebrow: 'New tier',
  celebrateStreakEyebrow: 'Streak',
  celebrateTierBody: 'Your Talent Score reached {{score}}.',
  celebrateStreakBody: 'You keep turning up. That is genuinely the hard part.',
  streakMilestone_one: '{{count}} day in a row',
  streakMilestone_other: '{{count}} days in a row',
  andMore_one: 'and {{count}} more on your wall',
  andMore_other: 'and {{count}} more on your wall',
  celebrateNice: 'Nice',
  celebrateNext: 'Next',
  celebrateShare: 'Share',
  shareTierMessage: 'I reached {{tier}} tier on AceAiX — Talent Score {{score}}.',

  // ── The catalogue (components/celebrate/achievements.ts) ───────────────────
  achievements: {
    first_post: {
      title: 'First post',
      hint: 'You posted for the first time.',
    },
    first_clip: {
      title: 'First clip',
      hint: 'You added your first video to your highlights.',
    },
    three_clips: {
      title: 'Three clips',
      hint: 'Three videos in your highlights. That is a reel a scout can watch.',
    },
    first_match: {
      title: 'First match',
      hint: 'You logged your first match.',
    },
    ten_matches: {
      title: 'Ten matches',
      hint: 'Ten matches on your record.',
    },
    first_application: {
      title: 'First application',
      hint: 'You applied to your first trial or opportunity.',
    },
    first_follower: {
      title: 'First follower',
      hint: 'Someone followed you.',
    },
    ten_followers: {
      title: 'Ten followers',
      hint: 'Ten people follow you.',
    },
    fifty_followers: {
      title: 'Fifty followers',
      hint: 'Fifty people follow you.',
    },
    first_endorsement: {
      title: 'First endorsement',
      hint: 'A coach or club vouched for you.',
    },
    verified: {
      title: 'Verified',
      hint: 'Your account is verified, so people know you are you.',
    },
    profile_complete: {
      title: 'Profile complete',
      hint: 'Full marks on the profile part of your Talent Score.',
    },
    tier_bronze: {
      title: 'Bronze',
      hint: 'Your Talent Score reached 40.',
    },
    tier_silver: {
      title: 'Silver',
      hint: 'Your Talent Score reached 55.',
    },
    tier_gold: {
      title: 'Gold',
      hint: 'Your Talent Score reached 70.',
    },
    tier_elite: {
      title: 'Elite',
      hint: 'Your Talent Score reached 85.',
    },
    streak_3: {
      title: 'Three days',
      hint: 'You opened AceAiX three days in a row.',
    },
    streak_7: {
      title: 'A full week',
      hint: 'You opened AceAiX seven days in a row.',
    },
    streak_30: {
      title: 'Thirty days',
      hint: 'You opened AceAiX thirty days in a row.',
    },
  },
};
