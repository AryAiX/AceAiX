export type PlatformGapStatus = 'blocked' | 'unverified' | 'verified';

export interface PlatformParity {
  capability: string;
  implementation: string[];
  acceptance: string[];
  status: PlatformGapStatus;
  blocker?: string;
}

/**
 * Browser capabilities that cannot be proven merely by sharing the screen
 * component. Release requires every entry to be `verified`.
 */
export const PLATFORM_PARITY: PlatformParity[] = [
  {
    capability: 'password recovery and email confirmation',
    implementation: ['lib/authRedirect.ts', 'providers/AuthProvider.tsx'],
    acceptance: [
      'hosted reset email returns to /reset-password over HTTPS',
      'PKCE code, token_hash and legacy recovery parameters work',
      'confirmation returns to the originating product host and enters onboarding',
      'Supabase redirect allowlist contains dev and app hosts',
    ],
    status: 'unverified',
  },
  {
    capability: 'opportunity deadline picker',
    implementation: ['app/opportunity/new.tsx'],
    acceptance: [
      'mouse and keyboard choose, change and clear a deadline',
      'past dates are unavailable',
      'submission sends the intended local date without timezone drift',
    ],
    status: 'unverified',
  },
  {
    capability: 'share and clipboard fallback',
    implementation: ['lib/share.ts', 'lib/share.web.ts'],
    acceptance: [
      'Web Share success and cancellation',
      'unsupported and rejected Web Share copy the canonical URL',
      'copy fallback works in Chromium, Firefox and Safari',
    ],
    status: 'unverified',
  },
  {
    capability: 'player-card PNG export',
    implementation: ['app/player-card.tsx'],
    acceptance: [
      'exported file is a valid 1080x1350 PNG',
      'Web Share receives the PNG where file sharing is supported',
      'other browsers download aceaix-card.png',
    ],
    status: 'unverified',
  },
  {
    capability: 'canonical deep links and direct refresh',
    implementation: ['lib/routes.ts', 'web/vercel.json', 'mobile/vercel.json'],
    acceptance: [
      'every /app share URL redirects to the matching app route',
      'direct navigation and refresh work for every dynamic route',
      'installed iOS and Android builds claim the same links',
      'deleted and malformed IDs show the correct state',
    ],
    status: 'blocked',
    blocker: 'the Expo V2 artifact is not yet deployed to dev.aceaix.com',
  },
  {
    capability: 'image and video selection and upload',
    implementation: [
      'app/compose.tsx',
      'app/edit-profile.tsx',
      'components/profile/HighlightsTab.tsx',
      'components/onboarding/PhotoStep.tsx',
      'lib/api.profile.ts',
    ],
    acceptance: [
      'choose and upload image and video files',
      'multiple selection, MIME, size and duration limits match native',
      'camera affordance has truthful browser behavior',
      'partial upload failure does not leave orphaned objects',
      'Chromium, Firefox and Safari',
    ],
    status: 'unverified',
  },
  {
    capability: 'video playback',
    implementation: [
      'components/feed/MediaCarousel.tsx',
      'components/profile/HighlightsTab.tsx',
    ],
    acceptance: [
      'load, play, pause on scroll, mute, seek, fullscreen and failure states',
      'signed and public media URLs',
      'keyboard-accessible controls',
    ],
    status: 'unverified',
  },
  {
    capability: 'account data export',
    implementation: ['lib/api.settings.ts'],
    acceptance: [
      'download has documented filename and JSON contents',
      'object URL remains valid until download begins',
      'Chromium, Firefox and Safari',
    ],
    status: 'unverified',
  },
  {
    capability: 'browser notifications',
    implementation: ['lib/push.web.ts', 'hooks/usePushNotifications.ts'],
    acceptance: [
      'permission state and settings match native behavior',
      'subscription is registered and revoked',
      'foreground and background notifications arrive',
      'click and cold-start route through notificationTarget',
    ],
    status: 'blocked',
    blocker: 'Web Push service worker, VAPID credentials and server delivery do not exist',
  },
  {
    capability: 'modal, sheet and lightbox accessibility',
    implementation: [
      'components/ui/Sheet.tsx',
      'components/ui/Lightbox.tsx',
      'components/ui/Input.tsx',
    ],
    acceptance: [
      'initial focus, focus trap, Escape and focus restoration',
      'localized controls and announced form errors',
      'lightbox image label and keyboard operation',
      'axe-core has no serious or critical findings',
    ],
    status: 'unverified',
  },
  {
    capability: 'responsive layout and RTL',
    implementation: ['app/_layout.tsx', 'app/(tabs)/_layout.tsx', 'components/ui/Screen.tsx'],
    acceptance: [
      'all required mobile, tablet and desktop viewports',
      'portrait and landscape',
      '200% and 400% zoom',
      'Arabic RTL and long German and Russian copy',
      'no horizontal document overflow or hidden controls',
    ],
    status: 'unverified',
  },
  {
    capability: 'browser storage and session recovery',
    implementation: ['lib/supabase.ts', 'i18n/index.tsx'],
    acceptance: [
      'normal persistent storage',
      'private-mode storage failure degrades to memory without a crash',
      'back, forward and reload preserve the correct auth and language state',
    ],
    status: 'unverified',
  },
];
