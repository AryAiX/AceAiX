/**
 * درجة الموهبة — البطاقة على الملف الشخصي، والشاشة خلفها.
 *
 * يجب أن ينجو أمران من الترجمة كما هما:
 *
 * 1. أوزان المحاور. وهي: الملف 15، الأداء 30، الوسائط 15، المصداقية 20،
 *    التفاعل 20، وهي مطابقة لـ `private.compute_talent_score`. للمترجم أن
 *    يعيد صياغة اسم المحور، لا أن يغيّر رقمه.
 * 2. الإفصاح. يجب أن يظل يقول إن الدرجة تُحسب مما هو في الملف الشخصي، وإن
 *    البيانات التي نستطيع التحقق منها تُحتسب أكثر من البيانات المكتوبة يدويًا،
 *    وإن الرقم يقيس ملفًا لا شخصًا. لا واحدة من هذه الجمل الثلاث زينة.
 *
 * أسماء الفئات موجودة في `common` (tierRising … tierElite) لأنها تُقرأ في
 * أكثر من موضع.
 */
export const score = {
  // ── بطاقة الدرجة (components/profile/ScoreCard.tsx) ───────────────────────
  cardEmptyBody: 'تظهر درجتك بمجرد إضافة رياضتك ومركزك إلى ملفك.',
  cardA11y: 'درجة الموهبة {{score}} من 100، فئة {{tier}}. يفتح التفصيل الكامل.',
  tierLine: 'فئة {{tier}}',
  topPercent: 'ضمن أفضل {{percent}}% من اللاعبين في رياضتك',
  rankingBuilding: 'يتكوّن ترتيبك كلما أضفت إلى ملفك.',
  pointsUp_zero: '+{{count}} نقطة',
  pointsUp_one: '+{{count}} نقطة',
  pointsUp_two: '+{{count}} نقطتان',
  pointsUp_few: '+{{count}} نقاط',
  pointsUp_many: '+{{count}} نقطة',
  pointsUp_other: '+{{count}} نقطة',
  pointsDown_zero: '-{{count}} نقطة',
  pointsDown_one: '-{{count}} نقطة',
  pointsDown_two: '-{{count}} نقطتان',
  pointsDown_few: '-{{count}} نقاط',
  pointsDown_many: '-{{count}} نقطة',
  pointsDown_other: '-{{count}} نقطة',
  sinceLastTime: 'منذ آخر مرة',

  // ── شاشة درجة الموهبة (app/score.tsx) ─────────────────────────────────────
  howCalculated: 'كيف تُحسب',

  notReadyTitle: 'درجتك ليست جاهزة بعد',
  notReadyBody: 'أضف رياضتك ومركزك ويمكننا حساب درجة موهبتك.',
  notReadyAction: 'أكمل ملفك',

  deltaUpSince: '+{{count}} منذ آخر مرة',
  deltaDownSince: '-{{count}} منذ آخر مرة',

  curveTitle: 'منحناك',
  historyLoading: 'جارٍ تحميل سجلّك…',
  historyEmpty:
    'يبدأ سجلّك من اليوم. عُد غدًا لترى الخط يتحرّك.',
  sparklineA11y_zero: 'سجلّ الدرجة، لا أيام مسجّلة.',
  sparklineA11y_one: 'سجلّ الدرجة ليوم واحد، من {{min}} إلى {{max}}.',
  sparklineA11y_two: 'سجلّ الدرجة ليومين، من {{min}} إلى {{max}}.',
  sparklineA11y_few: 'سجلّ الدرجة لـ{{count}} أيام، من {{min}} إلى {{max}}.',
  sparklineA11y_many: 'سجلّ الدرجة لـ{{count}} يومًا، من {{min}} إلى {{max}}.',
  sparklineA11y_other: 'سجلّ الدرجة لـ{{count}} يوم، من {{min}} إلى {{max}}.',
  sparklineA11yPlain: 'سجلّ الدرجة',
  sparklineLow: 'الأدنى {{value}}',
  sparklineHigh: 'الأعلى {{value}}',

  pillarsTitle: 'ممّ تتكوّن درجتك',
  tipsTitle: 'ارفعها',
  gotIt: 'فهمت',

  // ── ورقة الإفصاح (app/score.tsx) ──────────────────────────────────────────
  howIntro:
    'تُحسب درجة موهبتك مما هو في ملفك الشخصي — لا شيء غيره. خمسة أمور تدخل في حسابها:',
  howBulletProfile: 'مقدار ما أكملته من ملفك.',
  howBulletPerformance: 'المباريات والدقائق والأرقام التي سجّلتها.',
  howBulletMedia: 'اللقطات التي يستطيع المدرّب مشاهدتها.',
  howBulletCredibility: 'التوثيق، وناديك، وتزكيات المدرّبين.',
  howBulletEngagement: 'مدى نشاطك، ومن اطّلع على ملفك.',
  howVerified:
    'المعلومات التي نستطيع التحقق منها تُحتسب أكثر من المعلومات التي تكتبها بنفسك. فالحساب الموثّق، والنادي المرتبط، وسجلّ المباريات المؤكَّد من نادٍ، كلها تساوي أكثر من الشيء نفسه مُدخَلًا يدويًا.',
  howRecalculated:
    'يعيد خوادمنا حساب الرقم كلما تغيّر أي من ذلك. لا يمكنك تعديله، ولا يمكن لأحد غيرك.',
  howNotYouTitle: 'إنها مقياس لملفك، لا لك.',
  howNotYouBody:
    'الدرجة المنخفضة تعني أن هناك المزيد لتضيفه، لا أنك لاعب أضعف. ولا مدرّب يتخذ قرارًا بناءً على هذا الرقم وحده.',

  // ── المحاور الخمسة (components/profile/PillarList.tsx) ────────────────────
  /** الوزن رقم تملكه قاعدة البيانات — تُرجم الاسم لا الرقم. */
  pillarWeight: '{{label}}  ·  {{weight}}%',
  pillarPerformance: 'الأداء',
  pillarPerformanceExplain: 'المباريات والدقائق والأرقام التي سجّلتها',
  pillarCredibility: 'المصداقية',
  pillarCredibilityExplain: 'التوثيق وناديك والتزكيات',
  pillarEngagement: 'التفاعل',
  pillarEngagementExplain: 'مدى نشاطك ومن يطّلع عليك',
  pillarProfile: 'الملف',
  pillarProfileExplain: 'مدى اكتمال ملفك',
  pillarMedia: 'الوسائط',
  pillarMediaExplain: 'لقطات يستطيع المدرّب مشاهدتها فعلًا',

  // ── النصائح (components/profile/TipList.tsx) ──────────────────────────────
  /**
   * زر النصيحة وحده من عندنا. أما عنوان النصيحة وتفصيلها فتكتبهما
   * `private.build_score_tips` وتصل بالإنجليزية — راجع TipList.tsx.
   */
  tipPoints: '+{{points}} نقطة',
  tipOpen: 'فتح',
  tipAction: {
    addHighlights: 'أضف لقطة',
    completeProfile: 'أكمل الملف',
    logMatches: 'سجّل مباراة',
    getVerified: 'وثّق حسابك',
    askEndorsement: 'ابحث عن مدرّب',
    linkClub: 'اربط ناديك',
    postUpdate: 'انشر تحديثًا',
  },
  tipsEmptyTitle: 'لم يبقَ شيء في القائمة',
  tipsEmptyBody:
    'أنجزت كل ما كنا سنقترحه عليك الآن. واصل اللعب وواصل النشر.',

  // ── المحاكي (app/score.tsx) ───────────────────────────────────────────────
  simTitle: 'ماذا يلزم؟',
  simBody:
    'حرّك مؤشرًا لترى أين سيستقرّ الرقم. يجري التوقّع الحساب نفسه الذي تُحسب به درجتك الحقيقية، على الخادم، فلا يمكن أن يخالفها في الخفاء.',
  simProjected: 'المتوقّع',
  simNow: 'الآن',
  simNoChange: 'حرّك شيئًا لترى الفرق.',
  simReset: 'إعادة الضبط',
  simUnlocksTier: 'هذا سيضعك في فئة {{tier}}.',
  simGain_zero: '+{{count}} نقطة',
  simGain_one: '+{{count}} نقطة',
  simGain_two: '+{{count}} نقطتان',
  simGain_few: '+{{count}} نقاط',
  simGain_many: '+{{count}} نقطة',
  simGain_other: '+{{count}} نقطة',
  simHonest: 'توقّع لا وعد — يفترض أن العمل حقيقي وأن النتائج ستصمد.',

  simVideos: 'اللقطات المختارة',
  simMatches: 'المباريات المسجّلة هذا العام',
  simVerified: 'الموثّق منها',
  simEndorsements: 'التزكيات',
  simExpert: 'ما جاء منها من مدرّبين أو أندية',
  simPosts: 'المنشورات هذا الشهر',
  simFollowers: 'المتابِعون',
  simProfile: 'حقول الملف المكتملة',
  simAccountVerified: 'الحساب موثّق',
  simClubLinked: 'النادي مرتبط',

  // ── القراءة المكتوبة (supabase/functions/talent-insights) ─────────────────
  insightTitle: 'قراءة ملفك',
  insightLoading: 'جارٍ العمل على أرقامك…',
  insightUnavailable:
    'الملخّص المكتوب غير متاح الآن. المحاور أدناه تقول الشيء نفسه بالأرقام.',
  insightRefresh: 'اكتبه من جديد',
};
