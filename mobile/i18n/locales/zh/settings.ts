/**
 * 设置树 —— `app/settings/` 下的每个页面、构成它们的部件，
 * 以及四份法律文件外围的框架文案。
 *
 * 凡是关于举报、拉黑、监护人或未满18岁保护的内容，都放在 `safety.ts` 里，
 * 好让那部分文案能单独审核。共用词汇（保存、取消、已认证、解除拉黑、天赋分、
 * 四份文件的名称）来自 `common.ts`，这里不再重复。
 *
 * 关于存储值：球探选择的项目、位置、水平和国家以英文存储，渲染时通过
 * `constants/sports.ts` 翻译。这个文件里只有它们周围的标签。
 */
export const settings = {
  // ── 设置首页（app/settings/index.tsx） ─────────────────────────────────────
  title: '设置',

  sectionAccount: '账号',
  accountTitle: '账号',
  accountSubtitle: '邮箱、密码、认证',
  appearanceTitle: '外观',
  appearanceSubtitle: '浅色、深色或跟随手机',
  notificationsTitle: '通知',
  notificationsSubtitle: '选择哪些消息能找到你',

  sectionPrivacySafety: '隐私与安全',
  privacyTitle: '隐私',
  privacySubtitle: '谁能给你发私信、谁能找到你',

  sectionScouting: '球探',
  scoutingFooter: '我们用它来决定“发现”里谁排在最前面。',
  scoutingTitle: '你在找什么样的人',
  scoutingSubtitle: '项目、位置、水平和年龄',

  sectionAbout: '关于',
  supportTitle: '联系客服',
  supportFallback: '写信给我们：{{email}}',
  versionTitle: '版本',

  signOut: '退出登录',
  signOutConfirmTitle: '退出登录？',
  signOutConfirmBody: '再次登录时需要你的邮箱和密码。',

  /** “AceAiX by AryAiX”—— 两个都是品牌名，原样传入。 */
  productBy: '{{product}} 由 {{company}} 出品',

  // ── 账号（app/settings/account.tsx） ───────────────────────────────────────
  sectionSignIn: '登录',
  signInFooter:
    '你的邮箱既是登录方式，也是我们就账号事宜联系你的方式。要更改它，请写信到 {{email}}。',
  emailLabel: '邮箱',
  notSignedIn: '未登录',

  sectionVerification: '认证',
  verificationTitle: '认证',
  requestVerification: '申请认证',
  verificationCheckedSubtitle: '你的账号已核实',
  verificationAskSubtitle: '请我们核实你的账号',
  verificationInReview: '审核中',
  verificationSentOn: '{{date}}提交',
  verificationApproved: '已通过',
  verificationApprovedSubtitle: '你的标记正在路上',
  verificationRejected: '未通过',
  verificationRejectedSubtitle: '你可以重新提交申请',
  verificationRequestSent: '申请已提交，我们会尽快查看。',

  sectionYourData: '你的数据',
  dataFooter:
    '文件是 JSON 格式：你的资料、动态、评论、关注、申请和媒体文件，与我们存的完全一致。',
  downloadMyData: '下载我的数据',
  downloadSubtitle: '获取账号上所有内容的副本',
  preparingFile: '正在准备你的文件…',
  preparingShort: '准备中…',
  exportSaved: '已保存 {{name}}',

  // 修改密码弹层
  changePassword: '修改密码',
  changePasswordSubtitle: '这台设备上会保持登录状态。',
  currentPassword: '当前密码',
  currentPasswordPlaceholder: '你现在的密码',
  newPassword: '新密码',
  newPasswordHint_other: '至少{{count}}个字符。',
  newPasswordPlaceholder: '只有你知道的东西',
  confirmNewPassword: '确认新密码',
  confirmNewPasswordPlaceholder: '再输入一遍',
  passwordTooShort_other: '密码至少要有{{count}}个字符。',
  passwordsDoNotMatch: '两次输入的密码不一样。',
  passwordUnchanged: '这就是你现在用的密码。',
  passwordCurrentWrong: '当前密码不正确。',
  passwordChanged: '密码已修改。',
  passwordPhishingNote:
    '我们绝不会通过邮件或消息索要你的密码。如果有人这么做，那不是我们。',

  // ── 隐私（app/settings/privacy.tsx） ───────────────────────────────────────
  messagePrivacyHeading: '谁能给你发私信',
  messagePrivacyHint:
    '这只影响新的会话。已经在聊的仍然可以继续。',

  privacyEveryone: '所有人',
  privacyEveryoneHint: 'AceAiX 上的任何人都能主动和你对话。',
  privacyVerified: '认证过的教练和俱乐部',
  privacyVerifiedHint: '只有我们核实过的账号，以及关注你的人。',
  privacyFollowing: '你关注的人',
  privacyFollowingHint: '只有你已经关注的账号能主动写信给你。',
  privacyNobody: '没有人',
  privacyNobodyHint: '没有人能开始新的会话。已有的对话照常。',

  discoveryHeading: '出现在球探搜索里',
  discoveryHint: '打开之后，教练和俱乐部就能在“发现”里找到你。',
  discoverable: '可被发现',
  discoverableOn: '你的资料可以出现在搜索里',
  discoverableOff: '你不会出现在搜索里',

  publicWebHeading: '向未登录的访客展示我的资料',
  publicWebAdult:
    '设置为出现在搜索里的成年人资料，未登录的人也能在网页上看到。关掉上面的“{{setting}}”，两处就都不会出现。',
  readPrivacyPolicy: '阅读完整的隐私政策',

  // ── 通知（app/settings/notifications.tsx） ─────────────────────────────────
  pushOffTitle: '推送通知已关闭',
  pushOffBody:
    '你的手机不允许 AceAiX 发送通知，所以应用关闭时，下面这些都到不了你这里。',
  turnOnPush: '打开推送',
  pushStillOff: '推送仍然是关的。你可以在手机的系统设置里打开。',
  autoSaveNote: '更改会自动保存。',

  sectionHowWeReach: '我们怎么联系你',
  pushTitle: '推送通知',
  pushSubtitle: '应用关闭时，发到你的手机上',
  emailTitle: '邮件',
  emailSubtitle: '偶尔给你的收件箱发一份汇总',

  sectionActivity: '动态',
  activityFooter: '这些同时也决定了应用内通知里会出现什么。',
  notifyFollows: '新粉丝',
  notifyMessages: '私信',
  notifyComments: '评论',
  notifyLikes: '点赞',

  sectionOpportunities: '机会和你的分数',
  notifyOpportunities: '新机会',
  notifyApplications: '申请进展',
  notifyScoutInterest: '球探关注',
  notifyScoreUpdates: '天赋分变动',

  noMarketingNote:
    '我们从不发送营销类推送通知，也不会把你的信息卖给任何做这种事的人。',

  // ── 球探偏好（app/settings/scouting.tsx） ──────────────────────────────────
  scoutingIntro:
    '这些决定“发现”优先把谁推到你面前，以及我们会把哪些运动员告诉你。留空就表示“没有偏好”。',
  scoutingSports: '项目',
  scoutingSportsHint: '把你招募的项目都选上。',
  scoutingPositions: '位置',
  scoutingPositionsHint: '只包含你所选项目里的位置。',
  scoutingPositionsEmpty: '先选一个项目，它的位置就会出现在这里。',
  scoutingLevels: '水平',
  scoutingCountries: '国家',
  scoutingCountriesHint: '运动员所在的地方。',

  ageRange: '年龄范围',
  youngest: '最小',
  oldest: '最大',
  yearsSuffix: '岁',

  minimumTalentScore: '最低天赋分',
  atLeast: '至少',
  anyScoreHint: '不限分数，包括还没有分数的运动员',
  minScoreHint: '只看{{score}}分及以上的运动员',

  filters: '筛选条件',
  openToOffersOnly: '只看接受报价的',
  openToOffersHint: '不显示没有表示在找机会的运动员',
  notifyNewMatches: '有新匹配时通知我',
  notifyNewMatchesHint: '当符合条件的运动员加入或提升时',

  savePreferences: '保存偏好',
  preferencesSaved: '已保存。“发现”从现在起会按这个来。',

  // ── 外观（app/settings/appearance.tsx） ────────────────────────────────────
  themeHeading: '主题',
  themeBody:
    '“跟随系统”会随你手机的设置走，包括它的夜间时间表。',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  preview: '预览',
  themeSystemNoteLight: '你的手机当前是浅色模式。',
  themeSystemNoteDark: '你的手机当前是深色模式。',
  themeAlwaysLight: '始终浅色，无论手机怎么设置。',
  themeAlwaysDark: '始终深色，无论手机怎么设置。',

  /* 预览是一条虚构的动态，只是为了让人判断主题效果。 */
  previewName: 'Layla Haddad',
  previewCity: '迪拜',
  previewBadge: '{{tier}} {{score}}',
  previewPost: '德比战两球一助攻。完整短片在我主页上。',

  // ── 注销账号（app/settings/delete-account.tsx） ────────────────────────────
  deleteAccountTitle: '注销账号',
  deleteAccountSubtitle: '永久删除你的资料以及上面的一切',
  deleteCannotUndoTitle: '此操作无法撤销',
  deleteCannotUndoBody:
    '注销会永久删除你的账号。我们没有任何办法把它找回来，重新注册等于从零开始 —— 一份新资料，一个从0分起步的天赋分。',

  beforeYouGo: '在你走之前',
  takeABreakTitle: '不如先歇一阵',
  takeABreakBody:
    '关掉“可被发现”，你就从球探搜索里消失了。你的资料、动态和分数原封不动，什么时候想回来都可以再打开。',
  turnOffDiscovery: '关掉“可被发现”',
  discoveryAlreadyOff: '“可被发现”已经是关的',
  hiddenFromSearchToast: '你已经不会出现在球探搜索里。没有任何内容被删除。',
  deleteExportBody:
    '在一切被删除之前，先留一份你的资料、动态、评论、关注和申请的副本。账号一旦注销，我们就没法再发给你了。',

  whatGetsDeleted: '哪些内容会被删除',
  removedProfile: '你的资料、照片和你在上面写的一切',
  removedPosts: '你发过的每一条动态、评论和点赞',
  removedMessages: '你在每一段会话里的私信',
  removedApplications: '你的申请，以及你收藏过的机会',
  removedScore: '你的天赋分和它的全部历史',
  removedFollows: '你的粉丝和你关注的所有人',
  retentionNote:
    '法律有要求时，我们会在有限的时间内保留少量记录 —— 安全和审核记录，以及应对法律主张所需的内容。你资料里的任何内容都不会再展示给任何人。',

  /**
   * 用来确认注销时输入的那个词。请翻译成这门语言里人们真会去输入的词；
   * 比对时不区分大小写。
   */
  deleteConfirmWord: '删除',
  typeToContinue: '输入“{{word}}”以继续',
  deleteMyAccount: '注销我的账号',
  changedYourMind: '改主意了？直接返回就行 —— 现在还什么都没发生。',
  deleteConfirmTitle: '注销你的账号？',
  deleteConfirmBody:
    '这是最后一步。你的资料、动态、私信、申请和天赋分将被永久删除，无法恢复。',
  deletePermanently: '永久删除',
  keepMyAccount: '保留我的账号',

  // ── 设置里的共用控件（components/settings/） ───────────────────────────────
  nothingToChoose: '这里暂时没有可选的内容。',
  stepperDecrease: '减少{{label}}',
  stepperIncrease: '增加{{label}}',
  stepperValue: '{{label}} {{value}}',
  /** 一行单选项被念出来：先是标签，再是解释它的那句话。 */
  radioA11y: '{{label}}。{{hint}}',

  // ── 法律页面框架（app/legal/） ─────────────────────────────────────────────
  /* 文件本身以英文发布，从不翻译 —— 只翻译它周围的框架。 */
  legalUpdated: '{{date}}更新',
  legalLinkExternal: '{{label}}，将在应用外打开',

  // ── 配置缺失（components/common/ConfigMissing.tsx） ────────────────────────
  configMissingTitle: '配置缺失',
  configMissingBody:
    'AceAiX 连不上后端，因为这个构建没有设置 Supabase 的环境变量。',
  configMissingHint:
    '本地开发时把它们加到 `mobile/.env`，构建时作为 EAS secrets 添加，然后重启打包器。',
};
