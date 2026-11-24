/**
 * Store-update prompt and the "what's new" sheet.
 *
 * Release notes are keyed by the installed version: dots become underscores
 * and a v is added, so 2.0.6 is `v2_0_6`. A version with no block here shows
 * nothing.
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
    sportFit: 'New: Sport Fit. Answer 22 quick statements and see which sports suit how you think.',
    countries: 'Every country is now available, in your language.',
    city: 'Pick your city from suggestions, so nearby games can find you.',
    sports: 'Coaches and scouts can follow several sports in their brief.',
    live: 'See likes, follows and messages the moment they arrive.',
    maps: 'Clubs can paste any Google Maps link for their location.',
  },
  v2_1_0: {
    look: 'A fresh new look across the app.',
    persian: 'AceAiX now speaks Persian (فارسی).',
    tags: 'Tag people in your posts. Posts you’re tagged in show on your profile.',
    likes: 'Tap the like count to see who liked a post.',
    suggestions: 'Hashtag and @mention suggestions as you type. Tap a hashtag to see its posts.',
    sports: 'More sports, and you can ask us to add yours.',
    leaderboard: 'Scroll the whole leaderboard, with global ranks.',
  },
  v2_1_1: {
    likeTap: 'Tapping the heart now always likes the post. Tap the number to see who liked it.',
    parentName: 'Parents are now asked for their own name at sign-up.',
  },
};
