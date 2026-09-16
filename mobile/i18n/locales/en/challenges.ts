/**
 * Weekly skill challenges.
 *
 * Two words carry weight here and should not be flattened into one in any
 * language: a **claimed** result is what the athlete says they did, and a
 * **verified** one is what a coach watched and confirmed. The leaderboard is
 * readable only because those two are visibly different.
 *
 * The tone is a coach's, not a game's. No countdowns that shout, no "you are
 * falling behind", no reward language — a challenge is a thing to do, and the
 * clip you get out of it is yours whether or not you win.
 */
export const challenges = {
  // ── List ───────────────────────────────────────────────────────────────────
  title: 'Challenges',
  subtitle: 'Set by coaches and clubs. Send a clip, get it checked.',
  tabOpen: 'Open',
  tabEntered: 'Entered',
  tabMine: 'Mine',

  emptyTitle: 'No challenges open right now',
  emptyBody: 'Coaches post these most weeks. We will show them here the moment one opens.',
  emptyEnteredTitle: 'You have not entered one yet',
  emptyEnteredBody: 'Pick any open challenge and send a clip — a verified result is the fastest evidence you can get.',
  emptyMineTitle: 'You have not set a challenge',
  emptyMineBody: 'Ask for one specific thing on film and every answer will be comparable.',

  setBy: 'Set by {{name}}',
  closed: 'Closed',
  judging: 'Being judged',
  entries_one: '{{count}} entry',
  entries_other: '{{count}} entries',
  ageRange: 'Ages {{min}}–{{max}}',
  ageMin: '{{min}} and over',
  ageMax: 'Under {{max}}',

  // ── Detail ─────────────────────────────────────────────────────────────────
  briefTitle: 'What to film',
  rulesTitle: 'How it is judged',
  judgedNote: 'Judged by the coach who set it — there is no number to beat, so send your best take.',
  measuredNote: 'Measured in {{unit}}. {{direction}}',
  directionHigher: 'Higher is better.',
  directionLower: 'Lower is better.',

  leaderboardTitle: 'Leaderboard',
  leaderboardEmpty: 'Nobody has entered yet. First clip sets the mark.',
  verifiedBadge: 'Verified',
  claimedBadge: 'Claimed',
  verifiedTooltip: 'A coach watched this clip and confirmed the result.',
  claimedTooltip: 'The athlete’s own number. A coach has not checked it yet.',
  yourEntry: 'Your entry',
  rankLabel: '#{{rank}}',

  // ── Entering ───────────────────────────────────────────────────────────────
  enter: 'Enter',
  enterAgain: 'Send a better take',
  withdraw: 'Withdraw',
  withdrawConfirmTitle: 'Withdraw your entry?',
  withdrawConfirmBody: 'Your clip stays on your profile. It just comes off this leaderboard.',
  withdrawConfirmAction: 'Withdraw',

  chooseClipTitle: 'Which clip?',
  chooseClipBody: 'Pick one of your videos. Send a new one from your profile first if the right clip is not here.',
  noClipsTitle: 'You need a clip first',
  noClipsBody: 'Record the attempt, add it to your profile, then come back and enter.',
  noClipsAction: 'Add a clip',

  resultLabel: 'Your result',
  resultPlaceholder: 'e.g. 214',
  noteLabel: 'Anything to add?',
  notePlaceholder: 'Best of three. Left foot is still the weak one.',
  submit: 'Send entry',
  submitted: 'Entry sent. The coach will confirm it.',
  updated: 'Entry replaced.',
  withdrawn: 'Entry withdrawn.',

  // ── Judging, for the coach who set it ──────────────────────────────────────
  judgeTitle: 'Confirm results',
  judgeBody: 'Watch the clip, then confirm the number or send it back.',
  judgeAccept: 'Confirm',
  judgeReject: 'Send back',
  judgeValueLabel: 'Confirmed result',
  judgeNoteLabel: 'Note for the athlete',
  judgeNotePlaceholder: 'Ball touched the floor at 0:18 — the count restarts there.',
  judged: 'Result confirmed.',
  sentBack: 'Sent back to the athlete.',

  // ── Setting one ────────────────────────────────────────────────────────────
  newTitle: 'Set a challenge',
  newBody: 'Ask for one specific thing on film. The more exact the brief, the more useful the answers.',
  fieldTitle: 'Title',
  fieldTitlePlaceholder: 'Thirty seconds of keep-ups',
  fieldBrief: 'What to film',
  fieldBriefPlaceholder: 'One take, feet and thighs only, phone on the ground so we can see the whole body.',
  fieldRules: 'How it is judged',
  fieldRulesPlaceholder: 'No cuts. Best of three, not a montage.',
  fieldMeasured: 'Is there a number?',
  measuredYes: 'Measured',
  measuredNo: 'Judged',
  fieldMetricLabel: 'What is counted',
  fieldMetricLabelPlaceholder: 'Touches',
  fieldMetricUnit: 'Unit',
  fieldMetricUnitPlaceholder: 'touches',
  fieldBetter: 'Better is',
  betterHigher: 'Higher',
  betterLower: 'Lower',
  fieldAges: 'Age group',
  fieldCloses: 'Closes',
  closesIn7: 'In a week',
  closesIn14: 'In two weeks',
  closesIn30: 'In a month',
  create: 'Post challenge',
  created: 'Challenge is live.',

  // ── Home card ──────────────────────────────────────────────────────────────
  homeTitle: 'This week’s challenge',
  homeCta: 'See it',
  homeEnteredCta: 'See the leaderboard',
};
