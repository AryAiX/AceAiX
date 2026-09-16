/**
 * شجرة الإعدادات — كل شاشة تحت `app/settings/`، والمكوّنات التي تُبنى منها،
 * والواجهة المحيطة بالوثائق القانونية الأربع.
 *
 * أما كل ما يخص الإبلاغ والحظر وأولياء الأمور وحماية من هم دون 18 فمكانه
 * `safety.ts`، ليمكن مراجعة ذلك النص وحده. والمفردات المشتركة (حفظ، إلغاء،
 * موثّق، إلغاء الحظر، درجة الموهبة، أسماء الوثائق الأربع) تأتي من
 * `common.ts` ولا تتكرر هنا.
 *
 * ملاحظة عن القيم المخزَّنة: الرياضات والمراكز والمستويات والدول التي
 * يختارها الكشّاف محفوظة بالإنجليزية وتُترجَم عند العرض عبر
 * `constants/sports.ts`. وهذا الملف لا يحوي إلا العناوين حولها.
 */
export const settings = {
  // ── الإعدادات الرئيسية (app/settings/index.tsx) ────────────────────────────
  title: 'الإعدادات',

  sectionAccount: 'الحساب',
  accountTitle: 'الحساب',
  accountSubtitle: 'البريد وكلمة المرور والتوثيق',
  appearanceTitle: 'المظهر',
  appearanceSubtitle: 'فاتح أو داكن أو حسب هاتفك',
  notificationsTitle: 'الإشعارات',
  notificationsSubtitle: 'اختر ما يصلك',

  sectionPrivacySafety: 'الخصوصية والأمان',
  privacyTitle: 'الخصوصية',
  privacySubtitle: 'من يستطيع مراسلتك وإيجادك',

  sectionScouting: 'الكشافة',
  scoutingFooter: 'نستخدم هذا لترتيب من يظهر أولًا في الاستكشاف.',
  scoutingTitle: 'ما تبحث عنه',
  scoutingSubtitle: 'الرياضات والمراكز والمستويات والعمر',

  sectionAbout: 'عن التطبيق',
  supportTitle: 'تواصل مع الدعم',
  supportFallback: 'راسلنا على {{email}}',
  versionTitle: 'الإصدار',

  signOut: 'تسجيل الخروج',
  signOutConfirmTitle: 'تسجيل الخروج؟',
  signOutConfirmBody: 'ستحتاج إلى بريدك وكلمة مرورك للعودة.',

  /** «AceAiX by AryAiX» — الاسمان علامتان تجاريتان ويمرّان كما هما. */
  productBy: '{{product}} من {{company}}',

  // ── الحساب (app/settings/account.tsx) ─────────────────────────────────────
  sectionSignIn: 'تسجيل الدخول',
  signInFooter:
    'بريدك هو وسيلة دخولك ووسيلتنا للتواصل معك بشأن حسابك. ولتغييره اكتب إلى {{email}}.',
  emailLabel: 'البريد الإلكتروني',
  notSignedIn: 'غير مسجّل الدخول',

  sectionVerification: 'التوثيق',
  verificationTitle: 'التوثيق',
  requestVerification: 'اطلب التوثيق',
  verificationCheckedSubtitle: 'تم التحقق من حسابك',
  verificationAskSubtitle: 'اطلب منّا التحقق من حسابك',
  verificationInReview: 'قيد المراجعة',
  verificationSentOn: 'أُرسل في {{date}}',
  verificationApproved: 'مقبول',
  verificationApprovedSubtitle: 'شارتك في الطريق',
  verificationRejected: 'غير مقبول',
  verificationRejectedSubtitle: 'يمكنك إرسال طلب جديد',
  verificationRequestSent: 'أُرسل الطلب. سننظر فيه قريبًا.',

  sectionYourData: 'بياناتك',
  dataFooter:
    'الملف بصيغة JSON: ملفك ومنشوراتك وتعليقاتك ومتابعاتك وطلباتك ووسائطك، كما نحتفظ بها تمامًا.',
  downloadMyData: 'تنزيل بياناتي',
  downloadSubtitle: 'احصل على نسخة من كل ما في حسابك',
  preparingFile: 'نجهّز ملفك…',
  preparingShort: 'جارٍ التجهيز…',
  exportSaved: 'حُفظ {{name}}',

  // ورقة تغيير كلمة المرور
  changePassword: 'تغيير كلمة المرور',
  changePasswordSubtitle: 'ستبقى مسجّل الدخول على هذا الجهاز.',
  currentPassword: 'كلمة المرور الحالية',
  currentPasswordPlaceholder: 'كلمة مرورك الآن',
  newPassword: 'كلمة المرور الجديدة',
  newPasswordHint_zero: '{{count}} حرف على الأقل.',
  newPasswordHint_one: 'حرف واحد على الأقل.',
  newPasswordHint_two: 'حرفان على الأقل.',
  newPasswordHint_few: '{{count}} أحرف على الأقل.',
  newPasswordHint_many: '{{count}} حرفًا على الأقل.',
  newPasswordHint_other: '{{count}} حرف على الأقل.',
  newPasswordPlaceholder: 'شيء تعرفه أنت وحدك',
  confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
  confirmNewPasswordPlaceholder: 'اكتبها مرة أخرى',
  passwordTooShort_zero: 'اختر كلمة مرور من {{count}} حرف على الأقل.',
  passwordTooShort_one: 'اختر كلمة مرور من حرف واحد على الأقل.',
  passwordTooShort_two: 'اختر كلمة مرور من حرفين على الأقل.',
  passwordTooShort_few: 'اختر كلمة مرور من {{count}} أحرف على الأقل.',
  passwordTooShort_many: 'اختر كلمة مرور من {{count}} حرفًا على الأقل.',
  passwordTooShort_other: 'اختر كلمة مرور من {{count}} حرف على الأقل.',
  passwordsDoNotMatch: 'كلمتا المرور هاتان غير متطابقتين.',
  passwordUnchanged: 'هذه هي كلمة المرور التي لديك أصلًا.',
  passwordCurrentWrong: 'كلمة المرور الحالية غير صحيحة.',
  passwordChanged: 'تم تغيير كلمة المرور.',
  passwordPhishingNote:
    'لا نطلب كلمة مرورك أبدًا عبر البريد أو في رسالة. وإن طلبها أحد، فليس منّا.',

  // ── الخصوصية (app/settings/privacy.tsx) ───────────────────────────────────
  messagePrivacyHeading: 'من يستطيع مراسلتك',
  messagePrivacyHint:
    'هذا يؤثر على المحادثات الجديدة فقط. أما محادثاتك الحالية فتبقى مفتوحة.',

  privacyEveryone: 'الجميع',
  privacyEveryoneHint: 'يستطيع أي شخص على AceAiX بدء محادثة معك.',
  privacyVerified: 'المدرّبون والأندية الموثّقون',
  privacyVerifiedHint: 'الحسابات التي تحققنا منها فقط، إضافة إلى من يتابعونك.',
  privacyFollowing: 'من تتابعهم',
  privacyFollowingHint: 'الحسابات التي تتابعها بالفعل هي وحدها من يستطيع المراسلة أولًا.',
  privacyNobody: 'لا أحد',
  privacyNobodyHint: 'لا يستطيع أحد بدء محادثة جديدة. أما المحادثات القائمة فتستمر.',

  discoveryHeading: 'الظهور في بحث الكشّافين',
  discoveryHint: 'حين يكون هذا مفعّلًا، يستطيع المدرّبون والأندية إيجادك في الاستكشاف.',
  discoverable: 'قابل للاكتشاف',
  discoverableOn: 'قد يظهر ملفك في البحث',
  discoverableOff: 'أنت مخفيّ عن البحث',

  publicWebHeading: 'عرض ملفي للزوار غير المسجّلين',
  publicWebAdult:
    'ملفات البالغين المضبوطة على الظهور في البحث يمكن أن يراها على الويب أيضًا شخص غير مسجّل الدخول. وإيقاف «{{setting}}» أعلاه يخرجك من الاثنين معًا.',
  readPrivacyPolicy: 'اقرأ سياسة الخصوصية كاملة',

  // ── الإشعارات (app/settings/notifications.tsx) ────────────────────────────
  pushOffTitle: 'الإشعارات الفورية متوقفة',
  pushOffBody:
    'هاتفك لا يسمح لتطبيق AceAiX بإرسال الإشعارات، لذا لن يصلك أي مما في الأسفل والتطبيق مغلق.',
  turnOnPush: 'تفعيل الإشعارات الفورية',
  pushStillOff: 'الإشعارات الفورية ما زالت متوقفة. يمكنك تفعيلها من إعدادات هاتفك.',
  autoSaveNote: 'التغييرات تُحفظ تلقائيًا.',

  sectionHowWeReach: 'كيف نصل إليك',
  pushTitle: 'الإشعارات الفورية',
  pushSubtitle: 'على هاتفك، والتطبيق مغلق',
  emailTitle: 'البريد الإلكتروني',
  emailSubtitle: 'ملخّصات من حين لآخر إلى بريدك',

  sectionActivity: 'النشاط',
  activityFooter: 'هذه تتحكم أيضًا فيما يظهر في إشعاراتك داخل التطبيق.',
  notifyFollows: 'متابِعون جدد',
  notifyMessages: 'الرسائل',
  notifyComments: 'التعليقات',
  notifyLikes: 'الإعجابات',

  sectionOpportunities: 'الفرص ودرجتك',
  notifyOpportunities: 'فرص جديدة',
  notifyApplications: 'تحديثات الطلبات',
  notifyScoutInterest: 'اهتمام الكشّافين',
  notifyScoreUpdates: 'تحديثات درجة الموهبة',

  noMarketingNote:
    'لا نرسل إشعارات تسويقية أبدًا، ولا نبيع بياناتك لمن يرسلها.',

  // ── تفضيلات الكشافة (app/settings/scouting.tsx) ───────────────────────────
  scoutingIntro:
    'هذه تحدّد من يضعه الاستكشاف أمامك أولًا، وأي اللاعبين نخبرك عنهم. اترك أي حقل فارغًا لتقول «لا تفضيل».',
  scoutingSports: 'الرياضات',
  scoutingSportsHint: 'اختر كل رياضة تبحث فيها عن لاعبين.',
  scoutingPositions: 'المراكز',
  scoutingPositionsHint: 'مراكز الرياضات التي اخترتها فقط.',
  scoutingPositionsEmpty: 'اختر رياضة أولًا وستظهر مراكزها هنا.',
  scoutingLevels: 'المستويات',
  scoutingCountries: 'الدول',
  scoutingCountriesHint: 'حيث يقيم اللاعب.',

  ageRange: 'الفئة العمرية',
  youngest: 'الأصغر',
  oldest: 'الأكبر',
  yearsSuffix: 'سنة',

  minimumTalentScore: 'أدنى درجة موهبة',
  atLeast: 'على الأقل',
  anyScoreHint: 'أي درجة، بمن فيهم من لا درجة له بعد',
  minScoreHint: 'اللاعبون الحاصلون على {{score}} فأكثر فقط',

  filters: 'عوامل التصفية',
  openToOffersOnly: 'المستعدون للعروض فقط',
  openToOffersHint: 'إخفاء اللاعبين الذين لم يقولوا إنهم يبحثون',
  notifyNewMatches: 'أبلغني بالمطابقات الجديدة',
  notifyNewMatchesHint: 'حين ينضم لاعب مناسب أو يتحسّن مستواه',

  savePreferences: 'حفظ التفضيلات',
  preferencesSaved: 'تم الحفظ. سيعتمد الاستكشاف عليها من الآن.',

  // ── المظهر (app/settings/appearance.tsx) ──────────────────────────────────
  themeHeading: 'السمة',
  themeBody:
    '«حسب النظام» يتبع ما ضبطت عليه هاتفك، بما في ذلك جدوله الليلي.',
  themeSystem: 'حسب النظام',
  themeLight: 'فاتح',
  themeDark: 'داكن',
  preview: 'معاينة',
  themeSystemNoteLight: 'هاتفك الآن في الوضع الفاتح.',
  themeSystemNoteDark: 'هاتفك الآن في الوضع الداكن.',
  themeAlwaysLight: 'فاتح دائمًا، مهما ضبطت هاتفك.',
  themeAlwaysDark: 'داكن دائمًا، مهما ضبطت هاتفك.',

  /* المعاينة منشور متخيَّل، لا يظهر إلا ليمكن الحكم على السمة. */
  previewName: 'ليلى حدّاد',
  previewCity: 'دبي',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'هدفان وتمريرة حاسمة في الديربي. اللقطة كاملة على ملفي.',

  // ── حذف الحساب (app/settings/delete-account.tsx) ──────────────────────────
  deleteAccountTitle: 'حذف الحساب',
  deleteAccountSubtitle: 'إزالة ملفك وكل ما فيه نهائيًا',
  deleteCannotUndoTitle: 'لا يمكن التراجع عن هذا',
  deleteCannotUndoBody:
    'حذف حسابك يزيله نهائيًا. لا توجد طريقة لدينا لاستعادته، والتسجيل من جديد يبدأ من الصفر — ملف جديد، ودرجة موهبة تبدأ من صفر.',

  beforeYouGo: 'قبل أن تذهب',
  takeABreakTitle: 'خذ استراحة بدلًا من ذلك',
  takeABreakBody:
    'أوقف الظهور في البحث فتختفي من بحث الكشّافين. ويبقى ملفك ومنشوراتك ودرجتك كما هي تمامًا، ويمكنك تفعيله من جديد متى شئت.',
  turnOffDiscovery: 'إيقاف الظهور في البحث',
  discoveryAlreadyOff: 'الظهور في البحث متوقف أصلًا',
  hiddenFromSearchToast: 'أنت مخفيّ عن بحث الكشّافين. ولم يُحذف شيء.',
  deleteExportBody:
    'احتفظ بنسخة من ملفك ومنشوراتك وتعليقاتك ومتابعاتك وطلباتك قبل أن يُزال أي شيء. فبعد حذف الحساب لا يمكننا إرسالها إليك.',

  whatGetsDeleted: 'ما الذي يُحذف',
  removedProfile: 'ملفك وصورتك وكل ما كتبته فيه',
  removedPosts: 'كل منشور وتعليق وإعجاب قمت به',
  removedMessages: 'رسائلك، في كل محادثة',
  removedApplications: 'طلباتك وأي فرصة حفظتها',
  removedScore: 'درجة موهبتك وسجلّها كاملًا',
  removedFollows: 'متابِعوك وكل من تتابعهم',
  retentionNote:
    'نحتفظ بعدد قليل من السجلات لمدة محدودة حيث يفرض القانون ذلك — سجلات الأمان والإشراف، وما يلزم للرد على مطالبة قانونية. ولا يُعرض شيء من ملفك على أحد مرة أخرى.',

  /**
   * الكلمة التي تُكتب لتأكيد الحذف. تُرجمها إلى الكلمة التي يكتبها الناس فعلًا
   * بهذه اللغة؛ المقارنة لا تفرّق بين الحروف الكبيرة والصغيرة.
   */
  deleteConfirmWord: 'حذف',
  typeToContinue: 'اكتب {{word}} للمتابعة',
  deleteMyAccount: 'احذف حسابي',
  changedYourMind: 'غيّرت رأيك؟ ارجع فحسب — لم يحدث شيء بعد.',
  deleteConfirmTitle: 'حذف حسابك؟',
  deleteConfirmBody:
    'هذه الخطوة الأخيرة. ملفك ومنشوراتك ورسائلك وطلباتك ودرجة موهبتك ستُزال نهائيًا ولا يمكن استعادتها.',
  deletePermanently: 'حذف نهائي',
  keepMyAccount: 'أبقِ حسابي',

  // ── عناصر الإعدادات المشتركة (components/settings/) ───────────────────────
  nothingToChoose: 'لا شيء لاختياره هنا بعد.',
  stepperDecrease: 'تقليل {{label}}',
  stepperIncrease: 'زيادة {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** صف اختيار يُقرأ بصوت عالٍ: عنوانه، ثم السطر الذي يشرحه. */
  radioA11y: '{{label}}. {{hint}}',

  // ── واجهة الشاشات القانونية (app/legal/) ──────────────────────────────────
  /* الوثائق نفسها منشورة بالإنجليزية ولا تُترجَم أبدًا — لا يُترجَم إلا ما
     يحيط بها. */
  legalUpdated: 'حُدِّثت في {{date}}',
  legalLinkExternal: '{{label}}، يفتح خارج التطبيق',

  // ── إعدادات ناقصة (components/common/ConfigMissing.tsx) ───────────────────
  configMissingTitle: 'الإعداد ناقص',
  configMissingBody:
    'لا يستطيع AceAiX الوصول إلى خادمه لأن متغيرات بيئة Supabase غير مضبوطة لهذه النسخة.',
  configMissingHint:
    'أضفها إلى `mobile/.env` للتطوير المحلي، أو كأسرار EAS لنسخة البناء، ثم أعد تشغيل خادم التطوير.',
};
