/**
 * Sport Fit — a short mindset questionnaire and the sports it points to.
 *
 * Tone rules for every language:
 *
 *   * A suggestion to explore, never a verdict. Never "you should quit",
 *     "you are not made for", "your personality". The player keeps playing
 *     what they love; this only opens doors.
 *   * Never clinical: no "psychological test", "diagnosis", "personality
 *     type", "disorder". It is a questionnaire about how you train and how
 *     you feel in a match.
 *   * The statements are first person, plain, and readable by a 13-year-old.
 *     Translations of `item.*` need review by a sports psychologist who is a
 *     native speaker before launch (docs/32 §6).
 */
export const sportFit = {
  // ── Names ──────────────────────────────────────────────────────────────────
  title: 'Sport Fit',
  tagline: 'Which sports suit your mindset',

  // ── The profile card ───────────────────────────────────────────────────────
  cardCta: 'Find the sports that suit you',
  cardCtaBody: '22 quick statements, about 4 minutes. Private to you.',
  cardResult: 'Best fit: {{sport}}',
  cardResultBody: 'Then {{second}} and {{third}}',
  cardPrivate: 'Only you can see this',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'How you think shapes where you shine',
  introBody:
    'Tell us how you train and how you feel in a match. We match your answers with what twelve sports ask of a player’s mind, and show you the three that fit you best, and why.',
  introPoint1: '22 statements, about 4 minutes. There are no right or wrong answers.',
  introPoint2: 'Private: clubs and scouts never see your answers or your result.',
  introPoint3: 'If you have played Game Intelligence, your game reading counts too.',
  introStart: 'Start',
  answerAgain: 'Answer again',
  answerAgainNeedsParent: 'A parent needs to allow this again before you can answer.',
  introNotMedical: 'This is a questionnaire, not a medical or psychological assessment.',
  introGiHint: 'Play Game Intelligence first for a sharper result.',
  introGiAction: 'Play the games',

  // ── Consent gate ───────────────────────────────────────────────────────────
  consentTitle: 'Ask a parent first',
  consentBody:
    'Where you live, players under {{age}} need a parent or guardian to say yes before answering. We will send them a short e-mail explaining Sport Fit.',
  consentPendingTitle: 'Waiting for your parent',
  consentPendingBody:
    'We have asked them. The e-mail has a “Sport Fit” box — ask them to tick it, and the questionnaire unlocks here.',
  consentAction: 'Ask my parent',
  consentAgeUnknownTitle: 'Add your date of birth',
  consentAgeUnknownBody: 'We need it to know whether a parent has to approve first.',
  consentAgeUnknownAction: 'Edit profile',
  notAthleteTitle: 'For athletes',
  notAthleteBody: 'Sport Fit is part of an athlete profile.',
  suspendedBody: 'This is unavailable while your account is under review.',

  // ── Questions ──────────────────────────────────────────────────────────────
  questionsTitle: 'Sport Fit',
  progress: '{{n}} of {{total}}',
  questionHint: 'How true is this for you?',
  answer1: 'Strongly disagree',
  answer2: 'Disagree',
  answer3: 'Not sure',
  answer4: 'Agree',
  answer5: 'Strongly agree',
  back: 'Back',
  submitting: 'Finding your sports…',
  leaveTitle: 'Stop here?',
  leaveBody: 'Your answers so far will not be saved.',
  leaveConfirm: 'Stop',
  leaveCancel: 'Keep going',

  item: {
    drive1: 'I train even when nobody is checking on me.',
    drive2: 'I play my sport mostly because I love getting better at it.',
    drive3: 'After a few weeks, I often lose interest in training.',
    composure1: 'In the big moments of a match, I can stay calm.',
    composure2: 'Nerves before a competition often make me play worse.',
    composure3: 'When the score is close, I want the ball or the next point.',
    team1: 'A win feels better when I share it with teammates.',
    team2: 'I prefer being fully responsible for my own result.',
    team3: 'I like having teammates who rely on me, and relying on them.',
    focus1: 'I can keep my attention on one task for a long time.',
    focus2: 'Noise from the crowd or other players easily distracts me.',
    focus3: 'I can spend a whole session working on one small detail.',
    boldness1: 'I enjoy one-on-one battles with an opponent.',
    boldness2: 'Physical contact in a game doesn’t put me off.',
    boldness3: 'I prefer activities with little risk of getting hurt.',
    resilience1: 'After a mistake, I quickly focus on the next action.',
    resilience2: 'A loss makes me want to train harder.',
    resilience3: 'When a coach criticises me, I keep thinking about it for days.',
    discipline1: 'I like following a fixed training routine.',
    discipline2: 'I can repeat the same drill many times to get it right.',
    discipline3: 'I get bored quickly when practice is repetitive.',
    check1: 'To show you are reading carefully, choose “Agree” for this one.',
  },

  // ── Not usable: try again ──────────────────────────────────────────────────
  retryTitle: 'Let’s try that again',
  retryTooFast: 'That was very quick. Take a moment with each statement so the result means something.',
  retryCheck: 'One statement asked you to choose “Agree”. Read each one carefully and try again.',
  retryStraight: 'Every answer was the same. Think about each statement on its own and try again.',
  retryAction: 'Start again',

  // ── Result ─────────────────────────────────────────────────────────────────
  resultsTitle: 'Your Sport Fit',
  resultsSubtitle: 'The sports that suit how you think',
  fitLabel: '{{fit}}% fit',
  topPick: 'Best fit',
  whyTitle: 'Why it fits',
  developTitle: 'To develop',
  allSportsTitle: 'All sports',
  mindsetTitle: 'Your mindset',
  teamSpectrumSolo: 'Solo',
  teamSpectrumTeam: 'Team',
  fromGames: 'From Game Intelligence',
  takenOn: 'Answered {{date}}',
  nextRetake: 'You can answer again from {{date}}',
  findCoaches: 'Find coaches',
  footnote:
    'A suggestion to explore, not a verdict. Sport Fit looks at mindset and game reading only, not your body, fitness, skill or experience. Keep playing what you love.',
  privacyTitle: 'Your answers are private',
  privacyBody:
    'Only you can see them. They are not shown to clubs or scouts and are not part of your Talent Score.',
  deleteAction: 'Delete my answers',
  deleteTitle: 'Delete your Sport Fit answers?',
  deleteBody: 'Your answers and result are deleted for good. You can answer again any time.',
  deleteConfirm: 'Delete',
  deleted: 'Your Sport Fit answers were deleted',

  dimension: {
    drive: 'Drive',
    composure: 'Composure',
    focus: 'Focus',
    resilience: 'Bounce-back',
    team: 'Team or solo',
    boldness: 'Boldness',
    discipline: 'Routine',
    reading: 'Game reading',
    speed: 'Quick reactions',
  },
  dimensionWhat: {
    drive: 'Wanting to train and improve for its own sake',
    composure: 'Staying calm when it matters',
    focus: 'Keeping your attention where it should be',
    resilience: 'Recovering from mistakes and setbacks',
    team: 'Whether you prefer a team or your own result',
    boldness: 'Enjoying duels, contact and risk',
    discipline: 'Enjoying repetition and structured practice',
    reading: 'How fast you read play, from your games',
    speed: 'How quickly you react, from your games',
  },
  strength: {
    drive: 'You train because you want to improve',
    composure: 'You stay calm when the score is close',
    focus: 'You can hold your attention for a long time',
    resilience: 'You bounce back quickly from mistakes',
    boldness: 'You enjoy duels and physical battles',
    discipline: 'You enjoy routine and repeating a skill',
    reading: 'You read play quickly',
    speed: 'You react fast',
  },
  develop: {
    drive: 'Set one small goal for each week and tick it off.',
    composure: 'Practise a short breathing routine before key moments.',
    focus: 'Train with one cue word that brings your attention back.',
    resilience: 'After a mistake, use a reset action (a clap, a breath) and move on.',
    boldness: 'Play more small-sided games where you have to win your duel.',
    discipline: 'Make repetition a game: count, time or score your drills.',
    reading: 'Watch games and say out loud what you would do next.',
    speed: 'Add short reaction drills to your warm-up.',
  },
  teamMatch: {
    team: 'You enjoy sharing the work with a team',
    pairs: 'You like working with one partner',
    solo: 'You like carrying your own result',
  },
  sportWhy: {
    football: 'Quick decisions with ten teammates, for ninety minutes.',
    basketball: 'Constant decisions at speed, in a small team.',
    volleyball: 'Fast reactions and trust in every teammate on every point.',
    handball: 'Speed, contact and courage in a fast team game.',
    cricket: 'Long focus and calm nerves, alone at the crease inside a team.',
    padel: 'Quick reading of the ball with one partner beside you.',
    esports: 'Focus, quick reading and teamwork on a screen.',
    tennis: 'You alone against an opponent, point after point.',
    martialArts: 'Courage, control and calm in one-on-one combat.',
    chess: 'Deep focus and calm decisions, alone at the board.',
    swimming: 'Your own race, built on routine and long training.',
    athletics: 'Your own result, built on discipline and drive.',
  },

  // ── Guardian consent (settings → guardian) ─────────────────────────────────
  scopeMindset: 'Can answer the Sport Fit questionnaire',
  scopeMindsetOff: 'Sport Fit questionnaire not approved',
  addMindset: 'Ask to add Sport Fit',
  addMindsetHint:
    'Your parent approved your profile but not Sport Fit. We will send them a new link — they need to tick “Sport Fit”.',
  addMindsetSent: 'Request sent to {{email}}. Sport Fit unlocks when they approve.',
};
