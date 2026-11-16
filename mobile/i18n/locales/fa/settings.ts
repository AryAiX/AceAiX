/**
 * درخت تنظیمات — هر صفحه زیر `app/settings/`، قطعه‌هایی که از آن‌ها ساخته
 * شده، و چارچوب دور چهار سند حقوقی.
 *
 * هر چه درباره‌ی گزارش، مسدود کردن، سرپرست یا محافظت زیر ۱۸ است در
 * `safety.ts` است تا همان متن جدا بازبینی شود. واژگان مشترک (ذخیره، لغو،
 * تأییدشده، رفع مسدودیت، امتیاز استعداد، نام چهار سند) از `common.ts` می‌آید
 * و اینجا تکرار نمی‌شود.
 *
 * درباره‌ی مقدار‌های ذخیره‌شده: ورزش، پست، سطح و کشور‌هایی که استعدادیاب
 * انتخاب می‌کند به انگلیسی ذخیره می‌شوند و هنگام نمایش از راه
 * `constants/sports.ts` ترجمه می‌شوند. فقط برچسب‌های دور آن‌ها در این فایل است.
 */
export const settings = {
  // ── خانه‌ی تنظیمات (app/settings/index.tsx) ────────────────────────────────
  title: 'تنظیمات',

  sectionAccount: 'حساب',
  accountTitle: 'حساب',
  accountSubtitle: 'ایمیل، رمز عبور، تأیید',
  appearanceTitle: 'ظاهر',
  appearanceSubtitle: 'روشن، تیره، یا هماهنگ با گوشی',
  notificationsTitle: 'اعلان‌ها',
  notificationsSubtitle: 'انتخاب کنید چه چیزی به شما برسد',

  sectionPrivacySafety: 'حریم خصوصی و ایمنی',
  privacyTitle: 'حریم خصوصی',
  privacySubtitle: 'چه کسی می‌تواند پیام بدهد و پیدایتان کند',

  sectionScouting: 'استعدادیابی',
  scoutingFooter: 'از این استفاده می‌کنیم تا رتبه دهیم چه کسی در کشف اول دیده شود.',
  scoutingTitle: 'دنبال چه هستید',
  scoutingSubtitle: 'ورزش، پست، سطح و سن',

  sectionAbout: 'درباره',
  supportTitle: 'تماس با پشتیبانی',
  supportFallback: 'به {{email}} ایمیل بزنید',
  versionTitle: 'نسخه',

  signOut: 'خروج',
  signOutConfirmTitle: 'خارج شوید؟',
  signOutConfirmBody: 'برای برگشتن به ایمیل و رمز عبورتان نیاز دارید.',

  /** «AceAiX by AryAiX» — هر دو نام برندند و همان‌طور که هستند پاس داده می‌شوند. */
  productBy: '{{product}} از {{company}}',

  // ── حساب (app/settings/account.tsx) ────────────────────────────────────────
  sectionSignIn: 'ورود',
  signInFooter:
    'ایمیل همان راه ورود شماست و همان راهی که درباره‌ی حساب به شما می‌رسیم. برای عوض کردنش به {{email}} بنویسید.',
  emailLabel: 'ایمیل',
  notSignedIn: 'وارد نشده‌اید',

  sectionVerification: 'تأیید',
  verificationTitle: 'تأیید',
  requestVerification: 'درخواست تأیید',
  verificationCheckedSubtitle: 'حسابتان بررسی شده',
  verificationAskSubtitle: 'از ما بخواهید حسابتان را بررسی کنیم',
  verificationInReview: 'در حال بررسی',
  verificationSentOn: 'فرستاده در {{date}}',
  verificationApproved: 'تأیید شد',
  verificationApprovedSubtitle: 'نشان در راه است',
  verificationRejected: 'تأیید نشد',
  verificationRejectedSubtitle: 'می‌توانید درخواست تازه بفرستید',
  verificationRequestSent: 'درخواست فرستاده شد. به‌زودی نگاه می‌کنیم.',

  sectionYourData: 'داده‌های شما',
  dataFooter:
    'فایل JSON است: نمایه، پست‌ها، نظر‌ها، دنبال‌کردن‌ها، درخواست‌ها و رسانه‌ها، دقیقاً همان‌طور که نزد ماست.',
  downloadMyData: 'دانلود داده‌هایم',
  downloadSubtitle: 'یک کپی از همه‌چیز روی حسابتان بگیرید',
  preparingFile: 'فایل شما آماده می‌شود…',
  preparingShort: 'در حال آماده‌سازی…',
  exportSaved: '{{name}} ذخیره شد',

  // برگه‌ی عوض کردن رمز
  changePassword: 'عوض کردن رمز عبور',
  changePasswordSubtitle: 'روی این دستگاه وارد می‌مانید.',
  currentPassword: 'رمز عبور فعلی',
  currentPasswordPlaceholder: 'رمز الان',
  newPassword: 'رمز عبور تازه',
  newPasswordHint_one: 'حداقل {{count}} نویسه.',
  newPasswordHint_other: 'حداقل {{count}} نویسه.',
  newPasswordPlaceholder: 'چیزی که فقط خودتان می‌دانید',
  confirmNewPassword: 'تکرار رمز تازه',
  confirmNewPasswordPlaceholder: 'دوباره بنویسید',
  passwordTooShort_one: 'رمزی با حداقل {{count}} نویسه انتخاب کنید.',
  passwordTooShort_other: 'رمزی با حداقل {{count}} نویسه انتخاب کنید.',
  passwordsDoNotMatch: 'این دو رمز یکی نیستند.',
  passwordUnchanged: 'این همان رمزی است که الان دارید.',
  passwordCurrentWrong: 'رمز فعلی درست نیست.',
  passwordChanged: 'رمز عوض شد.',
  passwordPhishingNote:
    'هرگز رمزتان را با ایمیل یا در پیام نمی‌پرسیم. اگر کسی پرسید، ما نیستیم.',

  // ── حریم خصوصی (app/settings/privacy.tsx) ──────────────────────────────────
  messagePrivacyHeading: 'چه کسی می‌تواند به شما پیام بدهد',
  messagePrivacyHint: 'این فقط گفت‌وگو‌های تازه را عوض می‌کند. گفت‌وگو‌هایی که دارید باز می‌مانند.',

  privacyEveryone: 'همه',
  privacyEveryoneHint: 'هر کسی در AceAiX می‌تواند با شما گفت‌وگو شروع کند.',
  privacyVerified: 'مربی‌ها و باشگاه‌های تأییدشده',
  privacyVerifiedHint: 'فقط حساب‌هایی که بررسی کرده‌ایم، به‌علاوه‌ی کسانی که دنبالتان می‌کنند.',
  privacyFollowing: 'کسانی که دنبال می‌کنید',
  privacyFollowingHint: 'فقط حساب‌هایی که از قبل دنبال می‌کنید می‌توانند اول بنویسند.',
  privacyNobody: 'هیچ‌کس',
  privacyNobodyHint: 'کسی نمی‌تواند گفت‌وگوی تازه شروع کند. گفت‌وگو‌های موجود کار می‌کنند.',

  discoveryHeading: 'در جست‌وجوی استعدادیاب دیده شوید',
  discoveryHint: 'وقتی این روشن است، مربی‌ها و باشگاه‌ها می‌توانند در کشف پیدایتان کنند.',
  discoverable: 'قابل کشف',
  discoverableOn: 'نمایه‌تان می‌تواند در جست‌وجو بیاید',
  discoverableOff: 'از جست‌وجو پنهانید',

  publicWebHeading: 'نمایه‌ام به بازدیدکننده‌ی خارج از حساب نشان داده شود',
  publicWebAdult:
    'نمایه‌ی بزرگسالانی که روی دیده شدن در جست‌وجو تنظیم شده، روی وب هم برای کسی که وارد نشده دیده می‌شود. خاموش کردن «{{setting}}» در بالا شما را از هر دو بیرون می‌برد.',
  readPrivacyPolicy: 'خواندن سیاست حریم خصوصی کامل',

  // ── اعلان‌ها (app/settings/notifications.tsx) ──────────────────────────────
  pushOffTitle: 'اعلان‌های فشاری خاموش است',
  pushOffBody:
    'گوشی اجازه‌ی فرستادن اعلان به AceAiX را نمی‌دهد، پس تا وقتی برنامه بسته است هیچ‌کدام از پایین به شما نمی‌رسد.',
  turnOnPush: 'روشن کردن اعلان فشاری',
  pushStillOff: 'اعلان فشاری هنوز خاموش است. می‌توانید از تنظیمات گوشی روشن کنید.',
  scoutingRecruiterOnlyBody:
    'ترجیح استعدادیابی برای مربی‌ها، باشگاه‌ها و استعدادیاب‌هاست. ورزشکاران ورزش و آمادگی‌شان را روی نمایه تنظیم می‌کنند.',
  scoutingRecruiterOnlyTitle: 'برای مربی‌ها و باشگاه‌ها',
  openSystemSettings: 'باز کردن تنظیمات',
  autoSaveNote: 'تغییر‌ها خودشان ذخیره می‌شوند.',

  sectionHowWeReach: 'چطور به شما می‌رسیم',
  pushTitle: 'اعلان‌های فشاری',
  pushSubtitle: 'روی گوشی، وقتی برنامه بسته است',
  emailTitle: 'ایمیل',
  emailSubtitle: 'گاهی خلاصه‌ای به صندوق ورودی',

  sectionActivity: 'فعالیت',
  activityFooter: 'این‌ها همچنین کنترل می‌کنند چه چیزی در اعلان‌های داخل برنامه بیاید.',
  notifyFollows: 'دنبال‌کننده‌های تازه',
  notifyMessages: 'پیام‌ها',
  notifyComments: 'نظر‌ها',
  notifyMentions: 'اشاره‌ها',
  notifyLikes: 'پسند‌ها',
  notifyMeetups: 'بازی‌ها',
  meetupPlaces: 'محل هشدار بازی',
  meetupPlacesOnlyCity: 'فقط شهرتان',
  meetupPlacesBody: 'برای بازی‌های شهر نمایه‌تان هشدار می‌گیرید. تا ۵ شهر یا منطقه‌ی دیگر اضافه کنید.',
  meetupPlaceAdd: 'افزودن',

  sectionOpportunities: 'فرصت‌ها و امتیاز شما',
  notifyOpportunities: 'فرصت‌های تازه',
  notifyApplications: 'به‌روزرسانی درخواست‌ها',
  notifyScoutInterest: 'علاقه‌ی استعدادیاب',
  notifyScoreUpdates: 'به‌روزرسانی امتیاز استعداد',
  sectionClubs: 'باشگاه‌ها',
  notifyClubUpdates: 'به‌روزرسانی باشگاه',
  notifyClubUpdatesHint: 'اعلامیه، بازی، نتیجه و رویداد از باشگاه‌هایی که دنبال می‌کنید یا برایشان بازی می‌کنید',

  noMarketingNote:
    'هرگز اعلان فشاری تبلیغاتی نمی‌فرستیم، و مشخصاتتان را به کسی که این کار را بکند نمی‌فروشیم.',

  // ── ترجیح استعدادیابی (app/settings/scouting.tsx) ──────────────────────────
  scoutingIntro:
    'این تعیین می‌کند کشف چه کسی را اول جلوی شما بگذارد، و درباره‌ی کدام ورزشکار به شما بگوییم. هر چه را خالی بگذارید یعنی «ترجیحی ندارم».',
  scoutingSports: 'ورزش‌ها',
  scoutingSportsHint: 'ورزش‌هایی را که برایشان استعدادیابی می‌کنید انتخاب کنید. بیش از یکی می‌شود.',
  scoutingPositions: 'پست‌ها',
  scoutingPositionsHint: 'فقط پست‌های ورزش‌هایی که انتخاب کردید.',
  scoutingPositionsEmpty: 'اول یک ورزش انتخاب کنید تا پست‌هایش اینجا بیایند.',
  scoutingLevels: 'سطح‌ها',
  scoutingCountries: 'کشور‌ها',
  scoutingCountriesHint: 'ورزشکار کجا مستقر است.',

  ageRange: 'بازه‌ی سنی',
  youngest: 'جوان‌ترین',
  oldest: 'مسن‌ترین',
  yearsSuffix: 'سال',

  minimumTalentScore: 'حداقل امتیاز استعداد',
  atLeast: 'حداقل',
  anyScoreHint: 'هر امتیازی، از جمله ورزشکارانی که هنوز امتیاز ندارند',
  minScoreHint: 'فقط ورزشکارانی با امتیاز {{score}} یا بالاتر',

  filters: 'فیلتر‌ها',
  openToOffersOnly: 'فقط آماده‌ی پیشنهاد',
  openToOffersHint: 'ورزشکارانی را که نگفته‌اند دنبال‌اند پنهان کنید',
  notifyNewMatches: 'از تطابق‌های تازه خبرم کنید',
  notifyNewMatchesHint: 'وقتی ورزشکاری که جور است بپیوندد یا بهتر شود',

  savePreferences: 'ذخیره‌ی ترجیح‌ها',
  preferencesSaved: 'ذخیره شد. کشف از این به بعد از این استفاده می‌کند.',
  discardChangesTitle: 'تغییر‌ها کنار گذاشته شوند؟',
  discardChangesBody: 'تغییر‌های آنچه دنبالش هستید ذخیره نمی‌شود.',
  keepEditing: 'ادامه‌ی ویرایش',

  // ── ظاهر (app/settings/appearance.tsx) ─────────────────────────────────────
  themeHeading: 'پوسته',
  themeBody: 'سیستم از هر چه گوشی روی آن است پیروی می‌کند، از جمله برنامه‌ی شب.',
  themeSystem: 'سیستم',
  themeLight: 'روشن',
  themeDark: 'تیره',
  preview: 'پیش‌نمایش',
  themeSystemNoteLight: 'گوشی الان روی حالت روشن است.',
  themeSystemNoteDark: 'گوشی الان روی حالت تیره است.',
  themeAlwaysLight: 'همیشه روشن، هر چه گوشی روی آن باشد.',
  themeAlwaysDark: 'همیشه تیره، هر چه گوشی روی آن باشد.',

  /* پیش‌نمایش یک پست ساختگی است، فقط تا پوسته سنجیده شود. */
  previewName: 'لیلا حداد',
  previewCity: 'دبی',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'دو گل و یک پاس گل در دربی. کلیپ کامل روی نمایه‌ام.',

  // ── حذف حساب (app/settings/delete-account.tsx) ─────────────────────────────
  deleteAccountTitle: 'حذف حساب',
  deleteAccountSubtitle: 'نمایه‌تان و همه‌چیز روی آن برای همیشه برداشته می‌شود',
  deleteCannotUndoTitle: 'این برگشت‌پذیر نیست',
  deleteCannotUndoBody:
    'حذف حساب آن را برای همیشه برمی‌دارد. راهی نیست که آن را برگردانیم، و ثبت‌نام دوباره از صفر شروع می‌شود — نمایه‌ای تازه، و امتیاز استعدادی که از صفر آغاز می‌شود.',

  beforeYouGo: 'پیش از رفتن',
  takeABreakTitle: 'به‌جای آن کمی فاصله بگیرید',
  takeABreakBody:
    'کشف را خاموش کنید تا از جست‌وجوی استعدادیاب ناپدید شوید. نمایه، پست‌ها و امتیاز دقیقاً همان می‌مانند، و هر وقت بخواهید می‌توانید دوباره روشن کنید.',
  turnOffDiscovery: 'خاموش کردن کشف',
  discoveryAlreadyOff: 'کشف از قبل خاموش است',
  hiddenFromSearchToast: 'از جست‌وجوی استعدادیاب پنهانید. چیزی حذف نشده.',
  deleteExportBody:
    'پیش از آنکه چیزی برداشته شود، یک کپی از نمایه، پست‌ها، نظر‌ها، دنبال‌کردن‌ها و درخواست‌ها نگه دارید. وقتی حساب حذف شد نمی‌توانیم برایتان بفرستیم.',

  whatGetsDeleted: 'چه چیزی حذف می‌شود',
  removedProfile: 'نمایه، عکس، و هر چه روی آن نوشته‌اید',
  removedPosts: 'هر پست، نظر و پسندی که گذاشته‌اید',
  removedMessages: 'پیام‌هایتان، در هر گفت‌وگو',
  removedApplications: 'درخواست‌ها و هر فرصتی که ذخیره کرده‌اید',
  removedScore: 'امتیاز استعداد و تمام سابقه‌اش',
  removedFollows: 'دنبال‌کننده‌ها و همه‌ی کسانی که دنبال می‌کنید',
  retentionNote:
    'تعداد کمی سابقه را برای مدتی محدود نگه می‌داریم، جایی که قانون لازم کرده — سابقه‌ی ایمنی و نظارت، و هر چه برای جواب به یک مطالبه‌ی حقوقی لازم است. هیچ‌چیز از نمایه‌تان دیگر به کسی نشان داده نمی‌شود.',

  /**
   * کلمه‌ای که برای تأیید حذف تایپ می‌شود. آن را به کلمه‌ای ترجمه کنید که
   * مردم در این زبان واقعاً تایپ می‌کنند؛ مقایسه به حروف کوچک و بزرگ حساس نیست.
   */
  deleteConfirmWord: 'حذف',
  typeToContinue: 'برای ادامه {{word}} را بنویسید',
  deleteMyAccount: 'حذف حسابم',
  changedYourMind: 'نظرتان عوض شد؟ فقط برگردید — هنوز هیچ اتفاقی نیفتاده.',
  deleteConfirmTitle: 'حسابتان حذف شود؟',
  deleteConfirmBody:
    'این آخرین قدم است. نمایه، پست‌ها، پیام‌ها، درخواست‌ها و امتیاز استعداد برای همیشه برداشته می‌شوند و برنمی‌گردند.',
  deletePermanently: 'حذف برای همیشه',
  keepMyAccount: 'نگه داشتن حسابم',

  // ── کنترل‌های مشترک تنظیمات (components/settings/) ─────────────────────────
  nothingToChoose: 'هنوز اینجا چیزی برای انتخاب نیست.',
  stepperDecrease: 'کاهش {{label}}',
  stepperIncrease: 'افزایش {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** یک ردیف رادیویی که بلند خوانده می‌شود: برچسب، بعد خط توضیح. */
  radioA11y: '{{label}}. {{hint}}',

  // ── چارچوب صفحه‌ی حقوقی (app/legal/) ───────────────────────────────────────
  /* خود سند‌ها به انگلیسی منتشر می‌شوند و هرگز ترجمه نمی‌شوند — فقط
     چارچوب دور آن‌ها. */
  legalUpdated: 'به‌روزرسانی {{date}}',
  legalLinkExternal: '{{label}}، بیرون از برنامه باز می‌شود',

  // ── پیکربندی ناقص (components/common/ConfigMissing.tsx) ────────────────────
  configMissingTitle: 'پیکربندی نیست',
  configMissingBody:
    'AceAiX به پشتیبانش نمی‌رسد چون متغیر‌های محیط Supabase برای این ساخت تنظیم نشده‌اند.',
  configMissingHint:
    'آن‌ها را برای توسعه‌ی محلی در `mobile/.env` بگذارید، یا به‌عنوان راز EAS برای یک ساخت، بعد باندلر را از نو راه بیندازید.',
};
