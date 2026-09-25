/**
 * Game Intelligence — six short timed games about how a player reads the game.
 *
 * Tone rules for every language:
 *
 *   * It is a set of **games**, never an "exam", "test of intelligence" or
 *     "assessment of you". The audience is thirteen and up.
 *   * Never clinical: no "diagnosis", "disorder", "deficit", "cognitive
 *     ability". We measure speed, focus and decisions on these games, on this
 *     day — and the copy says so.
 *   * A low number is never a verdict. The result screen's footnote carries
 *     the same promise the Talent Score does.
 */
export const intelligence = {
  // ── Names ──────────────────────────────────────────────────────────────────
  title: 'Game Intelligence',
  short: 'Game IQ',
  tagline: 'How fast you read the game',

  // ── The profile card ───────────────────────────────────────────────────────
  cardCta: 'Play the six games',
  cardCtaBody: 'About 8 minutes. Show clubs how you think on the pitch.',
  cardContinue: 'Finish your games',
  cardContinueBody: '{{done}} of 6 played',
  cardTop: 'Top {{percent}}% of your age group',
  cardShared: 'Shared with clubs',
  cardPrivate: 'Only you can see this',
  cardA11y: 'Game Intelligence {{score}} out of 100',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'Six games. One picture of how you play.',
  introBody:
    'Quick games that measure how you see the pitch, decide under pressure and stay focused. Coaches care about this as much as speed or skill.',
  introPoint1: 'About 8 minutes — you can stop between games and come back later',
  introPoint2: 'Your results are private until you choose to share them',
  introPoint3: 'Two tries at each game every two weeks. Your best counts.',
  introStart: 'Let’s play',
  introNotMedical: 'These are games, not a medical or psychological assessment.',

  // ── Consent gate ───────────────────────────────────────────────────────────
  consentTitle: 'Ask a parent first',
  consentBody:
    'Where you live, players under {{age}} need a parent or guardian to say yes before playing. We will send them a short e-mail explaining the games.',
  consentPendingTitle: 'Waiting for your parent',
  consentPendingBody:
    'We have asked them. The e-mail has a “Game Intelligence” box — ask them to tick it, and the games unlock here.',
  consentAction: 'Ask my parent',
  consentAgeUnknownTitle: 'Add your date of birth',
  consentAgeUnknownBody: 'We need it to know whether a parent has to approve first.',
  consentAgeUnknownAction: 'Edit profile',
  notAthleteTitle: 'For athletes',
  notAthleteBody: 'Game Intelligence is part of an athlete profile. You can see results athletes share with you on their profile.',
  suspendedBody: 'This is unavailable while your account is under review.',

  // ── Readiness ──────────────────────────────────────────────────────────────
  readyTitle: 'Get ready',
  readyBody: 'Your result is only as good as the moment you play it.',
  readyQuiet: 'Somewhere quiet, sitting or standing still',
  readyNotifications: 'Notifications off, so nothing pops up mid-game',
  readyBattery: 'Enough battery, and the phone held in your hand',
  readyFatigue: 'How fresh do you feel right now?',
  fatigue1: 'Fresh',
  fatigue2: 'Good',
  fatigue3: 'OK',
  fatigue4: 'Tired',
  fatigue5: 'Exhausted',
  readyTiredHint: 'You can play, but your result may be lower than usual. Later might be better.',
  readyContinue: 'I’m ready',

  // ── Warm-up ────────────────────────────────────────────────────────────────
  warmupTitle: 'Warm-up',
  warmupBody: 'Tap the circle the moment it turns green. Five times. This tunes the games to your phone.',
  warmupWait: 'Wait for green…',
  warmupTap: 'Tap!',
  warmupEarly: 'Too early — wait for green',
  warmupDone: 'Warm-up done',

  // ── Hub ────────────────────────────────────────────────────────────────────
  hubTitle: 'Your games',
  hubBody: 'Play in any order. Football games count the most.',
  hubPlayed: 'Played',
  hubRetry: 'Retry needed',
  hubNoAttempts: 'Next try in a few days',
  hubCountsMost: 'Counts most',
  hubMinutes: '~{{n}} min',
  hubSeconds: '~{{n}} s',
  hubFinish: 'See my results',
  hubFinishNeeds: 'Games left before your result: {{count}}',
  hubPause: 'Take a break',
  hubPauseBody: 'Your progress is saved for 24 hours.',

  // ── A game ─────────────────────────────────────────────────────────────────
  practice: 'Practice',
  practiceBody: 'A few rounds that do not count.',
  practiceDone: 'Nice. Now for real.',
  startScored: 'Start',
  getReady: 'Get ready',
  round: 'Round {{n}} of {{total}}',
  scoredLabel: 'Counts',
  submitting: 'Saving…',
  gameDone: 'Done!',
  gameScore: '{{score}} / 100',
  gameInvalid: 'That round didn’t count',
  gameInvalidBody: 'Something looked off — maybe a distraction. You can try again later.',
  gameIncomplete: 'Not enough taps to score that round',
  gameIncompleteBody: 'No attempt was used. Try again when you are ready.',
  backToHub: 'Back to games',
  tryAgain: 'Try again',
  interrupted: 'Game paused',
  interruptedBody: 'You left the app, so this round was cancelled. No attempt was used.',
  timeUp: 'Time!',
  countdownGo: 'GO!',
  howTitle: 'How to play',
  hubNext: 'Up next',
  medalKeepGoing: 'Keep going',
  medalBronze: 'Bronze',
  medalSilver: 'Silver',
  medalGold: 'Gold',
  feedbackKeepGoing: 'Every round trains your eye — take a breather and you will read it quicker next time.',
  feedbackBronze: 'Solid round. A little more focus early on and silver is within reach.',
  feedbackSilver: 'Sharp! You read that quicker than most — gold is close.',
  feedbackGold: 'Outstanding — that is how the best players read the game.',

  tests: {
    pitchDecision: {
      name: 'Pitch Decision',
      what: 'Decision-making',
      how: 'Watch the play. When it freezes, you have 3 seconds: tap a teammate to pass, or choose Shoot or Dribble.',
      you: 'You',
      shoot: 'Shoot',
      dribble: 'Dribble',
      pass: 'Tap a teammate to pass',
      step1: 'Watch the play unfold',
      step2: 'It freezes — you have 3 seconds',
      step3: 'Tap a teammate to pass, or Shoot or Dribble',
    },
    anticipation: {
      name: 'Read the Ball',
      what: 'Anticipation',
      how: 'The ball flies towards goal, then disappears. Tap the goal line where it will cross.',
      tapLine: 'Tap where it crosses',
      step1: 'Follow the ball’s curve',
      step2: 'It vanishes before the goal',
      step3: 'Tap the goal line where it will cross',
      spotOn: 'Spot on!',
      close: 'Close',
      missed: 'Missed',
      keyTrue: 'Where it crossed',
      keyGuess: 'Your guess',
    },
    tracking: {
      name: 'Track the Runners',
      what: 'Awareness',
      how: 'Some balls flash. Keep your eyes on them while all the balls move. Then tap the ones you were following.',
      watch: 'Watch these',
      follow: 'Follow them…',
      pick: 'Tap the ones you followed · {{found}}/{{count}}',
      level: 'Level {{n}}',
      step1: 'Remember the shirts that flash',
      step2: 'Follow them while everyone runs',
      step3: 'Tap the ones you followed',
      found: '{{found}} of {{count}} found',
    },
    goNoGo: {
      name: 'Go / Stop',
      what: 'Self-control',
      how: 'Tap as fast as you can when a green ball appears. When a red STOP sign appears, don’t tap.',
      go: 'Green: tap',
      stop: 'Red: don’t',
      step1: 'Green ball: tap as fast as you can',
      step2: 'Red STOP sign: don’t tap',
      step3: 'The right call beats a fast one',
      stopSign: 'STOP',
    },
    flanker: {
      name: 'Focus Arrows',
      what: 'Focus',
      how: 'Which way is the middle arrow pointing? Ignore the others.',
      left: 'Left',
      right: 'Right',
      step1: 'Look only at the middle arrow',
      step2: 'Tap the way it points',
      step3: 'Ignore the arrows around it',
    },
    reaction: {
      name: 'Quick Hands',
      what: 'Reaction speed',
      how: 'One corner of the goal lights up. Tap it as fast as you can.',
      step1: 'A corner of the goal lights up',
      step2: 'Tap that corner as fast as you can',
      step3: 'Don’t guess — wait for the light',
      tapCorner: 'Tap the corner that lights up',
    },
  },

  // ── Results ────────────────────────────────────────────────────────────────
  resultsTitle: 'Your Game Intelligence',
  analyzing: 'Putting your results together…',
  resultsNotEnough: 'Play at least four games to get your overall.',
  confidence: 'Confidence',
  confidenceLow: 'Low',
  confidenceMedium: 'Medium',
  confidenceHigh: 'High',
  confidenceHint: 'Play all six games while fresh for high confidence.',
  strengths: 'Your strengths',
  workOn: 'Something to work on',
  tipsTitle: 'Try this',
  tip: {
    pitch_decision: 'Before the ball reaches you, glance over both shoulders. Know your pass before you need it.',
    anticipation: 'Watch the ball early in its flight — the start of the curve tells you where it will go.',
    tracking: 'Soften your gaze and watch the space between players, not one player at a time.',
    go_no_go: 'Stay ready, but let the colour decide. Speed matters less than the right choice.',
    flanker: 'Lock your eyes on the centre. Noise around you is noise.',
    reaction: 'Relax your hand before each round — tension makes you slower.',
  },
  history: 'Your progress',
  nextRetest: 'Next full retest: {{date}}',
  footnote:
    'These games measure how you played them today — speed, focus and decisions — not who you are or how good you will be. Scores rise with practice, sleep and age. No coach decides anything from this number alone.',
  notInTalentScore: 'Shown next to your Talent Score, not added to it — for now.',

  // ── Sharing ────────────────────────────────────────────────────────────────
  shareTitle: 'Who can see this',
  shareClubs: 'Share with coaches and clubs',
  shareClubsBody: 'Coaches, scouts and clubs who view your profile see your overall and each game.',
  shareBadge: 'Show a badge on my profile',
  shareBadgeBody: 'Other players see your overall only. Needs sharing turned on.',
  shareMinorNote: 'Your profile is only visible to clubs once your parent has approved it.',
  shareSaved: 'Saved',

  // ── On someone else's profile ─────────────────────────────────────────────
  theirTitle: 'Game Intelligence',
  theirTop: 'Top {{percent}}% in their age group',
  theirTests: '{{n}} of 6 games',
  theirPlayed: 'Played {{date}}',
  theirConfidence: '{{level}} confidence',

  // ── Guardian consent (settings → guardian) ─────────────────────────────────
  scopeAssessments: 'Can play the Game Intelligence games',
  scopeAssessmentsOff: 'Game Intelligence games not approved',
  addAssessments: 'Ask to add Game Intelligence',
  addAssessmentsHint:
    'Your parent approved your profile but not the games. We will send them a new link — they need to tick “Game Intelligence”.',
  addAssessmentsSent: 'Request sent to {{email}}. The games unlock when they approve.',
};
