/**
 * 谁看过这份主页。
 *
 * 有一条诚实规则必须在翻译之后依然成立：只有经过认证的教练、球探和俱乐部
 * 会被列出名字，其余的人只计入数量。任何暗示这份名单是完整的说法 ——
 * 比如“这就是看过的所有人” —— 都是错的，因为它有意就是不完整的。
 */
export const views = {
  title: '谁看过你的主页',
  subtitle: '过去{{days}}天里的教练、球探和俱乐部。',

  homeTitleNone: '这周还没有人看过',
  homeTitle_other: '有{{count}}人看过你的主页',
  homeProfessional_other: '其中{{count}}位是教练、球探或俱乐部',
  homeClubs_other: '来自{{count}}家俱乐部',
  homeEmptyBody: '加一段短片，或者记录一场比赛 —— 有影像的主页会先被点开。',
  homeCta: '看看是谁',

  namedTitle: '列出名字的',
  namedBody: '经过认证的教练、球探和俱乐部。',
  unnamedTitle_other: '另有{{count}}次浏览',
  unnamedBody: '来自我们尚未认证的账号，以及其他运动员。这些我们不列名字。',

  viewedAgo: '{{when}}看过',
  viewsCount_other: '看过{{count}}次',
  newBadge_other: '{{count}}条新的',

  emptyTitle: '还没有记录',
  emptyBody: '有教练点开你的主页时，这里就会出现记录。',

  rangeWeek: '本周',
  rangeMonth: '最近30天',

  whyTitle: '为什么有些名字看不到',
  whyBody:
    '我们只列出经过认证的教练、球探和俱乐部 —— 他们是以职业身份，来看一份你为了被找到而公开的主页。未认证的账号和其他运动员只计入数量，从不列出名字。这条规则对谁都不例外。',
};
