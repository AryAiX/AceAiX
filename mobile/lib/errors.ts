import { PostgrestError } from '@supabase/supabase-js';

import { tr } from './i18n-bridge';

/**
 * Turn a database or network failure into something a 14-year-old can act on.
 *
 * The rule: never show a raw Postgres message. Either we recognise the error
 * and explain what to do, or we say plainly that something went wrong.
 *
 * Errors surface from services, hooks and catch blocks — places with no React
 * context — so translation goes through the shared bridge in `i18n-bridge.ts`
 * rather than a hook. Before a translator registers, and in tests, the English
 * text below is used.
 */

/** English fallbacks, used until a translator is registered. */
const EN: Record<string, string> = {
  'errors.generic': 'Something went wrong. Please try again.',
  'errors.offline': 'No connection. Check your internet and try again.',
  'errors.sessionExpired': 'Your session expired. Sign in again.',
  'errors.notSignedIn': 'You need to be signed in to do that.',
  'errors.guardianConsentRequired':
    'A parent or guardian needs to approve your profile before it can appear in search.',
  'errors.messagingNotPermitted':
    "You can't message this account. They may only accept messages from verified coaches and clubs.",
  'errors.rateLimited': 'You are doing that too quickly. Wait a moment and try again.',
  'errors.ageBelowMinimum': 'You need to be at least 13 years old to use AceAiX.',
  'errors.storyCardText': 'A story card needs some text, up to 140 characters.',
  'errors.storyMediaMissing': 'Upload the photo first, then share the story.',
  'errors.alreadyExists': 'That already exists.',
  'errors.missingReference': 'Something this depends on is missing. Try refreshing.',
  'errors.invalidDetails': 'Some of those details are not valid.',
  'errors.noPermission': "You don't have permission to do that.",
  'errors.notFound': 'We could not find that.',
  'errors.endorseSelf': 'You cannot endorse yourself.',
  'errors.endorseLimit': 'You have already endorsed six things about this player.',
  'errors.giConsentRequired': 'A parent or guardian needs to approve the Game Intelligence games first.',
  'errors.giAttemptLimit': 'You have had two tries at this game in the last two weeks. Your best one counts.',
  'errors.giSessionClosed': 'That session has ended. Start a new one to keep playing.',
  'errors.giAlreadyDone': 'You have already played this game in this session.',
  'errors.invalidCredentials': 'That email or password is not right.',
  'errors.emailNotConfirmed': 'Check your inbox and confirm your email address first.',
  'errors.emailInUse': 'An account already uses that email. Try signing in.',
  'errors.passwordTooShort': 'Choose a password with at least 8 characters.',
  'errors.tooManyAttempts': 'Too many attempts. Wait a few minutes and try again.',
  'errors.meetupMapUrlInvalid': 'Use a Google Maps, Apple Maps or Waze link.',
  'errors.meetupPlaceInvalid': 'Each place must be 2 to 80 characters.',
  'errors.meetupPlacesLimit': 'You can add up to 5 places.',
  'errors.clubAccountOnly': "Only a club or academy account can create a club page.",
  'errors.clubPageExists': "You already run a club page.",
  'errors.clubPermission': "You don't have permission to do that for this club.",
  'errors.clubNotFound': "We could not find that club.",
  'errors.clubType': "Choose club or academy.",
  'errors.clubNameRequired': "Give the club its name.",
  'errors.clubFoundedYear': "That founding year doesn't look right.",
  'errors.clubCeoRequired': "Add the name of the CEO or director.",
  'errors.clubSportsRequired': "Choose at least one sport.",
  'errors.clubCategoriesInvalid': "Too many categories, or one is longer than 30 characters.",
  'errors.clubFieldTooLong': "One of those fields is too long.",
  'errors.clubBadUrl': "That link doesn't look right.",
  'errors.clubBadEmail': "That email doesn't look right.",
  'errors.clubBadPhone': "That phone number doesn't look right.",
  'errors.clubTermsRequired': "Please accept the Terms and the Child Safety policy.",
  'errors.clubContactPersonRequired': "Tell us who is filling this in.",
  'errors.clubDocumentMissing': "Upload the document first.",
  'errors.clubInviteeNotFound': "No AceAiX account uses that email. Ask them to sign up first.",
  'errors.clubInviteeMinor': "Page team members must be 18 or over.",
  'errors.clubInviteeUnavailable': "That account can't be added.",
  'errors.clubOwnerStays': "The owner can't be removed.",
  'errors.clubRole': "Choose a valid role.",
  'errors.clubInviteMissing': "That invitation is no longer open.",
  'errors.clubBroadcastTitle': "The title needs 3 to 80 characters.",
  'errors.clubBroadcastBody': "The message needs 3 to 1,000 characters.",
  'errors.clubEventTitle': "Give the event a title of at least 4 characters.",
  'errors.clubEventStarts': "Pick a start time in the future.",
  'errors.clubEventEnds': "The event has to end after it starts.",
  'errors.clubEventAlready': "You're already registered.",
  'errors.clubEventFull': "This event is full.",
  'errors.clubEventPast': "This event has already started.",
  'errors.clubEventClosed': "Registration is closed.",
  'errors.clubEventCancelled': "This event was cancelled.",
  'errors.clubEventOwnClub': "You can't register for your own club's event.",
  'errors.clubMinorNeedsVerified': "You can only register with clubs AceAiX has verified.",
  'errors.clubSeasonLabel': "Season name: 2 to 20 characters, for example 2026\u201327.",
  'errors.clubSeasonRequired': "Pick a season first.",
  'errors.clubSquadFields': "Pick a sport and a category.",
  'errors.clubSquadExists': "That squad already exists this season.",
  'errors.clubMemberName': "Add the person's name.",
  'errors.clubMemberExists': "That person is already in this squad.",
  'errors.clubLinkUnavailable': "That profile can't be linked.",
  'errors.clubLinkMissing': "That request is no longer open.",
  'errors.clubStreamUrl': "Live streams must be links to YouTube, Instagram, Twitch, Facebook, TikTok, X, Kick or Vimeo.",
  'errors.clubMatchOpponent': "Who are you playing?",
  'errors.clubMatchSport': "Pick a sport.",
  'errors.clubMatchKickoff': "Pick the date and kick-off time.",
  'errors.clubAwardTitle': "Give the award a name.",
  'errors.clubAwardLink': "You can only link people who are on your squads.",
};

function say(key: string): string {
  return tr(key, EN[key] ?? EN['errors.generic']);
}

/** `raise … using hint = '…'` in SQL — the most specific signal we get. */
const HINTS: Record<string, string> = {
  guardian_consent_required: 'errors.guardianConsentRequired',
  story_card_text: 'errors.storyCardText',
  story_media_missing: 'errors.storyMediaMissing',
  messaging_not_permitted: 'errors.messagingNotPermitted',
  rate_limited: 'errors.rateLimited',
  age_below_minimum: 'errors.ageBelowMinimum',
  challenge_closed: 'errors.challengeClosed',
  not_allowed: 'errors.challengeNotAllowed',
  media_not_found: 'errors.clipRequired',
  age_out_of_range: 'errors.ageOutOfRange',
  favorite_teams_max: 'errors.favoriteTeamsMax',
  profile_incomplete: 'errors.profileIncomplete',
  not_an_athlete: 'errors.notAnAthlete',
  endorse_self: 'errors.endorseSelf',
  endorse_limit: 'errors.endorseLimit',
  gi_consent_required: 'errors.giConsentRequired',
  sponsor_only: 'errors.sponsorOnly',
  sponsor_not_verified: 'errors.sponsorNotVerified',
  athlete_only: 'errors.athleteOnly',
  sponsorship_request_limit: 'errors.sponsorshipRequestLimit',
  sponsorship_request_closed: 'errors.sponsorshipRequestClosed',
  sponsor_call_closed: 'errors.sponsorCallClosed',
  sponsor_call_adults_only: 'errors.sponsorCallAdultsOnly',
  sponsorship_already_sent: 'errors.sponsorshipAlreadySent',
  sponsorship_already_answered: 'errors.sponsorshipAlreadyAnswered',
  sponsor_call_limit: 'errors.sponsorCallLimit',
  coach_only: 'errors.coachOnly',
  coach_not_accepting: 'errors.coachNotAccepting',
  coach_unavailable: 'errors.coachUnavailable',
  minor_needs_verified_coach: 'errors.minorNeedsVerifiedCoach',
  coaching_slot_gone: 'errors.coachingSlotGone',
  coaching_slot_full: 'errors.coachingSlotFull',
  coaching_already_booked: 'errors.coachingAlreadyBooked',
  coaching_location_required: 'errors.coachingLocationRequired',
  coaching_service_limit: 'errors.coachingServiceLimit',
  own_calendar: 'errors.coachingOwnCalendar',
  gi_attempt_limit: 'errors.giAttemptLimit',
  gi_session_closed: 'errors.giSessionClosed',
  gi_already_done: 'errors.giAlreadyDone',
  meetup_map_url_invalid: 'errors.meetupMapUrlInvalid',
  meetup_place_invalid: 'errors.meetupPlaceInvalid',
  meetup_places_limit: 'errors.meetupPlacesLimit',
  /* Club and academy pages (1014/01). */
  club_account_only: 'errors.clubAccountOnly',
  club_page_exists: 'errors.clubPageExists',
  club_permission: 'errors.clubPermission',
  club_not_found: 'errors.clubNotFound',
  club_type: 'errors.clubType',
  club_name_required: 'errors.clubNameRequired',
  club_founded_year: 'errors.clubFoundedYear',
  club_ceo_required: 'errors.clubCeoRequired',
  club_sports_required: 'errors.clubSportsRequired',
  club_sports_limit: 'errors.clubSportsRequired',
  club_categories_invalid: 'errors.clubCategoriesInvalid',
  club_field_too_long: 'errors.clubFieldTooLong',
  club_bad_url: 'errors.clubBadUrl',
  club_bad_email: 'errors.clubBadEmail',
  club_bad_phone: 'errors.clubBadPhone',
  club_terms_required: 'errors.clubTermsRequired',
  club_contact_person_required: 'errors.clubContactPersonRequired',
  club_document_missing: 'errors.clubDocumentMissing',
  club_invitee_not_found: 'errors.clubInviteeNotFound',
  club_invitee_minor: 'errors.clubInviteeMinor',
  club_invitee_unavailable: 'errors.clubInviteeUnavailable',
  club_owner_stays: 'errors.clubOwnerStays',
  club_role: 'errors.clubRole',
  club_invite_missing: 'errors.clubInviteMissing',
  club_broadcast_title: 'errors.clubBroadcastTitle',
  club_broadcast_body: 'errors.clubBroadcastBody',
  club_event_title: 'errors.clubEventTitle',
  club_event_starts: 'errors.clubEventStarts',
  club_event_ends: 'errors.clubEventEnds',
  club_event_already: 'errors.clubEventAlready',
  full: 'errors.clubEventFull',
  past: 'errors.clubEventPast',
  closed: 'errors.clubEventClosed',
  cancelled: 'errors.clubEventCancelled',
  own_club: 'errors.clubEventOwnClub',
  minor_needs_verified_club: 'errors.clubMinorNeedsVerified',
  club_season_label: 'errors.clubSeasonLabel',
  club_season_required: 'errors.clubSeasonRequired',
  club_squad_fields: 'errors.clubSquadFields',
  club_squad_exists: 'errors.clubSquadExists',
  club_member_name: 'errors.clubMemberName',
  club_member_exists: 'errors.clubMemberExists',
  club_link_unavailable: 'errors.clubLinkUnavailable',
  club_link_missing: 'errors.clubLinkMissing',
  club_stream_url: 'errors.clubStreamUrl',
  club_match_opponent: 'errors.clubMatchOpponent',
  club_match_sport: 'errors.clubMatchSport',
  club_match_kickoff: 'errors.clubMatchKickoff',
  club_award_title: 'errors.clubAwardTitle',
  club_award_link: 'errors.clubAwardLink',
};

const CODES: Record<string, string> = {
  '23505': 'errors.alreadyExists',
  '23503': 'errors.missingReference',
  '23514': 'errors.invalidDetails',
  '42501': 'errors.noPermission',
  '54000': 'errors.rateLimited',
  P0002: 'errors.notFound',
  PGRST301: 'errors.sessionExpired',
};

const AUTH_MESSAGES: Record<string, string> = {
  'invalid login credentials': 'errors.invalidCredentials',
  'email not confirmed': 'errors.emailNotConfirmed',
  'user already registered': 'errors.emailInUse',
  'password should be at least 6 characters': 'errors.passwordTooShort',
  'email rate limit exceeded': 'errors.tooManyAttempts',
};

export interface FriendlyError {
  message: string;
  /** Machine-readable hint, when the database gave us one. */
  hint?: string;
  raw?: unknown;
}

export function toFriendlyError(error: unknown): FriendlyError {
  if (!error) return { message: say('errors.generic') };

  if (typeof error === 'string') return { message: error };

  const e = error as Partial<PostgrestError> & {
    message?: string;
    status?: number;
    name?: string;
  };

  if (e.hint && HINTS[e.hint]) {
    return { message: say(HINTS[e.hint]), hint: e.hint, raw: error };
  }

  if (e.code && CODES[e.code]) {
    return { message: say(CODES[e.code]), hint: e.hint ?? undefined, raw: error };
  }

  const authMessage = e.message ? AUTH_MESSAGES[e.message.toLowerCase()] : undefined;
  if (authMessage) {
    return { message: say(authMessage), raw: error };
  }

  if (
    e.name === 'AuthRetryableFetchError' ||
    e.message?.includes('Network request failed') ||
    /internet connection appears to be offline|fetch failed|network connection was lost|request timed out/i.test(
      e.message ?? '',
    )
  ) {
    return { message: say('errors.offline'), raw: error };
  }

  if (e.status === 401 || e.status === 403) {
    return { message: say('errors.sessionExpired'), raw: error };
  }

  /* Custom RAISE messages we wrote ourselves are already human-readable and
     short. They are only ever written in English, which is a known gap: a
     message the database composes at runtime cannot be translated at the key
     level. Anything long or full of SQL noise gets the generic fallback. */
  if (e.message && e.message.length < 140 && !/[_"]|relation |column /.test(e.message)) {
    return { message: e.message, hint: e.hint ?? undefined, raw: error };
  }

  return { message: say('errors.generic'), raw: error };
}

export function errorMessage(error: unknown): string {
  return toFriendlyError(error).message;
}

/** Throws a FriendlyError-shaped Error, preserving the hint. */
export class AppError extends Error {
  hint?: string;
  raw?: unknown;

  constructor(error: unknown) {
    const friendly = toFriendlyError(error);
    super(friendly.message);
    this.name = 'AppError';
    this.hint = friendly.hint;
    this.raw = friendly.raw;
  }
}
