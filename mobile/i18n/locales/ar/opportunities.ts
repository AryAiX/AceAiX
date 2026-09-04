/**
 * الفرص: لوحة التجارب، والفرصة الواحدة كاملة، وقائمة مراجعة النادي، ونموذج
 * النشر، وصفحة النادي التي تشير إليها الفرصة.
 *
 * أربعة أمور تستحق المعرفة قبل الترجمة:
 *
 *  - `status.*` مكتوب مرتين عن قصد. فالقيمة المخزَّنة نفسها تُقرأ على وجهين
 *    مختلفين: `rejected` واقعة في قائمة الكشّاف، وجملة على شاشة ابن الخامسة
 *    عشرة. تُرجم الصوتين، ولا تدمجهما في واحد أبدًا.
 *  - `match.reason.*` هو قراءة اللاعب لسبب تُخرجه قاعدة البيانات بالإنجليزية.
 *    النصوص الإنجليزية الأصلية تبقى في الشيفرة كمفاتيح بحث — راجع
 *    components/opportunities/MatchExplain.tsx.
 *  - `post.safetyBody` نص امتثال. أبقِ معناه دقيقًا — دون 18، إبلاغ أحد
 *    الوالدين أو ولي الأمر، إزالة المنشورات — وأبقِ `{{guidelines}}` حيث
 *    تحتاجه الجملة: فمنه يُرسم رابط إرشادات المجتمع.
 *  - الرياضات والمراكز والمستويات وأنواع الفرص مخزَّنة بالإنجليزية وتُترجَم
 *    عبر `constants/sports.ts`. ولا شيء هنا يعيد ذكرها.
 */
export const opportunities = {
  // ── تبويب الفرص ───────────────────────────────────────────────────────────
  title: 'الفرص',
  athleteSubtitle: 'تجارب ومنح وعقود ومعسكرات',
  recruiterSubtitle: 'منشوراتك ومن تقدّم إليها',

  /** كل حفظ في هذا القسم يقول الشيء نفسه: اللوحة، المنشور، النادي. */
  savedToast: 'تم الحفظ. ستجده في المحفوظات.',

  tabs: {
    open: 'المفتوحة',
    saved: 'المحفوظة',
    applied: 'المقدَّم إليها',
    postings: 'منشوراتي',
    applicants: 'المتقدّمون',
  },

  /** الرياضات تأتي من `sports.allSports`؛ صف النوع وحده من عندنا. */
  allTypes: 'كل الأنواع',

  athlete: {
    appliedOn: 'قدّمت في {{date}}',

    openEmptyFilteredTitle: 'لا شيء يطابق هذه التصفية',
    openEmptyFilteredBody: 'امسحها لترى كل ما هو مفتوح الآن.',
    clearFilters: 'مسح التصفية',

    openEmptyTitle: 'لا شيء مفتوح في رياضتك بعد',
    openEmptyBody: 'تابع الأندية لتعرف أولًا.',
    findClubs: 'ابحث عن أندية',

    savedEmptyTitle: 'لا شيء محفوظ بعد',
    savedEmptyBody: 'اضغط علامة الحفظ على أي شيء تريد العودة إليه.',
    browseOpen: 'تصفّح المفتوح',

    appliedEmptyTitle: 'لا طلبات بعد',
    appliedEmptyBody: 'عندما تتقدّم، يمكنك متابعة كل رد هنا.',
    seeWhatsOpen: 'انظر ما هو مفتوح',
  },

  recruiter: {
    active: 'نشط',
    closed: 'مغلق',
    /* الصفتان التاليتان تُنطقان داخل جملة أطول، ولذلك جاءتا نكرتين. */
    activeA11y: 'نشط',
    closedA11y: 'مغلق',
    openPosting: 'يفتح المنشور',
    reviewApplicants: 'مراجعة المتقدّمين',

    postingsEmptyTitle: 'لا منشورات بعد',
    postingsEmptyBody:
      'انشر تجربة أو منحة أو معسكرًا وسيراه اللاعبون المناسبون أولًا.',

    allApplicants: 'كل من تقدّم إلى أي من منشوراتك، الأنسب أولًا.',
    applicantsEmptyTitle: 'لا متقدّمين بعد',
    applicantsEmptyBody: 'سيظهرون هنا لحظة تقدُّم أي شخص.',
  },

  // ── بطاقة الفرصة ──────────────────────────────────────────────────────────
  card: {
    independent: 'إعلان مستقل',
    open: 'يفتح الفرصة',
    /* تُنطق في نهاية جملة إتاحة البطاقة. */
    closedA11y: 'مغلقة',
    save: 'حفظ {{title}} لوقت لاحق',
    unsave: 'إزالة {{title}} من المحفوظات',
  },

  // ── أين وصل الطلب ─────────────────────────────────────────────────────────
  status: {
    /** ما يقرأه اللاعب الذي أرسله. */
    athlete: {
      applied: 'أُرسل',
      in_review: 'قيد القراءة',
      shortlisted: 'في القائمة المختصرة',
      invited: 'دعوة إلى تجربة',
      rejected: 'ليست هذه المرة',
      withdrawn: 'مسحوب',
    },
    /** ما يقرأه النادي الذي يراجعه. */
    recruiter: {
      applied: 'جديد',
      in_review: 'قيد المراجعة',
      shortlisted: 'في القائمة المختصرة',
      invited: 'مدعو',
      rejected: 'مرفوض',
      withdrawn: 'مسحوب',
    },
  },

  // ── رقم التطابق والأسباب وراءه ────────────────────────────────────────────
  match: {
    percentA11y: 'تطابق {{percent}} بالمئة',
    fitPercentA11y: 'ملاءمة {{percent}} بالمئة',
    why: 'لماذا تناسبك',
    /** قراءة اللاعب لما أعادته `private.match_reasons`. */
    reason: {
      sport: 'رياضتك',
      position: 'مركزك',
      region: 'قريبة منك',
      topTier: 'درجة موهبتك من الطراز الأول',
      strongScore: 'درجة موهبة قوية',
    },
  },

  // ── صف المتقدّم ───────────────────────────────────────────────────────────
  applicant: {
    open: 'يفتح طلبه',
    talentScoreA11y: 'درجة الموهبة {{score}}',
  },

  // ── فرصة واحدة كاملة ──────────────────────────────────────────────────────
  detail: {
    title: 'فرصة',
    more: 'إجراءات أخرى',
    /** السطر فوق الرابط في الرسالة المشاركة. */
    shareText: '{{title}} — {{club}}',
    shareClubFallback: 'على AceAiX',

    missingTitle: 'لم نجد ذلك',
    missingBody: 'قد يكون الرابط معطّلًا أو قديمًا.',
    goneTitle: 'هذه الفرصة انتهت',
    goneBody: 'أزالها النادي، أو أُغلقت. وهناك الكثير غيرها مفتوح.',
    seeWhatsOpen: 'انظر ما هو مفتوح',

    save: 'حفظ لوقت لاحق',
    unsave: 'إزالة من المحفوظات',

    reviewApplicants_zero: 'لا متقدّمين',
    reviewApplicants_one: 'مراجعة متقدّم واحد',
    reviewApplicants_two: 'مراجعة متقدّمَين',
    reviewApplicants_few: 'مراجعة {{count}} متقدّمين',
    reviewApplicants_many: 'مراجعة {{count}} متقدّمًا',
    reviewApplicants_other: 'مراجعة {{count}} متقدّم',

    withdraw: 'سحب الطلب',
    withdrawA11y: 'سحب هذا الطلب',
    withdrawn: 'سُحب.',
    applicationsClosed: 'التقديم مغلق',

    openClub: 'فتح {{club}}',
    viewClub: 'عرض النادي',
    postedByMember: 'نشره أحد الأعضاء',
    closed: 'مغلقة',

    about: 'عن هذه الفرصة',

    factType: 'النوع',
    factSport: 'الرياضة',
    factPosition: 'المركز',
    factWhere: 'المكان',
    factDeadline: 'آخر موعد',
    factPosted: 'نُشرت',
    noDeadline: 'بلا موعد نهائي',

    /* التجربة لقاء واقعي مع غريب. أبقِ هذا واضحًا. */
    safety:
      'أخبر أحد والديك أو ولي أمرك أو مدرّبك قبل الذهاب إلى أي لقاء حضوري. ولا يحق لأحد على AceAiX أن يطلب منك مالًا.',

    menuTitle: 'هذه الفرصة',
    reportHint: 'أخبرنا بما فيها من خطأ. البلاغات سرّية.',
  },

  report: {
    title: 'الإبلاغ عن هذا المنشور',
    subtitle: 'اختر أقرب سبب. لا نخبرهم أبدًا بمن أبلغ.',
    thanks: 'شكرًا لإخبارنا. سيطّلع فريقنا على الأمر.',
    reason: {
      childSafety: 'سلامة الأطفال',
      childSafetyHint: 'غير آمنة لمن هم دون 18',
      scam: 'احتيال أو طلب مال',
      impersonation: 'انتحال صفة نادٍ حقيقي',
      misleading: 'مضلِّلة أو غير صحيحة',
      spam: 'رسائل مزعجة',
      other: 'شيء آخر',
    },
  },

  apply: {
    send: 'إرسال الطلب',
    sent: 'أُرسل. سيرون ملفك معه.',
    messageLabel: 'رسالتك',
    messagePlaceholder: 'أخبرهم لماذا أنت مناسب — سطران أو ثلاثة تكفي.',
    whatTheySee: 'ما سيرونه',
    seeProfile: 'اسمك وملفك',
    seeScore: 'درجة موهبتك',
    seeHighlights: 'أبرز لقطاتك وإحصاءاتك',
    seeMessage: 'الرسالة التي كتبتها أعلاه',
    guardianNotice: 'سيتمكن أحد والديك أو ولي أمرك من رؤية الطلبات التي ترسلها.',
  },

  // ── مراجعة من تقدّم ───────────────────────────────────────────────────────
  applicants: {
    title: 'المتقدّمون',
    /** صف التصفية يعيد استخدام أسماء حالات المدرّب؛ «الكل» وحده من عندنا. */
    filterAll: 'الجميع',
    /** شريحة تصفية: المرحلة، ثم كم فيها. */
    filterChip: '{{label}} {{count}}',
    ranked: 'مرتّبون حسب مدى ملاءمة كل لاعب لهذا المنشور.',

    missingTitle: 'لم نجد هذا المنشور',
    missingBody: 'قد يكون الرابط معطّلًا أو قديمًا.',
    backToOpportunities: 'العودة إلى الفرص',

    lockedTitle: 'لا يمكنك مراجعة هذا المنشور',
    lockedBody:
      'لا يرى المتقدّمين إلا النادي أو المدرّب الذي نشره — ومن أضافهم من فريقه.',

    emptyTitle: 'لم يتقدّم أحد بعد',
    emptyBody: 'اللاعبون المناسبون لهذا المنشور يرونه أولًا. امهله يومًا أو يومين.',
    emptyStageTitle: 'لا أحد في هذه المرحلة',
    emptyStageBody: 'جرّب تصفية أخرى.',
    showEveryone: 'عرض الجميع',

    scoreLine: 'درجة الموهبة {{score}}',
    noMessage: 'لم يكتب رسالة.',
    viewProfile: 'عرض الملف كاملًا',

    moveForward: 'انقلهم إلى المرحلة التالية',
    shortlist: 'القائمة المختصرة',
    shortlistDone: 'أُضيف إلى القائمة المختصرة.',
    invite: 'دعوة إلى تجربة',
    inviteDone: 'دُعي إلى تجربة.',
    reject: 'رفض',
    rejectDone: 'وُضع كمرفوض.',

    notified: 'سيصلهم إشعار — يرسله AceAiX نيابة عنك.',
  },

  // ── نشر فرصة ──────────────────────────────────────────────────────────────
  post: {
    title: 'انشر فرصة',
    submit: 'انشرها',
    posted: 'نُشرت. سيراها اللاعبون المناسبون أولًا.',
    checkFields: 'راجع الحقول المميّزة.',

    titleLabel: 'العنوان',
    titlePlaceholder: 'تجربة حراس مرمى تحت 16',
    titleHint: 'قصير ومحدّد. اللاعبون يقرأونه أولًا.',
    titleError: 'اكتب عنوانًا يعرفه اللاعبون.',

    typeLabel: 'ما هي؟',
    typeError: 'اختر نوع هذه الفرصة.',
    /** تُقرأ كجملة واحدة: النوع، ثم معناه. */
    typeA11y: '{{label}}. {{hint}}',

    sportLabel: 'الرياضة',
    sportError: 'اختر الرياضة.',

    positionLabel: 'المركز',
    positionHint: 'اتركه مفتوحًا إن كان أي مركز يصلح.',
    positionAny: 'الكل',

    whereLabel: 'المكان',
    wherePlaceholder: 'دبي، الإمارات',
    whereError: 'أين تجري هذه الفرصة؟',

    deadlineLabel: 'يغلق التقديم',
    deadlineNone: 'بلا موعد نهائي',
    deadlineChoose: 'اختر تاريخ الإغلاق',
    deadlineChange: 'يغلق التقديم في {{date}}. تغيير التاريخ',
    deadlineClearA11y: 'مسح تاريخ الإغلاق',
    deadlineError: 'اختر تاريخًا في المستقبل.',

    detailsLabel: 'التفاصيل',
    detailsPlaceholder: 'ماذا يحدث في اليوم، ولمن هي، وماذا يُحضِر معه.',
    detailsError_zero: 'أضف تفاصيل أكثر.',
    detailsError_one: 'أضف تفاصيل أكثر — حرف واحد على الأقل.',
    detailsError_two: 'أضف تفاصيل أكثر — حرفان على الأقل.',
    detailsError_few: 'أضف تفاصيل أكثر — {{count}} أحرف على الأقل.',
    detailsError_many: 'أضف تفاصيل أكثر — {{count}} حرفًا على الأقل.',
    detailsError_other: 'أضف تفاصيل أكثر — {{count}} حرف على الأقل.',

    previewTitle: 'ما سيراه اللاعبون',
    previewHint: 'نسبة التطابق تُحسب لكل لاعب على حدة، لذا لا تظهر هنا.',
    previewPlaceholder: 'عنوانك يظهر هنا',

    /* نص امتثال. كل عبارة فيه لها وزنها — أبقِ الثلاث. */
    safetyTitle: 'قبل النشر',
    safetyBody:
      'كثير من لاعبي AceAiX دون 18. يجب أن تُقام التجارب بعلم أحد الوالدين أو ولي الأمر، وقد يزيل AceAiX المنشورات التي لا تتوافق مع {{guidelines}}.',
    safetyLinkA11y: 'قراءة إرشادات المجتمع',
  },

  // ── صفحة النادي ───────────────────────────────────────────────────────────
  org: {
    missingTitle: 'لم نجد هذا النادي',
    missingBody: 'قد يكون الرابط معطّلًا أو قديمًا.',
    backToDiscover: 'العودة إلى الاستكشاف',
    goneTitle: 'هذا النادي ليس على AceAiX',
    goneBody: 'ربما أُزيل.',

    /* `club` و`federation` من common؛ أما الأكاديمية فهي نوع مؤسسة لا غير،
       ولذلك مكانها هنا. */
    typeAcademy: 'أكاديمية',

    /* `value` هو العدد بعد اختصاره للشارة — «1.2K». */
    followers_zero: 'لا متابِعين',
    followers_one: 'متابِع واحد',
    followers_two: 'متابِعان',
    followers_few: '{{value}} متابِعين',
    followers_many: '{{value}} متابِعًا',
    followers_other: '{{value}} متابِع',
    followA11y: 'متابعة {{name}}',
    unfollowA11y: 'إلغاء متابعة {{name}}',

    tabAbout: 'نبذة',
    tabOpenings: 'الفرص',
    tabOpeningsCount: 'الفرص {{count}}',

    noIntro: 'لم يكتب هذا النادي نبذة بعد.',
    factType: 'النوع',
    factLeague: 'الدوري',
    factBasedIn: 'المقر',

    unverified:
      'لم يوثّق AceAiX هذا النادي بعد. تحقّق ممّن تتحدث إليه قبل أن تسافر إلى أي مكان.',

    openingsEmptyTitle: 'لا شيء مفتوح الآن',
    openingsEmptyFollowing: 'أنت تتابعهم، فستعرف حين تُفتح فرصة.',
    openingsEmptyBody: 'تابعهم لتعرف أولًا حين تُفتح فرصة.',
  },
};
