/**
 * The teams somebody supports.
 *
 * One distinction has to survive translation: this is fandom, never
 * employment. "Your teams" means the shirts they own; where an athlete plays
 * is "current club" in `onboarding` and `profile`, and a translator who
 * collapses the two turns a scout's fact into a preference.
 */
export const teams = {
  // ── The sign-up step ───────────────────────────────────────────────────────
  stepTitle: 'Who do you support?',
  stepBody: 'Pick up to five. It has nothing to do with where you play — this is just the shirt you own.',
  stepSkip: 'Skip for now',

  venueTitle: 'Favourite ground',
  venueBody: 'A stadium you would go to tomorrow if someone handed you a ticket.',
  venuePlaceholder: 'Santiago Bernabéu, Azadi, Old Trafford…',

  // ── Picker ─────────────────────────────────────────────────────────────────
  searchPlaceholder: 'Search clubs and national teams',
  popular: 'Popular right now',
  selected_one: '{{count}} selected',
  selected_other: '{{count}} selected',
  maxReached: 'Five is the limit — remove one to add another.',
  noResults: 'Nothing matching “{{query}}”.',
  addCustom: 'Add “{{name}}”',
  addCustomHint: 'Only you will see it until we have checked it over.',
  addedCustom: 'Added. It is on your profile now.',
  followersCount_one: '{{count}} supporter here',
  followersCount_other: '{{count}} supporters here',

  // ── On a profile ───────────────────────────────────────────────────────────
  supportsTitle: 'Supports',
  venueLabel: 'Favourite ground',
  emptySelf: 'Add the teams you support — it is the fastest way to find people like you.',
  emptyOther: 'No teams yet.',
  editAction: 'Edit teams',
  savedToast: 'Teams updated.',

  // ── The team page ──────────────────────────────────────────────────────────
  fansTitle: 'Supporters on AceAiX',
  fansEmpty: 'Nobody here supports them yet. You would be first.',
  fansLoadMore: 'Show more',
  alsoSupports: 'Also supports {{team}}',
  sharedTeams_one: 'You both support {{teams}}',
  sharedTeams_other: 'You both support {{teams}}',
};
