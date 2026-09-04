/**
 * Shared vocabulary — anything that appears in more than one place.
 *
 * Keep it small. A string used by exactly one screen belongs in that screen's
 * namespace, where it can be changed without wondering what else it touches.
 */
export const common = {
  appName: 'AceAiX',
  tagline: 'For young athletes',

  // Actions
  continue: 'Continue',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  cancel: 'Cancel',
  close: 'Close',
  confirm: 'Confirm',
  delete: 'Delete',
  remove: 'Remove',
  edit: 'Edit',
  share: 'Share',
  copyLink: 'Copy link',
  report: 'Report',
  block: 'Block',
  unblock: 'Unblock',
  follow: 'Follow',
  following: 'Following',
  unfollow: 'Unfollow',
  message: 'Message',
  apply: 'Apply',
  search: 'Search',
  filter: 'Filter',
  clear: 'Clear',
  clearAll: 'Clear all',
  skip: 'Skip',
  retry: 'Try again',
  refresh: 'Refresh',
  seeAll: 'See all',
  showMore: 'more',
  showLess: 'less',
  learnMore: 'Learn more',
  viewProfile: 'View profile',
  optional: 'Optional',
  required: 'Required',
  yes: 'Yes',
  no: 'No',
  on: 'On',
  off: 'Off',

  // States
  loading: 'Loading…',
  somethingWentWrong: 'Something went wrong',
  tryAgainLater: 'Check your connection and try again.',
  nothingHere: 'Nothing here yet',
  noResults: 'No results',
  notAvailable: 'This is no longer available',

  // People and roles
  athlete: 'Athlete',
  coach: 'Coach',
  club: 'Club',
  scout: 'Scout',
  guardian: 'Parent or guardian',
  federation: 'Federation',
  member: 'Member',
  aceaixTeam: 'AceAiX team',
  verified: 'Verified',
  under18: 'Under 18',

  // Counts
  followers: 'Followers',
  followingCount: 'Following',
  posts: 'Posts',
  clips: 'Clips',
  matches: 'Matches',
  endorsed: 'Endorsed',
  likes_one: '{{count}} like',
  likes_other: '{{count}} likes',
  comments_one: '{{count}} comment',
  comments_other: '{{count}} comments',
  messages_one: '{{count}} message',
  messages_other: '{{count}} messages',
  applicants_one: '{{count}} applicant',
  applicants_other: '{{count}} applicants',
  athletes_one: '{{count}} athlete',
  athletes_other: '{{count}} athletes',

  // Time
  now: 'now',
  today: 'Today',
  yesterday: 'Yesterday',

  // Score vocabulary
  talentScore: 'Talent Score',
  match: 'match',
  fit: 'fit',
  tierRising: 'Rising',
  tierBronze: 'Bronze',
  tierSilver: 'Silver',
  tierGold: 'Gold',
  tierElite: 'Elite',

  // Age bands — a minor's exact age is never shown
  ageBand13_15: 'Age 13–15',
  ageBand16_17: 'Age 16–17',
  ageBand18_24: 'Age 18–24',
  ageBand25Plus: 'Age 25+',
  ageYears: 'Age {{age}}',

  // Tabs
  tabHome: 'Home',
  tabDiscover: 'Discover',
  tabTrials: 'Trials',
  tabYou: 'You',
  tabCreate: 'Create',

  // Legal
  terms: 'Terms of Service',
  privacyPolicy: 'Privacy Policy',
  communityGuidelines: 'Community Guidelines',
  childSafety: 'Child Safety Standards',
};
