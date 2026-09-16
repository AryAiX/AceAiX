/**
 * 未登录时的流程：欢迎页、登录、注册，以及两个密码页面。
 *
 * 年龄门槛和监护人相关的文案属于合规内容。注册账号的最低年龄是13岁，
 * 13至17岁的人需要家长或监护人批准，才能被搜索到或收到私信。
 * 可以改写措辞，但绝不能改动规则本身。
 */
export const auth = {
  // ── 向导框架，与资料填写向导共用 ──────────────────────────────────────────
  stepCounter: '{{current}}/{{total}}',
  stepProgress: '第 {{current}} 步，共 {{total}} 步',
  stepBack: '退回上一步',

  // ── 多个页面共用的字段和提示 ──────────────────────────────────────────────
  emailLabel: '邮箱',
  passwordLabel: '密码',
  emailRequired: '请填写你的邮箱地址。',
  emailInvalid: '这个邮箱地址看起来不太对。',
  passwordRequired: '请填写你的密码。',
  passwordMinLength_other: '至少要有{{count}}个字符。',
  passwordLengthPlaceholder_other: '至少{{count}}个字符',
  createAccount: '创建账号',
  checkYourEmail: '查收邮件',
  sentTo: '已发送至',
  backToSignIn: '返回登录',

  // ── 条款与隐私 ────────────────────────────────────────────────────────────
  /* 两个链接标签是放在句子里的，翻译时可以移到本语言需要的位置。 */
  legalContinue: '继续即表示你同意我们的{{terms}}和{{privacy}}。',
  legalAgree: '我同意{{terms}}和{{privacy}}。',
  legalTermsLink: '条款',
  legalTermsA11y: '阅读服务条款',
  legalPrivacyA11y: '阅读隐私政策',
  legalAgreeA11y: '我同意服务条款和隐私政策',

  // ── 密码强度条 ────────────────────────────────────────────────────────────
  password: {
    tooShortLabel: '太短',
    weakLabel: '偏弱',
    weakHint: '加一个大写字母和一个数字。',
    goodLabel: '不错',
    goodHint: '再加一个数字或符号会更牢固。',
    strongLabel: '很强',
    strongHint: '这是个好密码。',
    meterSummary: '{{label}} · {{hint}}',
  },

  // ── 欢迎页 ────────────────────────────────────────────────────────────────
  welcome: {
    headline: '让人看见你。',
    subheadline: '你的天赋，被发现。',
    body: '建好资料，拿到天赋分，让教练和俱乐部找到你。',
    highlightScore: '百分制的天赋分，让你知道自己处在什么位置',
    highlightTrials: '来自俱乐部和青训营的真实试训与名额',
    highlightGuardian: '未满18岁？家长批准之后，别人才能找到你的资料',
    signIn: '我已经有账号了',
  },

  // ── 登录 ──────────────────────────────────────────────────────────────────
  signIn: {
    title: '欢迎回来',
    subtitle: '登录后接着上次的进度继续。',
    passwordPlaceholder: '你的密码',
    forgot: '忘记密码？',
    forgotA11y: '重置你的密码',
    submit: '登录',
    newHere: '第一次用 {{app}}？',
    createAccount: '创建账号',
  },

  // ── 注册 ──────────────────────────────────────────────────────────────────
  signUp: {
    roleTitle: '你是哪一种？',
    roleSubtitle:
      '这决定了为你建立哪一类资料。之后可以联系我们的客服团队更改。',
    roleAthleteTitle: '我是运动员',
    roleAthleteSubtitle: '建立资料，等待被发现',
    roleCoachTitle: '我是教练',
    roleCoachSubtitle: '寻找球员，发布名额',
    roleClubTitle: '我是俱乐部或青训机构',
    roleClubSubtitle: '发掘新人，发布试训',
    roleGuardianTitle: '我是家长或监护人',
    roleGuardianSubtitle: '支持并批准孩子的资料',

    nameTitle: '该怎么称呼你？',
    nameSubtitle: '请用真名 —— 教练需要知道自己看的是谁。',
    firstNameLabel: '名字',
    firstNamePlaceholder: 'Sara',
    firstNameRequired: '请填写你的名字。',
    lastNameLabel: '姓氏',
    lastNamePlaceholder: 'Karimi',
    lastNameRequired: '请填写你的姓氏。',

    dobTitle: '你的出生日期？',
    dobSubtitle:
      '我们问这个是为了保护年纪较小的运动员。你的准确生日不会展示给任何人，只会显示一个年龄段。',
    dobChoose: '选择出生日期',
    dobChange: '更改',
    dobSelectedA11y: '出生日期，{{date}}。点击更改',
    dobDayLabel: '日',
    dobDayPlaceholder: '04',
    dobMonthLabel: '月',
    dobMonthPlaceholder: '09',
    dobYearLabel: '年',
    dobYearPlaceholder: '2010',
    dobTooYoung:
      '注册 {{app}} 账号需要年满{{age}}岁。点击{{action}}，我们会说明接下来该怎么做。',
    dobMinorTitle: '需要家长或监护人参与',
    dobMinorBody:
      '因为你未满18岁，需要家长或监护人批准你的资料，教练才能找到你。我们稍后会问他们的邮箱，并给他们发一封简短的说明邮件。',

    blockedTitle: '等你满{{age}}岁再回来',
    blockedBody:
      '{{app}} 是为{{age}}岁及以上的运动员做的，所以现在还不能给你创建账号。这条规定是为了保护年纪更小的孩子在网上的安全，我们无法为任何人破例。',
    blockedEncouragement:
      '继续训练。等你满{{age}}岁再回来，你的资料还在这里等你。',
    blockedBackToStart: '回到开头',
    blockedWrongDate: '我选错日期了',

    accountTitle: '设置你的登录方式',
    accountSubtitle:
      '一个邮箱，一个密码。我们会发一个链接，确认这个邮箱是你的。',
    termsRequired: '请先同意服务条款和隐私政策再继续。',
  },

  // ── 查收邮件 ──────────────────────────────────────────────────────────────
  checkEmail: {
    body: '我们给你发了一个确认地址的链接。点开它，然后回来登录。',
    spamHint:
      '还没收到？可能要等一会儿，有时也会进垃圾邮件或推广邮件。',
    resendCountdown_other: '{{count}}秒后可重新发送',
    resend: '重新发送邮件',
    resendSuccess: '已发送。再去收件箱看看。',
  },

  // ── 忘记密码 ──────────────────────────────────────────────────────────────
  forgotPassword: {
    title: '忘记密码了？',
    subtitle:
      '告诉我们你注册时用的邮箱，我们会发一个链接给你，用来设置新密码。',
    submit: '发送重置链接',
    sentBody:
      '如果有账号用了这个地址，设置新密码的链接就在路上了。链接只能用一次，过一段时间会失效。',
  },

  // ── 重置密码 ──────────────────────────────────────────────────────────────
  resetPassword: {
    title: '设置新密码',
    subtitle:
      '选一个你在别处没用过的。设置好之后会直接登录。',
    newPasswordLabel: '新密码',
    repeatLabel: '再输一次新密码',
    repeatPlaceholder: '再输入一遍',
    repeatRequired: '请再输入一遍新密码。',
    mismatch: '两次输入的密码不一致。',
    submit: '保存新密码',
    success: '密码已更改，你已经登录了。',
    expiredHint: '如果这个链接已经过期，可以在登录页面重新申请一个。',
  },
};
