/**
 * السلاسل والإنجازات.
 *
 * `streakNoPressure` هي الجملة الأهم في هذا الملف: تقول صراحةً إنّ تفويت يوم
 * واحد لا يكلّف شيئًا سوى السلسلة الحالية. لا تحوّلها إلى تحذير أبدًا.
 */
export const progress = {
  title: 'الإنجازات',
  subtitle: 'كل ما هنا جاء من شيء فعلته بالفعل.',
  earnedOf: '{{earned}} من {{total}}',
  unlockedOn: 'حصلت عليه في {{date}}',
  tileEarnedA11y: '{{title}}. حصلت عليه في {{date}}. {{hint}}',
  tileLockedA11y: '{{title}}. لم تحصل عليه بعد. {{hint}}',

  groupStart: 'البداية',
  groupSeen: 'أن يراك الآخرون',
  groupScore: 'درجتك',
  groupStreak: 'الحضور',

  rarityCommon: 'شائع',
  rarityRare: 'نادر',
  rarityEpic: 'لافت',

  days_zero: 'لا أيام',
  days_one: 'يوم واحد',
  days_two: 'يومان',
  days_few: '{{count}} أيام',
  days_many: '{{count}} يومًا',
  days_other: '{{count}} يوم',

  streakChipA11y: 'السلسلة: {{days}}',
  streakChipHint: 'يفتح شرح السلسلة وآخر سبعة أيام',
  streakSheetTitle: 'سلسلتك',
  streakWhat:
    'السلسلة تحسب الأيام المتتالية التي فتحت فيها AceAiX. هذا كل شيء — أن تحضر. لا علاقة لها بالنشر ولا تغيّر درجة موهبتك أبدًا.',
  streakNoPressure:
    'إن فاتك يوم فلن تخسر شيئًا سوى السلسلة الحالية. أطول سلسلة لك تبقى كما هي، ودرجتك تبقى كما هي، ويبدأ العد من جديد في المرة القادمة التي تمرّ فيها.',
  streakNoneTitle: 'لا سلسلة بعد',
  streakNoneBody: 'تبدأ في أول يوم تفتح فيه التطبيق. لا شيء عليك تفعيله.',

  calendarTitle: 'آخر 7 أيام',
  calendarA11y: 'آخر سبعة أيام. كنت هنا في {{count}} منها.',
  streakCurrent: 'الآن',
  streakLongest: 'الأطول',
  streakTotal: 'أيام هنا',

  gotIt: 'فهمت',

  nextTierTitle: 'المستوى التالي',
  pointsToNext_zero: 'لم يتبقَّ شيء حتى {{tier}}',
  pointsToNext_one: 'نقطة واحدة حتى {{tier}}',
  pointsToNext_two: 'نقطتان حتى {{tier}}',
  pointsToNext_few: '{{count}} نقاط حتى {{tier}}',
  pointsToNext_many: '{{count}} نقطة حتى {{tier}}',
  pointsToNext_other: '{{count}} نقطة حتى {{tier}}',
  tierStartsAt: '{{tier}} يبدأ عند {{score}}',
  tierTopTitle: 'أعلى مستوى',
  tierTopBody: 'لا شيء فوق مستوى النخبة. حافظ على تحديث ملفك ويبقى لك.',
  tierTopA11y: 'مستوى النخبة، درجة الموهبة {{score}}. هذا أعلى مستوى.',
  scoreNotReadyTitle: 'لا توجد درجة موهبة بعد',
  scoreNotReadyBody: 'أضف رياضتك ومركزك وستظهر درجتك.',

  celebrateAchievementEyebrow: 'إنجاز جديد',
  celebrateTierEyebrow: 'مستوى جديد',
  celebrateStreakEyebrow: 'سلسلة',
  celebrateTierBody: 'وصلت درجة موهبتك إلى {{score}}.',
  celebrateStreakBody: 'أنت تحضر باستمرار. هذا هو الجزء الصعب فعلًا.',
  streakMilestone_zero: 'لا أيام متتالية',
  streakMilestone_one: 'يوم واحد متتالٍ',
  streakMilestone_two: 'يومان متتاليان',
  streakMilestone_few: '{{count}} أيام متتالية',
  streakMilestone_many: '{{count}} يومًا متتاليًا',
  streakMilestone_other: '{{count}} يوم متتالٍ',
  andMore_zero: 'ولا شيء آخر على جدارك',
  andMore_one: 'وواحد آخر على جدارك',
  andMore_two: 'واثنان آخران على جدارك',
  andMore_few: 'و{{count}} أخرى على جدارك',
  andMore_many: 'و{{count}} أخرى على جدارك',
  andMore_other: 'و{{count}} أخرى على جدارك',
  celebrateNice: 'رائع',
  celebrateNext: 'التالي',
  celebrateShare: 'مشاركة',
  shareTierMessage: 'وصلت إلى مستوى {{tier}} على AceAiX — درجة الموهبة {{score}}.',

  achievements: {
    first_post: {
      title: 'أول منشور',
      hint: 'نشرت شيئًا لأول مرة.',
    },
    first_clip: {
      title: 'أول مقطع',
      hint: 'أضفت أول فيديو إلى أبرز لقطاتك.',
    },
    three_clips: {
      title: 'ثلاثة مقاطع',
      hint: 'ثلاثة فيديوهات في أبرز لقطاتك. هذا شريط يمكن لكشّاف أن يشاهده.',
    },
    first_match: {
      title: 'أول مباراة',
      hint: 'سجّلت أول مباراة لك.',
    },
    ten_matches: {
      title: 'عشر مباريات',
      hint: 'عشر مباريات في سجلّك.',
    },
    first_application: {
      title: 'أول طلب',
      hint: 'تقدّمت لأول اختبار أو فرصة.',
    },
    first_follower: {
      title: 'أول متابع',
      hint: 'تابعك أحدهم.',
    },
    ten_followers: {
      title: 'عشرة متابعين',
      hint: 'عشرة أشخاص يتابعونك.',
    },
    fifty_followers: {
      title: 'خمسون متابعًا',
      hint: 'خمسون شخصًا يتابعونك.',
    },
    first_endorsement: {
      title: 'أول تزكية',
      hint: 'مدرّب أو نادٍ زكّاك.',
    },
    verified: {
      title: 'موثّق',
      hint: 'حسابك موثّق، فيعرف الناس أنك أنت.',
    },
    profile_complete: {
      title: 'ملف مكتمل',
      hint: 'الدرجة الكاملة في جزء الملف الشخصي من درجة موهبتك.',
    },
    tier_bronze: {
      title: 'برونزي',
      hint: 'وصلت درجة موهبتك إلى 40.',
    },
    tier_silver: {
      title: 'فضي',
      hint: 'وصلت درجة موهبتك إلى 55.',
    },
    tier_gold: {
      title: 'ذهبي',
      hint: 'وصلت درجة موهبتك إلى 70.',
    },
    tier_elite: {
      title: 'نخبة',
      hint: 'وصلت درجة موهبتك إلى 85.',
    },
    streak_3: {
      title: 'ثلاثة أيام',
      hint: 'فتحت AceAiX ثلاثة أيام متتالية.',
    },
    streak_7: {
      title: 'أسبوع كامل',
      hint: 'فتحت AceAiX سبعة أيام متتالية.',
    },
    streak_30: {
      title: 'ثلاثون يومًا',
      hint: 'فتحت AceAiX ثلاثين يومًا متتاليًا.',
    },
  },
};
