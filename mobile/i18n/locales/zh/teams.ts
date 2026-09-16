/**
 * 一个人支持的球队。
 *
 * 有一层区别必须在翻译之后依然成立：这里说的是球迷身份，绝不是效力关系。
 * “你支持的球队”指的是他们衣柜里的那件球衣；运动员在哪里踢球，是
 * `onboarding` 和 `profile` 里的“现属俱乐部”。把两者混为一谈的译法，会把
 * 球探眼里的一条事实变成一条偏好。
 */
export const teams = {
  // ── 注册步骤 ───────────────────────────────────────────────────────────────
  stepTitle: '你支持哪些球队？',
  stepBody: '最多选五支。这和你在哪里踢球没有关系 —— 这只是你自己的那件球衣。',
  stepSkip: '先跳过',

  venueTitle: '最想去的球场',
  venueBody: '要是明天有人给你一张票，你会去的那座球场。',
  venuePlaceholder: '伯纳乌、阿扎迪、老特拉福德…',

  // ── 选择器 ─────────────────────────────────────────────────────────────────
  searchPlaceholder: '搜索俱乐部和国家队',
  popular: '眼下热门',
  selected_other: '已选{{count}}支',
  maxReached: '最多五支 —— 先移除一支，才能再加一支。',
  noResults: '没有匹配“{{query}}”的结果。',
  addCustom: '添加“{{name}}”',
  addCustomHint: '在我们核对之前，只有你自己看得到。',
  addedCustom: '已添加，现在它在你的主页上了。',
  followersCount_other: '这里有{{count}}位支持者',

  // ── 出现在主页上 ───────────────────────────────────────────────────────────
  supportsTitle: '支持的球队',
  venueLabel: '最想去的球场',
  emptySelf: '把你支持的球队加上 —— 这是找到同好最快的办法。',
  emptyOther: '还没有球队。',
  editAction: '编辑球队',
  savedToast: '球队已更新。',

  // ── 球队页 ─────────────────────────────────────────────────────────────────
  fansTitle: 'AceAiX 上的支持者',
  fansEmpty: '这里还没有人支持他们。你会是第一个。',
  fansLoadMore: '显示更多',
  alsoSupports: '也支持{{team}}',
  sharedTeams_other: '你们都支持{{teams}}',
};
