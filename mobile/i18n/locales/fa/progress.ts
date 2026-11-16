/**
 * رشته‌ها، دستاورد‌ها، و دیواری که روی آن قرار دارند.
 *
 * قواعد لحن برای هر کس که این فضای نام را ترجمه یا بازنویسی می‌کند:
 *
 *   * رشته چیز خوبی است که اتفاق افتاده، هرگز چیزی که بشود از دستش داد.
 *     «نگذار بشکنی» ندارد، شمارش معکوس ندارد، و هشدار ندارد. `streakNoPressure`
 *     جمله‌ی باربر کل فایل است — با صدای بلند می‌گوید از دست دادن یک روز
 *     هیچ هزینه‌ای جز خود رشته ندارد، چون نوجوان سیزده‌ساله‌ای که ببیند عدد به یک برگشته،
 *     خلاف این را فرض می‌کند.
 *   * هر خط «چطور به دستش آوردی» راست است. شرط‌های پایین همان شرط‌های
 *     `private.check_achievements` هستند. آزادانه بازنویسی کنید؛ هرگز عددی را
 *     عوض نکنید.
 *   * سکه نیست، امتیازی که بشود خرج کرد نیست، رتبه‌بندی در برابر دیگران نیست،
 *     و هیچ چیز که بوی دستگاه شانس بدهد نیست. صدا، صدای مربی‌ای است که دیده
 *     کار خوبی کرده‌اید و یک بار می‌گوید.
 */
export const progress = {
  // ── دیوار (app/achievements.tsx) ───────────────────────────────────────────
  title: 'دستاورد‌ها',
  subtitle: 'هر کدام از این‌ها از کاری آمده که واقعاً انجام داده‌اید.',
  earnedOf: '{{earned}} از {{total}}',
  newTag: 'جدید',
  unlockedOn: 'کسب‌شده در {{date}}',
  tileEarnedA11y: '{{title}}. در {{date}} کسب شد. {{hint}}',
  tileLockedA11y: '{{title}}. هنوز کسب نشده. {{hint}}',

  groupStart: 'شروع کار',
  groupSeen: 'دیده شدن',
  groupScore: 'امتیاز شما',
  groupStreak: 'سر زدن',

  rarityCommon: 'معمولی',
  rarityRare: 'کمیاب',
  rarityEpic: 'برجسته',

  // ── رشته (components/celebrate/StreakChip, StreakCalendar) ─────────────────
  days_one: '{{count}} روز',
  days_other: '{{count}} روز',

  streakChipA11y: 'رشته: {{days}}',
  streakChipHint: 'شرح رشته و هفت روز اخیر را باز می‌کند',
  streakSheetTitle: 'رشته‌ی شما',
  streakWhat:
    'رشته روز‌های پیاپی را می‌شمارد که AceAiX را باز کرده‌اید. تمام ماجرا همین است — سر زدن. به پست گذاشتن وصل نیست، و هرگز امتیاز استعدادتان را عوض نمی‌کند.',
  streakNoPressure:
    'اگر یک روز باز نکنید، چیزی جز همین رشته از بین نمی‌رود. بلندترین رشته‌تان سر جایش می‌ماند، امتیازتان سر جایش می‌ماند، و شمارش دفعه‌ی بعد که سر بزنید از نو شروع می‌شود.',
  streakNoneTitle: 'هنوز رشته‌ای نیست',
  streakNoneBody: 'از اولین روزی که برنامه را باز کنید شروع می‌شود. چیزی برای ثبت‌نام نیست.',

  calendarTitle: '۷ روز اخیر',
  calendarA11y: 'هفت روز اخیر. در {{count}} تایشان اینجا بودید.',
  streakCurrent: 'الان',
  streakLongest: 'بلندترین',
  streakTotal: 'روز‌های اینجا',

  gotIt: 'فهمیدم',

  // ── رده‌ی بعد (components/celebrate/TierProgress) ──────────────────────────
  nextTierTitle: 'رده‌ی بعد',
  pointsToNext_one: '{{count}} امتیاز تا {{tier}}',
  pointsToNext_other: '{{count}} امتیاز تا {{tier}}',
  tierStartsAt: '{{tier}} از {{score}} شروع می‌شود',
  tierTopTitle: 'بالاترین رده',
  tierTopBody: 'بالاتر از نخبه چیزی نیست. نمایه را به‌روز نگه دارید تا مال شما بماند.',
  tierTopA11y: 'رده‌ی نخبه، امتیاز استعداد {{score}}. این بالاترین رده است.',
  scoreNotReadyTitle: 'هنوز امتیاز استعدادی نیست',
  scoreNotReadyBody: 'ورزش و پست بازی‌تان را اضافه کنید تا امتیازتان ظاهر شود.',

  // ── جشن (components/celebrate/CelebrationOverlay) ──────────────────────────
  celebrateAchievementEyebrow: 'دستاورد کسب شد',
  celebrateTierEyebrow: 'رده‌ی تازه',
  celebrateStreakEyebrow: 'رشته',
  celebrateTierBody: 'امتیاز استعدادتان به {{score}} رسید.',
  celebrateStreakBody: 'مدام سر می‌زنید. بخش سخت واقعاً همین است.',
  streakMilestone_one: '{{count}} روز پیاپی',
  streakMilestone_other: '{{count}} روز پیاپی',
  andMore_one: 'و {{count}} تای دیگر روی دیوارتان',
  andMore_other: 'و {{count}} تای دیگر روی دیوارتان',
  celebrateNice: 'آفرین',
  celebrateNext: 'بعدی',
  celebrateShare: 'اشتراک',
  shareTierMessage: 'در AceAiX به رده‌ی {{tier}} رسیدم — امتیاز استعداد {{score}}.',

  // ── فهرست (components/celebrate/achievements.ts) ───────────────────────────
  achievements: {
    first_post: {
      title: 'اولین پست',
      hint: 'اولین بار پست گذاشتید.',
    },
    first_clip: {
      title: 'اولین کلیپ',
      hint: 'اولین ویدیو را به ویترینتان اضافه کردید.',
    },
    three_clips: {
      title: 'سه کلیپ',
      hint: 'سه ویدیو در ویترینتان. این نواری است که استعدادیاب می‌تواند ببیند.',
    },
    first_match: {
      title: 'اولین مسابقه',
      hint: 'اولین مسابقه‌تان را ثبت کردید.',
    },
    ten_matches: {
      title: 'ده مسابقه',
      hint: 'ده مسابقه در سابقه‌تان.',
    },
    first_application: {
      title: 'اولین درخواست',
      hint: 'برای اولین تست یا فرصت درخواست دادید.',
    },
    first_follower: {
      title: 'اولین دنبال‌کننده',
      hint: 'کسی دنبالتان کرد.',
    },
    ten_followers: {
      title: 'ده دنبال‌کننده',
      hint: 'ده نفر دنبالتان می‌کنند.',
    },
    fifty_followers: {
      title: 'پنجاه دنبال‌کننده',
      hint: 'پنجاه نفر دنبالتان می‌کنند.',
    },
    first_endorsement: {
      title: 'اولین توصیه',
      hint: 'یک مربی یا باشگاه شما را توصیه کرد.',
    },
    verified: {
      title: 'تأییدشده',
      hint: 'حسابتان تأیید شده، پس دیگران می‌دانند خودتان هستید.',
    },
    profile_complete: {
      title: 'نمایه‌ی کامل',
      hint: 'نمره‌ی کامل در بخش نمایه‌ی امتیاز استعدادتان.',
    },
    tier_bronze: {
      title: 'برنز',
      hint: 'امتیاز استعدادتان به ۴۰ رسید.',
    },
    tier_silver: {
      title: 'نقره',
      hint: 'امتیاز استعدادتان به ۵۵ رسید.',
    },
    tier_gold: {
      title: 'طلا',
      hint: 'امتیاز استعدادتان به ۷۰ رسید.',
    },
    tier_elite: {
      title: 'نخبه',
      hint: 'امتیاز استعدادتان به ۸۵ رسید.',
    },
    streak_3: {
      title: 'سه روز',
      hint: 'سه روز پیاپی AceAiX را باز کردید.',
    },
    streak_7: {
      title: 'یک هفته‌ی کامل',
      hint: 'هفت روز پیاپی AceAiX را باز کردید.',
    },
    streak_30: {
      title: 'سی روز',
      hint: 'سی روز پیاپی AceAiX را باز کردید.',
    },
  },
};
