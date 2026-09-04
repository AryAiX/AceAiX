/**
 * معالج إعداد الملف الشخصي، ويظهر مرة واحدة بعد إنشاء الحساب.
 *
 * تشترك فيه ثلاثة مسارات: لاعب يبني ملفه، ومدرّب أو نادٍ يحدّد من يبحث عنه،
 * وأحد الوالدين أو ولي أمر جاء ليشرف على ملف ابنه لا ليبني ملفًا لنفسه.
 *
 * نصوص ولي الأمر نصوص امتثال. من كان بين 13 و17 لا يظهر في البحث ولا يمكن
 * مراسلته حتى يوافق أحد الوالدين أو ولي الأمر — قُل ذلك بوضوح ولا تخفّفه.
 */
export const onboarding = {
  // ── واجهة المعالج ─────────────────────────────────────────────────────────
  loading: 'نجهّز ملفك',
  signOut: 'تسجيل الخروج',
  skipForNow: 'تخطّي الآن',
  finish: 'ابدأ الاستكشاف',

  // ── اختيار الدولة، مشترك بين خطوتَي مكان اللاعب والمدرّب ──────────────────
  countryLabel: 'الدولة',
  countrySearchPlaceholder: 'ابحث عن دولة',
  countryNoMatch: 'لا دولة تطابق ذلك. جرّب بحثًا أقصر.',
  countryShowAll: 'عرض كل الدول',

  // ── اللاعب: الرياضة والمركز والمستوى ──────────────────────────────────────
  sportTitle: 'ما الرياضة التي تمارسها؟',
  sportSubtitle: 'اختر الرياضة التي تنافس فيها أكثر.',

  positionTitle: 'في أي مركز تلعب؟',
  positionSubtitle: 'اختر المركز الذي تلعبه غالبًا. يمكنك إضافة غيره لاحقًا.',
  positionNoneTitle: 'لا مراكز محدّدة هنا',
  positionNoneBody:
    'هذه الرياضة لا تُلعب بمراكز، فلا شيء لتختاره. اضغط {{action}} وتابع.',

  levelTitle: 'ما مستواك؟',
  levelSubtitle: 'كن صادقًا — المدرّبون يبحثون بالمستوى، والتطابق الصحيح أفضل من ادعاء كبير.',

  // ── اللاعب: أين تلعب ──────────────────────────────────────────────────────
  placeTitle: 'أين تلعب الآن؟',
  placeSubtitle: 'ناديك ومدينتك يساعدان المدرّبين القريبين على إيجادك.',
  clubLabel: 'النادي أو الأكاديمية',
  clubPlaceholder: 'أكاديمية الوصل',
  clubHint: 'اترك هذا فارغًا إن لم تكن مع نادٍ حاليًا.',
  cityLabel: 'المدينة',
  cityPlaceholder: 'دبي',

  // ── اللاعب: القياسات ──────────────────────────────────────────────────────
  physicalTitle: 'بعض الأرقام',
  physicalSubtitle:
    'كلها اختيارية. الكشّافون يبحثون عنها، لكن يمكنك تخطّيها وإضافتها في أي وقت.',
  heightLabel: 'الطول',
  heightPlaceholder: '172',
  heightHint: 'بالسنتيمتر',
  heightOutOfRange: 'أدخل طولًا بين {{min}} و{{max}} سم.',
  weightLabel: 'الوزن',
  weightPlaceholder: '64',
  weightHint: 'بالكيلوغرام',
  weightOutOfRange: 'أدخل وزنًا بين {{min}} و{{max}} كجم.',
  strongSide: 'الجهة الأقوى',

  // ── موافقة ولي الأمر، تُطلب من اللاعب الصغير ──────────────────────────────
  guardianTitle: 'أشرك شخصًا بالغًا',
  guardianSubtitle:
    'عمرك دون 18، لذا يوافق أحد والديك أو ولي أمرك على ملفك قبل أن يجدك أحد.',
  guardianApprovalTitle: 'ما الذي سيوافق عليه',
  guardianApprovalBody:
    'نرسل له رسالة واحدة فيها رابط. تشرح من نحن وتطلب منه الموافقة أو الرفض لأمرين منفصلين. يمكنه تغيير رأيه وإيقاف أي منهما في أي وقت، ولن نراسله في أي شيء آخر.',
  guardianSearchTitle: 'تظهر في البحث',
  guardianSearchBody:
    'يستطيع المدرّبون والأندية إيجاد ملفك عند بحثهم عن لاعبين.',
  guardianMessageTitle: 'يمكن للمدرّبين الموثّقين مراسلتك',
  guardianMessageBody: 'البالغون الذين وثّقناهم فقط. لا يستطيع غيرهم بدء محادثة معك.',
  guardianWhoTitle: 'من هو؟',
  guardianRelationshipParent: 'أحد الوالدين',
  guardianRelationshipGuardian: 'ولي أمر آخر',
  guardianNameLabel: 'اسمه',
  guardianNamePlaceholder: 'ليلى كريمي',
  guardianNameRequired: 'أدخل اسمه.',
  guardianEmailLabel: 'بريده الإلكتروني',
  guardianEmailHint: 'تأكّد من صحته — رابط الموافقة سيصل إليه.',
  guardianEmailRequired: 'أدخل بريده الإلكتروني.',
  guardianEmailInvalid: 'هذا البريد الإلكتروني لا يبدو صحيحًا.',
  guardianSkip: 'سأفعل ذلك لاحقًا',
  guardianSkipHint: 'يبقى ملفك مخفيًا عن المدرّبين حتى يوافق عليه شخص بالغ.',
  guardianSkipA11y:
    'سأفعل ذلك لاحقًا. يبقى ملفك مخفيًا حتى يوافق عليه أحد الوالدين أو ولي الأمر.',
  guardianSkipSheetTitle: 'تؤجّل هذا؟',
  guardianSkipSheetMessage:
    'سيبقى ملفك مخفيًا. لن يجدك المدرّبون في البحث ولن يستطيع أحد مراسلتك حتى يوافق أحد الوالدين أو ولي الأمر. يمكنك إرسال الرسالة في أي وقت من الإعدادات.',
  guardianSkipSheetConfirm: 'نعم، لاحقًا',
  guardianSkipSheetCancel: 'سأضيفه الآن',

  // ── الصورة ────────────────────────────────────────────────────────────────
  photoTitle: 'اجعل لاسمك وجهًا',
  photoSubtitle:
    'صورة واضحة لك وحدك. الملفات التي فيها صورة يُنظر إليها أكثر بكثير.',
  photoSaved: 'حُفظت. تبدو جيدة.',
  photoOptional: 'تخطَّ هذا إن فضّلت تأجيله — لا شيء هنا مطلوب.',
  photoChoose: 'اختر من الصور',
  photoChooseAnother: 'اختر صورة أخرى',
  photoTake: 'التقط صورة',
  photoUnreadable: 'لم نتمكن من قراءة هذه الصورة. جرّب غيرها.',
  photoLibraryDenied:
    'يحتاج {{app}} إلى إذن لفتح صورك. يمكنك تفعيله من الإعدادات.',
  photoLibraryFailed: 'لم نتمكن من فتح صورك. حاول مرة أخرى.',
  photoCameraDenied: 'يحتاج {{app}} إلى إذن لاستخدام الكاميرا. يمكنك تفعيله من الإعدادات.',
  photoCameraFailed: 'لم نتمكن من فتح الكاميرا. حاول مرة أخرى.',

  // ── المدرّب أو النادي: الرياضات والدور والمكان والهدف ──────────────────────
  recruiterSportsTitle: 'في أي رياضات تعمل؟',
  recruiterSportsSubtitle:
    'اختر ما تشاء منها. على أساسها نعرض لك اللاعبين المناسبين.',

  recruiterRoleTitle: 'ما دورك؟',
  recruiterRoleSubtitle: 'يراه اللاعبون وأولياء أمورهم، فاجعله بسيطًا وصادقًا.',
  recruiterRoleLabel: 'دورك',
  recruiterRolePlaceholderClub: 'مدير الأكاديمية',
  recruiterRolePlaceholderCoach: 'المدرّب الأول، تحت 16',
  recruiterRoleRequired: 'أخبرنا بما تعمل.',
  recruiterClubLabel: 'اسم النادي أو الأكاديمية',
  recruiterClubHintClub: 'سنستخدمه عند إعداد صفحة ناديك.',
  recruiterClubHintCoach: 'اترك هذا فارغًا إن كنت تعمل بشكل مستقل.',

  recruiterPlaceTitle: 'أين مقرّك؟',
  recruiterPlaceSubtitle: 'نضع اللاعبين القريبين منك في أعلى نتائجك.',

  recruiterTargetTitle: 'عمّن تبحث؟',
  recruiterTargetSubtitle:
    'إجابة تقريبية تكفي. يمكنك تغيير كل هذا لاحقًا من الإعدادات.',
  recruiterPositionsTitle: 'المراكز',
  recruiterPositionsEmpty: 'ارجع خطوة واختر رياضة لترى مراكزها.',
  recruiterAgeGroupTitle: 'الفئة العمرية',
  recruiterMinorsNote:
    'اللاعبون دون 18 لا يظهرون إلا بعد موافقة أحد الوالدين أو ولي الأمر على ملفهم.',
  ageBandAny: 'أي عمر',
  ageBandUnder14: 'دون 14',
  ageBand14To16: 'من 14 إلى 16',
  ageBand16To18: 'من 16 إلى 18',
  ageBand18To21: 'من 18 إلى 21',
  ageBand21Plus: '21 فما فوق',

  // ── أحد الوالدين أو ولي الأمر: كيف يعمل هذا ───────────────────────────────
  guardianIntroTitle: 'كيف يسير هذا معك',
  guardianIntroSubtitle:
    'أنت هنا للإشراف على ملف ابنك، لا لبناء ملف خاص بك.',
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: 'اربط حسابك بابنك',
  guardianIntroLinkBody:
    'افتح الإعدادات واختر «الوالد أو ولي الأمر». وإن كان قد أرسل لك رسالة موافقة من قبل، فالرابط الذي فيها يربطكما فورًا.',
  guardianIntroDecideTitle: 'قرّر ما يُسمح له به',
  guardianIntroDecideBody:
    'توافق أو ترفض أمرين: أن يجده المدرّبون في البحث، وأن يراسله المدرّبون الموثّقون.',
  guardianIntroChangeTitle: 'غيّر رأيك متى شئت',
  guardianIntroChangeBody:
    'يمكنك إيقاف أي منهما في أي وقت من الإعدادات، فيخرج ملفه من البحث فورًا.',
  guardianIntroFooter:
    'حتى توافق، يبقى ملف ابنك مخفيًا. لا يستطيع أحد البحث عنه ولا يستطيع أي بالغ بدء محادثة معه.',

  // ── النهاية: اللاعب ───────────────────────────────────────────────────────
  scoreLoading: 'نحسب درجتك',
  scoreErrorNote:
    'ملفك محفوظ في كل الأحوال — يمكنك المتابعة والاطلاع على درجتك لاحقًا.',
  athleteDoneTitle: 'أحسنت',
  athleteDoneTitleNamed: 'أحسنت يا {{name}}',
  athleteDoneScored: 'ملفك أصبح ظاهرًا. هذه نقطة انطلاقك — {{tier}}.',
  athleteDoneNoScore:
    'ملفك أصبح ظاهرًا. أضف القليل بعد وستظهر درجة موهبتك على ملفك.',
  tipsTitle: 'كيف ترفعها',
  tipPoints: '+{{points}}',
  tipsEmpty:
    'انشر لقطة، وأضف إحصاءاتك، واطلب من ناديك تزكيتك. كل إضافة ترفع الدرجة.',
  guardianRequested:
    'أرسلنا رسالة إلى {{name}}. بمجرد موافقته يستطيع المدرّبون إيجادك. حتى ذلك الحين يبقى ملفك خاصًا.',
  guardianPendingTitle: 'بقي شيء واحد',
  guardianPendingBody:
    'ملفك مخفي حتى يوافق عليه أحد الوالدين أو ولي الأمر. يمكنك إرسال الرسالة إليه في أي وقت من الإعدادات.',

  // ── النهاية: المدرّب وولي الأمر وغيرهما ───────────────────────────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: 'اكتمل إعدادك',
  recruiterDoneTitleNamed: 'اكتمل إعدادك يا {{name}}',
  recruiterDoneBody:
    'سنبدأ بمطابقتك مع اللاعبين الذين يناسبون ما تبحث عنه.',
  recruiterDonePointSearch: 'ابحث عن اللاعبين وصفّهم من الاستكشاف',
  recruiterDonePointPost: 'انشر التجارب والفرص ليتقدّم إليها اللاعبون',
  recruiterDonePointVerified: 'وثّق حسابك لمراسلة اللاعبين دون 18',
  doneTitle: 'كل شيء جاهز',
  guardianDoneBody: 'حسابك جاهز. ربطه بابنك يستغرق دقيقة تقريبًا.',
  basicDoneBody: 'تجوّل قليلًا وأكمل الباقي متى شئت.',
  guardianDoneNote:
    'الإعدادات، ثم «الوالد أو ولي الأمر». وإن كان ابنك قد أرسل لك رسالة موافقة من قبل، ففتح الرابط الذي فيها يربط حسابيكما.',
};
