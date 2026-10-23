/**
 * Store-update prompt and the "what's new" sheet.
 *
 * Release notes are keyed by the installed version: dots become underscores
 * and a v is added, so 2.0.6 is `v2_0_6`. A version with no block here shows
 * nothing. The 2.0.6 lines are draft copy — edit them before that release.
 */
export const whatsNew = {
  updateTitle: 'A new version is ready',
  updateRequiredTitle: 'Update required',
  updateBody: 'Update to get the latest features and fixes.',
  updateRequiredBody: 'This version is no longer supported. Update to keep using AceAiX.',
  update: 'Update now',
  later: 'Later',
  version: 'Version {{version}}',
  title: 'What’s new in {{version}}',
  gotIt: 'Got it',
  v2_0_6: {
    countries: 'Every country is now available, in your language.',
    city: 'Pick your city from suggestions, so nearby games can find you.',
    sports: 'Coaches and scouts can follow several sports in their brief.',
    live: 'See likes, follows and messages the moment they arrive.',
    maps: 'Clubs can paste any Google Maps link for their location.',
  },
};
