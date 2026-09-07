/**
 * The things that can go wrong, said plainly.
 *
 * `lib/errors.ts` maps database codes and Supabase auth strings onto these
 * keys, so an error surfaces in the reader's language wherever it is caught.
 */
export const errors = {
  generic: 'Something went wrong. Please try again.',
  offline: 'No connection. Check your internet and try again.',
  sessionExpired: 'Your session expired. Sign in again.',
  notSignedIn: 'You need to be signed in to do that.',

  // Database hints
  guardianConsentRequired:
    'A parent or guardian needs to approve your profile before it can appear in search.',
  messagingNotPermitted:
    "You can't message this account. They may only accept messages from verified coaches and clubs.",
  rateLimited: 'You are doing that too quickly. Wait a moment and try again.',
  ageBelowMinimum: 'You need to be at least 13 years old to use AceAiX.',

  // Database codes
  alreadyExists: 'That already exists.',
  missingReference: 'Something this depends on is missing. Try refreshing.',
  invalidDetails: 'Some of those details are not valid.',
  noPermission: "You don't have permission to do that.",
  notFound: 'We could not find that.',

  // Auth
  invalidCredentials: 'That email or password is not right.',
  emailNotConfirmed: 'Check your inbox and confirm your email address first.',
  emailInUse: 'An account already uses that email. Try signing in.',
  passwordTooShort: 'Choose a password with at least 8 characters.',
  tooManyAttempts: 'Too many attempts. Wait a few minutes and try again.',

  // Challenges and fandom
  challengeClosed: 'That challenge has closed.',
  challengeNotAllowed: 'Only verified coaches and clubs can set a challenge.',
  clipRequired: 'Pick one of your own public clips first.',
  ageOutOfRange: 'This challenge is for a different age group.',
  favoriteTeamsMax: 'Five teams is the limit — remove one to add another.',
  profileIncomplete: 'Finish your athlete profile first.',
  notAnAthlete: 'Only athletes have a Talent Score.',
};
