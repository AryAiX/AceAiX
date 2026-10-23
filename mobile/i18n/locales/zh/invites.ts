/**
 * 邀请 —— 一个专属链接、它带来的圈子，以及积分。
 *
 * 每种语言都要遵守的语气规则：
 *
 *   * 友好、像队友一样：说“叫上你的队友”，绝不说“赚钱”。
 *   * 积分是 AceAiX 的点数。绝不称它为钱、金币、现金、加密货币，
 *     或有价值的奖励；绝不承诺它能换到什么。
 *   * 提到朋友时只用名字（不带姓）。
 *
 * “token”在中文里统一叫“积分”。
 */
export const invites = {
  // ── 名称 ───────────────────────────────────────────────────────────────────
  title: '邀请朋友',
  circleTitle: '我的圈子',
  tagline: '叫上你的队友。每有 10 位朋友加入，你就能获得 1 积分。',

  // ── 资料卡片 ───────────────────────────────────────────────────────────────
  cardCta: '邀请你的朋友',
  cardCtaBody: '每有 10 位朋友加入，你就能获得 1 积分。',
  cardProgress: '已有 {{n}}/{{total}} 位，离下一个积分更近了',
  cardTokens: '积分：{{n}}',

  // ── 圈子页面 ───────────────────────────────────────────────────────────────
  linkTitle: '你的邀请链接',
  codeLabel: '你的邀请码',
  share: '分享邀请',
  copy: '复制链接',
  copied: '链接已复制',
  shareMessage:
    '来 AceAiX 和我一起吧！在这里，运动员能被教练和俱乐部发现。用我的链接注册：{{link}}。也可以在注册后输入我的邀请码 {{code}}。',
  shareTitle: '来 AceAiX 和我一起吧',
  nextToken: '再邀请 {{n}} 位，就能获得下一个积分',
  tokensLabel: '积分',
  countedLabel: '已加入',
  pendingLabel: '设置中',
  howTitle: '规则说明',
  how1: '把你的链接或邀请码分享给朋友。',
  how2: '朋友完成个人资料设置后才算数。未满 18 岁的朋友需要家长同意后才算数。',
  how3: '每有 10 位朋友算数，你就能获得 1 积分。',
  tokensNote: '积分是 AceAiX 的点数，没有现金价值，不能购买、出售或转让。',
  membersTitle: '你邀请的朋友',
  membersEmpty: '还没有人加入。分享你的链接，开始建立你的圈子吧。',
  statusQualified: '已算数',
  statusPending: '正在设置资料',
  invitedBy: '由{{name}}邀请',
  ledgerTitle: '积分记录',
  ledgerGained: '+{{n}} 积分',
  ledgerLost: '−{{n}} 积分：有一个邀请不再算数',

  // ── 手动输入邀请码 ─────────────────────────────────────────────────────────
  enterCodeTitle: '有人邀请你吗？',
  enterCodeBody: '输入朋友的邀请码。注册后的前 14 天内都可以输入。',
  enterCodePlaceholder: '邀请码',
  enterCodeAction: '添加邀请码',
  enterCodeInvalid: '邀请码由 8 位字母和数字组成。',
  claimed: '你是通过{{name}}的邀请加入的',

  notEligibleTitle: '邀请功能仅限运动员和教练使用',
  notEligibleBody: '如果有人邀请了你，会显示在这里。',

  // ── 别人的个人资料 ─────────────────────────────────────────────────────────
  badgeTier: '已邀请 {{n}}+ 人加入 AceAiX',

  // ── 邀请链接的落地页 ───────────────────────────────────────────────────────
  landingTitle: '{{name}}邀请你加入 AceAiX',
  landingTitleNoName: '你受邀加入 AceAiX',
  landingBody:
    '在 AceAiX，年轻运动员能被教练和俱乐部发现。创建免费账号即可加入。',
  landingSignUp: '创建我的账号',
  landingSignIn: '我已经有账号了',
  landingInvalidTitle: '这个邀请链接无效',
  landingInvalidBody: '请朋友再发一次给你。你仍然可以创建账号。',
  landingSignedIn: '你已经有账号了',
  landingSignedInBody: '如果你是在最近 14 天内加入的，仍然可以添加这个邀请。',
  landingAddInvite: '添加这个邀请',
  landingContinue: '继续',
};
