/**
 * چالش‌های مهارت هفتگی.
 *
 * دو واژه اینجا وزن دارند و در هیچ زبانی نباید یکی شوند: نتیجه‌ی **اعلام‌شده**
 * آن چیزی است که ورزشکار می‌گوید انجام داده، و نتیجه‌ی **تأییدشده** آن چیزی
 * است که مربی دیده و تأیید کرده. جدول فقط به این دلیل خواناست که این دو
 * آشکارا فرق دارند.
 *
 * لحن، لحن مربی است نه لحن بازی. شمارش معکوس که داد بزند نیست، «عقب مانده‌اید»
 * نیست، و زبان جایزه نیست — چالش کاری است برای انجام دادن، و کلیپی که از آن
 * درمی‌آید مال شماست، چه ببرید چه نبرید.
 */
export const challenges = {
  // ── فهرست ──────────────────────────────────────────────────────────────────
  title: 'چالش‌ها',
  subtitle: 'مربیان و باشگاه‌ها می‌گذارند. یک کلیپ بفرستید تا بررسی شود.',
  tabOpen: 'باز',
  tabEntered: 'شرکت کرده‌اید',
  tabMine: 'مال من',

  emptyTitle: 'الان چالشی باز نیست',
  emptyBody: 'مربیان بیشتر هفته‌ها این‌ها را می‌گذارند. همان لحظه که یکی باز شود اینجا نشانش می‌دهیم.',
  emptyEnteredTitle: 'هنوز در یکی شرکت نکرده‌اید',
  emptyEnteredBody:
    'هر چالش بازی را بردارید و یک کلیپ بفرستید — نتیجه‌ی تأییدشده سریع‌ترین سندی است که می‌توانید بگیرید.',
  emptyMineTitle: 'چالشی نگذاشته‌اید',
  emptyMineBody: 'یک چیز مشخص را روی فیلم بخواهید تا همه‌ی جواب‌ها قابل مقایسه باشند.',

  setBy: 'از طرف {{name}}',
  closed: 'بسته',
  judging: 'در حال داوری',
  entries_one: '{{count}} شرکت',
  entries_other: '{{count}} شرکت',
  allTitle: 'همه‌ی چالش‌ها',
  allSubtitle_one: '{{count}} باز · یک کلیپ بفرستید تا بررسی شود',
  allSubtitle_other: '{{count}} باز · یک کلیپ بفرستید تا بررسی شود',
  allHint: 'یک کلیپ بفرستید تا بررسی شود',
  openCount_one: '{{count}} باز',
  openCount_other: '{{count}} باز',
  closingSoon: 'به‌زودی بسته می‌شود',
  moreChallenges: 'چالش‌های بیشتر',
  higherWins: 'بالاتر می‌برد',
  lowerWins: 'پایین‌تر می‌برد',
  seeOpen: 'دیدن چالش‌های باز',
  tagLabel: 'چالش',
  enterChallenge: 'شرکت در چالش',
  athletesOnlyNote: 'فقط ورزشکاران می‌توانند در چالش شرکت کنند. شرکت‌ها و نتیجه‌ها را از اینجا می‌توانید دنبال کنید.',
  setYourOwn: 'چالش خودتان را بگذارید',
  statDays_one: 'روز مانده',
  statDays_other: 'روز مانده',
  statEntries_one: 'شرکت',
  statEntries_other: 'شرکت',
  daysLeft_one: '{{count}} روز مانده',
  daysLeft_other: '{{count}} روز مانده',
  ageRange: 'سن {{min}}–{{max}}',
  ageMin: '{{min}} به بالا',
  ageMax: 'زیر {{max}}',

  // ── جزئیات ─────────────────────────────────────────────────────────────────
  briefTitle: 'چه چیزی فیلم شود',
  rulesTitle: 'چطور داوری می‌شود',
  judgedNote: 'مربی‌ای که گذاشته داوری می‌کند — عددی برای رد کردن نیست، پس بهترین برداشتتان را بفرستید.',
  measuredNote: 'با {{unit}} اندازه گرفته می‌شود. {{direction}}',
  directionHigher: 'بالاتر بهتر است.',
  directionLower: 'پایین‌تر بهتر است.',

  leaderboardTitle: 'جدول',
  leaderboardEmpty: 'هنوز کسی شرکت نکرده. اولین کلیپ خط را می‌گذارد.',
  verifiedBadge: 'تأییدشده',
  claimedBadge: 'اعلام‌شده',
  verifiedTooltip: 'یک مربی این کلیپ را دیده و نتیجه را تأیید کرده.',
  claimedTooltip: 'عدد خود ورزشکار. هنوز مربی‌ای بررسی‌اش نکرده.',
  yourEntry: 'شرکت شما',
  rankLabel: '#{{rank}}',

  // ── شرکت کردن ──────────────────────────────────────────────────────────────
  enter: 'شرکت',
  enterAgain: 'یک برداشت بهتر بفرستید',
  withdraw: 'انصراف',
  withdrawConfirmTitle: 'از شرکتتان انصراف می‌دهید؟',
  withdrawConfirmBody: 'کلیپ روی نمایه‌تان می‌ماند. فقط از این جدول کنار می‌رود.',
  withdrawConfirmAction: 'انصراف',

  chooseClipTitle: 'کدام کلیپ؟',
  chooseClipBody: 'یکی از ویدیو‌هایتان را انتخاب کنید. اگر کلیپ درست اینجا نیست، اول از نمایه‌تان یکی تازه بفرستید.',
  noClipsTitle: 'اول یک کلیپ لازم است',
  noClipsBody: 'تلاش را ضبط کنید، به نمایه‌تان اضافه کنید، بعد برگردید و شرکت کنید.',
  noClipsAction: 'افزودن کلیپ',

  resultLabel: 'نتیجه‌ی شما',
  resultPlaceholder: 'مثلاً ۲۱۴',
  noteLabel: 'چیزی برای افزودن؟',
  notePlaceholder: 'بهترین از سه تا. پای چپ هنوز ضعیف‌تر است.',
  submit: 'فرستادن شرکت',
  submitted: 'شرکت فرستاده شد. مربی تأییدش می‌کند.',
  updated: 'شرکت عوض شد.',
  withdrawn: 'شرکت پس گرفته شد.',

  // ── داوری، برای مربی‌ای که گذاشته ──────────────────────────────────────────
  judgeTitle: 'تأیید نتیجه‌ها',
  judgeBody: 'کلیپ را ببینید، بعد عدد را تأیید کنید یا برگردانید.',
  judgeAccept: 'تأیید',
  judgeReject: 'برگرداندن',
  judgeValueLabel: 'نتیجه‌ی تأییدشده',
  judgeNoteLabel: 'یادداشت برای ورزشکار',
  judgeNotePlaceholder: 'توپ در ۰:۱۸ به زمین خورد — شمارش از آنجا از نو شروع می‌شود.',
  judged: 'نتیجه تأیید شد.',
  sentBack: 'به ورزشکار برگردانده شد.',

  // ── گذاشتن یکی ─────────────────────────────────────────────────────────────
  newTitle: 'گذاشتن یک چالش',
  newBody: 'یک چیز مشخص را روی فیلم بخواهید. هر چه شرح دقیق‌تر باشد، جواب‌ها مفیدترند.',
  fieldTitle: 'عنوان',
  fieldTitlePlaceholder: 'سی ثانیه روپایی',
  fieldBrief: 'چه چیزی فیلم شود',
  fieldBriefPlaceholder: 'یک برداشت، فقط پا و ران، گوشی روی زمین تا همه‌ی بدن دیده شود.',
  fieldRules: 'چطور داوری می‌شود',
  fieldRulesPlaceholder: 'بدون برش. بهترین از سه تا، نه مونتاژ.',
  fieldMeasured: 'عددی هست؟',
  measuredYes: 'اندازه‌گیری',
  measuredNo: 'داوری',
  fieldMetricLabel: 'چه چیزی شمرده می‌شود',
  fieldMetricLabelPlaceholder: 'لمس‌ها',
  fieldMetricUnit: 'واحد',
  fieldMetricUnitPlaceholder: 'لمس',
  fieldBetter: 'بهتر یعنی',
  betterHigher: 'بالاتر',
  betterLower: 'پایین‌تر',
  fieldAges: 'گروه سنی',
  fieldCloses: 'بسته می‌شود',
  closesIn7: 'تا یک هفته',
  closesIn14: 'تا دو هفته',
  closesIn30: 'تا یک ماه',
  create: 'گذاشتن چالش',
  created: 'چالش زنده است.',

  // ── کارت خانه ──────────────────────────────────────────────────────────────
  homeTitle: 'چالش این هفته',
  homeCta: 'دیدنش',
  homeEnteredCta: 'دیدن جدول',
  homeStubDays_one: 'روز مانده',
  homeStubDays_other: 'روز مانده',
  homeStubToday: 'امروز تمام می‌شود',
  homeStubEntered: 'شرکت کرده‌اید',
  homeBeFirst: 'اولین نفر باشید',
  homeSetBy: 'از طرف {{name}}',
};
