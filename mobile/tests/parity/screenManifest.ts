/**
 * The web-parity acceptance manifest.
 *
 * A screen is not "web complete" merely because Metro can render it. Every
 * entry must pass its listed states and actions in a browser against the same
 * backend contract as native. The inventory test fails when a route file is
 * added, removed, duplicated, or left out of this manifest.
 */

export type ParityCoverage = 'unverified' | 'render-only' | 'verified';

export interface ScreenParity {
  source: string;
  browserPath: string;
  access: string[];
  states: string[];
  actions: string[];
  coverage: ParityCoverage;
}

const screen = (
  source: string,
  browserPath: string,
  access: string[],
  states: string[],
  actions: string[],
  coverage: ParityCoverage = 'unverified',
): ScreenParity => ({ source, browserPath, access, states, actions, coverage });

export const SCREEN_PARITY: ScreenParity[] = [
  screen('index.tsx', '/', ['launch'], ['routing'], ['automatic redirect']),
  screen('+not-found.tsx', '/not-a-real-route', ['public'], ['ready'], ['return home']),
  screen('(auth)/welcome.tsx', '/welcome', ['signed-out'], ['ready'], ['sign up', 'sign in', 'open legal']),
  screen('(auth)/sign-in.tsx', '/sign-in', ['signed-out'], ['ready', 'validation', 'invalid credentials', 'unconfirmed email'], ['submit', 'forgot password', 'sign up']),
  screen('(auth)/sign-up.tsx', '/sign-up', ['signed-out'], ['ready', 'validation', 'under-13 blocked', 'confirmation required', 'API error'], ['complete four steps', 'open legal']),
  screen('(auth)/forgot-password.tsx', '/forgot-password', ['signed-out'], ['ready', 'validation', 'sending', 'success', 'API error'], ['request reset', 'return to sign in']),
  screen('(auth)/reset-password.tsx', '/reset-password', ['recovery'], ['token formats', 'weak password', 'mismatch', 'expired token', 'saving', 'success'], ['change password']),
  screen('(auth)/check-email.tsx', '/check-email', ['signed-out', 'unconfirmed'], ['email present', 'email missing', 'cooldown', 'sending', 'API error'], ['resend', 'return to sign in']),
  screen('(onboarding)/index.tsx', '/', ['incomplete athlete', 'incomplete recruiter', 'incomplete guardian', 'incomplete fallback'], ['loading', 'resume', 'validation', 'save error', 'upload error', 'guardian pending', 'guardian granted', 'score error'], ['complete every role path', 'skip optional step', 'request consent', 'upload avatar', 'sign out']),

  screen('(tabs)/index.tsx', '/', ['completed account'], ['loading', 'error', 'for-you empty', 'following empty', 'refresh', 'pagination'], ['change feed', 'open post', 'comment', 'moderate', 'refresh', 'load more']),
  screen('(tabs)/discover.tsx', '/discover', ['athlete', 'guardian', 'recruiter'], ['loading', 'error', 'empty', 'filtered empty', 'brief empty', 'pagination'], ['search', 'filter', 'sort', 'shortlist', 'open result']),
  screen('(tabs)/meetups.tsx', '/meetups', ['adult', 'minor'], ['loading', 'error', 'empty', 'filtered empty', 'joined empty', 'adults only'], ['change tab', 'filter', 'create', 'open meetup']),
  screen('(tabs)/opportunities.tsx', '/opportunities', ['athlete', 'guardian', 'recruiter'], ['loading', 'error', 'empty per tab', 'filtered empty', 'application statuses'], ['change tab', 'filter', 'save', 'open', 'create', 'review applicants', 'open challenges']),
  screen('(tabs)/profile.tsx', '/profile', ['completed account', 'athlete'], ['loading', 'error', 'posts empty', 'highlights empty', 'career empty'], ['refresh', 'edit', 'open score', 'open player card', 'change tab', 'share']),
  screen('(tabs)/create.tsx', '/create', ['completed account'], ['redirect'], ['forward to composer']),

  screen('compose.tsx', '/compose', ['completed account'], ['empty', 'posting', 'upload progress', 'upload error', 'API error', 'discard confirmation'], ['set caption', 'set audience', 'add and remove media', 'publish', 'discard']),
  screen('notifications.tsx', '/notifications', ['completed account'], ['loading', 'error', 'empty', 'new and earlier', 'realtime arrival'], ['open notification', 'mark all read', 'refresh']),
  screen('inbox.tsx', '/inbox', ['completed account'], ['loading', 'error', 'empty', 'realtime update'], ['open conversation', 'mute', 'open profile', 'block', 'refresh']),
  screen('chat/[id].tsx', '/chat/:conversationId', ['conversation participant'], ['invalid ID', 'loading', 'error', 'empty', 'failed send', 'permission blocked', 'minor safety', 'blocked', 'closed'], ['send', 'retry', 'open profile', 'moderate']),
  screen('search.tsx', '/search', ['completed account'], ['recent', 'suggestions', 'loading', 'error', 'no results'], ['change scope', 'type query', 'open result', 'clear recent']),
  screen('post/[id].tsx', '/post/:postId', ['visible-post viewer'], ['invalid ID', 'loading', 'unavailable', 'comments loading', 'comments error', 'comments empty', 'sending'], ['comment', 'reply', 'share', 'report', 'delete', 'block', 'play media']),
  screen('saved.tsx', '/saved', ['completed account'], ['loading', 'error', 'empty', 'loading more'], ['refresh', 'open post', 'comment', 'share', 'unsave', 'report', 'delete', 'block']),
  screen('u/[id].tsx', '/u/:userId', ['completed account'], ['invalid ID', 'loading', 'error', 'blocked by self', 'blocked by other', 'suspended'], ['follow', 'message', 'share', 'unblock', 'change profile tab']),
  screen('u/[id]/followers.tsx', '/u/:userId/followers', ['completed account'], ['loading', 'error', 'self empty', 'other empty'], ['open profile', 'follow', 'unfollow']),
  screen('u/[id]/following.tsx', '/u/:userId/following', ['completed account'], ['loading', 'error', 'self empty', 'other empty'], ['open profile', 'follow', 'unfollow']),
  screen('org/[id].tsx', '/org/:organizationId', ['completed account'], ['invalid ID', 'loading', 'error', 'gone', 'unverified', 'openings loading', 'openings error', 'openings empty'], ['follow', 'change tab', 'save opening', 'open opening']),
  screen('team/[id].tsx', '/team/:teamId', ['completed account'], ['loading', 'error', 'fans empty'], ['open fan profile']),

  screen('opportunity/[id].tsx', '/opportunity/:opportunityId', ['athlete', 'guardian', 'owner'], ['invalid ID', 'loading', 'error', 'gone', 'closed', 'applied', 'withdrawn', 'minor notice'], ['apply', 'reapply', 'withdraw', 'save', 'share', 'report', 'open applicants', 'open organization']),
  screen('opportunity/[id]/applicants.tsx', '/opportunity/:opportunityId/applicants', ['owner', 'authorized reviewer', 'unauthorized'], ['invalid ID', 'loading', 'error', 'locked', 'empty', 'filtered empty'], ['filter', 'open profile', 'message', 'perform every legal status transition']),
  screen('opportunity/new.tsx', '/opportunity/new', ['recruiter', 'non-recruiter'], ['loading', 'restricted', 'validation', 'submitting', 'API error'], ['complete form', 'preview', 'open safety guidance', 'publish']),
  screen('challenges.tsx', '/challenges', ['athlete', 'guardian', 'recruiter'], ['loading', 'error', 'open empty', 'entered empty', 'mine empty'], ['change tab', 'open challenge', 'create']),
  screen('challenge/[id].tsx', '/challenge/:challengeId', ['athlete', 'setter'], ['loading', 'error', 'not found', 'open', 'closed', 'leaderboard empty', 'clips empty', 'action error'], ['enter', 'withdraw', 'judge', 'verify', 'reject', 'open entrant']),
  screen('challenge/new.tsx', '/challenge/new', ['verified recruiter', 'unverified recruiter', 'unauthorized'], ['ready', 'validation', 'creating', 'API error'], ['configure metric', 'set ages and close window', 'publish']),
  screen('meetup/[id].tsx', '/meetup/:meetupId', ['adult', 'minor', 'host'], ['adults only', 'loading', 'error', 'full', 'cancelled', 'stranger', 'requested', 'declined', 'joined', 'host', 'requests empty'], ['request join', 'leave', 'accept', 'decline', 'cancel', 'open host']),
  screen('meetup/new.tsx', '/meetup/new', ['adult', 'minor'], ['adults only', 'incomplete', 'saving', 'API error'], ['complete form', 'publish']),

  screen('edit-profile.tsx', '/edit-profile', ['completed account', 'athlete'], ['loading', 'error', 'clean', 'dirty', 'upload error', 'save error', 'country search empty'], ['edit every field', 'upload avatar and cover', 'save']),
  screen('score.tsx', '/score', ['athlete', 'non-athlete'], ['loading', 'error', 'not ready', 'history loading', 'insufficient history'], ['refresh', 'simulate', 'open tip action', 'open methodology']),
  screen('achievements.tsx', '/achievements', ['completed account'], ['loading', 'earned', 'locked', 'retry'], ['refresh']),
  screen('player-card.tsx', '/player-card', ['athlete', 'non-athlete'], ['loading', 'error', 'exporting', 'export error'], ['export', 'share']),
  screen('views.tsx', '/views', ['athlete', 'non-athlete'], ['loading', 'error', 'zero views', 'seven day', 'thirty day'], ['change range', 'open viewer', 'open explanation']),

  screen('settings/index.tsx', '/settings', ['completed account', 'minor', 'guardian', 'recruiter'], ['ready', 'sign-out confirmation', 'signing out'], ['open every visible setting', 'open legal', 'contact support', 'sign out']),
  screen('settings/account.tsx', '/settings/account', ['completed account'], ['loading', 'verification states', 'password validation', 'API error', 'exporting', 'export error'], ['change password', 'request verification', 'export data', 'open deletion']),
  screen('settings/privacy.tsx', '/settings/privacy', ['adult', 'minor'], ['loading', 'consent loading', 'discovery locked', 'save rollback'], ['change messaging audience', 'change discoverability', 'open guardian and policy']),
  screen('settings/notifications.tsx', '/settings/notifications', ['completed account'], ['loading', 'error', 'saved', 'permission granted', 'permission denied', 'permission blocked', 'requesting'], ['toggle every preference', 'request permission', 'open browser settings']),
  screen('settings/blocked.tsx', '/settings/blocked', ['completed account'], ['loading', 'error', 'empty', 'working'], ['open profile', 'confirm unblock']),
  screen('settings/guardian.tsx', '/settings/guardian', ['minor', 'guardian', 'other adult'], ['loading', 'error', 'pending', 'granted', 'revoked', 'no links', 'no conversations'], ['request', 'resend', 'revoke', 'open minor', 'request age review']),
  screen('settings/scouting.tsx', '/settings/scouting', ['recruiter', 'non-recruiter'], ['loading', 'error', 'restricted', 'clean', 'dirty', 'saving'], ['edit every preference', 'save']),
  screen('settings/appearance.tsx', '/settings/appearance', ['completed account'], ['system', 'light', 'dark'], ['change scheme']),
  screen('settings/language.tsx', '/settings/language', ['completed account'], ['LTR', 'RTL', 'restart prompt'], ['change all seven languages', 'restart']),
  screen('settings/delete-account.tsx', '/settings/delete-account', ['completed account'], ['ready', 'discovery already off', 'exporting', 'hiding', 'deleting', 'API error'], ['hide profile', 'export data', 'enter localized confirmation', 'delete permanently']),

  screen('legal/terms.tsx', '/legal/terms', ['public'], ['ready'], ['navigate back']),
  screen('legal/privacy.tsx', '/legal/privacy', ['public'], ['ready'], ['navigate back']),
  screen('legal/guidelines.tsx', '/legal/guidelines', ['public'], ['ready'], ['navigate back']),
  screen('legal/child-safety.tsx', '/legal/child-safety', ['public'], ['ready'], ['navigate back']),
  screen('age-review.tsx', '/age-review', ['underage-remediation suspension'], ['idle', 'requesting', 'requested', 'request error'], ['request appeal', 'email safety', 'sign out']),
];

export const REQUIRED_PARITY_VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

export const REQUIRED_PARITY_SCHEMES = ['light', 'dark'] as const;
export const REQUIRED_PARITY_LANGUAGES = ['en', 'ar', 'de', 'es', 'fr', 'ru', 'zh'] as const;
