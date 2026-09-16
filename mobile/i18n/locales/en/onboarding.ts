/**
 * The profile wizard, which runs once after sign-up.
 *
 * Three paths share it: an athlete building a profile, a coach or club saying
 * who they are looking for, and a parent or guardian who is here to watch over
 * a child's profile rather than build one.
 *
 * The guardian copy is compliance text. A 13–17 year old is not discoverable
 * and cannot be messaged until a parent or guardian approves it — say that
 * plainly, never soften it.
 */
export const onboarding = {
  // ── Wizard chrome ─────────────────────────────────────────────────────────
  loading: 'Getting your profile ready',
  signOut: 'Sign out',
  skipForNow: 'Skip for now',
  finish: 'Start exploring',

  // ── Country picker, shared by the athlete and recruiter place steps ───────
  countryLabel: 'Country',
  countrySearchPlaceholder: 'Search countries',
  countryNoMatch: 'No country matches that. Try a shorter search.',
  countryShowAll: 'Show all countries',

  // ── Athlete: sport, position, level ───────────────────────────────────────
  sportTitle: 'What do you play?',
  sportSubtitle: 'Pick the sport you compete in most.',

  positionTitle: 'Where do you play?',
  positionSubtitle: 'Choose the position you play most often. You can add more later.',
  positionNoneTitle: 'No set positions here',
  positionNoneBody:
    'This sport is not played by position, so there is nothing to choose. Tap {{action}} and carry on.',

  levelTitle: 'What level are you at?',
  levelSubtitle: 'Be honest — coaches search by level, and the right match beats a big claim.',

  // ── Athlete: where you play ───────────────────────────────────────────────
  placeTitle: 'Where do you play now?',
  placeSubtitle: 'Your club and city help nearby coaches find you.',
  clubLabel: 'Club or academy',
  clubPlaceholder: 'Al Wasl Academy',
  clubHint: 'Leave this empty if you are not with a club right now.',
  cityLabel: 'City',
  cityPlaceholder: 'Dubai',

  // ── Athlete: physical ─────────────────────────────────────────────────────
  physicalTitle: 'A few numbers',
  physicalSubtitle:
    'All optional. Scouts look for them, but you can skip this and add them any time.',
  heightLabel: 'Height',
  heightPlaceholder: '172',
  heightHint: 'in cm',
  heightOutOfRange: 'Enter a height between {{min}} and {{max}} cm.',
  weightLabel: 'Weight',
  weightPlaceholder: '64',
  weightHint: 'in kg',
  weightOutOfRange: 'Enter a weight between {{min}} and {{max}} kg.',
  strongSide: 'Strong side',

  // ── Guardian approval, asked of the young athlete ─────────────────────────
  guardianTitle: 'Bring in a grown-up',
  guardianSubtitle:
    'You are under 18, so a parent or guardian approves your profile before anyone can find you.',
  guardianApprovalTitle: 'What they are asked to approve',
  guardianApprovalBody:
    'We send them one email with a link. It explains who we are and asks them to say yes or no to two separate things. They can change their mind and switch either one off at any time, and we will not email them about anything else.',
  guardianSearchTitle: 'You show up in search',
  guardianSearchBody:
    'Coaches and clubs can find your profile when they search for players.',
  guardianMessageTitle: 'Verified coaches can message you',
  guardianMessageBody: 'Only adults we have verified. Nobody else can start a chat with you.',
  guardianWhoTitle: 'Who is it?',
  guardianRelationshipParent: 'A parent',
  guardianRelationshipGuardian: 'Another guardian',
  guardianNameLabel: 'Their name',
  guardianNamePlaceholder: 'Leila Karimi',
  guardianNameRequired: 'Enter their name.',
  guardianEmailLabel: 'Their email',
  guardianEmailHint: 'Make sure this is right — the approval link goes here.',
  guardianEmailRequired: 'Enter their email address.',
  guardianEmailInvalid: 'That email address does not look right.',
  guardianSkip: 'Do this later',
  guardianSkipHint: 'Your profile stays hidden from coaches until a grown-up approves it.',
  guardianSkipA11y:
    'Do this later. Your profile stays hidden until a parent or guardian approves it.',
  guardianSkipSheetTitle: 'Leave this for later?',
  guardianSkipSheetMessage:
    'Your profile will stay hidden. Coaches will not find you in search and nobody can message you until a parent or guardian approves it. You can send the email any time from Settings.',
  guardianSkipSheetConfirm: 'Yes, do it later',
  guardianSkipSheetCancel: "I'll add them now",

  // ── Photo ─────────────────────────────────────────────────────────────────
  photoTitle: 'Put a face to the name',
  photoSubtitle:
    'A clear photo of you, on your own. Profiles with a photo get looked at far more often.',
  photoSaved: 'Saved. Looking good.',
  photoOptional: 'Skip this if you would rather do it later — nothing here is required.',
  photoChoose: 'Choose from photos',
  photoChooseAnother: 'Choose a different photo',
  photoTake: 'Take a photo',
  photoUnreadable: 'We could not read that photo. Try a different one.',
  photoLibraryDenied:
    '{{app}} needs permission to open your photos. You can turn it on in Settings.',
  photoLibraryFailed: 'We could not open your photos. Try again.',
  photoCameraDenied: '{{app}} needs permission to use the camera. You can turn it on in Settings.',
  photoCameraFailed: 'We could not open the camera. Try again.',

  // ── Recruiter: sports, role, place, target ────────────────────────────────
  recruiterSportsTitle: 'Which sports do you work in?',
  recruiterSportsSubtitle:
    'Pick as many as you like. This is what we use to show you the right athletes.',

  recruiterRoleTitle: 'Tell us your role',
  recruiterRoleSubtitle: 'Athletes and their parents see this, so keep it simple and true.',
  recruiterRoleLabel: 'Your role',
  recruiterRolePlaceholderClub: 'Academy director',
  recruiterRolePlaceholderCoach: 'Head coach, under-16s',
  recruiterRoleRequired: 'Tell us what you do.',
  recruiterClubLabel: 'Club or academy name',
  recruiterClubHintClub: 'We will use this when we set up your club page.',
  recruiterClubHintCoach: 'Leave this empty if you are freelance.',

  recruiterPlaceTitle: 'Where are you based?',
  recruiterPlaceSubtitle: 'We put athletes near you at the top of your results.',

  recruiterTargetTitle: 'Who are you looking for?',
  recruiterTargetSubtitle:
    'A rough answer is fine. You can change all of this later in your settings.',
  recruiterPositionsTitle: 'Positions',
  recruiterPositionsEmpty: 'Go back a step and pick a sport to see its positions.',
  recruiterAgeGroupTitle: 'Age group',
  recruiterMinorsNote:
    'Athletes under 18 only appear once a parent or guardian has approved their profile.',
  ageBandAny: 'Any age',
  ageBandUnder14: 'Under 14',
  ageBand14To16: '14 to 16',
  ageBand16To18: '16 to 18',
  ageBand18To21: '18 to 21',
  ageBand21Plus: '21 and over',

  // ── Parent or guardian: how this works ────────────────────────────────────
  guardianIntroTitle: 'How this works for you',
  guardianIntroSubtitle:
    "You are here to keep an eye on your child's profile, not to build one of your own.",
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: 'Link to your child',
  guardianIntroLinkBody:
    'Open Settings and choose Parent and guardian. If they have already sent you an approval email, the link in it connects you straight away.',
  guardianIntroDecideTitle: 'Decide what they can do',
  guardianIntroDecideBody:
    'You say yes or no to two things: whether coaches can find them in search, and whether verified coaches can message them.',
  guardianIntroChangeTitle: 'Change your mind whenever',
  guardianIntroChangeBody:
    'You can switch either one off at any time from Settings, and their profile drops out of search immediately.',
  guardianIntroFooter:
    'Until you approve it, your child’s profile stays hidden. Nobody can search for them and no adult can start a conversation with them.',

  // ── Finish: athlete ───────────────────────────────────────────────────────
  scoreLoading: 'Working out your score',
  scoreErrorNote:
    'Your profile is saved either way — you can carry on and check your score later.',
  athleteDoneTitle: 'Nice one',
  athleteDoneTitleNamed: 'Nice one, {{name}}',
  athleteDoneScored: 'Your profile is live. Here is where you are starting — {{tier}}.',
  athleteDoneNoScore:
    'Your profile is live. Add a bit more and your Talent Score appears on your profile.',
  tipsTitle: 'How to move it up',
  tipPoints: '+{{points}}',
  tipsEmpty:
    'Post a highlight, add your stats, and get your club to back you up. Every piece you add moves the score.',
  guardianRequested:
    'We emailed {{name}}. As soon as they approve, coaches can find you. Until then your profile stays private.',
  guardianPendingTitle: 'One thing left',
  guardianPendingBody:
    'Your profile is hidden until a parent or guardian approves it. You can send them the email any time from Settings.',

  // ── Finish: recruiter, guardian and everyone else ─────────────────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: "You're set up",
  recruiterDoneTitleNamed: "You're set up, {{name}}",
  recruiterDoneBody:
    'We will start matching you with athletes who fit what you are looking for.',
  recruiterDonePointSearch: 'Search and filter athletes in Discover',
  recruiterDonePointPost: 'Post trials and openings so athletes can apply',
  recruiterDonePointVerified: 'Get verified to message athletes under 18',
  doneTitle: "You're all set",
  guardianDoneBody: 'Your account is ready. Linking to your child takes about a minute.',
  basicDoneBody: 'Have a look around and set the rest up whenever you like.',
  guardianDoneNote:
    'Settings, then Parent and guardian. If your child has already sent you an approval email, opening the link in it connects your accounts.',
};
