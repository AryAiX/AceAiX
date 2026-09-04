/**
 * Messaging and notifications.
 *
 * Grouped in the order a person meets them: the inbox and one of its rows, the
 * safety menu behind every "…", then the thread — header, day separators,
 * bubbles, the under-18 banner, the card that replaces the composer when a
 * message cannot be delivered, and the composer itself — and finally the
 * notifications screen and one of its rows.
 *
 * Two things deliberately live elsewhere. Report reasons are labels only: the
 * values written to the moderation table are English constants in the
 * component. And the block reasons the database returns
 * (`minor_requires_verified_sender` and friends) are never translated either —
 * only the explanation shown for each one is.
 */
export const messaging = {
  // ── Inbox ──────────────────────────────────────────────────────────────────
  inboxTitle: 'Messages',
  inboxEmptyTitle: 'No messages yet',
  inboxEmptyBody: 'When a coach or club reaches out, it lands here.',
  inboxEmptyAction: 'Explore Discover',

  // ── One conversation row ───────────────────────────────────────────────────
  previewBlocked: 'You blocked this account',
  previewNone: 'No messages yet',
  unreadMessages_one: '{{count}} unread message',
  unreadMessages_other: '{{count}} unread messages',
  /* Shown in the badge instead of a four-digit number. */
  unreadOverflow: '99+',
  conversationHint: 'Opens the conversation. Long press for more options.',

  // ── Safety menu (inbox row and thread "…") ─────────────────────────────────
  thisPerson: 'this person',
  thisPersonSentence: 'This person',
  muteConversation: 'Mute conversation',
  unmuteConversation: 'Unmute conversation',
  muteHint: 'Only on this phone. They are never told.',
  reportHint: "Tell us what's wrong. Reports are private.",
  blockPerson: 'Block {{name}}',
  blockHint: "They can't message you or find your profile.",

  reportPerson: 'Report {{name}}',
  reportReasonPrompt: 'Pick the closest reason. We never tell them who reported.',
  reasonHarassment: 'Harassment or bullying',
  reasonChildSafety: 'Child safety',
  reasonScam: 'Scam or fake offer',
  reasonSpam: 'Spam',
  reasonNudity: 'Nudity or sexual content',
  reasonHate: 'Hate speech',
  reasonImpersonation: 'Impersonation',
  reasonOther: 'Something else',
  reportDetailsLabel: 'Anything else we should know?',
  reportEmergencyNote:
    'If someone is in danger right now, contact your local emergency services as well.',
  reportThanks: 'Thanks for telling us. Our team will take a look.',

  blockConfirmTitle: 'Block {{name}}?',
  blockConfirmBody:
    "They won't see your profile or posts, they can't message you, and you won't see them. You can undo this in Settings.",
  blockedToast: '{{name}} is blocked. You can undo this in Settings.',

  // ── Thread ─────────────────────────────────────────────────────────────────
  conversationNotOpened: 'We could not open that conversation.',
  loadingMessages: 'Loading messages',
  threadStart: 'This is the start of your conversation. Say hello.',
  threadStartWith: 'This is the start of your conversation with {{name}}. Say hello.',

  closedTitle: 'This conversation is closed',
  closedBody:
    'You blocked this account, so neither of you will see the other. You can undo this in Settings.',
  closedAction: 'Back to messages',
  blockedFromThread: 'You will not hear from this account again.',

  // ── Thread header ──────────────────────────────────────────────────────────
  backToMessages: 'Back to messages',
  openProfileOf: "Open {{name}}'s profile",
  loadingConversation: 'Loading conversation',
  moreOptions: 'More options',

  // ── One message ────────────────────────────────────────────────────────────
  messageFailedA11y: 'Message failed to send. Tap to try again.',
  notSent: 'Not sent — tap to retry',
  sending: 'Sending',

  // ── Under-18 banner ────────────────────────────────────────────────────────
  /* Compliance copy. The meaning is exact and must stay exact in every
     language: the person being messaged is under 18, and their parent or
     guardian can see that this conversation exists — not what is in it. */
  minorBanner:
    "You're messaging an athlete under 18. Their parent or guardian can see that this conversation exists.",

  // ── Message blocked ────────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: 'Messages are limited here',
  blockedVerifiedSenderBody:
    '{{name}} is under 18. Only coaches and clubs we have verified can start a conversation with them.',
  blockedGuardianConsentTitle: 'Waiting on a parent or guardian',
  blockedGuardianConsentBody:
    "{{name}} is under 18, and their parent or guardian hasn't approved messages yet.",
  blockedMessagesOffTitle: 'Messages are turned off',
  blockedMessagesOffBody: '{{name}} has chosen not to receive messages right now.',
  blockedOnlyFollowedTitle: 'Not open to new messages',
  blockedOnlyFollowedBody: '{{name}} only takes messages from people they follow.',
  blockedOnlyVerifiedTitle: 'Verified accounts only',
  blockedOnlyVerifiedBody:
    '{{name}} only takes messages from verified coaches and clubs.',
  blockedNotFoundTitle: 'This account is gone',
  blockedNotFoundBody: 'The person you were messaging is no longer on AceAiX.',
  blockedDefaultTitle: "You can't message here",
  blockedDefaultBody: "We can't deliver messages to {{name}} at the moment.",

  howTitle: 'How messaging works',
  howSubtitle:
    'AceAiX is built for young athletes, so who can start a conversation is limited on purpose.',
  howMinorsTitle: 'Under-18 athletes get extra protection',
  howMinorsBody:
    "An adult can only start a conversation with an athlete under 18 if we have verified them as a coach or club, and the athlete's parent or guardian has approved messaging.",
  howInboxTitle: 'Everyone chooses their own inbox',
  howInboxBody:
    "Anyone can limit messages to verified coaches and clubs, to people they follow, or turn them off completely. That choice is theirs and we don't override it.",
  howTemporaryTitle: 'Nothing here is permanent',
  howTemporaryBody:
    'If a guardian approves messaging, or the person changes their inbox setting, this thread opens up on its own. Following each other also helps.',
  howWrongTitle: 'If something feels wrong',
  howWrongBody:
    'Report or block from the “…” menu at the top of any conversation. Reports are private — we never tell the other person who reported them.',
  gotIt: 'Got it',

  // ── Composer ───────────────────────────────────────────────────────────────
  composerPlaceholder: 'Write a message',
  composerPlaceholderNamed: 'Message {{name}}',
  sendMessage: 'Send message',

  // ── Notifications ──────────────────────────────────────────────────────────
  notificationsTitle: 'Notifications',
  sectionNew: 'New',
  sectionEarlier: 'Earlier',
  markAllRead: 'Mark all read',
  markAllReadA11y_one: 'Mark {{count}} notification as read',
  markAllReadA11y_other: 'Mark all {{count}} notifications as read',
  notificationsEmptyTitle: 'Nothing new',
  notificationsEmptyBody: 'Post a clip or follow a few clubs and this will fill up.',
  notificationsEmptyAction: 'Find people to follow',

  // ── One notification ───────────────────────────────────────────────────────
  /* The sentence itself arrives from the server already written — see the
     KNOWN GAP note in NotificationRow. Only the actor prefix is ours: the
     server puts the newest actor's name at the front and counts the rest, and
     `groupedTitle` is where a language that reads right-to-left can reorder
     the two halves. */
  actorAndOthers_one: '{{name}} and {{count}} other',
  actorAndOthers_other: '{{name}} and {{count}} others',
  groupedTitle: '{{actors}}{{rest}}',
  unread: 'Unread',
};
