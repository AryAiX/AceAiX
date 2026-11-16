/**
 * 私信和通知。
 *
 * 按人遇到它们的顺序分组：收件箱和其中一行，每个“…”背后的安全菜单，
 * 然后是会话本身 —— 头部、日期分隔、气泡、未满18岁的提示条、
 * 消息发不出去时取代输入框的那张卡片，以及输入框 —— 最后是通知页面和
 * 其中一条通知。
 *
 * 有两样东西刻意放在别处。举报理由只是显示用的标签：写进审核表的值是组件里的
 * 英文常量。数据库返回的拦截原因（`minor_requires_verified_sender` 之类）
 * 也从不翻译 —— 翻译的只是每一种原因对应的说明。
 */
export const messaging = {
  // ── 收件箱 ─────────────────────────────────────────────────────────────────
  inboxTitle: '私信',
  inboxEmptyTitle: '还没有私信',
  inboxEmptyBody: '教练或俱乐部联系你时，消息会出现在这里。',
  inboxEmptyAction: '去“发现”看看',
  searchChats: '搜索聊天',
  filterAll: '全部',
  filterUnread: '未读',
  markRead: '已读',
  markUnread: '未读',
  mute: '静音',
  unmute: '取消静音',
  alreadyRead: '此聊天已读，无法标记为未读。',
  select: '选择',
  selectAll: '全选',
  selectedCount_other: '已选择 {{count}} 个',
  selectHint: '点按聊天以选择',
  receiptSent: '已发送',
  receiptSeen: '已读',
  previewYou: '你：{{text}}',
  startTitle: '开始对话',
  startBody: '在运动员、教练和俱乐部的主页上给他们发消息。',
  startAction: '寻找用户',
  noMatches: '没有符合搜索的聊天。',
  allCaughtUp: '全部已读。',
  swipeHint: '向左滑动聊天可标记已读或静音',
  sendTo: '发送给',
  pickChats: '选择聊天',
  sendToChats: '发送 · {{count}}',
  sharedToChats: '已发送',
  shareSomeFailed: '部分聊天发送失败，请重试。',
  copyLink: '复制链接',
  tapToOpen: '点按打开',
  viewProfile: '查看主页',
  postUnavailable: '帖子不可用',
  profileUnavailable: '主页不可用',
  previewSharedPost: '分享了帖子',
  previewSharedProfile: '分享了主页',
  tapToWatch: '点按观看',
  clipUnavailable: '片段不可用',
  previewSharedClip: '分享了片段',

  // ── 一条会话 ───────────────────────────────────────────────────────────────
  previewBlocked: '你拉黑了这个账号',
  previewNone: '还没有消息',
  unreadMessages_other: '{{count}}条未读私信',
  /* 显示在标记里，代替一个四位数。 */
  unreadOverflow: '99+',
  conversationHint: '点击打开会话。长按查看更多选项。',

  // ── 安全菜单（收件箱行和会话里的“…”） ────────────────────────────────────
  thisPerson: '这个人',
  thisPersonSentence: '这个人',
  muteConversation: '免打扰',
  unmuteConversation: '取消免打扰',
  muteHint: '只在这台手机上生效。对方永远不会知道。',
  reportHint: '告诉我们哪里有问题。举报内容是保密的。',
  blockPerson: '拉黑{{name}}',
  blockHint: '他们不能给你发私信，也找不到你的主页。',

  reportPerson: '举报{{name}}',
  reportReasonPrompt: '选最接近的理由。我们绝不会告诉对方是谁举报的。',
  reasonHarassment: '骚扰或欺凌',
  reasonChildSafety: '儿童安全',
  reasonScam: '诈骗或虚假报价',
  reasonSpam: '垃圾信息',
  reasonNudity: '裸露或性内容',
  reasonHate: '仇恨言论',
  reasonImpersonation: '冒充他人',
  reasonOther: '其他情况',
  reportDetailsLabel: '还有别的要告诉我们吗？',
  reportEmergencyNote:
    '如果有人现在正处于危险中，请同时联系当地的紧急救助部门。',
  reportThanks: '谢谢你告诉我们，我们的团队会去看看。',

  blockConfirmTitle: '拉黑{{name}}？',
  blockConfirmBody:
    '他们看不到你的主页和动态，不能给你发私信，你也不会再看到他们。你可以在设置里撤销。',
  blockedToast: '已拉黑{{name}}。你可以在设置里撤销。',

  // ── 会话 ───────────────────────────────────────────────────────────────────
  conversationNotOpened: '这个会话打不开。',
  loadingMessages: '正在加载消息',
  threadStart: '这是你们对话的开始。打个招呼吧。',
  threadStartWith: '这是你和{{name}}对话的开始。打个招呼吧。',

  closedTitle: '这个会话已关闭',
  closedBody:
    '你拉黑了这个账号，所以你们互相都看不到对方。你可以在设置里撤销。',
  closedAction: '返回私信',
  blockedFromThread: '你不会再收到这个账号的消息。',

  // ── 会话头部 ───────────────────────────────────────────────────────────────
  backToMessages: '返回私信',
  openProfileOf: '打开{{name}}的主页',
  loadingConversation: '正在加载会话',
  moreOptions: '更多选项',

  // ── 一条消息 ───────────────────────────────────────────────────────────────
  messageFailedA11y: '消息发送失败。点击重试。',
  notSent: '未发送 —— 点击重试',
  sending: '发送中',

  // ── 未满18岁提示条 ─────────────────────────────────────────────────────────
  /* 合规文案。含义精确，在任何语言里都必须保持精确：被发私信的人未满18岁，
     他们的家长或监护人能看到这个会话存在 —— 但看不到里面的内容。 */
  minorBanner:
    '你正在给一位未满18岁的运动员发私信。他们的家长或监护人能看到这个会话存在。',

  // ── 消息被拦截 ─────────────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: '这里的私信有限制',
  blockedVerifiedSenderBody:
    '{{name}}未满18岁。只有经我们认证的教练和俱乐部才能主动和他们对话。',
  blockedGuardianConsentTitle: '等待家长或监护人批准',
  blockedGuardianConsentBody:
    '{{name}}未满18岁，他们的家长或监护人还没有批准私信。',
  blockedMessagesOffTitle: '私信已关闭',
  blockedMessagesOffBody: '{{name}}目前选择不接收私信。',
  blockedOnlyFollowedTitle: '不接收新私信',
  blockedOnlyFollowedBody: '{{name}}只接收自己关注的人发来的私信。',
  blockedOnlyVerifiedTitle: '仅限认证账号',
  blockedOnlyVerifiedBody:
    '{{name}}只接收认证过的教练和俱乐部发来的私信。',
  blockedNotFoundTitle: '这个账号已经不在了',
  blockedNotFoundBody: '你要发私信的人已经不在 AceAiX 上了。',
  blockedDefaultTitle: '这里无法发私信',
  blockedDefaultBody: '我们目前无法把消息送到{{name}}那里。',

  howTitle: '私信是怎么运作的',
  howSubtitle:
    'AceAiX 是为年轻运动员做的，所以谁能主动发起对话是有意加以限制的。',
  howMinorsTitle: '未满18岁的运动员受到额外保护',
  howMinorsBody:
    '一个成年人要想主动和未满18岁的运动员对话，必须同时满足两个条件：我们已经认证他是教练或俱乐部，并且这位运动员的家长或监护人已经批准私信。',
  howInboxTitle: '每个人都能自己定收件箱的规矩',
  howInboxBody:
    '任何人都可以把私信限制为认证过的教练和俱乐部、限制为自己关注的人，或者完全关闭。这是他们自己的选择，我们不会去覆盖它。',
  howTemporaryTitle: '这里没有什么是永久的',
  howTemporaryBody:
    '如果监护人批准了私信，或者对方改了收件箱设置，这个会话会自己打开。互相关注也有帮助。',
  howWrongTitle: '如果觉得哪里不对劲',
  howWrongBody:
    '在任何会话顶部的“…”菜单里举报或拉黑。举报内容是保密的 —— 我们绝不会告诉对方是谁举报的。',
  gotIt: '知道了',

  // ── 输入框 ─────────────────────────────────────────────────────────────────
  composerPlaceholder: '写条消息',
  composerPlaceholderNamed: '给{{name}}发私信',
  sendMessage: '发送消息',

  // ── 通知 ───────────────────────────────────────────────────────────────────
  notificationsTitle: '通知',
  sectionNew: '新消息',
  sectionThisWeek: '本周',
  likedYourPosts_other: '{{name}} 赞了你的 {{count}} 条动态',
  moreNotifications_other: '还有{{count}}条通知',
  sectionEarlier: '更早',
  markAllRead: '全部标为已读',
  markAllReadA11y_other: '把{{count}}条通知全部标为已读',
  notificationsEmptyTitle: '没有新消息',
  notificationsEmptyBody: '发段短片，或者关注几家俱乐部，这里就会热闹起来。',
  notificationsEmptyAction: '找人关注',

  // ── 一条通知 ───────────────────────────────────────────────────────────────
  /* 句子本身由服务端写好后传来 —— 参见 NotificationRow 里的 KNOWN GAP 说明。
     只有前面的人名部分是我们的：服务端把最新一位的名字放在前面，再数出其余
     的人数，而 `groupedTitle` 就是从右往左阅读的语言可以调换两半顺序的地方。 */
  actorAndOthers_other: '{{name}}等{{count}}人',
  groupedTitle: '{{actors}}{{rest}}',
  unread: '未读',
  meetupNearbyTitle: '{{city}}有新的{{sport}}比赛',
  mentionedInPost: '{{name}}在一条动态里提到了你',
  mentionedInComment: '{{name}}在一条评论里提到了你',
  taggedInPost: '{{name}}在一条动态里标记了你',
  referralJoined: '{{name}}通过你的邀请加入了',
  referralJoinedNoName: '有一位朋友通过你的邀请加入了',
  referralTokenTitle: '你获得了 1 积分',
  referralTokenBody_other: '已有 {{n}} 位朋友通过你的邀请加入 AceAiX。',
  sportApproved: '你的项目已通过：{{sport}}',
  sportMatched: '你的项目已设为{{sport}}',
  sportRejected: '你的项目申请没有通过',
  followedYou: '{{actors}}开始关注你了',
  likedYourPost: '{{actors}}赞了你的动态',
  commentedOnPost: '{{actors}}评论了你的动态',
  repliedToYou: '{{actors}}回复了你',
  sentYouMessage: '{{actors}}给你发来一条消息',
  viewedYourProfile: '{{actors}}看了你的主页',
  challengeConfirmed: '你在{{challenge}}的参赛已确认',
  challengeConfirmedPlain: '你的参赛已确认',
  challengeAnotherGo: '你在{{challenge}}的参赛需要再来一次',
  challengeAnotherGoPlain: '你的参赛需要再来一次',
  challengeCoachConfirmed: '教练看过并确认了成绩。',
  challengeCoachRetry: '再读一遍要求，重新传一段短片。',
  clubPageVerified: '你的俱乐部主页已认证',
  clubVerificationRejected: '你的俱乐部认证未通过',
  clubVerificationMoreInfo: '我们需要更多信息才能认证你的俱乐部',
  clubInviteAccepted: '你的邀请已被接受',
  guardianApproved: '你的家长批准了你的账号',
  guardianChanged: '你的家长改了你能做的事',
  guardianNotApproved: '你的家长没有批准你的请求',
  guardianWithdrawn: '你的家长撤回了批准',
  giCompleted: '{{name}}完成了球商游戏',
  giCompletedPrivate: '除非他们选择分享，否则结果只有他们自己能看到。',
  sportFitCompleted: '{{name}}完成了运动契合度',
  sportFitPrivate: '他们的回答和结果只有他们自己能看到。',
  scoreTierReached: '你达到了{{tier}}等级',
  scoreTierNow: '你的天赋分现在是{{score}}。',
  clubInviteRun: '你被邀请协助管理{{club}}',
  clubEventCancelled: '{{event}}已取消',
  clubEventRegistered: '{{name}}报名参加了{{event}}',
  clubEventChildRegistered: '你的孩子报名参加了{{event}}',
  clubSquadAdded: '{{club}}已将你加入{{squad}}阵容',
  clubMatchLive: '{{club}}对阵{{opponent}}，正在直播',
  meetupWantsToJoin: '{{name}}想加入{{meetup}}',
  meetupYouAreIn: '你已加入：{{meetup}}',
  meetupNotThisTime: '这次不行：{{meetup}}',
  meetupCalledOff: '{{meetup}}取消了',
  challengeEntered: '{{name}}参加了{{challenge}}',
  challengeNewClip: '有一段新的短片在等你。',
  appliedTo: '{{name}}申请了{{what}}',
  applicationNow: '你对{{opportunity}}的申请现在是{{status}}',
  endorsedYouFor: '{{name}}因{{skill}}推荐了你',
  bookedService: '{{name}}预约了{{service}}',
  bookingCancelledByGuardian: '一位监护人取消了一项预约',
  coachingCancelledByAce: 'AceAiX取消了一节训练课：{{reason}}',
  cancelledSessionOn: '{{name}}取消了{{date}}的那节课',
  parentCancelled: '你的家长取消了{{session}}',
  childParentCancelled: '{{child}}的家长取消了{{session}}',
  cancelledSession: '{{name}}取消了{{session}}',
  aSession: '一节课',
  sponsorshipOfferFor: '{{sponsor}}就{{request}}发出了赞助邀约',
  sponsorshipOfferToChild: '{{sponsor}}向你的孩子发出了赞助邀约',
  anAthlete: '一名运动员',
  childAppliedToCall: '你的孩子申请了一项赞助征集：{{call}}',
  acceptedYourOffer: '{{name}}接受了你的赞助邀约',
  declinedYourOffer: '{{name}}拒绝了你的赞助邀约',
  acceptedYourApplication: '{{name}}接受了你的赞助申请',
  declinedYourApplication: '{{name}}拒绝了你的赞助申请',
  childParentAcceptedOffer: '{{child}}的家长接受了你的赞助邀约',
  childParentDeclinedOffer: '{{child}}的家长拒绝了你的赞助邀约',
  childParentWithdrewCall: '{{child}}的家长撤回了对你征集的申请',
  parentAcceptedOfferFrom: '你的家长接受了来自{{brand}}的赞助邀约',
  parentDeclinedOfferFrom: '你的家长拒绝了来自{{brand}}的赞助邀约',
  parentWithdrewApplication: '你的家长撤回了你向{{brand}}提交的申请',
  childOfferAccepted: '给你孩子的一项赞助邀约已被接受',
  childOfferDeclined: '给你孩子的一项赞助邀约已被拒绝',
  childApplicationAccepted: '给你孩子的一项赞助申请已被接受',
  childApplicationDeclined: '给你孩子的一项赞助申请已被拒绝',
};
