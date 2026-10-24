/**
 * 运动契合度 —— 一份关于训练和比赛心态的简短问卷，以及它指向的运动项目。
 *
 * 每种语言都要遵守的语气规则：
 *
 *   * 这是一个可以去探索的建议，绝不是结论。绝不说“你应该放弃”
 *     “你不适合”“你的性格”。球员继续玩自己喜欢的运动，这里只是多打开几扇门。
 *   * 绝不用临床的说法（英文注释里列出的那几类词都不要用）。
 *     这是一份关于你怎么训练、比赛时有什么感受的问卷。
 *   * `item.*` 里的句子用第一人称，简单直白，十三岁的读者也能看懂。
 *     反向表述的句子必须保持反向，意思不能变（计分依赖于此）。
 *     上线前需由以中文为母语的运动心理专家审读（docs/32 §6）。
 *
 * “Game Intelligence”在中文里统一叫“球商”，“Talent Score”叫“天赋分”。
 */
export const sportFit = {
  // ── 名称 ───────────────────────────────────────────────────────────────────
  title: '运动契合度',
  tagline: '哪些运动适合你的心态',

  // ── 资料卡片 ───────────────────────────────────────────────────────────────
  cardCta: '找到适合你的运动',
  cardCtaBody: '22个简短的句子，大约4分钟。只有你自己能看到。',
  cardResult: '最契合：{{sport}}',
  cardResultBody: '其次是{{second}}和{{third}}',
  cardPrivate: '只有你能看到',

  // ── 介绍 ───────────────────────────────────────────────────────────────────
  introTitle: '你怎么想，决定你在哪里发光',
  introBody:
    '告诉我们你怎么训练、比赛时有什么感受。我们会把你的回答和十二项运动对球员心态的要求做对比，告诉你最契合的三项运动，以及原因。',
  introPoint1: '22个句子，大约4分钟。答案没有对错之分。',
  introPoint2: '完全私密：俱乐部和球探永远看不到你的回答和结果。',
  introPoint3: '如果你玩过球商游戏，你读懂比赛的能力也会算进去。',
  introStart: '开始',
  answerAgain: '再答一次',
  answerAgainNeedsParent: '需要家长再次允许后，你才能再答一次。',
  introNotMedical: '这只是一份问卷，不是医学或心理方面的评估。',
  introGiHint: '先玩球商游戏，结果会更准确。',
  introGiAction: '去玩游戏',

  // ── 同意门槛 ───────────────────────────────────────────────────────────────
  consentTitle: '先问问家长',
  consentBody:
    '在你所在的地区，未满{{age}}岁的球员需要家长或监护人同意后才能作答。我们会给他们发一封简短的邮件，介绍「运动契合度」。',
  consentPendingTitle: '正在等家长同意',
  consentPendingBody:
    '我们已经发出请求。邮件里有一个「Sport Fit」选项——请家长勾选它，问卷就会在这里解锁。',
  consentAction: '请家长同意',
  consentAgeUnknownTitle: '填上你的出生日期',
  consentAgeUnknownBody: '我们需要知道是否要先经过家长同意。',
  consentAgeUnknownAction: '编辑资料',
  notAthleteTitle: '仅限运动员',
  notAthleteBody: '「运动契合度」是运动员资料的一部分。',
  suspendedBody: '你的账号正在审核中，暂时无法使用这个功能。',

  // ── 问题 ───────────────────────────────────────────────────────────────────
  questionsTitle: '运动契合度',
  progress: '第{{n}}/{{total}}题',
  questionHint: '这句话有多符合你？',
  answer1: '非常不同意',
  answer2: '不同意',
  answer3: '不确定',
  answer4: '同意',
  answer5: '非常同意',
  back: '上一题',
  submitting: '正在为你寻找合适的运动…',
  leaveTitle: '就到这里吗？',
  leaveBody: '你目前的回答不会被保存。',
  leaveConfirm: '停止',
  leaveCancel: '继续答题',

  item: {
    drive1: '就算没人盯着，我也会自己训练。',
    drive2: '我练这项运动，主要是因为我喜欢自己越练越好。',
    drive3: '过几个星期，我常常就对训练没兴趣了。',
    composure1: '在比赛的关键时刻，我能保持冷静。',
    composure2: '比赛前一紧张，我常常会发挥得更差。',
    composure3: '比分咬得很紧的时候，我想要拿球，或者想打下一分。',
    team1: '和队友一起分享的胜利，感觉更棒。',
    team2: '我更喜欢自己的成绩完全由我一个人负责。',
    team3: '我喜欢队友依靠我，我也依靠他们。',
    focus1: '我能长时间把注意力放在一件事上。',
    focus2: '观众或其他球员的声音很容易让我分心。',
    focus3: '我可以花一整节训练课去练一个小细节。',
    boldness1: '我喜欢和对手一对一较量。',
    boldness2: '比赛中的身体接触不会让我退缩。',
    boldness3: '我更喜欢不太容易受伤的活动。',
    resilience1: '犯错之后，我能很快把注意力转到下一个动作上。',
    resilience2: '输了比赛会让我想更努力地训练。',
    resilience3: '教练批评我之后，我会好几天都一直在想这件事。',
    discipline1: '我喜欢按照固定的训练安排来练。',
    discipline2: '为了把一个动作练好，我可以一遍又一遍地重复同一个练习。',
    discipline3: '训练内容一重复，我很快就会觉得无聊。',
    check1: '为了表明你在认真阅读，这一题请选「同意」。',
  },

  // ── 无法使用：再试一次 ─────────────────────────────────────────────────────
  retryTitle: '我们再试一次吧',
  retryTooFast: '你答得太快了。每句话都花点时间想一想，结果才有意义。',
  retryCheck: '有一题请你选「同意」。请认真读每一句，再试一次。',
  retryStraight: '你每一题的答案都一样。请单独想一想每句话，再试一次。',
  retryAction: '重新开始',

  // ── 结果 ───────────────────────────────────────────────────────────────────
  resultsTitle: '你的运动契合度',
  resultsSubtitle: '适合你思考方式的运动',
  fitLabel: '契合度{{fit}}%',
  topPick: '最契合',
  whyTitle: '为什么契合',
  developTitle: '可以加强的地方',
  allSportsTitle: '全部运动',
  mindsetTitle: '你的心态',
  teamSpectrumSolo: '个人',
  teamSpectrumTeam: '团队',
  fromGames: '来自球商游戏',
  takenOn: '{{date}}作答',
  nextRetake: '{{date}}起可以再答一次',
  findCoaches: '寻找教练',
  footnote:
    '这是一个可以去探索的建议，不是结论。「运动契合度」只看心态和读懂比赛的能力，不看你的身体、体能、技术或经验。继续玩你喜欢的运动吧。',
  privacyTitle: '你的回答是私密的',
  privacyBody:
    '只有你能看到。俱乐部和球探看不到，也不计入你的天赋分。',
  deleteAction: '删除我的回答',
  deleteTitle: '删除你的「运动契合度」回答吗？',
  deleteBody: '你的回答和结果会被永久删除。你随时可以重新作答。',
  deleteConfirm: '删除',
  deleted: '你的「运动契合度」回答已删除',

  dimension: {
    drive: '内在动力',
    composure: '沉着',
    focus: '专注',
    resilience: '恢复力',
    team: '团队还是个人',
    boldness: '勇敢',
    discipline: '规律训练',
    reading: '读懂比赛',
    speed: '快速反应',
  },
  dimensionWhat: {
    drive: '为了训练和进步本身而想去练',
    composure: '关键时刻保持冷静',
    focus: '把注意力放在该放的地方',
    resilience: '从失误和挫折中重新站起来',
    team: '你更喜欢团队，还是自己的成绩',
    boldness: '喜欢对抗、身体接触和冒险',
    discipline: '喜欢重复练习和有安排的训练',
    reading: '你读懂比赛有多快，来自你的游戏',
    speed: '你反应有多快，来自你的游戏',
  },
  strength: {
    drive: '你训练是因为你想进步',
    composure: '比分咬得紧时你能保持冷静',
    focus: '你能长时间保持专注',
    resilience: '你犯错后能很快调整过来',
    boldness: '你喜欢对抗和身体较量',
    discipline: '你喜欢规律训练和反复练一项技术',
    reading: '你读懂比赛很快',
    speed: '你反应很快',
  },
  develop: {
    drive: '每周定一个小目标，完成就打个勾。',
    composure: '在关键时刻前，练习一个简短的呼吸方法。',
    focus: '训练时用一个提示词，帮你把注意力拉回来。',
    resilience: '犯错后做一个重置动作（拍一下手、深呼吸一次），然后继续。',
    boldness: '多打小场比赛，在里面你必须赢下自己的一对一。',
    discipline: '把重复练习变成游戏：给练习计数、计时或打分。',
    reading: '看比赛时，把你下一步会怎么做说出来。',
    speed: '在热身里加入几个简短的反应练习。',
  },
  teamMatch: {
    team: '你喜欢和团队一起分担',
    pairs: '你喜欢和一个搭档配合',
    solo: '你喜欢自己为成绩负责',
  },
  sportWhy: {
    football: '和十名队友一起，九十分钟里不停快速做决定。',
    basketball: '在小团队里，高速中不断做决定。',
    volleyball: '每一分都需要快速反应，也要信任每一名队友。',
    handball: '在快节奏的团队比赛中，需要速度、身体接触和勇气。',
    cricket: '身在团队，却要独自站在击球区，需要长时间专注和沉稳。',
    padel: '身边有一个搭档，快速读懂球路。',
    esports: '在屏幕前专注、快速读懂局势、团队配合。',
    tennis: '你一个人面对对手，一分接一分。',
    martialArts: '一对一较量中的勇气、控制和冷静。',
    chess: '独自坐在棋盘前，深度专注、冷静决策。',
    swimming: '属于你自己的比赛，靠规律训练和长期坚持。',
    athletics: '属于你自己的成绩，靠自律和动力。',
  },

  // ── 监护人同意（设置 → 监护人） ────────────────────────────────────────────
  scopeMindset: '可以填写「运动契合度」问卷',
  scopeMindsetOff: '「运动契合度」问卷未获同意',
  addMindset: '申请加上「运动契合度」',
  addMindsetHint:
    '你的家长批准了你的资料，但没有同意「运动契合度」。我们会给他们发一个新链接——他们需要勾选「Sport Fit」。',
  addMindsetSent: '已向{{email}}发送请求。他们同意后，「运动契合度」就会解锁。',
};
