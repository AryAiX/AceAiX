/**
 * 安全 —— 拉黑、监护人同意，以及一切保护未成年人的内容。
 *
 * 刻意与 `settings.ts` 分开：这是合规文案，审核的人应该能在一个地方、
 * 用任何一种语言把它从头读到尾，而不必在主题选择和通知开关里翻找。
 *
 * 这里的每一层含义都是承重的。最低年龄是13岁。13至17岁的人在家长或监护人
 * 批准之前，既搜不到也收不到私信。“所有人”这个收件箱选项从不提供给
 * 未成年人。可以改写措辞；但不要弱化、笼统化，也不要漏掉任何一个条件。
 *
 * 举报理由在数据库里以英文存储 —— 只有举报者读到的标签会被翻译。
 */
export const safety = {
  // ── 拉黑（app/settings/blocked.tsx） ───────────────────────────────────────
  blockedTitle: '已拉黑的账号',
  blockedEmptyTitle: '你还没有拉黑过任何人。',
  blockedEmptyBody:
    '拉黑一个人之后，他们不能给你发私信、不能关注你，也看不到你的动态。他们不会收到任何通知。',
  blockedCount_other:
    '已拉黑{{count}}个账号。他们不能给你发私信、不能关注你，也看不到你的动态。',
  unblockConfirmTitle: '解除对{{name}}的拉黑？',
  unblockConfirmBody:
    '在你的隐私设置允许的范围内，他们将重新可以找到你、关注你并给你发私信。无论解除与否，他们都不会被告知。',
  unblockedToast: '已解除对{{name}}的拉黑',

  /** 显示在隐私页面上，那里只解释拉黑，不执行拉黑。 */
  blockingExplainer:
    '拉黑一个人之后，他们不能联系你、不能关注你，也看不到你的动态，而且不会被告知。你可以在{{settings}}里的{{blocked}}中撤销。',

  // ── 未成年人（app/settings/privacy.tsx） ───────────────────────────────────
  minorMessagingNote:
    '因为你未满18岁，“所有人”不是一个可选项。只有认证过的教练和俱乐部才能主动给你写信，而且必须是在家长或监护人批准私信之后。',
  minorNeverPublic:
    '你未满18岁，所以你的资料绝不会展示给未登录的人。这一点没有设置项，也没有办法关掉 —— 它由我们的数据库强制执行，不是由应用来把关。',
  minorsNeverPublicNote:
    '任何未满18岁的人的资料，都绝不会展示给未登录的访客，无论他们的设置是什么。',
  discoveryWaitingGuardian: '等待家长或监护人',
  guardianApprovalNeeded: '需要家长或监护人先批准。',
  askGuardian: '请家长或监护人批准',

  /** 账号页面：为什么有认证，以及认证能解锁什么。 */
  verificationFooter:
    '认证标记告诉运动员和俱乐部，我们核实过你的身份。同时，只有认证过的成年人，才能主动和未满18岁的运动员对话。',

  /** 球探偏好：招募方对未成年人可以做什么、不可以做什么。 */
  scoutingMinorNote:
    '未满18岁的运动员，只有在家长或监护人批准之后才会出现在这里；而且只有你的账号通过认证，才能给他们发私信。',

  // ── 监护人同意（app/settings/guardian.tsx） ────────────────────────────────
  guardianTitle: '家长与监护人',
  guardianAthletesTitle: '你照看的运动员',
  guardianSubtitleMinor: '你资料的授权情况',

  // 监护人逐项批准的内容
  scopeDiscovery: '出现在球探搜索里',
  scopeDiscoveryOff: '不出现在搜索里',
  scopeMessaging: '接收认证过的教练和俱乐部的私信',
  scopeMessagingOff: '没有人能主动发私信',
  scopeMedia: '在主页上展示照片和视频',
  scopeMediaOff: '不展示照片和视频',

  // 年轻运动员看到的
  minorHeading: '你的家长或监护人',
  minorIntro:
    '你未满18岁，所以要由一位成年人批准你的资料，教练和俱乐部才能找到你。在他们批准之前，你不会出现在搜索里，也没有人能主动给你发私信。',

  consentApproved: '已批准',
  consentActive: '生效中',
  consentGrantedMeta: '{{name}} · {{date}}',
  whatTheyApproved: '他们批准了什么',
  changeConsentNote:
    '要更改其中任何一项，请让{{name}}打开我们发到 {{email}} 的那封邮件里的链接，或者写信到 {{contact}}。',
  withdrawPermission: '撤回授权',

  consentWaitingTitle: '等待批准',
  consentPending: '待处理',
  consentSentOn: '{{date}}发送',
  consentEmailNote_other:
    '我们已经给他们发了一个安全链接，有效期{{count}}天。如果没有收到，请他们查一下垃圾邮件，然后再发一次。',
  resendEmail: '重新发送邮件',
  resentToast: '邮件已经再发了一次。',

  consentRevokedNote:
    '授权已于{{date}}撤回。在成年人重新批准之前，你的资料不会出现在搜索里。',

  // 请求授权
  askForPermission: '请求授权',
  askSomeoneElse: '换一个人问',
  requestFormHint:
    '我们会给他们发一个链接。允许什么由他们决定，而且他们随时可以改主意。',
  guardianNameLabel: '他们的全名',
  guardianNamePlaceholder: '例如 Amina Haddad',
  guardianEmailLabel: '他们的邮箱地址',
  relationshipQuestion: '他们和你是什么关系？',
  relationshipParent: '家长',
  relationshipGuardian: '监护人',
  relationshipOther: '其他',
  guardianEmailUseNote:
    '请填一个他们真在用、会查看的地址。我们只用它来请求授权，以及在你的账号有变动时通知他们。',
  sendRequest: '发送请求',
  sendNewRequest: '发送新的请求',
  replacesPending: '发送新请求会替换掉正在等待的那一条。',
  requestSentToast: '已发送。请他们查一下收件箱。',
  nameRequired: '请填写他们的全名。',
  emailInvalid: '这个邮箱地址看起来不太对。',

  whatChangesHeading: '他们批准之后会有什么变化',
  whatChangesBody:
    '你的资料可以出现在球探搜索里，认证过的教练和俱乐部可以给你发第一条私信。除此之外没有别的变化，你的准确年龄和出生日期仍然是私密的。',
  readChildSafety: '阅读我们的儿童安全标准',

  withdrawConfirmTitle: '撤回授权？',
  withdrawConfirmBody:
    '你的资料会重新从球探搜索里隐藏，教练也将无法再和你开始新的对话。你随时可以重新请求授权。',
  withdraw: '撤回',
  consentWithdrawnToast: '授权已撤回。你的资料重新从搜索里隐藏。',

  // 监护人看到的
  approvingHeading: '批准一位年轻运动员',
  approvingBody1:
    '当一位13至17岁的人把你写成他的家长或监护人时，我们会给你发一个安全链接。打开它，你可以分别批准或拒绝三件事：出现在球探搜索里、接收认证过的教练和俱乐部的私信，以及展示照片和视频。',
  approvingBody2_other:
    '这个链接的有效期是{{count}}天。在你使用它之前，他们的资料不会出现在搜索里，也没有成年人能给他们发私信。你随时可以通过同一个链接更改或撤回你的决定，也可以写信到 {{email}}。',
  guardianPhishingNote:
    '我们绝不会通过邮件向你索要付款、银行信息或身份证件的复印件。如果有消息自称来自 AceAiX 并索要这些东西，那不是我们发的。',

  linkedAthletes: '与你关联的运动员',
  noLinkedAthletes:
    '还没有人写你的名字。等有人写了，请求会通过邮件发来，并出现在这里。',
  linkApprovedOn: '{{date}}批准',
  linkRequestedOn: '{{date}}请求',
  linkWithdrawn: '授权已撤回',
  linkExpired: '请求已过期',
  badgeWithdrawn: '已撤回',
  badgeExpired: '已过期',

  // 监护人能看到一段对话的什么：只看到它存在，永远看不到内容
  whoTheyTalkTo: '他们在和谁说话',
  noConversations: '还没有对话。',
  messageContentsNote:
    'AceAiX 不会把他们私信的内容展示给你。如果有什么让你担心，请写信到 {{email}}。',

  guardianContactNote:
    '关于未成年人账号的问题：{{privacyEmail}}。关于他们安全的任何事：{{safetyEmail}}。',

  // 一位成年人误入了监护人页面
  adultNothingTitle: '没有需要批准的内容',
  adultNothingBody:
    '监护人授权只适用于13至17岁的人的账号。你的是成年人账号，所以你的资料和私信由你自己的隐私设置来决定。',
};
