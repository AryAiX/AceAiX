/**
 * 会出错的地方，用大白话说清楚。
 *
 * `lib/errors.ts` 把数据库返回码和 Supabase 的认证信息映射到这些键上，
 * 所以无论错误在哪里被捕获，读到的都是使用者自己的语言。
 */
export const errors = {
  generic: '出了点问题，请重试。',
  offline: '没有网络连接。请检查网络后重试。',
  sessionExpired: '登录已过期，请重新登录。',
  notSignedIn: '需要登录后才能这么做。',

  // 数据库提示
  guardianConsentRequired:
    '你的资料需要家长或监护人批准后，才能出现在搜索结果里。',
  messagingNotPermitted:
    '你无法给这个账号发私信。对方可能只接收经过认证的教练和俱乐部的私信。',
  rateLimited: '你的操作太频繁了，稍等片刻再试。',
  ageBelowMinimum: '年满13岁才能使用 AceAiX。',

  // 数据库返回码
  storyCardText: '快拍卡片需要填写文字，最多 140 个字符。',
  storyMediaMissing: '请先上传照片，再分享快拍。',
  alreadyExists: '这个已经存在了。',
  missingReference: '所依赖的内容不见了，刷新一下试试。',
  invalidDetails: '其中有些信息不符合要求。',
  noPermission: '你没有执行这项操作的权限。',
  notFound: '没有找到相关内容。',

  // 认证
  invalidCredentials: '邮箱或密码不正确。',
  emailNotConfirmed: '请先到收件箱里确认你的邮箱地址。',
  emailInUse: '这个邮箱已经注册过账号了，试试直接登录。',
  passwordTooShort: '密码至少要有8个字符。',
  tooManyAttempts: '尝试次数过多，等几分钟再试。',

  // 挑战与球迷身份
  challengeClosed: '这个挑战已经截止了。',
  challengeNotAllowed: '只有经过认证的教练和俱乐部才能发布挑战。',
  clipRequired: '请先选一段你自己的公开短片。',
  ageOutOfRange: '这个挑战面向的是另一个年龄段。',
  favoriteTeamsMax: '最多五支球队 —— 先移除一支，才能再加一支。',
  profileIncomplete: '请先完善你的运动员资料。',
  notAnAthlete: '只有运动员才有天赋分。',

  endorseSelf: '不能推荐你自己。',
  endorseLimit: '你已经推荐了这名球员的六项特点。',
  giConsentRequired: '需要家长或监护人先同意你玩球商游戏。',
  giAttemptLimit: '最近两周你已经玩过这个游戏两次了，按最好的一次算。',
  giSessionClosed: '这一轮已经结束了。开始新的一轮就能接着玩。',
  giAlreadyDone: '这一轮里你已经玩过这个游戏了。',
  sponsorOnly: '只有赞助商账号可以这样做。',
  sponsorNotVerified: '你的赞助商账号尚未通过认证。',
  athleteOnly: '只有运动员可以这样做。',
  sponsorshipRequestLimit: '最多同时保留三个开放的申请。',
  sponsorshipRequestClosed: '该申请已不再开放。',
  sponsorCallClosed: '该征集已关闭。',
  sponsorCallAdultsOnly: '该征集仅面向成年人。',
  sponsorshipAlreadySent: '你已有一项在等待答复。',
  sponsorshipAlreadyAnswered: '这一项已被答复。',
  sponsorCallLimit: '最多同时保留十个开放的征集。',
  coachOnly: '只有教练可以这样做。',
  coachNotAccepting: '这位教练目前不招收学员。',
  coachUnavailable: '无法预约这位教练。',
  minorNeedsVerifiedCoach: '你只能预约经 AceAiX 认证的教练。',
  coachingSlotGone: '该时间已不可预约。',
  coachingSlotFull: '该时间已满。',
  coachingAlreadyBooked: '你已经预约了这个时间。',
  coachingLocationRequired: '请说明上课地点。',
  coachingServiceLimit: '最多同时提供十二项课程。',
  coachingOwnCalendar: '不能预约自己的日历。',
};
