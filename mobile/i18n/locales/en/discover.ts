/**
 * Discovery and search.
 *
 * Grouped in screen order: the Discover tab (recruiter face first, then the
 * athlete's Explore), the pieces shared by both — match reasons, cards, rows —
 * and finally the search screen.
 *
 * Two things worth knowing before translating:
 *
 *  - `reason.*` mirrors the strings `private.match_reasons` emits in SQL. The
 *    English text is the database's; these keys are only how it is read out.
 *  - `board.*` is read by teenagers looking at where they stand. Nothing here
 *    tells anyone they are behind, and no translation should either — the
 *    leaderboard names positions people already hold and points forward.
 */
export const discover = {
  // ── Discover tab ───────────────────────────────────────────────────────────
  title: 'Discover talent',
  athleteSubtitle: 'Clubs, coaches and where you stand',
  searchPeople: 'Search people and clubs',
  queryPlaceholder: 'Name, club, position',
  queryLabel: 'Search athletes',
  filterResults: 'Filter results',
  filterResultsActive: 'Filter results, filters active',

  // Shared tab and scope names — the Explore tabs and the search scopes.
  tabAthletes: 'Athletes',
  tabCoaches: 'Coaches',
  tabClubs: 'Clubs',
  tabLeaderboard: 'Leaderboard',

  // ── Matched for you ────────────────────────────────────────────────────────
  matchedForYou: 'Matched for you',
  editBrief: 'Edit brief',
  noneFitBrief: 'Nobody fits your brief yet. Widen it and we’ll keep looking.',
  briefTitle: 'Tell us who you’re looking for',
  briefBody:
    'Set your sport, positions and age range once. Every athlete then shows how well they fit — and the reasons behind the number.',
  briefAction: 'Set my brief',
  briefSaved: 'Saved. We will match against this from now on.',

  // ── Result list ────────────────────────────────────────────────────────────
  searching: 'Searching…',
  sortedByA11y: 'Sorted by {{sort}}. Change sorting',
  rankedByFit: 'Ranked by fit. Every card shows the reasons behind its match.',
  rankedByScore: 'Ranked by talent score. Add a filter to see how well each athlete fits you.',
  savedToShortlist: 'Saved to your shortlist',
  emptyTitle: 'No athletes match that',
  emptyFilteredBody: 'Try widening the age range, adding a country, or clearing the search.',
  emptyOpenBody: 'Athletes appear here as they complete their profiles.',
  clearFilters: 'Clear filters',

  // ── Sort sheet ─────────────────────────────────────────────────────────────
  sortTitle: 'Sort results',
  sort: {
    match: 'Best match',
    matchHint: 'How well each athlete fits your filters',
    score: 'Highest score',
    scoreHint: 'Talent score, high to low',
    recent: 'Recently active',
    recentHint: 'Profiles updated most recently',
    name: 'Name',
    nameHint: 'A to Z',
  },

  // ── Filter sheet ───────────────────────────────────────────────────────────
  filters: {
    title: 'Filter results',
    subtitle: 'Each filter you set becomes a reason behind the match percentage.',
    preferencesTitle: 'Who are you looking for?',
    preferencesSubtitle:
      'We use this to pick the athletes in Matched for you — and to explain every match.',

    sport: 'Sport',
    position: 'Position',
    positionHint: 'Pick a sport first.',
    level: 'Level',
    country: 'Country',
    findCountry: 'Find a country',
    moreCountries_one: '{{count}} more — type to narrow the list.',
    moreCountries_other: '{{count}} more — type to narrow the list.',
    noCountryMatch: 'No country matches that.',

    age: 'Age',
    anyAge: 'Any age',
    youngest: 'Youngest',
    oldest: 'Oldest',
    any: 'Any',

    minScore: 'Minimum talent score',
    anyScore: 'Any score',
    tierAndAbove: '{{tier}} and above',
    scoreFloor: 'Only athletes scoring {{score}} or more.',

    openOnly: 'Open to offers only',
    openOnlyA11y: 'Only show athletes open to offers',

    // Stepper controls. `name` is one of the three below, so a screen reader
    // says "Increase youngest age".
    decrease: 'Decrease {{name}}',
    increase: 'Increase {{name}}',
    youngestAgeName: 'youngest age',
    oldestAgeName: 'oldest age',
    minScoreName: 'minimum talent score',

    // The apply button promises a real number, counted before you tap it.
    showResults: 'Show results',
    noMatchesYet: 'No matches yet',
    showCount_one: 'Show {{count}} result',
    showCount_other: 'Show {{count}} results',
  },

  // ── Match badge and the reasons behind it ──────────────────────────────────
  matchPercentA11y: '{{percent}} percent match',
  /** Mirrors `private.match_reasons`. See components/discover/MatchBadge.tsx. */
  reason: {
    sport: 'Plays your sport',
    position: 'Matches the position you need',
    age: 'Inside your age range',
    level: 'Competing at the level you scout',
    country: 'Based in your region',
    topTier: 'Top-tier talent score',
    strongScore: 'Strong talent score',
  },

  // ── Athlete card ───────────────────────────────────────────────────────────
  card: {
    openProfile: 'Opens the profile',
    scorePillA11y: 'Talent score {{score}} out of 100, {{tier}} tier',
    talentScoreA11y: 'talent score {{score}}',
    openToOffers: 'Open to offers',
    save: 'Save {{name}} to your shortlist',
    unsave: 'Remove {{name}} from your shortlist',
  },

  // ── Explore: the athlete's side of Discover ────────────────────────────────
  explore: {
    searchClubsPlaceholder: 'Search clubs and academies',
    searchClubsA11y: 'Search clubs',
    searchCoachesPlaceholder: 'Search coaches',
    searchCoachesA11y: 'Search coaches',
    anywhere: 'Anywhere',
    countryTitle: 'Country',
    countrySubtitle: 'Narrow the board to one country.',

    noClubsFound: 'No clubs found',
    noClubsFoundBody: 'Try a shorter name, or search for the city instead.',
    noClubsYet: 'No clubs yet',
    noClubsYetBody: 'Clubs appear here as they join AceAiX.',

    noCoachesFound: 'No coaches found',
    noCoachesFoundBody: 'Try part of the name, or clear the search to browse everyone.',
    noCoachesYet: 'No coaches yet',
    noCoachesYetBody: 'Coaches appear here as they join AceAiX.',
  },

  // ── Leaderboard ────────────────────────────────────────────────────────────
  // Encouraging in every language. A rank is a place someone holds, never a
  // shortfall, and the footer is addressed to everyone still climbing.
  board: {
    caption: 'Top talent scores in {{scope}}. Scores move as profiles grow.',
    everySport: 'every sport',
    scopeInCountry: '{{sport}}, {{country}}',
    keepBuilding: 'Every highlight, stat and verification you add moves your score. Keep building.',
    emptyTitle: 'Nothing on this board yet',
    emptyBody: 'Try another sport or country — or be the first one here.',
    you: 'You',
    rankA11y: 'Number {{rank}}',
    youA11y: '{{name}}, this is you',
    scoreA11y: 'talent score {{score}}, {{tier}} tier',
  },

  // ── Club and coach rows ────────────────────────────────────────────────────
  club: {
    /* `club` and `federation` come from common; an academy is only ever an
       organization type, so it lives here. */
    typeAcademy: 'Academy',
    openClub: 'Opens the club page',
  },
  followers_one: '{{value}} follower',
  followers_other: '{{value}} followers',
  followA11y: 'Follow {{name}}',
  unfollowA11y: 'Unfollow {{name}}',

  // ── Search screen ──────────────────────────────────────────────────────────
  search: {
    back: 'Go back',
    fieldPlaceholder: 'Athletes, coaches, clubs',
    fieldA11y: 'Search AceAiX',
    recent: 'Recent',
    clearRecentsA11y: 'Clear recent searches',
    trySport: 'Try a sport',
    emptyTitle: 'Nothing for “{{term}}”',
    emptyBody:
      'Try fewer words, or a club, city or position instead. You can also switch tab above.',
    clearSearch: 'Clear search',
  },
};

