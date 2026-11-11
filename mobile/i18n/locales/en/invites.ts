/**
 * Invites — a personal link, the circle it builds, and tokens.
 *
 * Tone rules for every language:
 *
 *   * Friendly and team-like: "bring your teammates", never "earn money".
 *   * Tokens are AceAiX points. Never call them money, coins, cash, crypto or
 *     rewards with a value; never promise what they will buy.
 *   * A friend is only ever named by first name.
 */
export const invites = {
  // ── Names ──────────────────────────────────────────────────────────────────
  title: 'Invite friends',
  circleTitle: 'My circle',
  tagline: 'Bring your teammates. Every 10 friends who join earn you a token.',

  // ── The profile card ───────────────────────────────────────────────────────
  cardCta: 'Invite your friends',
  cardCtaBody: 'Every 10 friends who join earn you 1 token.',
  cardProgress: '{{n}} of {{total}} to your next token',
  cardTokens: 'Tokens: {{n}}',

  // ── The circle screen ──────────────────────────────────────────────────────
  linkTitle: 'Your invite link',
  codeLabel: 'Your code',
  share: 'Share invite',
  copy: 'Copy link',
  copied: 'Link copied',
  shareMessage:
    'Join me on AceAiX, where athletes get discovered by coaches and clubs. Sign up with my link: {{link}}. Or enter my code {{code}} after you sign up.',
  shareTitle: 'Join me on AceAiX',
  nextToken: '{{n}} more to your next token',
  tokensLabel: 'Tokens',
  countedLabel: 'Joined',
  pendingLabel: 'Setting up',
  howTitle: 'How it works',
  how1: 'Share your link or code with friends.',
  how2: 'A friend counts once they finish setting up their profile. A friend under 18 counts once a parent approves.',
  how3: 'Every 10 friends who count earn you 1 token.',
  tokensNote: 'Tokens are AceAiX points. They have no cash value and cannot be bought, sold or transferred.',
  membersTitle: 'Friends you invited',
  membersEmpty: 'Nobody yet. Share your link to start your circle.',
  statusQualified: 'Counts',
  statusPending: 'Setting up profile',
  invitedBy: 'Invited by {{name}}',
  ledgerTitle: 'Token history',
  ledgerGained: '+{{n}} token',
  ledgerLost: '−{{n}} token: an invite no longer counts',

  // ── Entering a code by hand ────────────────────────────────────────────────
  enterCodeTitle: 'Were you invited?',
  enterCodeBody:
    'Enter your friend’s invite code in the first 14 days. Once your profile is set up, you have one day to add it.',
  enterCodePlaceholder: 'Invite code',
  enterCodeAction: 'Add code',
  enterCodeInvalid: 'An invite code has 8 letters and numbers.',
  claimed: 'You joined through {{name}}’s invite',

  notEligibleTitle: 'Invites are for athletes and coaches',
  notEligibleBody: 'If someone invited you, they are shown here.',

  // ── Someone else's profile ─────────────────────────────────────────────────
  badgeTier: 'Brought {{n}}+ people to AceAiX',

  // ── The landing screen of an invite link ──────────────────────────────────
  landingTitle: '{{name}} invited you to AceAiX',
  landingTitleNoName: 'You’re invited to AceAiX',
  landingBody:
    'AceAiX is where young athletes get discovered by coaches and clubs. Create your free account to join.',
  landingSignUp: 'Create my account',
  landingSignIn: 'I already have an account',
  landingInvalidTitle: 'This invite link is not valid',
  landingInvalidBody: 'Ask your friend to send it again. You can still create an account.',
  landingSignedIn: 'You already have an account',
  landingSignedInBody: 'If you joined in the last 14 days, you can still add this invite.',
  landingAddInvite: 'Add this invite',
  landingContinue: 'Continue',
  landingCopy: 'Copy',
  landingCopied: 'Code copied',
  landingCopyFailed: 'The code could not be copied. Select it and copy it yourself.',
  landingDownload: 'Download AceAiX, sign up, and enter this code in the app within your first 14 days.',
  landingAppStore: 'App Store',
  landingGooglePlay: 'Google Play',
};
