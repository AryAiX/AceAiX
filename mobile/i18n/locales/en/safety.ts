/**
 * Safety — blocking, guardian consent and everything that protects a minor.
 *
 * Kept apart from `settings.ts` on purpose: this is compliance copy, and a
 * reviewer should be able to read all of it in one place, in any language,
 * without wading through theme pickers and notification switches.
 *
 * Every meaning here is load-bearing. 13 is the minimum age. A 13 to 17 year
 * old is hidden from search and cannot be messaged until a parent or guardian
 * approves it. "Everyone" is never offered to a minor as an inbox setting.
 * Translate the words; do not soften, generalise or drop a condition.
 *
 * Report reasons are stored in the database in English — only the label a
 * reporter reads is translated.
 */
export const safety = {
  // ── Blocking (app/settings/blocked.tsx) ────────────────────────────────────
  blockedTitle: 'Blocked accounts',
  blockedEmptyTitle: "You haven't blocked anyone.",
  blockedEmptyBody:
    'Blocking someone stops them messaging you, following you or seeing your posts. They are never told.',
  blockedCount_one:
    '{{count}} account is blocked. They cannot message you, follow you or see your posts.',
  blockedCount_other:
    '{{count}} accounts are blocked. They cannot message you, follow you or see your posts.',
  unblockConfirmTitle: 'Unblock {{name}}?',
  unblockConfirmBody:
    'They will be able to find you, follow you and message you again, depending on your privacy settings. They are not told either way.',
  unblockedToast: '{{name}} unblocked',

  /** Shown on the privacy screen, where blocking is explained but not done. */
  blockingExplainer:
    'Blocking someone stops them contacting you, following you or seeing your posts, and they are not told. You can undo it from {{settings}}, then {{blocked}}.',

  // ── Minors (app/settings/privacy.tsx) ──────────────────────────────────────
  minorMessagingNote:
    'Because you are under 18, “Everyone” is not an option. Only verified coaches and clubs can write to you first, and only once a parent or guardian has approved messaging.',
  minorNeverPublic:
    'You are under 18, so your profile is never shown to someone who is not signed in. There is no setting for this and no way to switch it off — it is enforced by our database, not by the app.',
  minorsNeverPublicNote:
    'Profiles belonging to anyone under 18 are never shown to signed-out visitors, whatever their settings say.',
  discoveryWaitingGuardian: 'Waiting for a parent or guardian',
  guardianApprovalNeeded: 'A parent or guardian needs to approve this first.',
  askGuardian: 'Ask a parent or guardian',

  /** Account screen: why verification exists and what it unlocks. */
  verificationFooter:
    'A verified badge tells athletes and clubs that we have checked who you are. Verified adults are also the only people who can start a conversation with an under-18 athlete.',

  /** Scouting preferences: what a recruiter may and may not do with a minor. */
  scoutingMinorNote:
    'Athletes under 18 only appear here once a parent or guardian has approved it, and you can only message them if your account is verified.',

  // ── Guardian consent (app/settings/guardian.tsx) ───────────────────────────
  guardianTitle: 'Parent or guardian',
  guardianAthletesTitle: 'Athletes you look after',
  guardianSubtitleMinor: 'Permission for your profile',

  // What a guardian approves, one permission at a time
  scopeDiscovery: 'Appear in scout searches',
  scopeDiscoveryOff: 'Hidden from search',
  scopeMessaging: 'Receive messages from verified coaches and clubs',
  scopeMessagingOff: 'No one can message first',
  scopeMedia: 'Show photos and videos on the profile',
  scopeMediaOff: 'No photos or videos',

  // The young athlete's view
  minorHeading: 'Your parent or guardian',
  minorIntro:
    'You are under 18, so an adult has to approve your profile before coaches and clubs can find you. Until they do, you are hidden from search and nobody can message you first.',

  consentApproved: 'Approved',
  consentActive: 'Active',
  consentGrantedMeta: '{{name}} · {{date}}',
  whatTheyApproved: 'What they approved',
  changeConsentNote:
    'To change any of this, ask {{name}} to open the link we emailed them at {{email}}, or to write to {{contact}}.',
  withdrawPermission: 'Withdraw permission',

  consentWaitingTitle: 'Waiting for approval',
  consentPending: 'Pending',
  consentSentOn: 'Sent {{date}}',
  consentEmailNote_one:
    'We emailed them a secure link. It works for {{count}} day. If it did not arrive, ask them to check their spam folder, then send it again.',
  consentEmailNote_other:
    'We emailed them a secure link. It works for {{count}} days. If it did not arrive, ask them to check their spam folder, then send it again.',
  resendEmail: 'Resend the email',
  resentToast: 'We sent the email again.',

  consentRevokedNote:
    'Permission was withdrawn on {{date}}. Your profile is hidden from search until an adult approves it again.',

  // Asking for permission
  askForPermission: 'Ask for permission',
  askSomeoneElse: 'Ask someone else',
  requestFormHint:
    'We will email them a link. They choose what to allow, and they can change their mind at any time.',
  guardianNameLabel: 'Their full name',
  guardianNamePlaceholder: 'e.g. Amina Haddad',
  guardianEmailLabel: 'Their email address',
  relationshipQuestion: 'Who are they to you?',
  relationshipParent: 'Parent',
  relationshipGuardian: 'Guardian',
  relationshipOther: 'Other',
  guardianEmailUseNote:
    'Use a real address that they check. We only use it to ask for permission and to tell them about changes to your account.',
  sendRequest: 'Send the request',
  sendNewRequest: 'Send a new request',
  replacesPending: 'Sending a new request replaces the one waiting.',
  requestSentToast: 'Sent. Ask them to check their inbox.',
  nameRequired: 'Please write their full name.',
  emailInvalid: 'That email address does not look right.',

  whatChangesHeading: 'What changes when they approve',
  whatChangesBody:
    'Your profile can appear in scout searches, and verified coaches and clubs can send you a first message. Nothing else changes, and your exact age and date of birth stay private.',
  readChildSafety: 'Read our Child Safety Standards',

  withdrawConfirmTitle: 'Withdraw permission?',
  withdrawConfirmBody:
    'Your profile will be hidden from scout searches again, and coaches will not be able to start new conversations with you. You can ask for permission again at any time.',
  withdraw: 'Withdraw',
  consentWithdrawnToast: 'Permission withdrawn. Your profile is hidden from search again.',

  // The guardian's view
  approvingHeading: 'Approving a young athlete',
  approvingBody1:
    'When a 13 to 17 year old names you as their parent or guardian, we email you a secure link. Open it and you can approve or refuse three things separately: appearing in scout searches, receiving messages from verified coaches and clubs, and showing photos and videos.',
  approvingBody2_one:
    'The link works for {{count}} day. Until you use it, their profile stays hidden from search and no adult can message them. You can change or withdraw your decision at any time from the same link, or by writing to {{email}}.',
  approvingBody2_other:
    'The link works for {{count}} days. Until you use it, their profile stays hidden from search and no adult can message them. You can change or withdraw your decision at any time from the same link, or by writing to {{email}}.',
  guardianPhishingNote:
    'We will never ask you for a payment, a bank detail or a copy of an identity document by email. If a message claims to be from AceAiX and asks for any of those, it is not from us.',

  linkedAthletes: 'Athletes linked to you',
  noLinkedAthletes:
    'Nobody has named you yet. When they do, the request arrives by email and appears here.',
  linkApprovedOn: 'Approved {{date}}',
  linkRequestedOn: 'Requested {{date}}',
  linkWithdrawn: 'Permission withdrawn',
  linkExpired: 'Request expired',
  badgeWithdrawn: 'Withdrawn',
  badgeExpired: 'Expired',

  // What a guardian may see of a conversation: that it exists, never its words
  whoTheyTalkTo: 'Who they are talking to',
  noConversations: 'No conversations yet.',
  messageContentsNote:
    'AceAiX does not show you the contents of their messages. If something worries you, write to {{email}}.',

  guardianContactNote:
    "Questions about a young person's account: {{privacyEmail}}. Anything about their safety: {{safetyEmail}}.",

  // An adult who reached the guardian screen
  adultNothingTitle: 'Nothing to approve',
  adultNothingBody:
    'Guardian permission applies to accounts belonging to 13 to 17 year olds. Yours is an adult account, so your profile and messages are governed by your own privacy settings.',
};
