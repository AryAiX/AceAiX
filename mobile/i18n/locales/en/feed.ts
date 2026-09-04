/**
 * The feed, the composer and a single post.
 *
 * Grouped in the order a person meets them: home, then a card and its actions,
 * then comments, then the safety menu behind every "…", then the composer, the
 * single-post screen and the dead-link screen.
 *
 * Report reasons appear here as labels only — the values sent to the moderation
 * table are English constants in the component and never translated.
 */
export const feed = {
  // ── Home ───────────────────────────────────────────────────────────────────
  scopeForYou: 'For you',
  scopeFollowing: 'Following',

  messages: 'Messages',
  messagesUnread_one: 'Messages, {{count}} unread',
  messagesUnread_other: 'Messages, {{count}} unread',
  notifications: 'Notifications',
  notificationsNew_one: 'Notifications, {{count}} new',
  notificationsNew_other: 'Notifications, {{count}} new',

  emptyFollowingTitle: 'Nothing from your people yet',
  emptyFollowingBody:
    'Follow athletes, coaches and clubs you care about and their posts show up right here.',
  emptyFollowingAction: 'Find people to follow',
  emptyForYouTitle: 'Your feed is warming up',
  emptyForYouBody:
    'Follow a few athletes to fill it, or post your own update to get started.',
  emptyForYouAction: 'Find people',

  // ── Post card ──────────────────────────────────────────────────────────────
  openProfileOf: "Open {{name}}'s profile",
  postMoreOptions: "More options for {{name}}'s post, including report and block",
  showFullCaption: 'Show the full caption',
  openPost: 'Open post',

  // ── Like, comment, share, save ─────────────────────────────────────────────
  likePost: 'Like this post',
  unlikePost: 'Unlike this post',
  readAndAddComments: 'Read and add comments',
  sharePost: 'Share this post',
  savePost: 'Save this post',
  removeFromSaved: 'Remove from saved',

  // ── Media ──────────────────────────────────────────────────────────────────
  mediaSwipe_one: '{{count}} item, swipe to see more',
  mediaSwipe_other: '{{count}} items, swipe to see more',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'Video clip',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',

  // ── Comments ───────────────────────────────────────────────────────────────
  commentsTitle: 'Comments',
  commentsHeading_one: 'Comments ({{count}})',
  commentsHeading_other: 'Comments ({{count}})',
  noCommentsTitle: 'No comments yet',
  noCommentsBody: 'Say something encouraging.',
  reply: 'Reply',
  replyTo: 'Reply to {{name}}',
  replyingTo: 'Replying to {{name}}',
  stopReplying: 'Stop replying',
  commentPlaceholder: 'Add a comment…',
  writeComment: 'Write a comment',
  postComment: 'Post comment',
  ownCommentOptions: 'Options for your comment',
  reportOrBlockPerson: 'Report or block {{name}}',

  // ── Safety menu ────────────────────────────────────────────────────────────
  thisPerson: 'this person',
  actionsOwnPost: 'Your post',
  actionsOwnComment: 'Your comment',
  actionsPost: 'This post',
  actionsComment: 'This comment',
  linkCopied: 'Link copied',
  linkCopyFailed: 'We could not copy that link.',
  deletePost: 'Delete post',
  deleteComment: 'Delete comment',
  reportPost: 'Report post',
  reportComment: 'Report comment',
  reportHint: "Tell us what's wrong. Reports are private.",
  blockPerson: 'Block {{name}}',
  blockHint: "They won't be able to find you or message you.",

  reportThisPost: 'Report this post',
  reportThisComment: 'Report this comment',
  reportReasonPrompt: 'Pick the closest reason. We never tell them who reported.',
  reasonSpam: 'Spam',
  reasonHarassment: 'Harassment or bullying',
  reasonNudity: 'Nudity or sexual content',
  reasonViolence: 'Violence',
  reasonHate: 'Hate speech',
  reasonImpersonation: 'Impersonation',
  reasonChildSafety: 'Child safety',
  reasonScam: 'Scam',
  reasonOther: 'Something else',
  reportDetailsLabel: 'Anything else we should know?',
  reportEmergencyNote:
    'If someone is in danger right now, contact your local emergency services as well.',
  reportThanks: 'Thanks for telling us. Our team will take a look.',

  blockConfirmTitle: 'Block {{name}}?',
  blockConfirmBody:
    "They won't see your profile or posts, they can't message you, and you won't see them. You can undo this in Settings.",
  blockedToast: '{{name}} is blocked. You can undo this in Settings.',

  deletePostConfirmTitle: 'Delete this post?',
  deleteCommentConfirmTitle: 'Delete this comment?',
  deleteConfirmBody: "This can't be undone.",
  keepIt: 'Keep it',
  postDeleted: 'Post deleted',
  commentDeleted: 'Comment deleted',

  // ── Composer ───────────────────────────────────────────────────────────────
  composeTitle: 'New post',
  cancelAndClose: 'Cancel and close',
  postButton: 'Post',
  uploading: 'Uploading {{done}} of {{total}}…',
  audienceA11y: 'Who can see this: {{audience}}. Change it.',
  composePlaceholder: 'Share an update, a result, or a clip…',
  composeA11y: 'What do you want to share?',
  charCount: '{{used}}/{{max}}',
  clip: 'Clip',
  selectedPhoto: 'Selected photo {{index}}',
  selectedVideo: 'Selected video {{index}}',
  removePhoto: 'Remove photo {{index}}',
  removeVideo: 'Remove video {{index}}',
  addMedia: 'Add photo or video',
  addMediaA11y: 'Add a photo or video',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX needs permission to open your photos. Turn it on in Settings.',
  posted: 'Posted',
  /* Written for a 13-year-old: short, plain, and all three examples kept. */
  safetyNote: "Keep it kind. Don't share your address, phone number or school.",

  audienceSheetTitle: 'Who can see this?',
  audienceEveryone: 'Everyone',
  audienceEveryoneDetail: 'Anyone on AceAiX can see it.',
  audienceFollowersDetail: 'Only people who follow you.',
  audienceConnections: 'Connections',
  audienceConnectionsDetail: 'Only people you follow who follow you back.',

  discardTitle: 'Discard this post?',
  discardBody: "Your words and anything you picked won't be saved.",
  discard: 'Discard',
  keepWriting: 'Keep writing',

  // ── One post ───────────────────────────────────────────────────────────────
  postTitle: 'Post',
  postUnavailableTitle: 'This post is no longer available',
  postUnavailableBody: 'It may have been deleted or taken down.',
  postUnavailableBodyRules:
    'It may have been deleted, or taken down for breaking our rules.',
  goBack: 'Go back',

  // ── Dead link ──────────────────────────────────────────────────────────────
  notFoundTitle: 'This page has moved on',
  notFoundBody: 'The link you followed does not lead anywhere in AceAiX.',
  notFoundAction: 'Back to home',
};
