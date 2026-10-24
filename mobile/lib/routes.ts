import type { Href } from 'expo-router';

import type { AppNotification } from '@/types/models';
import { WEB_APP_ORIGIN } from '@/lib/webLinks';

/**
 * Every navigation target in one place.
 *
 * Screens build links from these helpers rather than concatenating strings,
 * and notifications route from their typed `entity_type` / `entity_id` rather
 * than a free-text URL — which is what used to send a "new message" tap to
 * the wrong screen, or nowhere at all.
 */

export const Routes = {
  home: '/(tabs)' as const,
  discover: '/(tabs)/discover' as const,
  opportunities: '/(tabs)/opportunities' as const,
  myProfile: '/(tabs)/profile' as const,

  compose: '/compose' as const,
  notifications: '/notifications' as const,
  inbox: '/inbox' as const,
  search: '/search' as const,
  score: '/score' as const,
  intelligence: '/intelligence' as const,
  intelligenceSession: '/intelligence/session' as const,
  /** Sport Fit: the mindset questionnaire and the sports it points to. */
  sportFit: '/sport-fit' as const,
  sportFitQuestions: '/sport-fit/questions' as const,
  /** My invite link, my circle and my tokens. */
  invite: '/invite' as const,
  /** Where an invite link lands: `/i/<code>`. */
  inviteLanding: (code: string) => `/i/${code}` as const,
  achievements: '/achievements' as const,
  editProfile: '/edit-profile' as const,

  /** Full-screen story viewer; pass `userId` and the rail's `queue` as params. */
  story: '/stories/[userId]' as const,
  storyOf: (userId: string) => `/stories/${userId}` as const,
  newStory: '/stories/new' as const,
  /** Full-screen reels; pass `start` (a post id) as a param to open at it. */
  reels: '/reels' as const,
  /** Every reel as a grid: where "See all" on Home lands. */
  reelsCollection: '/clips' as const,

  profile: (userId: string) => `/u/${userId}` as const,
  post: (postId: string) => `/post/${postId}` as const,
  chat: (conversationId: string) => `/chat/${conversationId}` as const,
  opportunity: (id: string) => `/opportunity/${id}` as const,
  applicants: (id: string) => `/opportunity/${id}/applicants` as const,
  organization: (id: string) => `/org/${id}` as const,
  followers: (userId: string) => `/u/${userId}/followers` as const,
  following: (userId: string) => `/u/${userId}/following` as const,

  /** The sponsorship portal: requests, calls, offers and applications. */
  sponsorship: '/sponsorship' as const,
  /** Create a request, or edit one with `id` as a param. */
  sponsorshipRequest: '/sponsorship/request' as const,
  /** Create a call, or edit one with `id` as a param. */
  sponsorshipCall: '/sponsorship/call' as const,
  sponsorshipBrand: '/sponsorship/brand' as const,

  /** My coaching: a coach's calendar and services, or the sessions I booked. */
  coaching: '/coaching' as const,
  /** Create a service, or edit one with `id` as a param. */
  coachingService: '/coaching/service' as const,
  /** Open times for a service; pass `service` as a param. */
  coachingSlots: '/coaching/slots' as const,
  /** Book this coach. */
  coachBooking: (coachId: string) => `/coaching/${coachId}` as const,

  /** Set up a club or academy page (club accounts without one). */
  clubSetup: '/club/setup' as const,
  /** The page team's hub: everything a club runs, one tap each. */
  clubManage: (orgId: string) => `/club/${orgId}/manage` as const,
  /** Page details, sports, branches, branding and verification papers. */
  clubEdit: (orgId: string) => `/club/${orgId}/edit` as const,
  clubTeam: (orgId: string) => `/club/${orgId}/team` as const,
  clubBroadcast: (orgId: string) => `/club/${orgId}/broadcast` as const,
  clubSquads: (orgId: string) => `/club/${orgId}/squads` as const,
  /** Add a player or staff member: pass `squad`, and `id` to edit. */
  clubSquadMember: (orgId: string) => `/club/${orgId}/member` as const,
  /** Add an award, or edit one with `id` as a param. */
  clubAward: (orgId: string) => `/club/${orgId}/award` as const,
  /** Create a fixture, or edit one with `id` as a param. */
  clubMatchEdit: (orgId: string) => `/club/${orgId}/match-edit` as const,
  /** Create an event, or edit one with `id` as a param. */
  clubEventEdit: (orgId: string) => `/club/${orgId}/event-edit` as const,
  /** A match: live score, timeline, stream link — and the scorekeeper's controls. */
  match: (matchId: string) => `/match/${matchId}` as const,
  /** A club event: details, places left, register. */
  clubEvent: (eventId: string) => `/event/${eventId}` as const,

  meetups: '/(tabs)/meetups' as const,
  meetup: (id: string) => `/meetup/${id}` as const,
  newMeetup: '/meetup/new' as const,

  challenges: '/challenges' as const,
  challenge: (id: string) => `/challenge/${id}` as const,
  newChallenge: '/challenge/new' as const,
  playerCard: '/player-card' as const,
  profileViews: '/views' as const,
  savedPosts: '/saved' as const,
  shortlist: '/shortlist' as const,
  team: (id: string) => `/team/${id}` as const,

  settings: '/settings' as const,
  settingsAccount: '/settings/account' as const,
  settingsPrivacy: '/settings/privacy' as const,
  settingsNotifications: '/settings/notifications' as const,
  settingsBlocked: '/settings/blocked' as const,
  settingsGuardian: '/settings/guardian' as const,
  settingsScouting: '/settings/scouting' as const,
  settingsAppearance: '/settings/appearance' as const,
  settingsLanguage: '/settings/language' as const,
  deleteAccount: '/settings/delete-account' as const,

  terms: '/legal/terms' as const,
  privacy: '/legal/privacy' as const,
  guidelines: '/legal/guidelines' as const,
  childSafety: '/legal/child-safety' as const,

  auth: {
    welcome: '/(auth)/welcome' as const,
    signIn: '/(auth)/sign-in' as const,
    signUp: '/(auth)/sign-up' as const,
    forgotPassword: '/(auth)/forgot-password' as const,
    resetPassword: '/(auth)/reset-password' as const,
    checkEmail: '/(auth)/check-email' as const,
  },

  onboarding: '/(onboarding)' as const,
  ageReview: '/age-review' as const,
};

export type RouteDecisionProfile = {
  onboarding_completed: boolean;
  is_suspended?: boolean;
  suspended_reason?: string | null;
};

export type RouteDecision =
  | typeof Routes.auth.welcome
  | typeof Routes.onboarding
  | typeof Routes.home
  | typeof Routes.ageReview
  | null;

const UNDERAGE_SUSPENSION_REASONS = new Set([
  'underage_account_pending_remediation',
  'under_13',
  'underage',
]);

/** True only for the suspension state that requires an age review or appeal. */
export function requiresAgeReview(profile: RouteDecisionProfile): boolean {
  return Boolean(
    profile.is_suspended &&
      profile.suspended_reason &&
      UNDERAGE_SUSPENSION_REASONS.has(profile.suspended_reason),
  );
}

/**
 * Pure routing policy used by the root layout.
 *
 * Keeping this free of router hooks makes recovery-session and suspension
 * behavior testable without mounting the application shell.
 */
export function routeDecision(input: {
  hasSession: boolean;
  profile: RouteDecisionProfile | null;
  segments: readonly string[];
}): RouteDecision {
  const { hasSession, profile, segments } = input;
  const group = segments[0];
  const inAuth = group === '(auth)';
  const inRecovery = isResetPasswordRoute(segments);
  const inOnboarding = group === '(onboarding)';
  const inAgeReview = group === 'age-review';
  /* An invite link (`/i/<code>`) must open before there is an account: that
     is the point of it. The screen keeps the code and sends the visitor on. */
  const isPublic = group === 'legal' || group === '+not-found' || group === 'i';
  const atEntry = segments.length === 0;

  if (!hasSession) return !inAuth && !isPublic ? Routes.auth.welcome : null;

  // Supabase establishes a session before the recovery form is submitted.
  if (inRecovery) return null;
  if (!profile) return null;

  if (requiresAgeReview(profile)) return inAgeReview ? null : Routes.ageReview;
  if (inAgeReview) return profile.onboarding_completed ? Routes.home : Routes.onboarding;

  if (!profile.onboarding_completed) return inOnboarding ? null : Routes.onboarding;
  return inAuth || inOnboarding || atEntry ? Routes.home : null;
}

/**
 * Where a notification should take you.
 *
 * Returns null when there is nowhere sensible to go, so the caller can render
 * the row as non-tappable instead of navigating to a dead end.
 */
export function notificationTarget(n: AppNotification): Href | null {
  const id = n.entity_id;

  switch (n.entity_type) {
    case 'conversation':
      return id ? Routes.chat(id) : Routes.inbox;
    case 'post':
      return id ? Routes.post(id) : null;
    case 'user':
      return id ? Routes.profile(id) : null;
    case 'opportunity':
      // An application you received belongs on the applicant list; one you
      // sent belongs on the opportunity itself.
      if (!id) return Routes.opportunities;
      return n.type === 'application_received' ? Routes.applicants(id) : Routes.opportunity(id);
    case 'score':
      return Routes.score;
    case 'challenge':
      return id ? Routes.challenge(id) : Routes.challenges;
    case 'coaching':
      // A booking or a cancellation: the coach's calendar, or my sessions.
      return Routes.coaching;
    case 'sponsorship':
      // Every offer, application and answer is read in the portal.
      return Routes.sponsorship;
    case 'meetup':
      return id ? Routes.meetup(id) : null;
    case 'organization':
      // Invitations, squad links, announcements and verification decisions
      // are all answered on the club's own page.
      return id ? Routes.organization(id) : null;
    case 'club_match':
      return id ? Routes.match(id) : null;
    case 'club_event':
      return id ? Routes.clubEvent(id) : null;
    case 'referral':
      // A friend joined through my invite, or I earned a token.
      return Routes.invite;
    default:
      break;
  }

  // Fall back to the actor's profile — better than doing nothing.
  if (n.actor_id) return Routes.profile(n.actor_id);
  return null;
}

/** Deep-link paths the app answers to (`aceaix://…` and https links). */
export const DEEP_LINK_PREFIXES = ['aceaix://', WEB_APP_ORIGIN];

/** Recovery must remain reachable after Supabase establishes a recovery session. */
export function isResetPasswordRoute(segments: readonly string[]): boolean {
  return segments[0] === '(auth)' && segments[1] === 'reset-password';
}
