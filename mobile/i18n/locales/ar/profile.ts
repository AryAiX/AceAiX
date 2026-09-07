/**
 * الملفات الشخصية — ملفي، وملف غيري، والتبويبات تحته، وقوائم المتابِعين،
 * ونموذج التعديل.
 *
 * مرتّبة بترتيب الشاشات. وكل ما يظهر في مواضع أخرى من التطبيق (المتابِعون،
 * المنشورات، اللقطات، المباريات، التزكيات، متابعة، مراسلة، موثّق) مأخوذ من
 * `common` بدل تكراره هنا.
 *
 * ملاحظة عن القيم المخزَّنة: الرياضات والمراكز والمستويات والجهة الأقوى
 * محفوظة في قاعدة البيانات بالإنجليزية وتُترجَم عند العرض عبر
 * `constants/sports.ts`. أما أسماء الدول فتُحفظ كما كُتبت ولا تُترجَم كذلك —
 * راجع PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── ملف شخص آخر (app/u/[id].tsx) ──────────────────────────────────────────
  title: 'الملف الشخصي',
  thisPerson: 'هذا الشخص',

  notFoundTitle: 'لم نجد هذا الملف',
  notFoundBody: 'الرابط الذي فتحته لا يشير إلى أحد على AceAiX.',
  notFoundAction: 'رجوع',

  blockedTitle: 'لا يمكنك عرض هذا الملف',
  blockedByYouBody: 'أنت حظرت {{name}}. ألغِ الحظر لرؤية ملفه من جديد.',
  blockedBody: 'هذا الملف غير متاح لك.',
  unblockedToast: 'أُلغي الحظر.',

  suspendedTitle: 'هذا الحساب غير متاح',
  suspendedBody: 'أُوقف مؤقتًا ريثما يراجعه فريقنا.',

  // ── ترويسة الملف (components/profile/ProfileHeader.tsx) ───────────────────
  openToOffers: 'مستعد للعروض',
  followersA11y_zero: 'لا متابِعين. يفتح القائمة.',
  followersA11y_one: 'متابِع واحد. يفتح القائمة.',
  followersA11y_two: 'متابِعان. يفتح القائمة.',
  followersA11y_few: '{{count}} متابِعين. يفتح القائمة.',
  followersA11y_many: '{{count}} متابِعًا. يفتح القائمة.',
  followersA11y_other: '{{count}} متابِع. يفتح القائمة.',
  followingA11y_zero: 'لا يتابع أحدًا. يفتح القائمة.',
  followingA11y_one: 'يتابع شخصًا واحدًا. يفتح القائمة.',
  followingA11y_two: 'يتابع شخصين. يفتح القائمة.',
  followingA11y_few: 'يتابع {{count}} أشخاص. يفتح القائمة.',
  followingA11y_many: 'يتابع {{count}} شخصًا. يفتح القائمة.',
  followingA11y_other: 'يتابع {{count}} شخص. يفتح القائمة.',

  editProfile: 'تعديل الملف',
  settings: 'الإعدادات',
  moreOptions: 'خيارات أخرى',
  messageLimitedHint: 'الرسائل محدودة لهذا الحساب. اضغط لمعرفة السبب.',

  shareProfile: 'مشاركة الملف',
  /** الرابط لا يُترجَم؛ الجملة حوله فقط. */
  shareMessage: '{{name}} على AceAiX — {{url}}',

  reportAccount: 'الإبلاغ عن هذا الحساب',
  reportAccountSubtitle: 'يراجع فريقنا كل بلاغ',
  reportSheetSubtitle: 'اختر أقرب سبب. لا يُخبَر أحد بأنك أبلغت عنه.',
  reportThanks: 'شكرًا. سيطّلع فريقنا على هذا.',
  reportReason: {
    childSafety: 'سلامة الأطفال',
    childSafetyHint: 'قاصر في خطر أو مستهدَف',
    harassment: 'تنمّر أو تحرّش',
    harassmentHint: 'إساءة موجّهة إلى شخص',
    hate: 'خطاب كراهية',
    hateHint: 'هجوم على هوية شخص',
    nudity: 'عُري أو محتوى جنسي',
    nudityHint: 'محتوى لا مكان له هنا',
    violence: 'عنف أو تهديد',
    violenceHint: 'تهديدات أو محتوى صادم',
    impersonation: 'انتحال شخصية غيره',
    impersonationHint: 'حساب مزيّف',
    scam: 'احتيال أو نصب',
    scamHint: 'تجارب أو رسوم أو عروض وهمية',
    spam: 'رسائل مزعجة',
    spamHint: 'منشورات مكرّرة أو غير مرغوبة',
    other: 'شيء آخر',
    otherHint: 'اشرح لنا بكلماتك',
  },

  blockPerson: 'حظر {{name}}',
  blockPersonSubtitle: 'لن يستطيع إيجادك ولا مراسلتك',
  blockConfirmTitle: 'حظر {{name}}؟',
  blockConfirmBody:
    'لن يستطيع {{name}} مراسلتك ولا متابعتك ولا رؤية ما تنشره. يمكنك التراجع من الإعدادات.',
  blockedToast: 'لم يعد {{name}} يراك ولا يستطيع مراسلتك.',

  /** إجابات مباشرة عن سؤال «لماذا لا أستطيع مراسلة هذا الشخص؟». */
  messageBlockTitle: 'لا يمكنك مراسلة هذا الحساب',
  messageBlockNote:
    'هذه القواعد تحمي اللاعبين الصغار. يضعها اللاعب، وأحد والديه أو ولي أمره، و AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'عمر هذا اللاعب دون 18. لا يستطيع بدء محادثة معه إلا المدرّبون والأندية الموثّقون.',
    minorRequiresGuardianConsent:
      'لم يوافق أحد والدَي هذا اللاعب أو ولي أمره على الرسائل بعد.',
    recipientMessagesOff: 'أوقف هذا الشخص استقبال الرسائل.',
    recipientOnlyAcceptsFollowed: 'لا يستقبل هذا الشخص الرسائل إلا ممن يتابعهم.',
    recipientOnlyAcceptsVerified: 'لا يستقبل هذا الشخص الرسائل إلا من الحسابات الموثّقة.',
    notPermitted: 'لا يمكنك بدء محادثة مع هذا الحساب الآن.',
    notFound: 'لم نتمكن من العثور على هذا الحساب.',
  },
  gotIt: 'فهمت',

  // ── صف الإحصاءات (components/profile/StatRow.tsx) ─────────────────────────
  statA11y: '{{value}} {{label}}',

  // ── التبويبات (components/profile/ProfileTabs.tsx) ────────────────────────
  tabHighlights: 'أبرز اللقطات',
  tabCareer: 'المسيرة',

  // ── تبويب المنشورات (components/profile/PostsTab.tsx) ─────────────────────
  postsEmptyTitleSelf: 'لا منشورات بعد',
  postsEmptyTitleOther: 'لم يُنشر شيء بعد',
  postsEmptyBodySelf:
    'شارك حصة تدريب أو نتيجة أو لقطة. الملفات النشطة يراها عدد أكبر.',
  postsEmptyBodyOther: 'عندما ينشر، سيظهر هنا.',
  postsEmptyAction: 'اكتب منشورًا',

  // ── شبكة الوسائط (components/profile/MediaGrid.tsx) ───────────────────────
  addHighlight: 'إضافة لقطة',
  videoClipA11y: 'مقطع فيديو',
  photoA11y: 'صورة',

  // ── تبويب أبرز اللقطات (components/profile/HighlightsTab.tsx) ─────────────
  photoPermission: 'يحتاج AceAiX إلى إذن لفتح صورك.',

  noHighlightsTitle: 'لا لقطات هنا',
  noHighlightsBody: 'أبرز اللقطات جزء من ملف اللاعب.',
  clipsEmptyTitleSelf: 'المدرّبون يشاهدون قبل أن يقرأوا.',
  clipsEmptyTitleOther: 'لا لقطات بعد',
  clipsEmptyBodySelf: 'أضف أول لقطة لك. ثلاث لقطات قصيرة هي العدد المثالي.',
  clipsEmptyBodyOther: 'عندما يرفع لقطة، ستظهر هنا.',
  clipsEmptyAction: 'أضف أول لقطة',

  nameClipTitle: 'سمِّ هذه اللقطة',
  nameClipSubtitle: 'عنوان قصير يساعد المدرّب على معرفة ما يشاهده.',
  clipTitleLabel: 'العنوان',
  clipTitlePlaceholderVideo: 'مثال: هدف بالقدم اليسرى أمام الوصل',
  clipTitlePlaceholderPhoto: 'مثال: نهائي الكأس',
  addToProfile: 'إضافة إلى الملف',
  clipAddedToast: 'أُضيفت. يستطيع المدرّبون مشاهدتها الآن.',
  clipRemovedToast: 'أُزيلت.',

  holdToRemoveClip: 'اضغط مطوّلًا على لقطة لإزالتها.',
  removeClipTitle: 'إزالة هذه اللقطة؟',
  removeClipBody: 'ستُزال من ملفك. وقد تنخفض درجة موهبتك.',
  mediaLoadFailed: 'تعذّر تحميل هذا الملف. حاول بعد قليل.',

  // ── تبويب المسيرة (components/profile/CareerTab.tsx) ──────────────────────
  noCareerTitle: 'لا سجلّ مسيرة',
  noCareerBody: 'هذا القسم لملفات اللاعبين.',
  add: 'إضافة',

  matchesEmptyTitleSelf: 'لا مباريات مسجّلة',
  matchesEmptyTitleOther: 'لا مباريات بعد',
  matchesEmptyBodySelf: 'تسجيل آخر 12 شهرًا يُظهر للمدرّب مستواك الحالي.',
  matchesEmptyBodyOther: 'لم يُسجَّل شيء هنا بعد.',
  matchFallback: 'مباراة',
  matchVersus: 'ضد {{opponent}}',
  matchMinutes: '{{n}} دقيقة',
  matchGoals_zero: 'بلا أهداف',
  matchGoals_one: 'هدف واحد',
  matchGoals_two: 'هدفان',
  matchGoals_few: '{{count}} أهداف',
  matchGoals_many: '{{count}} هدفًا',
  matchGoals_other: '{{count}} هدف',
  matchAssists_zero: 'بلا تمريرات حاسمة',
  matchAssists_one: 'تمريرة حاسمة',
  matchAssists_two: 'تمريرتان حاسمتان',
  matchAssists_few: '{{count}} تمريرات حاسمة',
  matchAssists_many: '{{count}} تمريرة حاسمة',
  matchAssists_other: '{{count}} تمريرة حاسمة',

  honoursTitle: 'الألقاب',
  honoursEmptyTitleSelf: 'لا ألقاب بعد',
  honoursEmptyTitleOther: 'لا ألقاب مدرَجة',
  honoursEmptyBodySelf: 'ألقاب الدوري والكؤوس وأفضل لاعب في الموسم — كل ما فزت به يُحتسب.',

  certificatesTitle: 'الشهادات',
  certificatesEmptyTitleSelf: 'لا شهادات بعد',
  certificatesEmptyTitleOther: 'لا شهادات مدرَجة',
  certificatesEmptyBodySelf: 'شهادات التدريب والإسعافات الأولية وحماية الأطفال واللغات.',

  endorsementsTitle: 'التزكيات',
  endorsementsEmptyTitle: 'لا تزكيات بعد',
  endorsementsEmptyBodySelf:
    'اطلبها من مدرّب يعرف مستواك. تزكية من مدرّب موثّق تعني الكثير.',

  logMatchTitle: 'تسجيل مباراة',
  logMatchSubtitle: 'ما تتذكّره فقط — يمكنك إضافة المزيد لاحقًا.',
  matchDate: 'التاريخ',
  matchDateHint: 'سنة-شهر-يوم',
  matchCompetition: 'البطولة',
  matchCompetitionPlaceholder: 'دوري تحت 16',
  matchOpponent: 'الخصم',
  matchOpponentPlaceholder: 'النصر',
  matchResult: 'النتيجة',
  matchResultPlaceholder: 'فوز 3-1',
  matchMinutesLabel: 'الدقائق',
  matchGoalsLabel: 'الأهداف',
  matchAssistsLabel: 'التمريرات الحاسمة',
  saveMatch: 'حفظ المباراة',
  matchDateInvalid: 'استخدم صيغة التاريخ YYYY-MM-DD، مثل 2026-03-14.',
  matchAddedToast: 'أُضيفت المباراة.',

  addHonourTitle: 'إضافة لقب',
  honourTitleLabel: 'بماذا فزت؟',
  honourTitlePlaceholder: 'بطل دوري تحت 16',
  honourOrgLabel: 'الجهة المانحة',
  honourOrgPlaceholder: 'دوري دبي للشباب',
  honourYearLabel: 'السنة',
  saveHonour: 'حفظ اللقب',
  honourTitleRequired: 'أعطِ اللقب اسمًا.',
  honourAddedToast: 'أُضيف اللقب.',

  addCertificateTitle: 'إضافة شهادة',
  certificateTitleLabel: 'الشهادة',
  certificateTitlePlaceholder: 'إسعافات أولية',
  certificateIssuerLabel: 'جهة الإصدار',
  certificateIssuerPlaceholder: 'الهلال الأحمر',
  certificateYearLabel: 'السنة',
  saveCertificate: 'حفظ الشهادة',
  certificateTitleRequired: 'أعطِ الشهادة اسمًا.',
  certificateAddedToast: 'أُضيفت الشهادة.',

  // ── قائمة الأشخاص (components/profile/PeopleList.tsx) ─────────────────────
  searchThisList: 'ابحث في هذه القائمة',
  noMatchTitle: 'لا أحد يطابق ذلك',
  noMatchBody: 'جرّب اسمًا آخر.',
  openProfileA11y: 'فتح ملف {{name}}',

  // ── المتابِعون والمتابَعون (app/u/[id]/…) ─────────────────────────────────
  followersEmptyTitle: 'لا متابِعين بعد',
  followersEmptyBodySelf: 'انشر لقطة أو تحديثًا. الناس يتابعون اللاعبين الحاضرين.',
  followersEmptyBodyOther: 'لا أحد يتابع هذا الحساب بعد.',
  followingEmptyTitleSelf: 'لا تتابع أحدًا بعد',
  followingEmptyTitleOther: 'لا يتابع أحدًا بعد',
  followingEmptyBodySelf: 'تابع الأندية والمدرّبين واللاعبين لتمتلئ صفحتك.',
  followingEmptyBodyOther: 'لم يتابع هذا الحساب أحدًا بعد.',

  // ── تعديل الملف (app/edit-profile.tsx) ────────────────────────────────────
  /* `editProfile` أعلاه هو عنوان هذه الشاشة وزر فتحها معًا. */
  firstNameRequired: 'لا يمكن ترك الاسم الأول فارغًا.',
  savedScoreUp_zero: 'تم الحفظ — لم تتغيّر درجة موهبتك.',
  savedScoreUp_one: 'تم الحفظ — ارتفعت درجة موهبتك نقطة واحدة.',
  savedScoreUp_two: 'تم الحفظ — ارتفعت درجة موهبتك نقطتين.',
  savedScoreUp_few: 'تم الحفظ — ارتفعت درجة موهبتك {{count}} نقاط.',
  savedScoreUp_many: 'تم الحفظ — ارتفعت درجة موهبتك {{count}} نقطة.',
  savedScoreUp_other: 'تم الحفظ — ارتفعت درجة موهبتك {{count}} نقطة.',
  savedScoreDown_zero: 'تم الحفظ — لم تتغيّر درجة موهبتك.',
  savedScoreDown_one: 'تم الحفظ — انخفضت درجة موهبتك نقطة واحدة.',
  savedScoreDown_two: 'تم الحفظ — انخفضت درجة موهبتك نقطتين.',
  savedScoreDown_few: 'تم الحفظ — انخفضت درجة موهبتك {{count}} نقاط.',
  savedScoreDown_many: 'تم الحفظ — انخفضت درجة موهبتك {{count}} نقطة.',
  savedScoreDown_other: 'تم الحفظ — انخفضت درجة موهبتك {{count}} نقطة.',

  sectionYou: 'أنت',
  changePhotoA11y: 'تغيير صورة ملفك',
  uploadingPhoto: 'جارٍ الرفع…',
  tapToChangePhoto: 'اضغط لتغيير صورتك',
  addCover: 'أضف صورة غلاف',
  changeCover: 'تغيير صورة الغلاف',
  uploadingCover: 'جارٍ رفع الغلاف…',
  removeCover: 'إزالة الغلاف',
  changeCoverA11y: 'تغيير صورة الغلاف خلف ملفك',
  viewPhotoA11y: 'عرض صورة {{name}}',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  bio: 'نبذة عنك',
  bioPlaceholder: 'في أي مركز تلعب، وعلى ماذا تعمل الآن؟',
  bioCounter: '{{n}} / {{max}}',
  city: 'المدينة',
  cityPlaceholder: 'دبي',
  country: 'الدولة',
  countryPlaceholder: 'اختر دولة',
  countryA11y: 'الدولة. حاليًا {{value}}. يفتح قائمة اختيار.',
  notSet: 'غير محدّدة',

  sectionSport: 'رياضتك',
  sport: 'الرياضة',
  sportPlaceholder: 'اختر رياضتك',
  sportA11y: 'الرياضة. حاليًا {{value}}. يفتح قائمة اختيار.',
  position: 'المركز',
  level: 'المستوى',
  levelHintDefault: 'اختر المستوى الذي تلعب فيه الآن.',
  league: 'الدوري أو البطولة',
  leaguePlaceholder: 'دوري دبي للشباب',
  club: 'النادي الحالي',
  clubPlaceholder: 'أكاديمية النصر',
  clubHint: 'ربط ناديك يرفع درجة مصداقيتك.',

  sectionPhysical: 'القياسات',
  height: 'الطول',
  heightUnit: 'سم',
  weight: 'الوزن',
  weightUnit: 'كجم',
  dominantSide: 'الجهة الأقوى',

  sectionAvailability: 'الجاهزية',
  openToOffersHint: 'يرى المدرّبون هذا على ملفك.',

  chooseSportTitle: 'اختر رياضتك',
  /** الرمز التعبيري لا يُترجَم؛ ترتيب الرمز والاسم فقط. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: 'أين تعيش؟',
  searchCountries: 'ابحث عن دولة',
  useTypedCountry: 'استخدام “{{country}}”',
  useTypedCountryHint: 'ليست في القائمة؟ أضفها بنفسك.',
  countryTypeToAdd: 'ابدأ الكتابة لإضافة دولتك.',

  // ── بطاقة اللاعب ──────────────────────────────────────────────────────────
  playerCard: 'بطاقة اللاعب',
  playerCardHint: 'بطاقة يمكنك حفظها ونشرها.',
  playerCardBody: 'كل ما يبحث عنه الكشّاف أولًا، في صورة واحدة.',
  playerCardSaved: 'تم الحفظ.',
  playerCardShared: 'البطاقة جاهزة للمشاركة.',
  playerCardFailed: 'تعذّر إنشاء البطاقة. حاول بعد قليل.',
  playerCardShare: 'مشاركة',
  playerCardSave: 'حفظ الصورة',
};
