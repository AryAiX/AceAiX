/**
 * 每周技能挑战。
 *
 * 这里有两个词分量很重，任何语言都不能把它们揉成一个：**自报**的成绩是运动员
 * 自己说的，**已核实**的成绩是教练看过并确认的。排行榜之所以读得懂，全靠这
 * 两个词一眼就能分开。
 *
 * 语气是教练的，不是游戏的。没有喊人的倒计时，没有“你要落后了”，也没有奖励
 * 话术 —— 挑战就是一件要去做的事，而做出来的那段短片是你的，赢不赢都一样。
 */
export const challenges = {
  // ── 列表 ───────────────────────────────────────────────────────────────────
  title: '挑战',
  subtitle: '由教练和俱乐部发布。传一段短片，让人看过。',
  tabOpen: '开放中',
  tabEntered: '已参加',
  tabMine: '我发布的',

  emptyTitle: '现在没有开放的挑战',
  emptyBody: '教练基本每周都会发。一有新的开放，这里就会出现。',
  emptyEnteredTitle: '你还没参加过',
  emptyEnteredBody: '随便挑一个开放的挑战，传段短片 —— 核实过的成绩，是你能拿到的最快的证据。',
  emptyMineTitle: '你还没发布过挑战',
  emptyMineBody: '要求拍一件具体的事，收到的每份回答才有可比性。',

  setBy: '由{{name}}发布',
  closed: '已截止',
  judging: '评定中',
  entries_other: '{{count}}人参加',
  ageRange: '{{min}}–{{max}}岁',
  ageMin: '{{min}}岁及以上',
  ageMax: '未满{{max}}岁',

  // ── 详情 ───────────────────────────────────────────────────────────────────
  briefTitle: '拍什么',
  rulesTitle: '怎么评',
  judgedNote: '由发布挑战的教练评定 —— 没有要超过的数字，把你最好的一条传上来就行。',
  measuredNote: '以{{unit}}计。{{direction}}',
  directionHigher: '越高越好。',
  directionLower: '越低越好。',

  leaderboardTitle: '排行榜',
  leaderboardEmpty: '还没有人参加。第一段短片就是标杆。',
  verifiedBadge: '已核实',
  claimedBadge: '自报',
  verifiedTooltip: '教练看过这段短片，确认了这个成绩。',
  claimedTooltip: '运动员自己报的数字。教练还没核实过。',
  yourEntry: '你的参赛记录',
  rankLabel: '第{{rank}}名',

  // ── 参加 ───────────────────────────────────────────────────────────────────
  enter: '参加',
  enterAgain: '传一条更好的',
  withdraw: '撤回',
  withdrawConfirmTitle: '撤回你的参赛记录？',
  withdrawConfirmBody: '短片还留在你的主页上，只是从这个排行榜上撤下来。',
  withdrawConfirmAction: '撤回',

  chooseClipTitle: '用哪段短片？',
  chooseClipBody: '从你的视频里挑一段。要是没有合适的，先到主页上传一段新的。',
  noClipsTitle: '你得先有一段短片',
  noClipsBody: '把这次尝试拍下来，加到你的主页上，再回来参加。',
  noClipsAction: '添加短片',

  resultLabel: '你的成绩',
  resultPlaceholder: '比如 214',
  noteLabel: '还有什么要说的吗？',
  notePlaceholder: '三次里最好的一次。左脚还是弱一些。',
  submit: '提交参赛',
  submitted: '已提交。教练会来核实。',
  updated: '已换成新的一条。',
  withdrawn: '已撤回。',

  // ── 评定，给发布挑战的教练 ─────────────────────────────────────────────────
  judgeTitle: '核实成绩',
  judgeBody: '看完短片，确认这个数字，或者退回去。',
  judgeAccept: '确认',
  judgeReject: '退回',
  judgeValueLabel: '确认的成绩',
  judgeNoteLabel: '给运动员的说明',
  judgeNotePlaceholder: '0:18 球落地了 —— 从那里重新计数。',
  judged: '成绩已确认。',
  sentBack: '已退回给运动员。',

  // ── 发布一个 ───────────────────────────────────────────────────────────────
  newTitle: '发布挑战',
  newBody: '要求拍一件具体的事。要求越明确，收到的回答越有用。',
  fieldTitle: '标题',
  fieldTitlePlaceholder: '三十秒颠球',
  fieldBrief: '拍什么',
  fieldBriefPlaceholder: '一镜到底，只用脚和大腿，手机放在地上，要能看到全身。',
  fieldRules: '怎么评',
  fieldRulesPlaceholder: '不许剪辑。三次里最好的一次，不是剪出来的集锦。',
  fieldMeasured: '有数字吗？',
  measuredYes: '计量',
  measuredNo: '评定',
  fieldMetricLabel: '数的是什么',
  fieldMetricLabelPlaceholder: '触球次数',
  fieldMetricUnit: '单位',
  fieldMetricUnitPlaceholder: '次',
  fieldBetter: '哪边算好',
  betterHigher: '越高',
  betterLower: '越低',
  fieldAges: '年龄段',
  fieldCloses: '截止',
  closesIn7: '一周后',
  closesIn14: '两周后',
  closesIn30: '一个月后',
  create: '发布挑战',
  created: '挑战已上线。',

  // ── 首页卡片 ───────────────────────────────────────────────────────────────
  homeTitle: '本周的挑战',
  homeCta: '去看看',
  homeEnteredCta: '看排行榜',
};
