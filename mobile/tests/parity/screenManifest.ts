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
  screen('(onboarding)/index.tsx', '/', ['incomplete athlete', 'incomplete recruiter', 'incomplete club', 'incomplete guardian', 'incomplete fallback'], ['loading', 'resume', 'validation', 'save error', 'upload error', 'guardian pending', 'guardian granted', 'score error', 'club page wizard', 'club resume'], ['complete every role path', 'skip optional step', 'request consent', 'upload avatar', 'sign out', 'set up club page', 'open club page']),

  screen('(tabs)/index.tsx', '/', ['completed account'], ['loading', 'error', 'for-you empty', 'following empty', 'refresh', 'pagination'], ['change feed', 'open post', 'comment', 'moderate', 'refresh', 'load more']),
  screen('(tabs)/discover.tsx', '/discover', ['athlete', 'guardian', 'recruiter', 'sponsor'], ['loading', 'error', 'empty', 'filtered empty', 'brief empty', 'pagination', 'explore grid', 'explore empty', 'explore sport filter', 'sponsors tab', 'seekers list', 'no calls', 'no seekers'], ['search', 'filter', 'sort', 'shortlist', 'open result', 'switch explore and people', 'filter clips by sport', 'open clip in reels', 'ask for sponsorship', 'apply to call', 'make offer']),
  screen('(tabs)/meetups.tsx', '/meetups', ['adult', 'minor'], ['loading', 'error', 'empty', 'filtered empty', 'joined empty', 'adults only'], ['change tab', 'filter', 'create', 'open meetup']),
  screen('(tabs)/opportunities.tsx', '/opportunities', ['athlete', 'guardian', 'recruiter'], ['loading', 'error', 'empty per tab', 'filtered empty', 'application statuses'], ['change tab', 'filter', 'save', 'open', 'create', 'review applicants', 'open challenges']),
  screen('(tabs)/profile.tsx', '/profile', ['completed account', 'athlete', 'club', 'invited page team member'], ['loading', 'error', 'posts empty', 'highlights empty', 'career empty', 'managed club card', 'club setup prompt', 'page team invite'], ['refresh', 'edit', 'open score', 'open player card', 'change tab', 'share', 'open club page', 'manage club', 'set up club page', 'open invite']),
  screen('(tabs)/create.tsx', '/create', ['completed account'], ['redirect'], ['forward to composer']),

  screen('compose.tsx', '/compose', ['completed account'], ['empty', 'posting', 'upload progress', 'upload error', 'API error', 'discard confirmation'], ['set caption', 'set audience', 'add and remove media', 'publish', 'discard']),
  screen('notifications.tsx', '/notifications', ['completed account'], ['loading', 'error', 'empty', 'new and earlier', 'realtime arrival'], ['open notification', 'mark all read', 'refresh']),
  screen('inbox.tsx', '/inbox', ['completed account'], ['loading', 'error', 'empty', 'realtime update'], ['open conversation', 'mute', 'open profile', 'block', 'refresh']),
  screen('chat/[id].tsx', '/chat/:conversationId', ['conversation participant'], ['invalid ID', 'loading', 'error', 'empty', 'failed send', 'permission blocked', 'minor safety', 'blocked', 'closed'], ['send', 'retry', 'open profile', 'moderate']),
  screen('search.tsx', '/search', ['completed account'], ['recent', 'suggestions', 'loading', 'error', 'no results'], ['change scope', 'type query', 'open result', 'clear recent']),
  screen('post/[id].tsx', '/post/:postId', ['visible-post viewer'], ['invalid ID', 'loading', 'unavailable', 'comments loading', 'comments error', 'comments empty', 'sending'], ['comment', 'reply', 'share', 'report', 'delete', 'block', 'play media']),
  screen('saved.tsx', '/saved', ['completed account'], ['loading', 'error', 'empty', 'loading more'], ['refresh', 'open post', 'comment', 'share', 'unsave', 'report', 'delete', 'block']),
  screen('shortlist.tsx', '/shortlist', ['recruiter'], ['loading', 'error', 'empty', 'populated'], ['refresh', 'open athlete', 'remove', 'return to discover']),
  screen('u/[id].tsx', '/u/:userId', ['completed account'], ['invalid ID', 'loading', 'error', 'blocked by self', 'blocked by other', 'suspended'], ['follow', 'message', 'share', 'unblock', 'change profile tab']),
  screen('u/[id]/followers.tsx', '/u/:userId/followers', ['completed account'], ['loading', 'error', 'self empty', 'other empty'], ['open profile', 'follow', 'unfollow']),
  screen('u/[id]/following.tsx', '/u/:userId/following', ['completed account'], ['loading', 'error', 'self empty', 'other empty'], ['open profile', 'follow', 'unfollow']),
  screen('org/[id].tsx', '/org/:organizationId', ['completed account', 'follower', 'page team (owner/manager/editor/scorekeeper/coach)', 'invited team member', 'invited squad member'], ['invalid ID', 'loading', 'error', 'gone', 'cover fallback', 'story unseen', 'story seen', 'verification status (managers)', 'team invite banner', 'squad link banner', 'guardian consent required', 'live match banner', 'next match teaser', 'posts loading', 'posts error', 'posts empty', 'announcements pinned', 'matches empty', 'matches live/upcoming/results', 'squads empty', 'youth names note', 'events empty', 'event cancelled', 'event full', 'event registered', 'challenges empty', 'awards empty', 'about sections', 'unverified', 'openings loading', 'openings error', 'openings empty'], ['follow', 'unfollow', 'open story', 'manage', 'open verification (edit)', 'accept/decline team invite', 'accept/decline squad link', 'open guardian settings', 'open live/next match', 'change tab', 'pull to refresh', 'load more posts', 'open post', 'new post', 'new story', 'open match', 'add match', 'change season', 'filter squads by sport', 'open squad member profile', 'edit squads', 'open event', 'new event', 'open challenge', 'new challenge', 'open award recipient', 'add award', 'open in maps', 'email', 'call', 'open website', 'open social', 'save opening', 'open opening']),
  screen('match/[id].tsx', '/match/:matchId', ['completed account', 'scorekeeper', 'editor'], ['invalid ID', 'loading', 'error', 'not found', 'upcoming', 'live', 'half time', 'full time', 'postponed', 'cancelled', 'timeline empty', 'notes', 'stream link', 'action in flight'], ['open club', 'watch live', 'open scorer profile', 'edit fixture', 'kick off', 'half time', 'second half', 'full time', 'postpone', 'cancel', 'resume', 'back to upcoming', 'set minute and period', 'adjust score', 'add goal', 'add event', 'delete event', 'pull to refresh']),
  screen('event/[id].tsx', '/event/:eventId', ['athlete', 'minor', 'guardian', 'page team', 'content manager'], ['invalid ID', 'loading', 'error', 'not found', 'cancelled', 'gate ok', 'registered', 'full', 'closed', 'past', 'age out of range', 'not signed in', 'minor needs verified club', 'guardian consent required', 'own club', 'registrations empty'], ['open club', 'open maps', 'register with note', 'cancel my place', 'open guardian settings', 'open registrant profile', 'edit event', 'cancel event']),
  screen('club/setup.tsx', '/club/setup', ['club account without page', 'club account with page', 'non-club account'], ['loading', 'error', 'not a club', 'has page', 'no page', 'wizard resume', 'validation', 'save error', 'upload error', 'pin parsed', 'pin invalid', 'licence attached', 'done'], ['start setup', 'continue setup', 'open page', 'edit page', 'leave setup', 'skip branding', 'verify later', 'finish setup']),
  screen('club/[orgId]/edit.tsx', '/club/:orgId/edit', ['owner', 'manager', 'editor or outsider'], ['invalid ID', 'loading', 'error', 'not found', 'no permission', 'verification status', 'review note', 'licence on file', 'validation', 'saving', 'upload error'], ['save basics', 'save location and branches', 'save sports', 'save contact', 'save logo and cover', 'save about', 'attach licence', 'send papers', 'view page']),
  screen('club/[orgId]/manage.tsx', '/club/:orgId/manage', ['page owner/manager', 'editor', 'scorekeeper/coach', 'non-team'], ['invalid ID', 'loading', 'error', 'gone', 'no permission', 'unverified', 'verification pending', 'review note', 'live match', 'next match', 'tiles filtered by permission'], ['finish verification', 'new post', 'new story', 'new match', 'new event', 'new challenge', 'open squads', 'add award', 'keep live score', 'open next match', 'announcement', 'page team', 'edit page', 'view page', 'refresh']),
  screen('club/[orgId]/team.tsx', '/club/:orgId/team', ['page owner/manager', 'other page team member', 'non-team'], ['loading', 'error', 'no permission', 'empty', 'pending invite tag', 'self tag', 'view-only', 'email validation', 'API error'], ['invite by email with role', 'change role', 'remove member', 'leave page']),
  screen('club/[orgId]/broadcast.tsx', '/club/:orgId/broadcast', ['page owner/manager', 'non-manager'], ['loading', 'error', 'no permission', 'unverified warning', 'validation', 'daily limit reached', 'sending', 'history loading', 'history empty', 'history error'], ['write title and message', 'pick audience', 'send', 'refresh']),
  screen('club/[orgId]/squads.tsx', '/club/:orgId/squads', ['page content team', 'non-team'], ['loading', 'error', 'no permission', 'no season', 'no squads', 'no sports', 'youth squad note', 'link badges'], ['switch season', 'new season', 'make season current', 'new squad', 'add player', 'add staff', 'open member', 'delete squad']),
  screen('club/[orgId]/member.tsx', '/club/:orgId/member', ['page content team', 'non-team'], ['loading', 'error', 'no permission', 'not found', 'player form', 'staff form', 'youth name hint', 'link invited', 'link accepted', 'link declined', 'validation', 'saving'], ['switch kind', 'set name, number, position or staff role', 'search and link profile', 'unlink', 'save', 'delete']),
  screen('club/[orgId]/award.tsx', '/club/:orgId/award', ['page content team', 'non-team'], ['loading', 'error', 'no permission', 'not found', 'validation', 'no linkable members', 'image uploading', 'saving'], ['fill details', 'pick placement', 'pick recipient', 'link squad member', 'add, change or remove photo', 'save', 'delete']),
  screen('club/[orgId]/match-edit.tsx', '/club/:orgId/match-edit', ['content (owner/manager/editor)', 'unauthorized'], ['invalid ID', 'loading', 'error', 'not found', 'no permission', 'new', 'edit', 'edit live/finished (status hidden)', 'validation', 'saving'], ['pick sport', 'pick squad', 'pick or type category', 'set opponent', 'home/away', 'pick kick-off', 'set stream link', 'set status', 'save', 'delete']),
  screen('club/[orgId]/event-edit.tsx', '/club/:orgId/event-edit', ['content (owner/manager/editor)', 'unauthorized'], ['invalid ID', 'loading', 'error', 'not found', 'no permission', 'new', 'edit', 'validation', 'saving'], ['pick kind', 'edit fields', 'pick sport and category', 'pick start and end', 'set ages and capacity', 'toggle registration', 'set price and currency', 'save']),
  screen('team/[id].tsx', '/team/:teamId', ['completed account'], ['loading', 'error', 'fans empty'], ['open fan profile']),

  screen('opportunity/[id].tsx', '/opportunity/:opportunityId', ['athlete', 'guardian', 'owner'], ['invalid ID', 'loading', 'error', 'gone', 'closed', 'applied', 'withdrawn', 'minor notice'], ['apply', 'reapply', 'withdraw', 'save', 'share', 'report', 'open applicants', 'open organization']),
  screen('opportunity/[id]/applicants.tsx', '/opportunity/:opportunityId/applicants', ['owner', 'authorized reviewer', 'unauthorized'], ['invalid ID', 'loading', 'error', 'locked', 'empty', 'filtered empty'], ['filter', 'open profile', 'message', 'perform every legal status transition']),
  screen('opportunity/new.tsx', '/opportunity/new', ['recruiter', 'non-recruiter'], ['loading', 'restricted', 'validation', 'submitting', 'API error'], ['complete form', 'preview', 'open safety guidance', 'publish']),
  screen('challenges.tsx', '/challenges', ['athlete', 'guardian', 'recruiter'], ['loading', 'error', 'open empty', 'entered empty', 'mine empty'], ['change tab', 'open challenge', 'create']),
  screen('challenge/[id].tsx', '/challenge/:challengeId', ['athlete', 'setter'], ['loading', 'error', 'not found', 'open', 'closed', 'leaderboard empty', 'clips empty', 'action error'], ['enter', 'withdraw', 'judge', 'verify', 'reject', 'open entrant']),
  screen('challenge/new.tsx', '/challenge/new', ['verified recruiter', 'unverified recruiter', 'unauthorized', 'club page editor (?org=)'], ['ready', 'validation', 'creating', 'API error', 'club context loading', 'setting for club'], ['configure metric', 'set ages and close window', 'publish', 'publish for club and go back']),
  screen('meetup/[id].tsx', '/meetup/:meetupId', ['adult', 'minor', 'host'], ['adults only', 'loading', 'error', 'full', 'cancelled', 'stranger', 'requested', 'declined', 'joined', 'host', 'requests empty'], ['request join', 'leave', 'accept', 'decline', 'cancel', 'open host']),
  screen('meetup/new.tsx', '/meetup/new', ['adult', 'minor'], ['adults only', 'incomplete', 'saving', 'API error'], ['complete form', 'publish']),

  screen('edit-profile.tsx', '/edit-profile', ['completed account', 'athlete'], ['loading', 'error', 'clean', 'dirty', 'upload error', 'save error', 'country search empty'], ['edit every field', 'upload avatar and cover', 'save']),
  screen('score.tsx', '/score', ['athlete', 'non-athlete'], ['loading', 'error', 'not ready', 'history loading', 'insufficient history'], ['refresh', 'simulate', 'open tip action', 'open methodology']),
  screen('intelligence/index.tsx', '/intelligence', ['athlete', 'minor needing guardian', 'minor pending guardian', 'no date of birth', 'non-athlete', 'suspended', 'recruiter'], ['loading', 'error', 'guardian gate', 'guardian pending', 'age unknown', 'not athlete', 'intro', 'session in progress', 'result', 'result below four games', 'no percentile', 'fresh result celebration'], ['start', 'continue', 'replay', 'ask guardian', 'edit profile', 'share with clubs', 'show badge'], 'render-only'),
  screen('intelligence/session.tsx', '/intelligence/session', ['athlete with consent'], ['loading', 'error', 'get ready', 'tired hint', 'warm-up', 'hub', 'game intro', 'practice', 'practice done', 'scored round', 'submitting', 'result', 'invalid result', 'incomplete round', 'interrupted', 'no attempts left', 'finishing'], ['choose freshness', 'warm up', 'open game', 'practice', 'start scored', 'answer', 'retry', 'back to hub', 'finish', 'pause'], 'render-only'),
  screen('sport-fit/index.tsx', '/sport-fit', ['athlete', 'minor needing guardian', 'minor pending guardian', 'no date of birth', 'non-athlete', 'suspended'], ['loading', 'error', 'guardian gate', 'guardian pending', 'age unknown', 'not athlete', 'intro', 'intro without game intelligence', 'result', 'result with game signals', 'retake locked', 'fresh result celebration', 'deleting'], ['start', 'play the games', 'ask guardian', 'edit profile', 'find coaches', 'retake', 'delete answers'], 'render-only'),
  screen('sport-fit/questions.tsx', '/sport-fit/questions', ['athlete with consent'], ['statement', 'answered', 'submitting', 'too fast', 'attention check missed', 'same answer everywhere', 'API error', 'leave confirmation'], ['answer', 'back', 'leave', 'start again'], 'render-only'),
  screen('invite.tsx', '/invite', ['athlete', 'coach', 'other roles', 'new account within 14 days'], ['loading', 'error', 'no invites yet', 'pending and counted friends', 'token earned', 'invited by', 'enter code', 'not eligible'], ['share invite', 'enter code', 'add code'], 'render-only'),
  screen('i/[code].tsx', '/i/:code', ['public', 'signed-in new account', 'signed-in older account'], ['loading', 'valid invite', 'invalid invite', 'signed in'], ['create account', 'sign in', 'add this invite', 'continue'], 'render-only'),
  screen('stories/[userId].tsx', '/stories/:userId', ['completed account', 'story author', 'story viewer'], ['loading', 'error', 'photo', 'video', 'card', 'paused', 'own story', 'next author', 'empty author skipped'], ['tap next', 'tap previous', 'hold to pause', 'swipe down to close', 'close', 'delete own story', 'toggle sound'], 'render-only'),
  screen('stories/new.tsx', '/stories/new', ['completed account', 'minor without media consent'], ['card', 'photo empty', 'photo picked', 'posting', 'API error'], ['choose background', 'write text', 'pick sticker', 'set stat', 'pick photo', 'set caption', 'set audience', 'share'], 'render-only'),
  screen('sponsorship/index.tsx', '/sponsorship', ['athlete', 'minor without scope', 'sponsor', 'unverified sponsor', 'guardian', 'other roles'], ['loading', 'error', 'guardian gate', 'verification gate', 'no requests', 'no calls', 'no deals', 'waiting for answer'], ['accept', 'decline', 'withdraw', 'message', 'new request', 'edit request', 'mark funded', 'close', 'reopen', 'new call', 'close call', 'edit brand']),
  screen('sponsorship/request.tsx', '/sponsorship/request', ['athlete', 'minor without scope', 'non-athlete'], ['loading', 'error', 'gate', 'new', 'editing', 'invalid title', 'invalid date', 'invalid amount', 'saving'], ['fill', 'toggle needs', 'toggle gives', 'publish']),
  screen('sponsorship/call.tsx', '/sponsorship/call', ['verified sponsor', 'unverified sponsor', 'non-sponsor'], ['loading', 'error', 'gate', 'new', 'editing', 'invalid range', 'invalid date', 'saving'], ['fill', 'pick sport', 'toggle offers', 'open to minors', 'publish']),
  screen('sponsorship/brand.tsx', '/sponsorship/brand', ['sponsor', 'non-sponsor'], ['loading', 'error', 'gate', 'invalid website', 'invalid range', 'saving'], ['fill', 'pick sports', 'toggle offers', 'save']),
  screen('coaching/index.tsx', '/coaching', ['coach', 'athlete', 'guardian', 'other roles'], ['loading', 'error', 'not taking students', 'no services', 'no slots', 'day with bookings', 'no bookings', 'cancelled booking'], ['toggle taking students', 'save headline', 'add service', 'edit service', 'retire service', 'open times', 'pick day', 'cancel slot', 'cancel booking', 'find a coach', 'open profile']),
  screen('coaching/service.tsx', '/coaching/service', ['coach', 'non-coach'], ['loading', 'error', 'gate', 'new', 'editing', 'class capacity', 'invalid title', 'invalid price', 'missing location', 'saving'], ['pick kind', 'pick length', 'pick where', 'save']),
  screen('coaching/slots.tsx', '/coaching/slots', ['coach with services', 'coach without services', 'non-coach'], ['loading', 'error', 'gate', 'choose service', 'nothing picked', 'saving', 'some skipped'], ['pick service', 'pick days', 'pick times', 'repeat weekly', 'open times']),
  screen('coaching/[coachId].tsx', '/coaching/:coachId', ['adult athlete', 'minor with scope', 'minor without scope', 'the coach', 'blocked viewer'], ['loading', 'error', 'unavailable', 'not taking students', 'guardian gate', 'unverified coach gate', 'no times', 'slot full', 'already booked', 'flexible location'], ['pick service', 'pick day', 'pick time', 'name the place', 'add note', 'book', 'ask guardian']),
  screen('clips.tsx', '/clips', ['completed account'], ['loading', 'error', 'empty', 'grid', 'loading more'], ['open reel', 'open pager', 'pull to refresh', 'back']),
  screen('reels.tsx', '/reels', ['completed account'], ['loading', 'error', 'empty', 'playing', 'paused', 'muted'], ['swipe', 'tap to pause', 'double-tap like', 'like', 'comment', 'share', 'follow', 'unmute', 'open profile', 'close'], 'render-only'),
  screen('achievements.tsx', '/achievements', ['completed account'], ['loading', 'earned', 'locked', 'retry'], ['refresh']),
  screen('player-card.tsx', '/player-card', ['athlete', 'non-athlete'], ['loading', 'error', 'exporting', 'export error'], ['export', 'share']),
  screen('views.tsx', '/views', ['athlete', 'non-athlete'], ['loading', 'error', 'zero views', 'seven day', 'thirty day'], ['change range', 'open viewer', 'open explanation']),

  screen('settings/index.tsx', '/settings', ['completed account', 'minor', 'guardian', 'recruiter'], ['ready', 'sign-out confirmation', 'signing out'], ['open every visible setting', 'open legal', 'contact support', 'sign out']),
  screen('settings/account.tsx', '/settings/account', ['completed account'], ['loading', 'verification states', 'password validation', 'API error', 'exporting', 'export error'], ['change password', 'request verification', 'export data', 'open deletion']),
  screen('settings/privacy.tsx', '/settings/privacy', ['adult', 'minor'], ['loading', 'consent loading', 'discovery locked', 'save rollback'], ['change messaging audience', 'change discoverability', 'open guardian and policy']),
  screen('settings/notifications.tsx', '/settings/notifications', ['completed account'], ['loading', 'error', 'saved', 'permission granted', 'permission denied', 'permission blocked', 'requesting'], ['toggle every preference', 'toggle club updates', 'request permission', 'open browser settings']),
  screen('settings/blocked.tsx', '/settings/blocked', ['completed account'], ['loading', 'error', 'empty', 'working'], ['open profile', 'confirm unblock']),
  screen('settings/guardian.tsx', '/settings/guardian', ['minor', 'guardian', 'other adult'], ['loading', 'error', 'pending', 'granted', 'revoked', 'no links', 'no conversations'], ['request', 'resend', 'revoke', 'open minor', 'request age review', 'ask to add game intelligence', 'ask to add sport fit']),
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
