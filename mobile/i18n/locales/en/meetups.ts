/**
 * Meetups — arranging to actually play with people.
 *
 * Two words carry weight through translation and should not be collapsed:
 *
 *   * a **spot** is a place in the game, not a place on a map. "3 spots left"
 *     is about people; `venue` and `area` are about geography.
 *   * **host** is whoever organised it and decides who comes. It is not a
 *     coach, not a captain, and carries no authority beyond this one game.
 *
 * The feature is eighteen-plus, enforced in the database. Nothing here should
 * explain that to a minor, because a minor never sees these strings — the tab
 * is not shown to them at all.
 */
export const meetups = {
  // ── The tab ────────────────────────────────────────────────────────────────
  title: 'Play',
  subtitle: 'Find people to play with, wherever you are',

  // ── Searching ──────────────────────────────────────────────────────────────
  searchPlace: 'Where? City, area or venue',
  searchPlaceHint: 'Somewhere you are, or somewhere you are going',
  anySport: 'Any sport',
  anyLevel: 'Any level',
  anyDate: 'Any date',
  today: 'Today',
  thisWeek: 'This week',
  thisMonth: 'This month',
  filters: 'Filters',
  clearFilters: 'Clear',

  emptyTitle: 'Nothing here yet',
  emptyBody: 'No one has posted a game in this place and time. Be the first — someone else is probably looking too.',
  emptyAction: 'Post a game',
  emptySearchTitle: 'Nothing matched',
  emptySearchBody: 'Try a wider date range, or a nearby area.',

  // ── A card ─────────────────────────────────────────────────────────────────
  spotsLeft_one: '{{count}} spot left',
  spotsLeft_other: '{{count}} spots left',
  spotsOf: '{{taken}} of {{total}}',
  full: 'Full',
  cancelled: 'Cancelled',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'Host',
  hostedBy: 'Hosted by {{name}}',
  costEach: '{{cost}} each',

  levelAny: 'Any level',
  levelBeginner: 'Beginner',
  levelIntermediate: 'Intermediate',
  levelAdvanced: 'Advanced',
  levelCompetitive: 'Competitive',

  // ── Posting one ────────────────────────────────────────────────────────────
  createTitle: 'Post a game',
  createSubtitle: 'Say what you want to play, where and when. People ask to join, and you decide.',
  fieldSport: 'Sport',
  fieldTitle: 'What is it?',
  fieldTitlePlaceholder: 'Saturday five-a-side',
  fieldCountry: 'Country',
  fieldCity: 'City',
  fieldArea: 'Area',
  fieldAreaPlaceholder: 'Al Jadaf, Marina, Puerto Banús…',
  fieldVenue: 'Venue',
  fieldVenuePlaceholder: 'The pitch, court or club',
  fieldWhen: 'When',
  fieldEnds: 'Until',
  fieldSpots: 'How many players, including you?',
  fieldSpotsHint: 'Two for a hitting partner. Ten for five-a-side.',
  fieldLevel: 'Level',
  fieldNote: 'Anything else?',
  fieldNotePlaceholder: 'Bring boots. We usually go for a drink after.',
  fieldCost: 'Cost each',
  fieldCostPlaceholder: 'AED 25, or free',
  post: 'Post it',
  posted: 'Posted. People can find it now.',

  // ── Joining ────────────────────────────────────────────────────────────────
  askToJoin: 'Ask to join',
  askMessage: 'Say something to the host',
  askMessagePlaceholder: 'I play left back and I know the pitch.',
  requested: 'Asked — waiting on the host',
  joined: 'You are in',
  declined: 'Not this time',
  askSent: 'Sent. The host will let you know.',
  youAreHosting: 'You are hosting this',
  leave: 'Leave this game',
  leaveConfirmTitle: 'Leave this game?',
  leaveConfirmBody: 'Your spot goes back to the pool and the host is told.',
  left: 'You left. Your spot is free again.',

  // ── Hosting ────────────────────────────────────────────────────────────────
  requests: 'Requests',
  requests_one: '{{count}} request',
  requests_other: '{{count}} requests',
  noRequests: 'No one has asked yet.',
  accept: 'Accept',
  decline: 'Decline',
  accepted: '{{name}} is in.',
  declinedToast: 'Declined.',
  going: 'Going',
  cancel: 'Cancel this game',
  cancelConfirmTitle: 'Cancel this game?',
  cancelConfirmBody: 'Everyone who is going will be told. This cannot be undone.',
  cancelled_toast: 'Cancelled. Everyone going has been told.',

  // ── Mine ───────────────────────────────────────────────────────────────────
  mine: 'Mine',
  minePast: 'Past',
  mineEmptyTitle: 'Nothing coming up',
  mineEmptyBody: 'Games you post or join show up here.',

  // ── Accessibility ──────────────────────────────────────────────────────────
  a11yCard: '{{title}} in {{city}}, {{spots}}',
  a11yAccept: 'Accept {{name}}',
  a11yDecline: 'Decline {{name}}',
};
