/**
 * 天赋分 —— 主页上的那张卡片，以及它背后的页面。
 *
 * 有两件事必须原封不动地保留下来：
 *
 * 1. 五个维度的权重。资料15、表现30、影像15、可信度20、活跃度20，
 *    与 `private.compute_talent_score` 一致。译者可以改写维度的说法，
 *    但绝不能改动数字。
 * 2. 说明文字。它必须继续讲清楚三件事：分数是根据资料上的内容算出来的；
 *    可核实的信息比手动填写的信息更值钱；这个数字衡量的是一份资料，
 *    而不是一个人。这三句话没有一句是装饰。
 *
 * 段位名称放在 `common` 里（tierRising … tierElite），因为多处都会读到。
 */
export const score = {
  // ── 分数卡片（components/profile/ScoreCard.tsx） ───────────────────────────
  cardEmptyBody: '资料里填上项目和位置之后，你的分数就会出现。',
  cardA11y: '天赋分{{score}}分，满分100分，{{tier}}段位。点击查看完整拆解。',
  tierLine: '{{tier}}段位',
  topPercent: '在你的项目中位列前{{percent}}%',
  rankingBuilding: '资料越完整，你的排名越准。',
  pointsUp_other: '+{{count}}分',
  pointsDown_other: '-{{count}}分',
  sinceLastTime: '较上次',

  // ── 天赋分页面（app/score.tsx） ────────────────────────────────────────────
  howCalculated: '这个分数是怎么算的',

  notReadyTitle: '你的分数还没准备好',
  notReadyBody: '填上你的项目和位置，我们就能算出你的天赋分。',
  notReadyAction: '完善你的资料',

  deltaUpSince: '较上次+{{count}}',
  deltaDownSince: '较上次-{{count}}',

  curveTitle: '你的曲线',
  historyLoading: '正在加载历史记录…',
  historyEmpty:
    '从今天起开始积累历史记录。明天回来看看这条线怎么走。',
  sparklineA11y_other: '{{count}}天的分数记录，从{{min}}到{{max}}。',
  sparklineA11yPlain: '分数记录',
  sparklineLow: '最低{{value}}',
  sparklineHigh: '最高{{value}}',

  pillarsTitle: '你的分数由什么构成',
  tipsTitle: '把分数提上去',
  gotIt: '知道了',

  // ── 说明弹层（app/score.tsx） ──────────────────────────────────────────────
  howIntro:
    '你的天赋分是根据你资料上的内容算出来的 —— 只看这些。有五样东西计入其中：',
  howBulletProfile: '你的资料填了多少。',
  howBulletPerformance: '你记录的比赛、出场时间和数据。',
  howBulletMedia: '教练能看的短片。',
  howBulletCredibility: '认证、你的俱乐部，以及教练的推荐。',
  howBulletEngagement: '你有多活跃，以及谁看过你的资料。',
  howVerified:
    '我们能够核实的信息，比你自己手动填写的更值钱。认证过的账号、关联的俱乐部、由俱乐部确认过的比赛记录，都比同样内容的手动填写分量更重。',
  howRecalculated:
    '只要其中任何一项有变化，这个数字都会由我们的服务器重新计算。你改不了它，别人也改不了。',
  howNotYouTitle: '它衡量的是你的资料，不是你这个人。',
  howNotYouBody:
    '分数低只说明还有内容可以补，不代表你球踢得更差。没有哪个教练会只凭这个数字做决定。',

  // ── 五个维度（components/profile/PillarList.tsx） ──────────────────────────
  /** 权重这个数字归数据库所有 —— 翻译标签，不要动数字。 */
  pillarWeight: '{{label}}  ·  {{weight}}%',
  pillarPerformance: '表现',
  pillarPerformanceExplain: '你记录的比赛、出场时间和数据',
  pillarCredibility: '可信度',
  pillarCredibilityExplain: '认证、你的俱乐部，以及推荐',
  pillarEngagement: '活跃度',
  pillarEngagementExplain: '你有多活跃，以及谁在关注你',
  pillarProfile: '资料',
  pillarProfileExplain: '你的资料有多完整',
  pillarMedia: '影像',
  pillarMediaExplain: '教练真正看得到的短片',

  // ── 提升建议（components/profile/TipList.tsx） ─────────────────────────────
  /**
   * 只有按钮文字是我们写的。建议本身的标题和说明由
   * `private.build_score_tips` 生成，以英文传来 —— 参见 TipList.tsx。
   */
  tipPoints: '+{{points}}分',
  tipOpen: '打开',
  tipAction: {
    addHighlights: '添加短片',
    completeProfile: '完善资料',
    logMatches: '记录比赛',
    getVerified: '完成认证',
    askEndorsement: '找位教练',
    linkClub: '关联俱乐部',
    postUpdate: '发条动态',
  },
  tipsEmptyTitle: '清单上没有剩下的了',
  tipsEmptyBody:
    '眼下我们能想到的你都做完了。继续练，继续发。',

  // ── 试算器（app/score.tsx） ────────────────────────────────────────────────
  simTitle: '要做到什么程度？',
  simBody:
    '拖动滑块，看看数字会落在哪里。这个预估在服务器上跑的是和你真实分数一模一样的算法，所以它不会悄悄给出不一样的说法。',
  simProjected: '预估',
  simNow: '现在',
  simNoChange: '动一下滑块，就能看到差别。',
  simReset: '重置',
  simUnlocksTier: '这样你会进入{{tier}}段位。',
  simGain_other: '+{{count}}分',
  simHonest: '这是预估，不是承诺 —— 它假设这些练习是真做了的，成绩也站得住。',

  simVideos: '集锦短片',
  simMatches: '今年记录的比赛',
  simVerified: '其中已核实的',
  simEndorsements: '推荐',
  simExpert: '其中来自教练或俱乐部的',
  simPosts: '本月发的动态',
  simFollowers: '粉丝',
  simProfile: '已填写的资料项',
  simAccountVerified: '账号已认证',
  simClubLinked: '已关联俱乐部',

  // ── 文字解读（supabase/functions/talent-insights） ─────────────────────────
  insightTitle: '解读你的资料',
  insightLoading: '正在梳理你的数据…',
  insightUnavailable:
    '文字总结现在拿不到。下面的几个维度，用数字说的是同一件事。',
  insightRefresh: '重新写一遍',
};
