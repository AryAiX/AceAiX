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
};
