import type { Href } from 'expo-router';

import type { AppNotification } from '@/types/models';

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
  achievements: '/achievements' as const,
  editProfile: '/edit-profile' as const,

  profile: (userId: string) => `/u/${userId}` as const,
  post: (postId: string) => `/post/${postId}` as const,
  chat: (conversationId: string) => `/chat/${conversationId}` as const,
  opportunity: (id: string) => `/opportunity/${id}` as const,
  applicants: (id: string) => `/opportunity/${id}/applicants` as const,
  organization: (id: string) => `/org/${id}` as const,
  followers: (userId: string) => `/u/${userId}/followers` as const,
  following: (userId: string) => `/u/${userId}/following` as const,

  challenges: '/challenges' as const,
  challenge: (id: string) => `/challenge/${id}` as const,
  newChallenge: '/challenge/new' as const,
  playerCard: '/player-card' as const,
  profileViews: '/views' as const,
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
};

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
    default:
      break;
  }

  // Fall back to the actor's profile — better than doing nothing.
  if (n.actor_id) return Routes.profile(n.actor_id);
  return null;
}

/** Deep-link paths the app answers to (`aceaix://…` and https links). */
export const DEEP_LINK_PREFIXES = ['aceaix://', 'https://aceaix.com/app'];
