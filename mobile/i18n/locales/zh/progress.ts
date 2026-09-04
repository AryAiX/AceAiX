/**
 * 连续天数与成就。
 *
 * `streakNoPressure` 是这份文件里最要紧的一句：它明说漏掉一天不会失去任何东西，
 * 只是当前这一轮重新开始。永远不要把它改写成警告。
 *
 * 中文只有一种复数形式，所以这里只写 `_other`，不写 `_one`。
 */
export const progress = {
  title: '成就',
  subtitle: '这里的每一项，都来自你真正做过的事。',
  earnedOf: '{{total}} 项中的 {{earned}} 项',
  unlockedOn: '{{date}} 获得',
  tileEarnedA11y: '{{title}}。{{date}} 获得。{{hint}}',
  tileLockedA11y: '{{title}}。尚未获得。{{hint}}',

  groupStart: '起步',
  groupSeen: '被看见',
  groupScore: '你的评分',
  groupStreak: '常来看看',

  rarityCommon: '常见',
  rarityRare: '少见',
  rarityEpic: '亮眼',

  days_other: '{{count}} 天',

  streakChipA11y: '连续记录：{{days}}',
  streakChipHint: '查看什么是连续记录，以及最近七天',
  streakSheetTitle: '你的连续记录',
  streakWhat:
    '连续记录数的是你连着多少天打开 AceAiX。就这么简单——来看看就好。它和发帖无关，也永远不会改变你的天赋评分。',
  streakNoPressure:
    '漏掉一天，你不会失去任何东西，只是当前这一轮重新开始。你的最长记录还在，评分也还在，下次再来的时候重新数起。',
  streakNoneTitle: '还没有连续记录',
  streakNoneBody: '你第一次打开应用的那天就开始了，不需要另外开启什么。',

  calendarTitle: '最近 7 天',
  calendarA11y: '最近七天。其中有 {{count}} 天你来过。',
  streakCurrent: '当前',
  streakLongest: '最长',
  streakTotal: '累计天数',

  gotIt: '知道了',

  nextTierTitle: '下一档',
  pointsToNext_other: '还差 {{count}} 分到{{tier}}',
  tierStartsAt: '{{tier}}从 {{score}} 分开始',
  tierTopTitle: '最高一档',
  tierTopBody: '精英之上没有别的档位了。把资料保持更新，它就一直是你的。',
  tierTopA11y: '精英档，天赋评分 {{score}}。这是最高一档。',
  scoreNotReadyTitle: '还没有天赋评分',
  scoreNotReadyBody: '填上你的运动项目和位置，评分就会出现。',

  celebrateAchievementEyebrow: '获得成就',
  celebrateTierEyebrow: '新档位',
  celebrateStreakEyebrow: '连续记录',
  celebrateTierBody: '你的天赋评分达到了 {{score}}。',
  celebrateStreakBody: '你一直都在。说真的，这才是最难的部分。',
  streakMilestone_other: '连续 {{count}} 天',
  andMore_other: '墙上还有 {{count}} 项',
  celebrateNice: '不错',
  celebrateNext: '下一个',
  celebrateShare: '分享',
  shareTierMessage: '我在 AceAiX 上升到了{{tier}}档——天赋评分 {{score}}。',

  achievements: {
    first_post: {
      title: '第一条动态',
      hint: '你第一次发了动态。',
    },
    first_clip: {
      title: '第一段视频',
      hint: '你把第一段视频加进了高光集锦。',
    },
    three_clips: {
      title: '三段视频',
      hint: '高光集锦里有三段视频，已经够球探看一遍了。',
    },
    first_match: {
      title: '第一场比赛',
      hint: '你记录了自己的第一场比赛。',
    },
    ten_matches: {
      title: '十场比赛',
      hint: '你的记录里有十场比赛。',
    },
    first_application: {
      title: '第一次申请',
      hint: '你报名了第一次试训或机会。',
    },
    first_follower: {
      title: '第一位关注者',
      hint: '有人关注了你。',
    },
    ten_followers: {
      title: '十位关注者',
      hint: '有十个人关注你。',
    },
    fifty_followers: {
      title: '五十位关注者',
      hint: '有五十个人关注你。',
    },
    first_endorsement: {
      title: '第一份推荐',
      hint: '有教练或俱乐部为你背书。',
    },
    verified: {
      title: '已认证',
      hint: '你的账号已通过认证，别人知道这确实是你。',
    },
    profile_complete: {
      title: '资料完整',
      hint: '天赋评分里的资料部分拿到了满分。',
    },
    tier_bronze: {
      title: '青铜',
      hint: '你的天赋评分达到了 40。',
    },
    tier_silver: {
      title: '白银',
      hint: '你的天赋评分达到了 55。',
    },
    tier_gold: {
      title: '黄金',
      hint: '你的天赋评分达到了 70。',
    },
    tier_elite: {
      title: '精英',
      hint: '你的天赋评分达到了 85。',
    },
    streak_3: {
      title: '三天',
      hint: '你连着三天打开了 AceAiX。',
    },
    streak_7: {
      title: '整整一周',
      hint: '你连着七天打开了 AceAiX。',
    },
    streak_30: {
      title: '三十天',
      hint: '你连着三十天打开了 AceAiX。',
    },
  },
};
