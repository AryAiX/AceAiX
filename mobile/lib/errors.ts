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
  'errors.alreadyExists': 'That already exists.',
  'errors.missingReference': 'Something this depends on is missing. Try refreshing.',
  'errors.invalidDetails': 'Some of those details are not valid.',
  'errors.noPermission': "You don't have permission to do that.",
  'errors.notFound': 'We could not find that.',
  'errors.invalidCredentials': 'That email or password is not right.',
  'errors.emailNotConfirmed': 'Check your inbox and confirm your email address first.',
  'errors.emailInUse': 'An account already uses that email. Try signing in.',
  'errors.passwordTooShort': 'Choose a password with at least 8 characters.',
  'errors.tooManyAttempts': 'Too many attempts. Wait a few minutes and try again.',
};

function say(key: string): string {
  return tr(key, EN[key] ?? EN['errors.generic']);
}

/** `raise … using hint = '…'` in SQL — the most specific signal we get. */
const HINTS: Record<string, string> = {
  guardian_consent_required: 'errors.guardianConsentRequired',
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
  'Invalid login credentials': 'errors.invalidCredentials',
  'Email not confirmed': 'errors.emailNotConfirmed',
  'User already registered': 'errors.emailInUse',
  'Password should be at least 6 characters': 'errors.passwordTooShort',
  'Email rate limit exceeded': 'errors.tooManyAttempts',
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

  if (e.message && AUTH_MESSAGES[e.message]) {
    return { message: say(AUTH_MESSAGES[e.message]), raw: error };
  }

  if (e.name === 'AuthRetryableFetchError' || e.message?.includes('Network request failed')) {
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
