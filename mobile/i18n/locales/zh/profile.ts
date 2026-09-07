/**
 * 主页 —— 我的、别人的、下面的几个标签页、粉丝列表，以及编辑表单。
 *
 * 按页面顺序分组。凡是在应用别处也会出现的词（粉丝、动态、短片、比赛、推荐、
 * 关注、私信、已认证）都取自 `common`，不在这里重复。
 *
 * 关于存储值：项目、位置、水平和惯用侧在数据库里以英文保存，渲染时通过
 * `constants/sports.ts` 翻译。国家名按输入原样保存，所以也不翻译 ——
 * 参见 PRIORITY_COUNTRIES。
 */
export const profile = {
  // ── 别人的主页（app/u/[id].tsx） ───────────────────────────────────────────
  title: '主页',
  thisPerson: '这个人',

  notFoundTitle: '找不到这个主页',
  notFoundBody: '你点开的链接在 AceAiX 上没有对应的人。',
  notFoundAction: '返回',

  blockedTitle: '你无法查看这个主页',
  blockedByYouBody: '你拉黑了{{name}}。解除拉黑后才能重新看到他们的主页。',
  blockedBody: '这个主页对你不可见。',
  unblockedToast: '已解除拉黑。',

  suspendedTitle: '这个账号不可用',
  suspendedBody: '账号已被暂停，我们的团队正在审核。',

  // ── 主页头部（components/profile/ProfileHeader.tsx） ───────────────────────
  openToOffers: '接受报价',
  followersA11y_other: '{{count}}位粉丝。点击打开列表。',
  followingA11y_other: '关注了{{count}}人。点击打开列表。',

  editProfile: '编辑资料',
  settings: '设置',
  moreOptions: '更多选项',
  messageLimitedHint: '这个账号的私信有限制。点击了解原因。',

  shareProfile: '分享主页',
  /** 网址不翻译，只翻译它周围的句子。 */
  shareMessage: '{{name}} 的 AceAiX 主页 —— {{url}}',

  reportAccount: '举报这个账号',
  reportAccountSubtitle: '每一条举报我们的团队都会看',
  reportSheetSubtitle: '选最接近的理由。我们不会告诉对方是谁举报的。',
  reportThanks: '谢谢，我们的团队会看看这件事。',
  reportReason: {
    childSafety: '儿童安全',
    childSafetyHint: '未成年人处于危险或被针对',
    harassment: '欺凌或骚扰',
    harassmentHint: '针对某个人的辱骂',
    hate: '仇恨言论',
    hateHint: '攻击一个人的身份',
    nudity: '裸露或性内容',
    nudityHint: '不该出现在这里的内容',
    violence: '暴力或威胁',
    violenceHint: '威胁或血腥内容',
    impersonation: '冒充他人',
    impersonationHint: '假账号',
    scam: '诈骗',
    scamHint: '假试训、乱收费或虚假报价',
    spam: '垃圾信息',
    spamHint: '重复或没人想要的内容',
    other: '其他情况',
    otherHint: '用你自己的话告诉我们',
  },

  blockPerson: '拉黑{{name}}',
  blockPersonSubtitle: '他们将无法找到你，也无法给你发私信',
  blockConfirmTitle: '拉黑{{name}}？',
  blockConfirmBody:
    '{{name}}将无法给你发私信、关注你，也看不到你发的内容。你可以在设置里撤销。',
  blockedToast: '{{name}}再也看不到你，也不能给你发私信了。',

  /** 用大白话回答“为什么我不能给这个人发私信？”。 */
  messageBlockTitle: '你无法给这个账号发私信',
  messageBlockNote:
    '这些规则是为了保护年轻运动员，由运动员本人、他们的家长或监护人，以及 AceAiX 共同设定。',
  messageBlock: {
    minorRequiresVerifiedSender:
      '这位运动员未满18岁。只有认证过的教练和俱乐部才能主动和他们对话。',
    minorRequiresGuardianConsent:
      '这位运动员的家长或监护人还没有批准私信。',
    recipientMessagesOff: '这个人已经关闭了私信。',
    recipientOnlyAcceptsFollowed: '这个人只接收自己关注的人发来的私信。',
    recipientOnlyAcceptsVerified: '这个人只接收认证账号发来的私信。',
    notPermitted: '你现在无法和这个账号开始对话。',
    notFound: '找不到这个账号。',
  },
  gotIt: '知道了',

  // ── 数据行（components/profile/StatRow.tsx） ───────────────────────────────
  statA11y: '{{value}} {{label}}',

  // ── 标签页（components/profile/ProfileTabs.tsx） ───────────────────────────
  tabHighlights: '高光',
  tabCareer: '生涯',

  // ── 动态标签页（components/profile/PostsTab.tsx） ──────────────────────────
  postsEmptyTitleSelf: '还没有动态',
  postsEmptyTitleOther: '还没发过什么',
  postsEmptyBodySelf:
    '分享一次训练、一个成绩，或一段短片。活跃的资料更容易被看到。',
  postsEmptyBodyOther: '他们发动态后，会显示在这里。',
  postsEmptyAction: '写一条动态',

  // ── 媒体网格（components/profile/MediaGrid.tsx） ───────────────────────────
  addHighlight: '添加高光',
  videoClipA11y: '视频短片',
  photoA11y: '照片',

  // ── 高光标签页（components/profile/HighlightsTab.tsx） ─────────────────────
  photoPermission: 'AceAiX 需要访问相册的权限。',

  noHighlightsTitle: '这里没有高光',
  noHighlightsBody: '高光是运动员资料的一部分。',
  clipsEmptyTitleSelf: '教练先看片，再看字。',
  clipsEmptyTitleOther: '还没有短片',
  clipsEmptyBodySelf: '传上你的第一段短片。三段短的正好。',
  clipsEmptyBodyOther: '他们上传短片后，会显示在这里。',
  clipsEmptyAction: '添加第一段短片',

  nameClipTitle: '给这段短片起个名',
  nameClipSubtitle: '一个简短的标题能让教练知道自己在看什么。',
  clipTitleLabel: '标题',
  clipTitlePlaceholderVideo: '例如：对阵 Al Wasl 的左脚破门',
  clipTitlePlaceholderPhoto: '例如：杯赛决赛',
  addToProfile: '添加到主页',
  clipAddedToast: '已添加。教练现在就能看到了。',
  clipRemovedToast: '已移除。',

  holdToRemoveClip: '长按一段短片可以移除它。',
  removeClipTitle: '移除这段短片？',
  removeClipBody: '它会从你的主页上撤下。你的天赋分可能会因此下降。',
  mediaLoadFailed: '这个文件加载不了，过一会儿再试。',

  // ── 生涯标签页（components/profile/CareerTab.tsx） ─────────────────────────
  noCareerTitle: '没有生涯记录',
  noCareerBody: '这一栏是给运动员资料用的。',
  add: '添加',

  matchesEmptyTitleSelf: '没有记录比赛',
  matchesEmptyTitleOther: '还没有比赛',
  matchesEmptyBodySelf: '把最近12个月记下来，教练就能看出你现在的状态。',
  matchesEmptyBodyOther: '这里还没有记录任何内容。',
  matchFallback: '比赛',
  matchVersus: '对阵{{opponent}}',
  matchMinutes: '{{n}}分钟',
  matchGoals_other: '{{count}}个进球',
  matchAssists_other: '{{count}}次助攻',

  honoursTitle: '荣誉',
  honoursEmptyTitleSelf: '还没有荣誉',
  honoursEmptyTitleOther: '没有列出荣誉',
  honoursEmptyBodySelf: '联赛冠军、杯赛、赛季最佳球员 —— 你赢过的都算。',

  certificatesTitle: '证书',
  certificatesEmptyTitleSelf: '还没有证书',
  certificatesEmptyTitleOther: '没有列出证书',
  certificatesEmptyBodySelf: '教练资格证、急救、儿童保护、语言证书。',

  endorsementsTitle: '推荐',
  endorsementsEmptyTitle: '还没有推荐',
  endorsementsEmptyBodySelf:
    '找一位了解你球风的教练。来自认证教练的推荐分量很重。',

  logMatchTitle: '记录一场比赛',
  logMatchSubtitle: '记得多少写多少 —— 之后还能补。',
  matchDate: '日期',
  matchDateHint: '年-月-日',
  matchCompetition: '赛事',
  matchCompetitionPlaceholder: 'U16 联赛',
  matchOpponent: '对手',
  matchOpponentPlaceholder: 'Al Nasr',
  matchResult: '结果',
  matchResultPlaceholder: '3-1 胜',
  matchMinutesLabel: '出场时间',
  matchGoalsLabel: '进球',
  matchAssistsLabel: '助攻',
  saveMatch: '保存比赛',
  matchDateInvalid: '请按 YYYY-MM-DD 的格式填写日期，例如 2026-03-14。',
  matchAddedToast: '比赛已添加。',

  addHonourTitle: '添加一项荣誉',
  honourTitleLabel: '你赢得了什么？',
  honourTitlePlaceholder: 'U16 联赛冠军',
  honourOrgLabel: '颁发方',
  honourOrgPlaceholder: '迪拜青年联赛',
  honourYearLabel: '年份',
  saveHonour: '保存荣誉',
  honourTitleRequired: '给这项荣誉起个名字。',
  honourAddedToast: '荣誉已添加。',

  addCertificateTitle: '添加一份证书',
  certificateTitleLabel: '证书',
  certificateTitlePlaceholder: '急救',
  certificateIssuerLabel: '颁发机构',
  certificateIssuerPlaceholder: '红新月会',
  certificateYearLabel: '年份',
  saveCertificate: '保存证书',
  certificateTitleRequired: '给这份证书起个名字。',
  certificateAddedToast: '证书已添加。',

  // ── 人员列表（components/profile/PeopleList.tsx） ──────────────────────────
  searchThisList: '在这个列表里搜索',
  noMatchTitle: '没有人符合',
  noMatchBody: '换个名字试试。',
  openProfileA11y: '打开{{name}}的主页',

  // ── 粉丝和关注（app/u/[id]/…） ─────────────────────────────────────────────
  followersEmptyTitle: '还没有粉丝',
  followersEmptyBodySelf: '发段短片或一条动态。愿意露面的运动员才有人关注。',
  followersEmptyBodyOther: '还没有人关注这个账号。',
  followingEmptyTitleSelf: '你还没有关注任何人',
  followingEmptyTitleOther: '还没有关注任何人',
  followingEmptyBodySelf: '关注俱乐部、教练和运动员，把你的动态流填满。',
  followingEmptyBodyOther: '这个账号还没有关注过任何人。',

  // ── 编辑资料（app/edit-profile.tsx） ───────────────────────────────────────
  /* 上面的 `editProfile` 既是这个页面的标题，也是打开它的按钮。 */
  firstNameRequired: '名字不能为空。',
  savedScoreUp_other: '已保存 —— 你的天赋分涨了{{count}}分。',
  savedScoreDown_other: '已保存 —— 你的天赋分掉了{{count}}分。',

  sectionYou: '你',
  changePhotoA11y: '更换你的头像',
  uploadingPhoto: '上传中…',
  tapToChangePhoto: '点击更换头像',
  addCover: '添加封面图',
  changeCover: '更换封面图',
  uploadingCover: '正在上传封面…',
  removeCover: '移除封面',
  changeCoverA11y: '更换个人资料的封面图',
  viewPhotoA11y: '查看 {{name}} 的照片',
  firstName: '名字',
  lastName: '姓氏',
  bio: '关于你',
  bioPlaceholder: '你打什么位置，最近在练什么？',
  bioCounter: '{{n}} / {{max}}',
  city: '城市',
  cityPlaceholder: '迪拜',
  country: '国家',
  countryPlaceholder: '选择一个国家',
  countryA11y: '国家。当前为{{value}}。点击打开选择器。',
  notSet: '未填写',

  sectionSport: '你的项目',
  sport: '项目',
  sportPlaceholder: '选择你的项目',
  sportA11y: '项目。当前为{{value}}。点击打开选择器。',
  position: '位置',
  level: '水平',
  levelHintDefault: '选你现在所处的水平。',
  league: '联赛或赛事',
  leaguePlaceholder: '迪拜青年联赛',
  club: '现属俱乐部',
  clubPlaceholder: 'Al Nasr Academy',
  clubHint: '关联一家俱乐部能提高你的可信度得分。',

  sectionPhysical: '身体数据',
  height: '身高',
  heightUnit: '厘米',
  weight: '体重',
  weightUnit: '公斤',
  dominantSide: '惯用侧',

  sectionAvailability: '意向',
  openToOffersHint: '教练会在你的主页上看到这一项。',

  chooseSportTitle: '选择你的项目',
  /** 表情符号不翻译，只调整符号和名称的顺序。 */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: '你住在哪里？',
  searchCountries: '搜索国家',
  useTypedCountry: '使用“{{country}}”',
  useTypedCountryHint: '列表里没有？自己添加一个。',
  countryTypeToAdd: '开始输入来添加你的国家。',

  // ── 球员卡 ─────────────────────────────────────────────────────────────────
  playerCard: '球员卡',
  playerCardHint: '一张可以保存、也可以发出去的卡片。',
  playerCardBody: '球探最先要看的东西，都在这一张图里。',
  playerCardSaved: '已保存。',
  playerCardShared: '卡片已备好，可以分享了。',
  playerCardFailed: '卡片生成失败，过一会儿再试。',
  playerCardShare: '分享',
  playerCardSave: '保存图片',
};
