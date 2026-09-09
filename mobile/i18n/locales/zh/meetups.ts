/**
 * Meetups, in Simplified Chinese — arranging to actually play with people.
 *
 * Two words carry the meaning and must not be collapsed into one another:
 *
 *   * a **spot** is a place in the game, so it is 名额 — a slot for a person,
 *     never a location. The geography is 场地 (venue), 区域 (area) and 城市
 *     (city), and none of them may borrow 名额.
 *   * the **host** is 组织者 — whoever posted this one game and decides who
 *     comes. Not 队长, not 教练, and not 主办方, which would make a casual game
 *     sound like an event with an organisation behind it. The word carries no
 *     authority past this one game.
 *
 * Chinese has a single plural category, so every family here defines `_other`
 * and nothing else. `SingleFormPlurals` in `./index.ts` drops the `_one` keys
 * from what this catalogue must supply, and `tests/unit/i18n.test.ts` checks
 * each family against `Intl.PluralRules('zh')` — adding a `_one` form fails
 * that test rather than satisfying it.
 *
 * 约球 is the feature in one word; 球局 is one arranged game. Keep both plain:
 * this is read by adults sorting out a Saturday kickabout, not by a league.
 */
export const meetups = {
  // ── 这个标签页 ─────────────────────────────────────────────────────────────
  title: '约球',
  subtitle: '不管你在哪儿，都能找到人一起打',

  // ── 搜索 ───────────────────────────────────────────────────────────────────
  searchPlace: '在哪儿？城市、区域或场地',
  searchPlaceHint: '你现在在的地方，或者你要去的地方',
  anySport: '不限项目',
  anyLevel: '不限水平',
  anyDate: '不限日期',
  today: '今天',
  thisWeek: '本周',
  thisMonth: '本月',
  filters: '筛选',
  clearFilters: '清除',

  emptyTitle: '这里还什么都没有',
  emptyBody: '这个时间、这个地方还没人发过球局。你来发第一场 —— 附近多半也有人在找。',
  emptyAction: '发起球局',
  emptySearchTitle: '没有匹配的结果',
  emptySearchBody: '把日期范围放宽一点，或者换个附近的区域。',

  // ── 一张卡片 ───────────────────────────────────────────────────────────────
  spotsLeft_other: '还剩{{count}}个名额',
  spotsOf: '{{taken}}/{{total}}人',
  full: '已满',
  cancelled: '已取消',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: '组织者',
  hostedBy: '由{{name}}组织',
  costEach: '每人{{cost}}',

  levelAny: '不限水平',
  levelBeginner: '新手',
  levelIntermediate: '中等',
  levelAdvanced: '进阶',
  levelCompetitive: '竞技',

  // ── 发起一场 ───────────────────────────────────────────────────────────────
  createTitle: '发起球局',
  createSubtitle: '写清楚你想打什么、在哪儿、什么时候。别人来申请，你来定。',
  fieldSport: '项目',
  fieldTitle: '这是什么局？',
  fieldTitlePlaceholder: '周六五人制',
  fieldCountry: '国家',
  fieldCity: '城市',
  fieldArea: '区域',
  fieldAreaPlaceholder: '阿尔贾达夫、码头区、波多班努斯…',
  fieldVenue: '场地',
  fieldVenuePlaceholder: '球场、场馆或俱乐部',
  fieldWhen: '什么时候',
  fieldEnds: '到什么时候',
  fieldSpots: '一共几个人，算上你？',
  fieldSpotsHint: '找人对练，写两个。五人制，写十个。',
  fieldLevel: '水平',
  fieldNote: '还有什么要说的吗？',
  fieldNotePlaceholder: '记得带球鞋。打完一般还会一起喝一杯。',
  fieldCost: '每人多少钱',
  fieldCostPlaceholder: '25 迪拉姆，或者免费',
  post: '发出去',
  posted: '发好了，现在别人能找到它了。',

  // ── 加入别人的 ─────────────────────────────────────────────────────────────
  askToJoin: '申请加入',
  askMessage: '跟组织者说句话',
  askMessagePlaceholder: '我踢左后卫，这块场地我熟。',
  requested: '已申请 —— 等组织者回复',
  joined: '你加入了',
  declined: '这次没成',
  askSent: '已发出。组织者会回复你。',
  youAreHosting: '这场是你组织的',
  leave: '退出这场球局',
  leaveConfirmTitle: '退出这场球局？',
  leaveConfirmBody: '你的名额会重新放出来，组织者也会收到通知。',
  left: '你退出了，名额重新空出来了。',

  // ── 你自己组织时 ───────────────────────────────────────────────────────────
  requests: '申请',
  requests_other: '{{count}}条申请',
  noRequests: '还没有人申请。',
  accept: '接受',
  decline: '拒绝',
  accepted: '{{name}}加入了。',
  declinedToast: '已拒绝。',
  going: '要来的人',
  cancel: '取消这场球局',
  cancelConfirmTitle: '取消这场球局？',
  cancelConfirmBody: '所有要来的人都会收到通知。取消之后没法恢复。',
  cancelled_toast: '已取消。要来的人都收到通知了。',

  // ── 我的 ───────────────────────────────────────────────────────────────────
  mine: '我的',
  minePast: '过往',
  mineEmptyTitle: '接下来没有安排',
  mineEmptyBody: '你发起或加入的球局会出现在这里。',

  // ── 无障碍 ─────────────────────────────────────────────────────────────────
  a11yCard: '{{title}}，{{city}}，{{spots}}',
  a11yAccept: '接受{{name}}',
  a11yDecline: '拒绝{{name}}',
};
