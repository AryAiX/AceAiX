/**
 * Profiles — mine, someone else's, the tabs underneath, the follower lists,
 * and the edit form.
 *
 * Grouped in screen order. Anything that also appears elsewhere in the app
 * (Followers, Posts, Clips, Matches, Endorsed, Follow, Message, Verified) is
 * taken from `common` instead of being repeated here.
 *
 * Note on stored values: sports, positions, levels and dominant side are held
 * in the database in English and translated at render time through
 * `constants/sports.ts`. Country names are stored as typed, so they are not
 * translated either — see PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── Someone else's profile (app/u/[id].tsx) ────────────────────────────────
  title: 'Profile',
  thisPerson: 'This person',

  notFoundTitle: "We can't find that profile",
  notFoundBody: 'The link you followed does not point at anyone on AceAiX.',
  notFoundAction: 'Go back',

  blockedTitle: "You can't view this profile",
  blockedByYouBody: 'You blocked {{name}}. Unblock them to see their profile again.',
  blockedBody: 'This profile is not available to you.',
  unblockedToast: 'Unblocked.',

  suspendedTitle: 'This account is not available',
  suspendedBody: 'It has been suspended while our team reviews it.',

  // ── Profile header (components/profile/ProfileHeader.tsx) ──────────────────
  openToOffers: 'Open to offers',
  followersA11y_one: '{{count}} follower. Opens the list.',
  followersA11y_other: '{{count}} followers. Opens the list.',
  followingA11y_one: 'Following {{count}} person. Opens the list.',
  followingA11y_other: 'Following {{count}} people. Opens the list.',

  editProfile: 'Edit profile',
  settings: 'Settings',
  moreOptions: 'More options',
  messageLimitedHint: 'Messages are limited for this account. Tap to find out why.',

  shareProfile: 'Share profile',
  /** The URL is not translated; only the sentence around it. */
  shareMessage: '{{name}} on AceAiX — {{url}}',

  reportAccount: 'Report this account',
  reportAccountSubtitle: 'Our team reviews every report',
  reportSheetSubtitle: 'Pick the closest reason. Nobody is told that you reported them.',
  reportThanks: 'Thanks. Our team will look at this.',
  reportReason: {
    childSafety: 'Child safety',
    childSafetyHint: 'A minor is at risk or being targeted',
    harassment: 'Bullying or harassment',
    harassmentHint: 'Abuse aimed at someone',
    hate: 'Hate speech',
    hateHint: 'Attacks on who someone is',
    nudity: 'Nudity or sexual content',
    nudityHint: 'Content that does not belong here',
    violence: 'Violence or threats',
    violenceHint: 'Threats or graphic content',
    impersonation: 'Pretending to be someone else',
    impersonationHint: 'A fake account',
    scam: 'Scam or fraud',
    scamHint: 'Fake trials, fees, or offers',
    spam: 'Spam',
    spamHint: 'Repeated or unwanted posts',
    other: 'Something else',
    otherHint: 'Tell us in your own words',
  },

  blockPerson: 'Block {{name}}',
  blockPersonSubtitle: 'They will not be able to find or message you',
  blockConfirmTitle: 'Block {{name}}?',
  blockConfirmBody:
    '{{name}} will not be able to message you, follow you, or see what you post. You can undo this in Settings.',
  blockedToast: '{{name}} can no longer see you or message you.',

  /** Plain-language answers to "why can't I message this person?". */
  messageBlockTitle: "You can't message this account",
  messageBlockNote:
    'These rules protect young athletes. They are set by the athlete, their parent or guardian, and by AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'This athlete is under 18. Only verified coaches and clubs can start a conversation with them.',
    minorRequiresGuardianConsent:
      "This athlete's parent or guardian hasn't approved messages yet.",
    recipientMessagesOff: 'This person has turned messages off.',
    recipientOnlyAcceptsFollowed: 'This person only accepts messages from people they follow.',
    recipientOnlyAcceptsVerified: 'This person only accepts messages from verified accounts.',
    notPermitted: "You can't start a conversation with this account right now.",
    notFound: 'We could not find this account.',
  },
  gotIt: 'Got it',

  // ── Stat row (components/profile/StatRow.tsx) ──────────────────────────────
  statA11y: '{{value}} {{label}}',

  // ── Tabs (components/profile/ProfileTabs.tsx) ──────────────────────────────
  tabHighlights: 'Highlights',
  tabCareer: 'Career',

  // ── Posts tab (components/profile/PostsTab.tsx) ────────────────────────────
  postsEmptyTitleSelf: 'No posts yet',
  postsEmptyTitleOther: 'Nothing posted yet',
  postsEmptyBodySelf:
    'Share a training session, a result, or a clip. Active profiles get seen more.',
  postsEmptyBodyOther: 'When they post, it will show up here.',
  postsEmptyAction: 'Write a post',

  // ── Media grid (components/profile/MediaGrid.tsx) ──────────────────────────
  addHighlight: 'Add highlight',
  videoClipA11y: 'Video clip',
  photoA11y: 'Photo',

  // ── Highlights tab (components/profile/HighlightsTab.tsx) ──────────────────
  photoPermission: 'AceAiX needs permission to open your photos.',

  noHighlightsTitle: 'No highlights here',
  noHighlightsBody: 'Highlights are part of an athlete profile.',
  clipsEmptyTitleSelf: 'Coaches watch before they read.',
  clipsEmptyTitleOther: 'No clips yet',
  clipsEmptyBodySelf: 'Add your first clip. Three short ones is the sweet spot.',
  clipsEmptyBodyOther: 'When they upload a clip, it will show up here.',
  clipsEmptyAction: 'Add your first clip',

  nameClipTitle: 'Name this clip',
  nameClipSubtitle: "A short title helps a coach know what they're watching.",
  clipTitleLabel: 'Title',
  clipTitlePlaceholderVideo: 'e.g. Left-foot finish vs Al Wasl',
  clipTitlePlaceholderPhoto: 'e.g. Cup final',
  addToProfile: 'Add to profile',
  clipAddedToast: 'Added. Coaches can watch this now.',
  clipRemovedToast: 'Removed.',

  holdToRemoveClip: 'Press and hold a clip to remove it.',
  removeClipTitle: 'Remove this clip?',
  removeClipBody: 'It will be taken off your profile. Your Talent Score may go down.',
  mediaLoadFailed: 'This file could not be loaded. Try again in a moment.',

  // ── Career tab (components/profile/CareerTab.tsx) ──────────────────────────
  noCareerTitle: 'No career record',
  noCareerBody: 'This section is for athlete profiles.',
  add: 'Add',

  matchesEmptyTitleSelf: 'No matches logged',
  matchesEmptyTitleOther: 'No matches yet',
  matchesEmptyBodySelf: 'Logging the last 12 months shows a coach your current form.',
  matchesEmptyBodyOther: 'Nothing has been logged here yet.',
  matchFallback: 'Match',
  matchVersus: 'vs {{opponent}}',
  matchMinutes: '{{n}} min',
  matchGoals_one: '{{count}} goal',
  matchGoals_other: '{{count}} goals',
  matchAssists_one: '{{count}} assist',
  matchAssists_other: '{{count}} assists',

  honoursTitle: 'Honours',
  honoursEmptyTitleSelf: 'No honours yet',
  honoursEmptyTitleOther: 'No honours listed',
  honoursEmptyBodySelf: 'League titles, cups, player of the season — anything you won counts.',

  certificatesTitle: 'Certificates',
  certificatesEmptyTitleSelf: 'No certificates yet',
  certificatesEmptyTitleOther: 'No certificates listed',
  certificatesEmptyBodySelf: 'Coaching badges, first aid, safeguarding, language certificates.',

  endorsementsTitle: 'Endorsements',
  endorsementsEmptyTitle: 'No endorsements yet',
  endorsementsEmptyBodySelf:
    'Ask a coach who knows your game. One from a verified coach counts for a lot.',

  logMatchTitle: 'Log a match',
  logMatchSubtitle: 'Only what you remember — you can add more later.',
  matchDate: 'Date',
  matchDateHint: 'Year-month-day',
  matchCompetition: 'Competition',
  matchCompetitionPlaceholder: 'U16 League',
  matchOpponent: 'Opponent',
  matchOpponentPlaceholder: 'Al Nasr',
  matchResult: 'Result',
  matchResultPlaceholder: '3-1 win',
  matchMinutesLabel: 'Minutes',
  matchGoalsLabel: 'Goals',
  matchAssistsLabel: 'Assists',
  saveMatch: 'Save match',
  matchDateInvalid: 'Use the date format YYYY-MM-DD, for example 2026-03-14.',
  matchAddedToast: 'Match added.',

  addHonourTitle: 'Add an honour',
  honourTitleLabel: 'What did you win?',
  honourTitlePlaceholder: 'U16 League champion',
  honourOrgLabel: 'Who gave it',
  honourOrgPlaceholder: 'Dubai Youth League',
  honourYearLabel: 'Year',
  saveHonour: 'Save honour',
  honourTitleRequired: 'Give the honour a name.',
  honourAddedToast: 'Honour added.',

  addCertificateTitle: 'Add a certificate',
  certificateTitleLabel: 'Certificate',
  certificateTitlePlaceholder: 'First aid',
  certificateIssuerLabel: 'Issued by',
  certificateIssuerPlaceholder: 'Red Crescent',
  certificateYearLabel: 'Year',
  saveCertificate: 'Save certificate',
  certificateTitleRequired: 'Give the certificate a name.',
  certificateAddedToast: 'Certificate added.',

  // ── People list (components/profile/PeopleList.tsx) ────────────────────────
  searchThisList: 'Search this list',
  noMatchTitle: 'Nobody matches that',
  noMatchBody: 'Try a different name.',
  openProfileA11y: "Open {{name}}'s profile",

  // ── Followers and following (app/u/[id]/…) ─────────────────────────────────
  followersEmptyTitle: 'No followers yet',
  followersEmptyBodySelf: 'Post a clip or an update. People follow athletes who show up.',
  followersEmptyBodyOther: 'Nobody follows this account yet.',
  followingEmptyTitleSelf: "You're not following anyone yet",
  followingEmptyTitleOther: 'Not following anyone yet',
  followingEmptyBodySelf: 'Follow clubs, coaches and athletes to fill your feed.',
  followingEmptyBodyOther: 'This account has not followed anyone yet.',

  // ── Edit profile (app/edit-profile.tsx) ────────────────────────────────────
  /* `editProfile` above is this screen's title as well as the button that opens it. */
  firstNameRequired: 'Your first name cannot be empty.',
  savedScoreUp_one: 'Saved — your Talent Score went up {{count}} point.',
  savedScoreUp_other: 'Saved — your Talent Score went up {{count}} points.',
  savedScoreDown_one: 'Saved — your Talent Score went down {{count}} point.',
  savedScoreDown_other: 'Saved — your Talent Score went down {{count}} points.',

  sectionYou: 'You',
  changePhotoA11y: 'Change your profile photo',
  uploadingPhoto: 'Uploading…',
  tapToChangePhoto: 'Tap to change your photo',
  addCover: 'Add a cover photo',
  changeCover: 'Change cover photo',
  uploadingCover: 'Uploading cover…',
  removeCover: 'Remove cover',
  changeCoverA11y: 'Change the cover photo behind your profile',
  viewPhotoA11y: "View {{name}}'s photo",
  firstName: 'First name',
  lastName: 'Last name',
  bio: 'About you',
  bioPlaceholder: 'What position do you play, and what are you working on?',
  bioCounter: '{{n}} / {{max}}',
  city: 'City',
  cityPlaceholder: 'Dubai',
  country: 'Country',
  countryPlaceholder: 'Choose a country',
  countryA11y: 'Country. Currently {{value}}. Opens a picker.',
  notSet: 'not set',

  sectionSport: 'Your sport',
  sport: 'Sport',
  sportPlaceholder: 'Choose your sport',
  sportA11y: 'Sport. Currently {{value}}. Opens a picker.',
  position: 'Position',
  level: 'Level',
  levelHintDefault: 'Pick the level you play at right now.',
  league: 'League or competition',
  leaguePlaceholder: 'Dubai Youth League',
  club: 'Current club',
  clubPlaceholder: 'Al Nasr Academy',
  clubHint: 'A linked club adds to your credibility score.',

  sectionPhysical: 'Physical',
  height: 'Height',
  heightUnit: 'cm',
  weight: 'Weight',
  weightUnit: 'kg',
  dominantSide: 'Dominant side',

  sectionAvailability: 'Availability',
  openToOffersHint: 'Coaches see this on your profile.',

  chooseSportTitle: 'Choose your sport',
  /** The emoji is not translated; only the order of mark and name. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: 'Where do you live?',
  searchCountries: 'Search countries',
  useTypedCountry: 'Use “{{country}}”',
  useTypedCountryHint: 'Not in the list? Add it yourself.',
  countryTypeToAdd: 'Start typing to add your country.',

  // ── The player card ────────────────────────────────────────────────────────
  playerCard: 'Player card',
  playerCardHint: 'A card you can save and post.',
  playerCardBody: 'Everything a scout would look for first, in one image.',
  playerCardSaved: 'Saved.',
  playerCardShared: 'Card ready to share.',
  playerCardFailed: 'Could not build the card. Try again in a moment.',
  playerCardShare: 'Share',
  playerCardSave: 'Save image',
};
