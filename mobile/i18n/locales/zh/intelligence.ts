/**
 * 球商 —— 六个限时小游戏，看一名球员怎么读懂比赛。
 *
 * 每种语言都要遵守的语气规则：
 *
 *   * 这是一组**游戏**，绝不能写成测验，也不是对你这个人的评判。
 *     读者最小只有十三岁。
 *   * 绝不用医学或临床的说法（英文注释里列出的那几类词都不要用）。
 *     我们衡量的是在这几个游戏里、在这一天的反应速度、专注和决策 ——
 *     文案也要这样说。
 *   * 分数低从来不是结论。结果页底部的说明，和天赋分做出的是同一个承诺。
 *
 * “Game Intelligence”在中文里统一叫“球商”，就像“Talent Score”叫“天赋分”。
 */
export const intelligence = {
  // ── 名称 ───────────────────────────────────────────────────────────────────
  title: '球商',
  short: '球商',
  tagline: '你读懂比赛有多快',

  // ── 资料卡片 ───────────────────────────────────────────────────────────────
  cardCta: '玩这六个游戏',
  cardCtaBody: '大约8分钟。让俱乐部看看你在场上是怎么思考的。',
  cardContinue: '把游戏玩完',
  cardContinueBody: '已玩{{done}}/6个',
  cardTop: '在你的年龄组中位列前{{percent}}%',
  cardShared: '已分享给俱乐部',
  cardPrivate: '只有你能看到',
  cardA11y: '球商{{score}}分，满分100分',

  // ── 介绍 ───────────────────────────────────────────────────────────────────
  introTitle: '六个游戏，看清你是怎么踢球的。',
  introBody:
    '几个快节奏的小游戏，看你怎么观察球场、在压力下做决定、保持专注。教练对这些的在意程度，不亚于速度和技术。',
  introPoint1: '大约8分钟 —— 每个游戏之间都可以停下，之后再回来',
  introPoint2: '在你选择分享之前，结果只有你自己能看到',
  introPoint3: '每个游戏每两周可以玩两次，按最好的一次算。',
  introStart: '开始玩',
  introNotMedical: '这些只是游戏，不是医学或心理方面的评估。',

  // ── 同意门槛 ───────────────────────────────────────────────────────────────
  consentTitle: '先问问家长',
  consentBody:
    '在你所在的地区，未满{{age}}岁的球员需要家长或监护人同意后才能玩。我们会给他们发一封简短的邮件，介绍这些游戏。',
  consentPendingTitle: '正在等家长同意',
  consentPendingBody:
    '我们已经发出请求。邮件里有一个“Game Intelligence”选项——请家长勾选它，游戏就会在这里解锁。',
  consentAction: '请家长同意',
  consentAgeUnknownTitle: '填上你的出生日期',
  consentAgeUnknownBody: '我们需要知道是否要先经过家长同意。',
  consentAgeUnknownAction: '编辑资料',
  notAthleteTitle: '仅限运动员',
  notAthleteBody: '球商是运动员资料的一部分。运动员分享给你的结果，可以在他们的资料上看到。',
  suspendedBody: '你的账号正在审核中，暂时无法使用这个功能。',

  // ── 准备 ───────────────────────────────────────────────────────────────────
  readyTitle: '准备一下',
  readyBody: '你玩的时候状态怎么样，结果就怎么样。',
  readyQuiet: '找个安静的地方，坐着或站着别动',
  readyNotifications: '关掉通知，免得游戏中途弹出来',
  readyBattery: '电量充足，手机拿在手里',
  readyFatigue: '你现在感觉精神怎么样？',
  fatigue1: '精神饱满',
  fatigue2: '不错',
  fatigue3: '还行',
  fatigue4: '有点累',
  fatigue5: '累坏了',
  readyTiredHint: '可以玩，但结果可能比平时低一些。晚点再玩也许更好。',
  readyContinue: '我准备好了',

  // ── 热身 ───────────────────────────────────────────────────────────────────
  warmupTitle: '热身',
  warmupBody: '圆圈一变绿就马上点，一共五次。这能让游戏适配你的手机。',
  warmupWait: '等它变绿…',
  warmupTap: '点！',
  warmupEarly: '太早了 —— 等它变绿',
  warmupDone: '热身完成',

  // ── 游戏列表 ───────────────────────────────────────────────────────────────
  hubTitle: '你的游戏',
  hubBody: '顺序随你。足球类游戏占比最大。',
  hubPlayed: '已玩',
  hubRetry: '需要重玩',
  hubNoAttempts: '过几天可以再玩',
  hubCountsMost: '占比最大',
  hubMinutes: '约{{n}}分钟',
  hubSeconds: '约{{n}}秒',
  hubFinish: '查看我的结果',
  hubFinishNeeds: '还差{{count}}个游戏出结果',
  hubPause: '休息一下',
  hubPauseBody: '你的进度会保存24小时。',

  // ── 单个游戏 ───────────────────────────────────────────────────────────────
  practice: '练习',
  practiceBody: '先来几轮，不计分。',
  practiceDone: '不错。现在来真的。',
  startScored: '开始',
  getReady: '准备',
  round: '第{{n}}/{{total}}轮',
  scoredLabel: '计分',
  submitting: '正在保存…',
  gameDone: '完成！',
  gameScore: '{{score}} / 100',
  gameInvalid: '这一轮不算',
  gameInvalidBody: '好像有点不对劲 —— 可能是分心了。你可以晚点再试。',
  gameIncomplete: '点击次数太少，这一轮没法计分',
  gameIncompleteBody: '没有用掉次数。准备好了再试一次。',
  backToHub: '回到游戏列表',
  tryAgain: '再试一次',
  interrupted: '游戏已暂停',
  interruptedBody: '你离开了应用，所以这一轮取消了。没有用掉次数。',
  timeUp: '时间到！',
  countdownGo: '开始！',
  howTitle: '玩法',
  hubNext: '下一个',
  medalKeepGoing: '继续加油',
  medalBronze: '铜牌',
  medalSilver: '银牌',
  medalGold: '金牌',
  feedbackKeepGoing: '每一轮都在训练你的眼睛——休息一下，下次你会读得更快。',
  feedbackBronze: '这一轮不错。开局再专注一点，银牌就在眼前。',
  feedbackSilver: '反应敏锐！你比大多数人读得更快——离金牌不远了。',
  feedbackGold: '太棒了——顶尖球员就是这样阅读比赛的。',

  tests: {
    pitchDecision: {
      name: '场上决策',
      what: '决策',
      how: '看这次进攻。画面定住时，你有3秒：点一名队友传球，或者选择射门或带球。',
      you: '你',
      shoot: '射门',
      dribble: '带球',
      pass: '点一名队友传球',
      step1: '观察进攻展开',
      step2: '画面定住——你有3秒',
      step3: '点队友传球，或选择射门、带球',
    },
    anticipation: {
      name: '判断落点',
      what: '预判',
      how: '球飞向球门，然后消失。点出它会从球门线的哪里越过。',
      tapLine: '点它越过的位置',
      step1: '盯住球的弧线',
      step2: '球在到达球门前消失',
      step3: '点出它越过球门线的位置',
      spotOn: '正中！',
      close: '很接近',
      missed: '偏了',
      keyTrue: '实际越线点',
      keyGuess: '你的判断',
    },
    tracking: {
      name: '盯住跑位',
      what: '视野',
      how: '有几个球会闪一下。所有球开始移动时，眼睛一直盯着它们。然后点出你盯住的那几个。',
      watch: '看好这几个',
      follow: '盯住它们…',
      pick: '点出你盯住的球 · {{found}}/{{count}}',
      level: '第{{n}}关',
      step1: '记住闪烁的球衣',
      step2: '大家跑动时盯住它们',
      step3: '点出你盯住的那几个',
      found: '找到 {{found}}/{{count}}',
    },
    goNoGo: {
      name: '绿走红停',
      what: '自控',
      how: '出现绿球时，尽快点击。出现红色“停”标志时，别点。',
      go: '绿：点',
      stop: '红：别点',
      step1: '绿球：尽快点击',
      step2: '红色“停”标志：别点',
      step3: '判断正确比速度更重要',
      stopSign: '停',
    },
    flanker: {
      name: '专注箭头',
      what: '专注',
      how: '中间的箭头指向哪边？别管其他箭头。',
      left: '左',
      right: '右',
      step1: '只看中间的箭头',
      step2: '点它指向的方向',
      step3: '别管旁边的箭头',
    },
    reaction: {
      name: '快手',
      what: '反应速度',
      how: '球门的一个角会亮起来。尽快点它。',
      step1: '球门的一个角会亮起',
      step2: '尽快点那个角',
      step3: '别猜——等它亮',
      tapCorner: '点亮起的那个角',
    },
  },

  // ── 结果 ───────────────────────────────────────────────────────────────────
  resultsTitle: '你的球商',
  analyzing: '正在整理你的结果…',
  resultsNotEnough: '至少玩四个游戏，才能得出总分。',
  confidence: '可信度',
  confidenceLow: '低',
  confidenceMedium: '中',
  confidenceHigh: '高',
  confidenceHint: '精神饱满时把六个游戏都玩一遍，可信度就会高。',
  strengths: '你的强项',
  workOn: '可以加强的地方',
  tipsTitle: '试试这个',
  tip: {
    pitch_decision: '球还没到脚下，先扫一眼两侧身后。需要传球之前，就想好传给谁。',
    anticipation: '在球刚飞出时就盯住它 —— 弧线的开头会告诉你它往哪儿去。',
    tracking: '放松视线，看球员之间的空当，而不是一次只盯一个人。',
    go_no_go: '保持准备，但让颜色来决定。选对比快更重要。',
    flanker: '眼睛锁定中间。周围的干扰就只是干扰。',
    reaction: '每轮开始前放松手 —— 太紧张反而会变慢。',
  },
  history: '你的进步',
  nextRetest: '下次可以全部重玩：{{date}}',
  footnote:
    '这些游戏衡量的是你今天玩它们的表现 —— 速度、专注和决策 —— 不是你这个人，也不是你将来能有多好。多练习、睡好觉、年龄增长，分数都会提高。没有哪个教练会只凭这个数字做决定。',
  notInTalentScore: '显示在你的天赋分旁边，但不计入天赋分 —— 目前是这样。',

  // ── 分享 ───────────────────────────────────────────────────────────────────
  shareTitle: '谁能看到',
  shareClubs: '分享给教练和俱乐部',
  shareClubsBody: '查看你资料的教练、球探和俱乐部，能看到你的总分和每个游戏的分数。',
  shareBadge: '在我的资料上显示徽章',
  shareBadgeBody: '其他球员只能看到你的总分。需要先打开分享。',
  shareMinorNote: '你的资料要等家长批准后，俱乐部才能看到。',
  shareSaved: '已保存',

  // ── 别人的资料上 ───────────────────────────────────────────────────────────
  theirTitle: '球商',
  theirTop: '在其年龄组中位列前{{percent}}%',
  theirTests: '{{n}}/6个游戏',
  theirPlayed: '{{date}}玩过',
  theirConfidence: '可信度：{{level}}',

  // ── 监护人同意（设置 → 监护人） ────────────────────────────────────────────
  scopeAssessments: '可以玩球商游戏',
  scopeAssessmentsOff: '球商游戏未获同意',
  addAssessments: '申请加上球商',
  addAssessmentsHint:
    '你的家长批准了你的资料，但没有同意这些游戏。我们会给他们发一个新链接 —— 他们需要勾选“球商”。',
  addAssessmentsSent: '已向{{email}}发送请求。他们同意后，游戏就会解锁。',
};
