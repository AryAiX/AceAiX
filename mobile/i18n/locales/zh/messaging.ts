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
};
