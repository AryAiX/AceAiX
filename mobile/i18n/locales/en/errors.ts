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
  storyCardText: 'A story card needs some text, up to 140 characters.',
  storyMediaMissing: 'Upload the photo first, then share the story.',
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

  endorseSelf: 'You cannot endorse yourself.',
  endorseLimit: 'You have already endorsed six things about this player.',

  giConsentRequired: 'A parent or guardian needs to approve the Game Intelligence games first.',
  giAttemptLimit: 'You have had two tries at this game in the last two weeks. Your best one counts.',
  giSessionClosed: 'That session has ended. Start a new one to keep playing.',
  giAlreadyDone: 'You have already played this game in this session.',
  sponsorOnly: 'Only a sponsor account can do that.',
  sponsorNotVerified: 'Your sponsor account has not been verified yet.',
  athleteOnly: 'Only an athlete can do that.',
  sponsorshipRequestLimit: 'You can have three open requests at a time.',
  sponsorshipRequestClosed: 'That request is no longer open.',
  sponsorCallClosed: 'That call is closed.',
  sponsorCallAdultsOnly: 'That call is for adults only.',
  sponsorshipAlreadySent: 'You already have one waiting.',
  sponsorshipAlreadyAnswered: 'That has already been answered.',
  sponsorCallLimit: 'You can have ten open calls at a time.',
  coachOnly: 'Only a coach can do that.',
  coachNotAccepting: 'This coach is not taking students right now.',
  coachUnavailable: 'This coach cannot be booked.',
  minorNeedsVerifiedCoach: 'You can only book coaches AceAiX has verified.',
  coachingSlotGone: 'That time is no longer available.',
  coachingSlotFull: 'That time is full.',
  coachingAlreadyBooked: 'You have already booked that time.',
  coachingLocationRequired: 'Say where it should take place.',
  coachingServiceLimit: 'You can offer twelve services at a time.',
  coachingOwnCalendar: 'You cannot book your own calendar.',
};
