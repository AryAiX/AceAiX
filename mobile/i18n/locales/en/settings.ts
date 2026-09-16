/**
 * The settings tree — every screen under `app/settings/`, the pieces they are
 * built from, and the chrome around the four legal documents.
 *
 * Anything about reporting, blocking, guardians or under-18 protection lives
 * in `safety.ts` instead, so that copy can be reviewed on its own. Shared
 * vocabulary (Save, Cancel, Verified, Unblock, Talent Score, the four document
 * names) comes from `common.ts` and is not repeated here.
 *
 * Note on stored values: the sports, positions, levels and countries a scout
 * picks are stored in English and translated at render time through
 * `constants/sports.ts`. Only the labels around them are in this file.
 */
export const settings = {
  // ── Settings home (app/settings/index.tsx) ─────────────────────────────────
  title: 'Settings',

  sectionAccount: 'Account',
  accountTitle: 'Account',
  accountSubtitle: 'Email, password, verification',
  appearanceTitle: 'Appearance',
  appearanceSubtitle: 'Light, dark or match your phone',
  notificationsTitle: 'Notifications',
  notificationsSubtitle: 'Choose what reaches you',

  sectionPrivacySafety: 'Privacy & safety',
  privacyTitle: 'Privacy',
  privacySubtitle: 'Who can message and find you',

  sectionScouting: 'Scouting',
  scoutingFooter: 'We use this to rank who shows up first in Discover.',
  scoutingTitle: "What you're looking for",
  scoutingSubtitle: 'Sports, positions, levels and age',

  sectionAbout: 'About',
  supportTitle: 'Contact support',
  supportFallback: 'Email us at {{email}}',
  versionTitle: 'Version',

  signOut: 'Sign out',
  signOutConfirmTitle: 'Sign out?',
  signOutConfirmBody: "You'll need your email and password to get back in.",

  /** "AceAiX by AryAiX" — both names are brands and are passed in as they are. */
  productBy: '{{product}} by {{company}}',

  // ── Account (app/settings/account.tsx) ─────────────────────────────────────
  sectionSignIn: 'Sign in',
  signInFooter:
    'Your email is how you sign in and how we reach you about your account. To change it, write to {{email}}.',
  emailLabel: 'Email',
  notSignedIn: 'Not signed in',

  sectionVerification: 'Verification',
  verificationTitle: 'Verification',
  requestVerification: 'Request verification',
  verificationCheckedSubtitle: 'Your account is checked',
  verificationAskSubtitle: 'Ask us to check your account',
  verificationInReview: 'In review',
  verificationSentOn: 'Sent {{date}}',
  verificationApproved: 'Approved',
  verificationApprovedSubtitle: 'Your badge is on the way',
  verificationRejected: 'Not approved',
  verificationRejectedSubtitle: 'You can send a new request',
  verificationRequestSent: 'Request sent. We will look at it soon.',

  sectionYourData: 'Your data',
  dataFooter:
    'The file is JSON: your profile, posts, comments, follows, applications and media, exactly as we hold them.',
  downloadMyData: 'Download my data',
  downloadSubtitle: 'Get a copy of everything on your account',
  preparingFile: 'Preparing your file…',
  preparingShort: 'Preparing…',
  exportSaved: 'Saved {{name}}',

  // Change-password sheet
  changePassword: 'Change password',
  changePasswordSubtitle: 'You will stay signed in on this device.',
  currentPassword: 'Current password',
  currentPasswordPlaceholder: 'Your password now',
  newPassword: 'New password',
  newPasswordHint_one: 'At least {{count}} character.',
  newPasswordHint_other: 'At least {{count}} characters.',
  newPasswordPlaceholder: 'Something only you know',
  confirmNewPassword: 'Confirm new password',
  confirmNewPasswordPlaceholder: 'Type it again',
  passwordTooShort_one: 'Choose a password with at least {{count}} character.',
  passwordTooShort_other: 'Choose a password with at least {{count}} characters.',
  passwordsDoNotMatch: 'Those two passwords are not the same.',
  passwordUnchanged: 'That is the password you already have.',
  passwordCurrentWrong: 'That current password is not right.',
  passwordChanged: 'Password changed.',
  passwordPhishingNote:
    'We never ask for your password by email or in a message. If someone does, it is not us.',

  // ── Privacy (app/settings/privacy.tsx) ─────────────────────────────────────
  messagePrivacyHeading: 'Who can message you',
  messagePrivacyHint:
    'This only affects new conversations. Chats you already have stay open.',

  privacyEveryone: 'Everyone',
  privacyEveryoneHint: 'Anyone on AceAiX can start a conversation with you.',
  privacyVerified: 'Verified coaches and clubs',
  privacyVerifiedHint: 'Only accounts we have checked, plus people who follow you.',
  privacyFollowing: 'People you follow',
  privacyFollowingHint: 'Only the accounts you already follow can write first.',
  privacyNobody: 'No one',
  privacyNobodyHint: 'Nobody can start a new conversation. Existing chats keep working.',

  discoveryHeading: 'Appear in scout searches',
  discoveryHint: 'When this is on, coaches and clubs can find you in Discover.',
  discoverable: 'Discoverable',
  discoverableOn: 'Your profile can show up in search',
  discoverableOff: 'You are hidden from search',

  publicWebHeading: 'Show my profile to signed-out visitors',
  publicWebAdult:
    'Adult profiles that are set to appear in search can also be seen on the web by someone who is not signed in. Turning off “{{setting}}” above takes you out of both.',
  readPrivacyPolicy: 'Read the full Privacy Policy',

  // ── Notifications (app/settings/notifications.tsx) ─────────────────────────
  pushOffTitle: 'Push notifications are off',
  pushOffBody:
    'Your phone is not letting AceAiX send notifications, so nothing below can reach you while the app is closed.',
  turnOnPush: 'Turn on push',
  pushStillOff: 'Push is still off. You can turn it on in your phone settings.',
  autoSaveNote: 'Changes save on their own.',

  sectionHowWeReach: 'How we reach you',
  pushTitle: 'Push notifications',
  pushSubtitle: 'On your phone, while the app is closed',
  emailTitle: 'Email',
  emailSubtitle: 'Occasional summaries to your inbox',

  sectionActivity: 'Activity',
  activityFooter: 'These also control what shows up in your in-app notifications.',
  notifyFollows: 'New followers',
  notifyMessages: 'Messages',
  notifyComments: 'Comments',
  notifyLikes: 'Likes',

  sectionOpportunities: 'Opportunities and your score',
  notifyOpportunities: 'New opportunities',
  notifyApplications: 'Application updates',
  notifyScoutInterest: 'Scout interest',
  notifyScoreUpdates: 'Talent Score updates',

  noMarketingNote:
    'We never send marketing push notifications, and we do not sell your details to anyone who does.',

  // ── Scouting preferences (app/settings/scouting.tsx) ───────────────────────
  scoutingIntro:
    'These shape who Discover puts in front of you first, and which athletes we tell you about. Leave anything blank to say “no preference”.',
  scoutingSports: 'Sports',
  scoutingSportsHint: 'Pick every sport you recruit for.',
  scoutingPositions: 'Positions',
  scoutingPositionsHint: 'Only the positions from the sports you chose.',
  scoutingPositionsEmpty: 'Choose a sport first and its positions will appear here.',
  scoutingLevels: 'Levels',
  scoutingCountries: 'Countries',
  scoutingCountriesHint: 'Where the athlete is based.',

  ageRange: 'Age range',
  youngest: 'Youngest',
  oldest: 'Oldest',
  yearsSuffix: 'yrs',

  minimumTalentScore: 'Minimum Talent Score',
  atLeast: 'At least',
  anyScoreHint: 'Any score, including athletes with no score yet',
  minScoreHint: 'Only athletes scoring {{score}} or above',

  filters: 'Filters',
  openToOffersOnly: 'Open to offers only',
  openToOffersHint: 'Hide athletes who have not said they are looking',
  notifyNewMatches: 'Notify me about new matches',
  notifyNewMatchesHint: 'When an athlete who fits joins or improves',

  savePreferences: 'Save preferences',
  preferencesSaved: 'Saved. Discover will use this from now on.',

  // ── Appearance (app/settings/appearance.tsx) ───────────────────────────────
  themeHeading: 'Theme',
  themeBody:
    'System follows whatever your phone is set to, including its night schedule.',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  preview: 'Preview',
  themeSystemNoteLight: 'Your phone is currently in light mode.',
  themeSystemNoteDark: 'Your phone is currently in dark mode.',
  themeAlwaysLight: 'Always light, whatever your phone is set to.',
  themeAlwaysDark: 'Always dark, whatever your phone is set to.',

  /* The preview is a made-up post, shown only so the theme can be judged. */
  previewName: 'Layla Haddad',
  previewCity: 'Dubai',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'Two goals and an assist in the derby. Full clip on my profile.',

  // ── Delete account (app/settings/delete-account.tsx) ───────────────────────
  deleteAccountTitle: 'Delete account',
  deleteAccountSubtitle: 'Permanently remove your profile and everything on it',
  deleteCannotUndoTitle: 'This cannot be undone',
  deleteCannotUndoBody:
    'Deleting your account removes it permanently. There is no way for us to bring it back, and signing up again starts from nothing — a new profile, and a Talent Score that begins at zero.',

  beforeYouGo: 'Before you go',
  takeABreakTitle: 'Take a break instead',
  takeABreakBody:
    'Turn off discovery and you disappear from scout searches. Your profile, posts and score stay exactly as they are, and you can switch it back on whenever you want.',
  turnOffDiscovery: 'Turn off discovery',
  discoveryAlreadyOff: 'Discovery is already off',
  hiddenFromSearchToast: 'You are hidden from scout searches. Nothing has been deleted.',
  deleteExportBody:
    'Keep a copy of your profile, posts, comments, follows and applications before anything is removed. Once the account is deleted we cannot send it to you.',

  whatGetsDeleted: 'What gets deleted',
  removedProfile: 'Your profile, photo and everything you wrote on it',
  removedPosts: 'Every post, comment and like you made',
  removedMessages: 'Your messages, in every conversation',
  removedApplications: 'Your applications and any opportunity you saved',
  removedScore: 'Your Talent Score and its whole history',
  removedFollows: 'Your followers and everyone you follow',
  retentionNote:
    'We keep a small number of records for a limited time where the law requires it — safety and moderation records, and anything needed to answer a legal claim. Nothing from your profile is shown to anyone again.',

  /**
   * The word typed to confirm deletion. Translate it into the word people
   * would actually type in this language; the comparison ignores case.
   */
  deleteConfirmWord: 'DELETE',
  typeToContinue: 'Type {{word}} to continue',
  deleteMyAccount: 'Delete my account',
  changedYourMind: 'Changed your mind? Just go back — nothing has happened yet.',
  deleteConfirmTitle: 'Delete your account?',
  deleteConfirmBody:
    'This is the last step. Your profile, posts, messages, applications and Talent Score are removed permanently and cannot be recovered.',
  deletePermanently: 'Delete permanently',
  keepMyAccount: 'Keep my account',

  // ── Shared settings controls (components/settings/) ────────────────────────
  nothingToChoose: 'Nothing to choose here yet.',
  stepperDecrease: 'Decrease {{label}}',
  stepperIncrease: 'Increase {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** A radio row read aloud: its label, then the line explaining it. */
  radioA11y: '{{label}}. {{hint}}',

  // ── Legal screen chrome (app/legal/) ───────────────────────────────────────
  /* The documents themselves are published in English and are never
     translated — only the furniture around them is. */
  legalUpdated: 'Updated {{date}}',
  legalLinkExternal: '{{label}}, opens outside the app',

  // ── Missing configuration (components/common/ConfigMissing.tsx) ────────────
  configMissingTitle: 'Configuration missing',
  configMissingBody:
    'AceAiX cannot reach its backend because the Supabase environment variables are not set for this build.',
  configMissingHint:
    'Add them to `mobile/.env` for local development, or as EAS secrets for a build, then restart the bundler.',
};
