/**
 * 机会：试训看板、一条完整的招募信息、俱乐部的审阅队列、发布表单，
 * 以及一条机会所指向的俱乐部页面。
 *
 * 翻译前有四点值得知道：
 *
 *  - `status.*` 是刻意写了两遍的。同一个存储值，在两个人眼里读起来完全不同：
 *    `rejected` 在球探的列表上是一个事实，在一个15岁孩子的屏幕上是一句话。
 *    两种口吻都要译出来，绝不要合并成一种。
 *  - `match.reason.*` 是运动员对数据库生成的英文理由的读法。英文原文作为
 *    查表用的键留在代码里 —— 参见 components/opportunities/MatchExplain.tsx。
 *  - `post.safetyBody` 是合规文案。含义要一字不差 —— 未满18岁、家长或监护人
 *    须知情、违规帖子会被移除 —— 并把 `{{guidelines}}` 放在句子需要它的
 *    位置：社区规范的链接就是从那里引出来的。
 *  - 项目、位置、水平和机会类型以英文存储，通过 `constants/sports.ts`
 *    翻译。这里不再重述。
 */
export const opportunities = {
  // ── 机会标签页 ──────────────────────────────────────────────────────────────
  title: '机会',
  athleteSubtitle: '试训、奖学金、合同、训练营',
  recruiterSubtitle: '你发布的内容和申请的人',

  /** 这一块里的收藏说的都是同一件事：看板、招募信息、俱乐部。 */
  savedToast: '已收藏，可以在“收藏”里找到。',

  tabs: {
    open: '开放中',
    saved: '收藏',
    applied: '已申请',
    postings: '我发布的',
    applicants: '申请者',
  },

  /** 项目来自 `sports.allSports`；只有类型这一行是我们的。 */
  allTypes: '全部',

  athlete: {
    appliedOn: '{{date}}申请',

    openEmptyFilteredTitle: '没有符合这些筛选条件的',
    openEmptyFilteredBody: '清除筛选，看看现在所有开放中的机会。',
    clearFilters: '清除筛选',

    openEmptyTitle: '你的项目暂时没有开放的机会',
    openEmptyBody: '关注俱乐部，第一时间收到消息。',
    findClubs: '找俱乐部',

    savedEmptyTitle: '还没有收藏',
    savedEmptyBody: '想回头再看的，点一下书签图标就收藏了。',
    browseOpen: '看看有什么开放中',

    appliedEmptyTitle: '还没有申请记录',
    appliedEmptyBody: '你申请之后，可以在这里跟进每一条回复。',
    seeWhatsOpen: '看看有什么开放中',
  },

  recruiter: {
    active: '进行中',
    closed: '已关闭',
    /* 下面两个会被念在一句更长的话里面。 */
    activeA11y: '进行中',
    closedA11y: '已关闭',
    openPosting: '打开这条招募信息',
    reviewApplicants: '审阅申请者',

    postingsEmptyTitle: '还没有发布过',
    postingsEmptyBody:
      '发一条试训、奖学金或训练营，符合条件的运动员会最先看到。',

    allApplicants: '申请过你任意一条招募信息的所有人，最契合的排在前面。',
    applicantsEmptyTitle: '还没有申请者',
    applicantsEmptyBody: '一有人申请，他们就会出现在这里。',
  },

  // ── 机会卡片 ────────────────────────────────────────────────────────────────
  card: {
    independent: '个人发布',
    open: '打开这条机会',
    /* 在卡片无障碍描述的末尾念出。 */
    closedA11y: '已关闭',
    save: '收藏{{title}}稍后再看',
    unsave: '把{{title}}移出收藏',
  },

  // ── 一份申请走到哪一步了 ────────────────────────────────────────────────────
  status: {
    /** 递交申请的运动员读到的。 */
    athlete: {
      applied: '已发送',
      in_review: '正在被查看',
      shortlisted: '进入候选名单',
      invited: '受邀试训',
      rejected: '这次没成',
      withdrawn: '已撤回',
    },
    /** 审阅申请的俱乐部读到的。 */
    recruiter: {
      applied: '新申请',
      in_review: '审阅中',
      shortlisted: '已入候选',
      invited: '已邀请',
      rejected: '已拒绝',
      withdrawn: '已撤回',
    },
  },

  // ── 匹配数字和它背后的理由 ──────────────────────────────────────────────────
  match: {
    percentA11y: '匹配度{{percent}}%',
    fitPercentA11y: '契合度{{percent}}%',
    why: '为什么这条适合你',
    /** 运动员对 `private.match_reasons` 返回内容的读法。 */
    reason: {
      sport: '你的项目',
      position: '你的位置',
      region: '离你近',
      topTier: '你的天赋分处于顶级段位',
      strongScore: '天赋分不错',
    },
  },

  // ── 申请者列表行 ────────────────────────────────────────────────────────────
  applicant: {
    open: '打开他们的申请',
    talentScoreA11y: '天赋分{{score}}',
  },

  // ── 一条完整的机会 ──────────────────────────────────────────────────────────
  detail: {
    title: '机会',
    more: '更多操作',
    /** 分享消息里链接上面的那一行。 */
    shareText: '{{title}} —— {{club}}',
    shareClubFallback: '来自 AceAiX',

    missingTitle: '找不到这一条',
    missingBody: '链接可能已损坏或过期。',
    goneTitle: '这一条已经没了',
    goneBody: '俱乐部把它撤下了，或者它已经截止。开放中的还有很多。',
    seeWhatsOpen: '看看有什么开放中',

    save: '收藏，稍后再看',
    unsave: '取消收藏',

    reviewApplicants_other: '审阅{{count}}位申请者',

    withdraw: '撤回申请',
    withdrawA11y: '撤回这份申请',
    withdrawn: '已撤回。',
    applicationsClosed: '申请已截止',

    openClub: '打开{{club}}',
    viewClub: '查看俱乐部',
    postedByMember: '由成员发布',
    closed: '已关闭',

    about: '关于这条机会',

    factType: '类型',
    factSport: '项目',
    factPosition: '位置',
    factWhere: '地点',
    factDeadline: '截止日期',
    factPosted: '发布时间',
    noDeadline: '无截止日期',

    /* 试训是要在现实里见陌生人的。这段话要直白。 */
    safety:
      '去参加任何线下活动之前，先告诉家长、监护人或教练。AceAiX 上的任何人都不该向你要钱。',

    menuTitle: '这条机会',
    reportHint: '告诉我们哪里有问题。举报内容是保密的。',
  },

  report: {
    title: '举报这条招募信息',
    subtitle: '选最接近的理由。我们绝不会告诉对方是谁举报的。',
    thanks: '谢谢你告诉我们，我们的团队会去看看。',
    reason: {
      childSafety: '儿童安全',
      childSafetyHint: '对未满18岁的人不安全',
      scam: '诈骗或索要钱财',
      impersonation: '冒充真实俱乐部',
      misleading: '误导或不属实',
      spam: '垃圾信息',
      other: '其他情况',
    },
  },

  apply: {
    send: '发送申请',
    sent: '已发送。他们会连着你的资料一起看到。',
    messageLabel: '你的留言',
    messagePlaceholder: '说说你为什么合适 —— 两三行就够了。',
    whatTheySee: '他们会看到什么',
    seeProfile: '你的姓名和资料',
    seeScore: '你的天赋分',
    seeHighlights: '你的高光和数据',
    seeMessage: '你在上面写的留言',
    guardianNotice: '你的家长或监护人可以看到你发出的申请。',
  },

  // ── 审阅申请的人 ────────────────────────────────────────────────────────────
  applicants: {
    title: '申请者',
    /** 筛选行沿用招募方那套状态名称；只有“全部”是我们的。 */
    filterAll: '全部',
    /** 筛选标签：先是阶段，再是这个阶段有多少人。 */
    filterChip: '{{label}} {{count}}',
    ranked: '按每位运动员与这条招募信息的契合程度排序。',

    missingTitle: '找不到这条招募信息',
    missingBody: '链接可能已损坏或过期。',
    backToOpportunities: '返回机会',

    lockedTitle: '你无法审阅这条招募信息',
    lockedBody:
      '只有发布它的俱乐部或教练 —— 以及他们添加的工作人员 —— 才能看到谁申请了。',

    emptyTitle: '还没有人申请',
    emptyBody: '符合这条招募信息的运动员会最先看到。再等一两天。',
    emptyStageTitle: '这个阶段还没有人',
    emptyStageBody: '换个筛选条件试试。',
    showEveryone: '显示全部',

    scoreLine: '天赋分{{score}}',
    noMessage: '他们没有写留言。',
    viewProfile: '查看完整资料',

    moveForward: '让他们进入下一步',
    shortlist: '加入候选名单',
    shortlistDone: '已加入候选名单。',
    invite: '邀请试训',
    inviteDone: '已邀请试训。',
    reject: '拒绝',
    rejectDone: '已标记为拒绝。',

    notified: '他们会收到通知 —— AceAiX 会替你发。',
  },

  // ── 发布一条机会 ────────────────────────────────────────────────────────────
  post: {
    title: '发布一条机会',
    submit: '发布',
    posted: '已发布。符合条件的运动员会最先看到。',
    checkFields: '请检查标红的字段。',

    titleLabel: '标题',
    titlePlaceholder: 'U16 门将试训',
    titleHint: '简短、具体。运动员最先扫过的就是这一行。',
    titleError: '起一个运动员一看就懂的标题。',

    typeLabel: '这是什么？',
    typeError: '请选择这是什么。',
    /** 作为一句话念出：先是类型，再是它的含义。 */
    typeA11y: '{{label}}。{{hint}}',

    sportLabel: '项目',
    sportError: '请选择项目。',

    positionLabel: '位置',
    positionHint: '如果任何位置都可以申请，就留空。',
    positionAny: '不限',

    whereLabel: '地点',
    wherePlaceholder: '迪拜，阿联酋',
    whereError: '这件事在哪里进行？',

    deadlineLabel: '申请截止',
    deadlineNone: '无截止日期',
    deadlineChoose: '选择截止日期',
    deadlineChange: '申请于{{date}}截止。点击更改日期',
    deadlineClearA11y: '清除截止日期',
    deadlineError: '请选择一个未来的日期。',

    detailsLabel: '详情',
    detailsPlaceholder: '当天会做什么、面向哪些人、需要带什么。',
    detailsError_other: '再多写一点 —— 至少{{count}}个字符。',

    previewTitle: '运动员会看到什么',
    previewHint: '匹配百分比是针对每位运动员单独计算的，所以这里不显示。',
    previewPlaceholder: '你的标题会出现在这里',

    /* 合规文案。每一个分句都有分量 —— 三个都要留。 */
    safetyTitle: '发布之前',
    safetyBody:
      'AceAiX 上有很多运动员未满18岁。举办试训必须让家长或监护人知情，不符合我们{{guidelines}}的招募信息，AceAiX 可能会移除。',
    safetyLinkA11y: '阅读社区规范',
  },

  // ── 俱乐部页面 ──────────────────────────────────────────────────────────────
  org: {
    missingTitle: '找不到这家俱乐部',
    missingBody: '链接可能已损坏或过期。',
    backToDiscover: '返回发现',
    goneTitle: '这家俱乐部不在 AceAiX 上',
    goneBody: '它可能已经被移除。',

    /* `club` 和 `federation` 来自 common；青训机构只作为一种机构类型出现，
       所以放在这里。 */
    typeAcademy: '青训机构',

    /* `value` 是已经为标记缩短过的数字 —— 比如“1.2K”。 */
    followers_other: '{{value}}位粉丝',
    followA11y: '关注{{name}}',
    unfollowA11y: '取消关注{{name}}',

    tabAbout: '简介',
    tabOpenings: '名额',
    tabOpeningsCount: '名额 {{count}}',

    noIntro: '这家俱乐部还没有写简介。',
    factType: '类型',
    factLeague: '联赛',
    factBasedIn: '所在地',

    unverified:
      'AceAiX 还没有认证这家俱乐部。在动身前往任何地方之前，先弄清楚你在跟谁打交道。',

    openingsEmptyTitle: '目前没有开放的名额',
    openingsEmptyFollowing: '你已经关注了他们，一有名额开放就会收到消息。',
    openingsEmptyBody: '关注他们，一有名额开放就能第一时间知道。',
  },
};
