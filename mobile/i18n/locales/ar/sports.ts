/**
 * الرياضات والمراكز والمستويات.
 *
 * المفتاح الإنجليزي هو ما يُخزَّن في قاعدة البيانات — رياضة اللاعب هي
 * "Football" في كل اللغات، وإلا لبحث مدرّب في مدريد ومدرّب في دبي في
 * قائمتين مختلفتين. لا يُترجَم إلا ما يُعرض.
 */
export const sports = {
  football: 'كرة القدم',
  basketball: 'كرة السلة',
  tennis: 'التنس',
  athletics: 'ألعاب القوى',
  swimming: 'السباحة',
  cricket: 'الكريكيت',
  volleyball: 'الكرة الطائرة',
  handball: 'كرة اليد',
  padel: 'البادل',
  chess: 'الشطرنج',
  esports: 'الرياضات الإلكترونية',
  martialArts: 'الفنون القتالية',

  allSports: 'كل الرياضات',
  anySport: 'أي رياضة',
  anyPosition: 'أي مركز',

  position: {
    goalkeeper: 'حارس مرمى',
    centreBack: 'قلب دفاع',
    fullBack: 'ظهير',
    wingBack: 'ظهير جناح',
    defensiveMidfielder: 'وسط مدافع',
    centralMidfielder: 'وسط',
    attackingMidfielder: 'صانع ألعاب',
    winger: 'جناح',
    striker: 'مهاجم',

    pointGuard: 'صانع ألعاب',
    shootingGuard: 'حارس مصوّب',
    smallForward: 'جناح صغير',
    powerForward: 'جناح قوي',
    centre: 'ارتكاز',

    singles: 'فردي',
    doubles: 'زوجي',

    sprints: 'عدْو سريع',
    middleDistance: 'مسافات متوسطة',
    longDistance: 'مسافات طويلة',
    jumps: 'قفز',
    throws: 'رمي',
    hurdles: 'حواجز',

    freestyle: 'حرة',
    backstroke: 'ظهر',
    breaststroke: 'صدر',
    butterfly: 'فراشة',
    individualMedley: 'متنوعة فردية',

    batter: 'ضارب',
    bowler: 'رامي',
    allRounder: 'لاعب شامل',
    wicketKeeper: 'حارس ويكيت',

    setter: 'معِدّ',
    outsideHitter: 'ضارب أطراف',
    opposite: 'ضارب مقابل',
    middleBlocker: 'صادّ وسط',
    libero: 'ليبرو',

    leftWing: 'جناح أيسر',
    leftBack: 'ظهير أيسر',
    centreBackHandball: 'صانع ألعاب',
    rightBack: 'ظهير أيمن',
    rightWing: 'جناح أيمن',
    pivot: 'لاعب الدائرة',

    rightSide: 'الجهة اليمنى',
    leftSide: 'الجهة اليسرى',

    classical: 'كلاسيكي',
    rapid: 'سريع',
    blitz: 'خاطف',

    entry: 'مقتحِم',
    support: 'مساند',
    igl: 'قائد داخل اللعبة',
    mid: 'الوسط',
    jungle: 'الغابة',
    duelist: 'مبارِز',

    judo: 'جودو',
    karate: 'كاراتيه',
    taekwondo: 'تايكوندو',
    boxing: 'ملاكمة',
    wrestling: 'مصارعة',
    mma: 'فنون قتالية مختلطة',
  },

  level: {
    grassroots: 'قاعدي',
    grassrootsHint: 'فريق مدرسة أو حي',
    academy: 'أكاديمية',
    academyHint: 'أكاديمية نادٍ أو فريق تطوير',
    amateur: 'هاوٍ',
    amateurHint: 'منافسة هواة مسجّلة',
    semiPro: 'شبه محترف',
    semiProHint: 'بأجر وبدوام جزئي',
    professional: 'محترف',
    professionalHint: 'عقد بدوام كامل',
  },

  side: {
    right: 'اليمنى',
    left: 'اليسرى',
    both: 'كلتاهما',
  },

  opportunityType: {
    trial: 'تجربة أداء',
    trialHint: 'حصة مفتوحة أو يوم تقييم',
    scholarship: 'منحة',
    scholarshipHint: 'مقعد في أكاديمية أو جامعة',
    contract: 'عقد',
    contractHint: 'عقد احتراف أو عرض',
    camp: 'معسكر',
    campHint: 'معسكر تدريبي أو يوم استعراض',
  },
};
