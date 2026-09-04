/**
 * 动态流、发布器和单条动态。
 *
 * 按人遇到它们的顺序分组：首页，然后是一张卡片和它的操作，接着是评论、
 * 每个“…”背后的安全菜单，再是发布器、单条动态页面和失效链接页面。
 *
 * 举报理由在这里只是显示用的标签 —— 写进审核表的值是组件里的英文常量，
 * 从不翻译。
 */
export const feed = {
  // ── 首页 ───────────────────────────────────────────────────────────────────
  scopeForYou: '推荐',
  scopeFollowing: '关注',

  messages: '私信',
  messagesUnread_other: '私信，{{count}}条未读',
  notifications: '通知',
  notificationsNew_other: '通知，{{count}}条新消息',

  emptyFollowingTitle: '你关注的人还没有动态',
  emptyFollowingBody:
    '关注你在意的运动员、教练和俱乐部，他们的动态就会出现在这里。',
  emptyFollowingAction: '找人关注',
  emptyForYouTitle: '你的动态流正在预热',
  emptyForYouBody:
    '关注几位运动员把它填满，或者先发一条自己的动态。',
  emptyForYouAction: '找人',

  // ── 动态卡片 ───────────────────────────────────────────────────────────────
  openProfileOf: '打开{{name}}的主页',
  postMoreOptions: '{{name}}这条动态的更多选项，包括举报和拉黑',
  showFullCaption: '显示完整文字',
  openPost: '打开动态',

  // ── 点赞、评论、分享、收藏 ─────────────────────────────────────────────────
  likePost: '给这条动态点赞',
  unlikePost: '取消点赞',
  readAndAddComments: '查看和发表评论',
  sharePost: '分享这条动态',
  savePost: '收藏这条动态',
  removeFromSaved: '取消收藏',

  // ── 媒体 ───────────────────────────────────────────────────────────────────
  mediaSwipe_other: '{{count}}项内容，左右滑动查看',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: '视频短片',
  soundOn: '打开声音',
  soundOff: '关闭声音',

  // ── 评论 ───────────────────────────────────────────────────────────────────
  commentsTitle: '评论',
  commentsHeading_other: '评论（{{count}}）',
  noCommentsTitle: '还没有评论',
  noCommentsBody: '说句鼓励的话吧。',
  reply: '回复',
  replyTo: '回复{{name}}',
  replyingTo: '正在回复{{name}}',
  stopReplying: '取消回复',
  commentPlaceholder: '写条评论…',
  writeComment: '写评论',
  postComment: '发表评论',
  ownCommentOptions: '你这条评论的选项',
  reportOrBlockPerson: '举报或拉黑{{name}}',

  // ── 安全菜单 ───────────────────────────────────────────────────────────────
  thisPerson: '这个人',
  actionsOwnPost: '你的动态',
  actionsOwnComment: '你的评论',
  actionsPost: '这条动态',
  actionsComment: '这条评论',
  linkCopied: '链接已复制',
  linkCopyFailed: '复制不了这个链接。',
  deletePost: '删除动态',
  deleteComment: '删除评论',
  reportPost: '举报动态',
  reportComment: '举报评论',
  reportHint: '告诉我们哪里有问题。举报内容是保密的。',
  blockPerson: '拉黑{{name}}',
  blockHint: '他们将无法找到你，也无法给你发私信。',

  reportThisPost: '举报这条动态',
  reportThisComment: '举报这条评论',
  reportReasonPrompt: '选最接近的理由。我们绝不会告诉对方是谁举报的。',
  reasonSpam: '垃圾信息',
  reasonHarassment: '骚扰或欺凌',
  reasonNudity: '裸露或性内容',
  reasonViolence: '暴力',
  reasonHate: '仇恨言论',
  reasonImpersonation: '冒充他人',
  reasonChildSafety: '儿童安全',
  reasonScam: '诈骗',
  reasonOther: '其他情况',
  reportDetailsLabel: '还有别的要告诉我们吗？',
  reportEmergencyNote:
    '如果有人现在正处于危险中，请同时联系当地的紧急救助部门。',
  reportThanks: '谢谢你告诉我们，我们的团队会去看看。',

  blockConfirmTitle: '拉黑{{name}}？',
  blockConfirmBody:
    '他们看不到你的主页和动态，不能给你发私信，你也不会再看到他们。你可以在设置里撤销。',
  blockedToast: '已拉黑{{name}}。你可以在设置里撤销。',

  deletePostConfirmTitle: '删除这条动态？',
  deleteCommentConfirmTitle: '删除这条评论？',
  deleteConfirmBody: '删除后无法恢复。',
  keepIt: '保留',
  postDeleted: '动态已删除',
  commentDeleted: '评论已删除',

  // ── 发布器 ─────────────────────────────────────────────────────────────────
  composeTitle: '新动态',
  cancelAndClose: '取消并关闭',
  postButton: '发布',
  uploading: '正在上传第{{done}}项，共{{total}}项…',
  audienceA11y: '谁能看到：{{audience}}。点击更改。',
  composePlaceholder: '分享近况、成绩，或者一段短片…',
  composeA11y: '你想分享点什么？',
  charCount: '{{used}}/{{max}}',
  clip: '短片',
  selectedPhoto: '已选照片{{index}}',
  selectedVideo: '已选视频{{index}}',
  removePhoto: '移除照片{{index}}',
  removeVideo: '移除视频{{index}}',
  addMedia: '添加照片或视频',
  addMediaA11y: '添加一张照片或一段视频',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX 需要访问相册的权限。请在系统设置里打开。',
  posted: '已发布',
  /* 写给13岁的人看：短、直白，三个例子一个都不少。 */
  safetyNote: '友善一点。不要透露你的住址、电话或学校。',

  audienceSheetTitle: '谁能看到这条？',
  audienceEveryone: '所有人',
  audienceEveryoneDetail: 'AceAiX 上的任何人都能看到。',
  audienceFollowersDetail: '只有关注你的人。',
  audienceConnections: '互相关注的人',
  audienceConnectionsDetail: '只有你关注、并且也关注了你的人。',

  discardTitle: '放弃这条动态？',
  discardBody: '你写的内容和选好的素材都不会保存。',
  discard: '放弃',
  keepWriting: '继续写',

  // ── 单条动态 ───────────────────────────────────────────────────────────────
  postTitle: '动态',
  postUnavailableTitle: '这条动态已经不在了',
  postUnavailableBody: '可能已被删除或下架。',
  postUnavailableBodyRules:
    '可能已被删除，也可能因违反规则被下架。',
  goBack: '返回',

  // ── 失效链接 ───────────────────────────────────────────────────────────────
  notFoundTitle: '这个页面已经不在了',
  notFoundBody: '你点开的链接在 AceAiX 里指向不了任何地方。',
  notFoundAction: '回到首页',
};
