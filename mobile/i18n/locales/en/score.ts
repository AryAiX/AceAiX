/**
 * The Talent Score — the card on a profile, and the screen behind it.
 *
 * Two things must survive translation intact:
 *
 * 1. The pillar weights. They are profile 15, performance 30, media 15,
 *    credibility 20, engagement 20, and they match
 *    `private.compute_talent_score`. A translator may reword a pillar, never
 *    renumber it.
 * 2. The disclosure. It has to keep saying that the score is worked out from
 *    what is on the profile, that data we can check counts for more than data
 *    typed in by hand, and that the number measures a profile rather than a
 *    person. None of those three sentences is decoration.
 *
 * The tier names live in `common` (tierRising … tierElite) because they are
 * read in several places.
 */
export const score = {
  // ── Score card (components/profile/ScoreCard.tsx) ──────────────────────────
  cardEmptyBody: 'Your score appears once your sport and position are on your profile.',
  cardA11y: 'Talent Score {{score}} out of 100, {{tier}} tier. Opens the full breakdown.',
  tierLine: '{{tier}} tier',
  topPercent: 'Top {{percent}}% of athletes in your sport',
  rankingBuilding: 'Your ranking builds as you add to your profile.',
  pointsUp_one: '+{{count}} point',
  pointsUp_other: '+{{count}} points',
  pointsDown_one: '-{{count}} point',
  pointsDown_other: '-{{count}} points',
  sinceLastTime: 'since last time',

  // ── Talent Score screen (app/score.tsx) ────────────────────────────────────
  howCalculated: 'How this is calculated',

  notReadyTitle: 'Your score is not ready yet',
  notReadyBody: 'Add your sport and position and we can work out your Talent Score.',
  notReadyAction: 'Finish your profile',

  deltaUpSince: '+{{count}} since last time',
  deltaDownSince: '-{{count}} since last time',

  curveTitle: 'Your curve',
  historyLoading: 'Loading your history…',
  historyEmpty:
    'Your history starts building from today. Come back tomorrow to see the line move.',
  sparklineA11y_one: 'Score history over {{count}} day, from {{min}} to {{max}}.',
  sparklineA11y_other: 'Score history over {{count}} days, from {{min}} to {{max}}.',
  sparklineA11yPlain: 'Score history',
  sparklineLow: 'Low {{value}}',
  sparklineHigh: 'High {{value}}',

  pillarsTitle: 'What makes up your score',
  tipsTitle: 'Move it up',
  gotIt: 'Got it',

  // ── The disclosure sheet (app/score.tsx) ───────────────────────────────────
  howIntro:
    'Your Talent Score is worked out from what is on your profile — nothing else. Five things count towards it:',
  howBulletProfile: 'How much of your profile you have filled in.',
  howBulletPerformance: 'The matches, minutes and output you have logged.',
  howBulletMedia: 'The clips a coach can watch.',
  howBulletCredibility: 'Verification, your club, and endorsements from coaches.',
  howBulletEngagement: 'How active you are, and who has looked at your profile.',
  howVerified:
    'Information we can check counts for more than information you type in yourself. A verified account, a linked club, and a match record confirmed by a club are all worth more than the same thing entered by hand.',
  howRecalculated:
    'The number is recalculated by our servers whenever any of that changes. You cannot edit it, and neither can anyone else.',
  howNotYouTitle: 'It is a measure of your profile, not of you.',
  howNotYouBody:
    'A low score means there is more to add, not that you are a worse player. No coach makes a decision from this number on its own.',

  // ── The five pillars (components/profile/PillarList.tsx) ───────────────────
  /** The weight is a number the database owns — translate the label, not the figure. */
  pillarWeight: '{{label}}  ·  {{weight}}%',
  pillarPerformance: 'Performance',
  pillarPerformanceExplain: "Matches, minutes and output you've logged",
  pillarCredibility: 'Credibility',
  pillarCredibilityExplain: 'Verification, your club, and endorsements',
  pillarEngagement: 'Engagement',
  pillarEngagementExplain: "How active you are, and who's looking",
  pillarProfile: 'Profile',
  pillarProfileExplain: 'How complete your profile is',
  pillarMedia: 'Media',
  pillarMediaExplain: 'Clips a coach can actually watch',

  // ── Tips (components/profile/TipList.tsx) ──────────────────────────────────
  /**
   * Only the button label is ours. The tip's own title and detail are written
   * by `private.build_score_tips` and arrive in English — see TipList.tsx.
   */
  tipPoints: '+{{points}} pts',
  tipOpen: 'Open',
  tipAction: {
    addHighlights: 'Add a clip',
    completeProfile: 'Finish profile',
    logMatches: 'Log a match',
    getVerified: 'Get verified',
    askEndorsement: 'Find a coach',
    linkClub: 'Link your club',
    postUpdate: 'Post an update',
  },
  tipsEmptyTitle: 'Nothing left on the list',
  tipsEmptyBody:
    "You've done everything we'd suggest right now. Keep playing and keep posting.",

  // ── The simulator (app/score.tsx) ──────────────────────────────────────────
  simTitle: 'What would it take?',
  simBody:
    'Move a slider to see where the number would land. The projection runs the same calculation as your real score, on the server, so it cannot quietly disagree with it.',
  simProjected: 'Projected',
  simNow: 'Now',
  simNoChange: 'Move something to see the difference.',
  simReset: 'Reset',
  simUnlocksTier: 'That would put you in {{tier}}.',
  simGain_one: '+{{count}} point',
  simGain_other: '+{{count}} points',
  simHonest: 'A projection, not a promise — it assumes the work is real and the results hold up.',

  simVideos: 'Highlight clips',
  simMatches: 'Matches logged this year',
  simVerified: 'Of those, verified',
  simEndorsements: 'Endorsements',
  simExpert: 'Of those, from coaches or clubs',
  simPosts: 'Posts this month',
  simFollowers: 'Followers',
  simProfile: 'Profile fields filled',
  simAccountVerified: 'Account verified',
  simClubLinked: 'Club linked',

  // ── The written read (supabase/functions/talent-insights) ──────────────────
  insightTitle: 'Reading your profile',
  insightLoading: 'Working through your numbers…',
  insightUnavailable:
    'The written summary is not available right now. The pillars below say the same thing in numbers.',
  insightRefresh: 'Write it again',
};
