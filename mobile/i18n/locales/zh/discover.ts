/**
 * 发现与搜索。
 *
 * 按页面顺序分组：先是“发现”标签页（招募方那一面，然后是运动员的“探索”），
 * 再是两边共用的部分 —— 匹配理由、卡片、列表行 —— 最后是搜索页面。
 *
 * 翻译前有两点值得知道：
 *
 *  - `reason.*` 对应 `private.match_reasons` 在 SQL 里生成的字符串。
 *    英文原文归数据库所有；这些键只决定它被读出来的样子。
 *  - `board.*` 是给正在看自己排在哪里的青少年读的。这里没有一句话在说
 *    “你落后了”，翻译也不该有 —— 排行榜说的是一个人已经站在的位置，
 *    并且往前看。
 */
export const discover = {
  // ── 发现标签页 ─────────────────────────────────────────────────────────────
  title: '发现天赋',
  athleteSubtitle: '俱乐部、教练，以及你的位置',
  searchPeople: '搜索人和俱乐部',
  queryPlaceholder: '姓名、俱乐部、位置',
  queryLabel: '搜索运动员',
  filterResults: '筛选结果',
  filterResultsActive: '筛选结果，已启用筛选',

  // 共用的标签页和范围名称 —— “探索”的标签页和搜索范围。
  tabAthletes: '运动员',
  tabCoaches: '教练',
  tabClubs: '俱乐部',
  tabLeaderboard: '排行榜',

  // ── 为你匹配 ───────────────────────────────────────────────────────────────
  matchedForYou: '为你匹配',
  editBrief: '编辑需求',
  noneFitBrief: '还没有人符合你的需求。放宽一些，我们会继续找。',
  briefTitle: '告诉我们你在找什么样的人',
  briefBody:
    '把项目、位置和年龄范围设一次。之后每位运动员都会显示与你的契合程度，以及这个数字背后的理由。',
  briefAction: '设置我的需求',
  briefSaved: '已保存。从现在起我们按这个来匹配。',

  // ── 结果列表 ───────────────────────────────────────────────────────────────
  searching: '搜索中…',
  sortedByA11y: '按{{sort}}排序。点击更改排序方式',
  rankedByFit: '按契合度排序。每张卡片都写着匹配背后的理由。',
  rankedByScore: '按天赋分排序。加一个筛选条件，就能看到每位运动员和你有多契合。',
  savedToShortlist: '已加入你的候选名单',
  emptyTitle: '没有运动员符合',
  emptyFilteredBody: '试试放宽年龄范围、加一个国家，或者清空搜索词。',
  emptyOpenBody: '运动员完善资料后会出现在这里。',
  clearFilters: '清除筛选',

  // ── 排序弹层 ───────────────────────────────────────────────────────────────
  sortTitle: '结果排序',
  sort: {
    match: '最佳匹配',
    matchHint: '每位运动员与你的筛选条件有多合',
    score: '分数最高',
    scoreHint: '天赋分从高到低',
    recent: '最近活跃',
    recentHint: '资料更新最近的',
    name: '姓名',
    nameHint: '按字母顺序',
  },

  // ── 筛选弹层 ───────────────────────────────────────────────────────────────
  filters: {
    title: '筛选结果',
    subtitle: '你设的每一个条件，都会成为匹配百分比背后的一条理由。',
    preferencesTitle: '你在找什么样的人？',
    preferencesSubtitle:
      '我们据此挑选“为你匹配”里的运动员 —— 并解释每一次匹配。',

    sport: '项目',
    position: '位置',
    positionHint: '请先选一个项目。',
    level: '水平',
    country: '国家',
    findCountry: '查找国家',
    moreCountries_other: '还有{{count}}个 —— 输入来缩小范围。',
    noCountryMatch: '没有匹配的国家。',

    age: '年龄',
    anyAge: '不限年龄',
    youngest: '最小',
    oldest: '最大',
    any: '不限',

    minScore: '最低天赋分',
    anyScore: '不限分数',
    tierAndAbove: '{{tier}}及以上',
    scoreFloor: '只看{{score}}分及以上的运动员。',

    openOnly: '只看接受报价的',
    openOnlyA11y: '只显示接受报价的运动员',

    // 步进控件。`name` 是下面三者之一，读屏软件会念成“增加最小年龄”。
    decrease: '减少{{name}}',
    increase: '增加{{name}}',
    youngestAgeName: '最小年龄',
    oldestAgeName: '最大年龄',
    minScoreName: '最低天赋分',

    // 应用按钮承诺的是一个真实数字，在你点它之前就已经数好了。
    showResults: '显示结果',
    noMatchesYet: '暂无匹配',
    showCount_other: '显示{{count}}条结果',
  },

  // ── 匹配标记和它背后的理由 ─────────────────────────────────────────────────
  matchPercentA11y: '匹配度{{percent}}%',
  /** 对应 `private.match_reasons`。参见 components/discover/MatchBadge.tsx。 */
  reason: {
    sport: '练的是你要的项目',
    position: '位置符合你的需求',
    age: '在你的年龄范围内',
    level: '在你物色的水平上比赛',
    country: '在你所在的区域',
    topTier: '天赋分处于顶级段位',
    strongScore: '天赋分不错',
  },

  // ── 运动员卡片 ─────────────────────────────────────────────────────────────
  card: {
    openProfile: '打开主页',
    scorePillA11y: '天赋分{{score}}分，满分100分，{{tier}}段位',
    talentScoreA11y: '天赋分{{score}}',
    openToOffers: '接受报价',
    save: '把{{name}}加入候选名单',
    unsave: '把{{name}}移出候选名单',
  },

  // ── 探索：运动员这一面的“发现” ───────────────────────────────────────────
  explore: {
    searchClubsPlaceholder: '搜索俱乐部和青训机构',
    searchClubsA11y: '搜索俱乐部',
    searchCoachesPlaceholder: '搜索教练',
    searchCoachesA11y: '搜索教练',
    anywhere: '不限地区',
    countryTitle: '国家',
    countrySubtitle: '把榜单缩小到一个国家。',

    noClubsFound: '没有找到俱乐部',
    noClubsFoundBody: '试试短一点的名字，或者改搜城市。',
    noClubsYet: '还没有俱乐部',
    noClubsYetBody: '俱乐部加入 AceAiX 后会出现在这里。',

    noCoachesFound: '没有找到教练',
    noCoachesFoundBody: '试试名字的一部分，或者清空搜索词浏览全部。',
    noCoachesYet: '还没有教练',
    noCoachesYetBody: '教练加入 AceAiX 后会出现在这里。',
  },

  // ── 排行榜 ─────────────────────────────────────────────────────────────────
  // 在任何语言里都要给人鼓励。名次是一个人已经站到的位置，不是差距；
  // 页脚是写给所有还在往上爬的人的。
  board: {
    caption: '{{scope}}天赋分最高的人。资料在长，分数就会跟着动。',
    everySport: '全部项目',
    scopeInCountry: '{{sport}}，{{country}}',
    keepBuilding: '你添加的每段高光、每项数据、每次认证，都会推动你的分数。继续搭。',
    emptyTitle: '这个榜单还是空的',
    emptyBody: '换个项目或国家试试 —— 或者做第一个上榜的人。',
    you: '你',
    rankA11y: '第{{rank}}名',
    youA11y: '{{name}}，这是你',
    scoreA11y: '天赋分{{score}}，{{tier}}段位',
  },

  // ── 俱乐部和教练列表行 ─────────────────────────────────────────────────────
  club: {
    /* `club` 和 `federation` 来自 common；青训机构只作为一种机构类型出现，
       所以放在这里。 */
    typeAcademy: '青训机构',
    openClub: '打开俱乐部页面',
  },
  followers_other: '{{value}}位粉丝',
  followA11y: '关注{{name}}',
  unfollowA11y: '取消关注{{name}}',

  // ── 搜索页面 ───────────────────────────────────────────────────────────────
  search: {
    back: '返回',
    fieldPlaceholder: '运动员、教练、俱乐部',
    fieldA11y: '在 AceAiX 中搜索',
    recent: '最近搜索',
    clearRecentsA11y: '清除最近搜索',
    trySport: '试试搜项目',
    emptyTitle: '没有“{{term}}”的结果',
    emptyBody:
      '试试少输几个词，或者改搜俱乐部、城市或位置。也可以切换上面的标签页。',
    clearSearch: '清空搜索',
  },
};
