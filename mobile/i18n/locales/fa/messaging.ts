/**
 * پیام‌رسانی و اعلان‌ها.
 *
 * به ترتیبی که آدم با آن‌ها روبه‌رو می‌شود: صندوق و یکی از ردیف‌هایش، منوی
 * ایمنی پشت هر «…»، بعد رشته — سرصفحه، جداکننده‌ی روز، حباب‌ها، نوار زیر ۱۸،
 * کارتی که وقتی پیام نمی‌رسد جای کادر نوشتن را می‌گیرد، و خود کادر نوشتن — و در
 * آخر صفحه‌ی اعلان و یکی از ردیف‌هایش.
 *
 * دو چیز عمداً جای دیگر است. دلیل‌های گزارش فقط برچسب‌اند: مقداری که در جدول
 * نظارت نوشته می‌شود ثابت انگلیسی داخل کامپوننت است. و دلیل‌های مسدودی که
 * پایگاه داده برمی‌گرداند (`minor_requires_verified_sender` و بقیه) هم هرگز
 * ترجمه نمی‌شوند — فقط توضیحی که برای هر کدام نشان داده می‌شود.
 */
export const messaging = {
  // ── صندوق ──────────────────────────────────────────────────────────────────
  inboxTitle: 'پیام‌ها',
  inboxEmptyTitle: 'هنوز پیامی نیست',
  inboxEmptyBody: 'وقتی مربی یا باشگاه پیامی بفرستد، همین‌جا می‌آید.',
  inboxEmptyAction: 'کاوش در کشف',
  searchChats: 'جست‌وجوی گفت‌وگو‌ها',
  filterAll: 'همه',
  filterUnread: 'نخوانده',
  markRead: 'خوانده',
  markUnread: 'نخوانده',
  mute: 'بی‌صدا',
  unmute: 'رفع بی‌صدا',
  alreadyRead: 'این گفت‌وگو از قبل خوانده شده، پس نمی‌شود نخوانده شود.',
  select: 'انتخاب',
  selectAll: 'انتخاب همه',
  selectedCount_one: '{{count}} انتخاب‌شده',
  selectedCount_other: '{{count}} انتخاب‌شده',
  selectHint: 'برای انتخاب، روی گفت‌وگو‌ها بزنید',
  receiptSent: 'فرستاده',
  receiptSeen: 'دیده',
  previewYou: 'شما: {{text}}',
  startTitle: 'شروع یک گفت‌وگو',
  startBody: 'از نمایه‌شان به ورزشکاران، مربی‌ها و باشگاه‌ها پیام دهید.',
  startAction: 'پیدا کردن افراد',
  noMatches: 'گفت‌وگویی با جست‌وجویتان جور نیست.',
  allCaughtUp: 'همه را دیده‌اید.',
  swipeHint: 'برای خوانده و بی‌صدا، گفت‌وگو را به چپ بکشید',
  sendTo: 'فرستادن به',
  pickChats: 'یک گفت‌وگو انتخاب کنید',
  sendToChats: 'فرستادن · {{count}}',
  sharedToChats: 'فرستاده شد',
  shareSomeFailed: 'به همه‌ی گفت‌وگو‌ها نرسید. دوباره تلاش کنید.',
  copyLink: 'کپی پیوند',
  tapToOpen: 'برای باز کردن بزنید',
  viewProfile: 'دیدن نمایه',
  postUnavailable: 'پست در دسترس نیست',
  profileUnavailable: 'نمایه در دسترس نیست',
  previewSharedPost: 'یک پست به اشتراک گذاشت',
  previewSharedProfile: 'یک نمایه به اشتراک گذاشت',
  tapToWatch: 'برای دیدن بزنید',
  clipUnavailable: 'کلیپ در دسترس نیست',
  previewSharedClip: 'یک کلیپ به اشتراک گذاشت',

  // ── یک ردیف گفت‌وگو ────────────────────────────────────────────────────────
  previewBlocked: 'این حساب را مسدود کرده‌اید',
  previewNone: 'هنوز پیامی نیست',
  unreadMessages_one: '{{count}} پیام نخوانده',
  unreadMessages_other: '{{count}} پیام نخوانده',
  /* به‌جای عدد چهاررقمی روی نشان. */
  unreadOverflow: '99+',
  conversationHint: 'گفت‌وگو را باز می‌کند. برای گزینه‌های بیشتر نگه دارید.',

  // ── منوی ایمنی (ردیف صندوق و «…» رشته) ─────────────────────────────────────
  thisPerson: 'این شخص',
  thisPersonSentence: 'این شخص',
  muteConversation: 'بی‌صدا کردن گفت‌وگو',
  unmuteConversation: 'رفع بی‌صدای گفت‌وگو',
  muteHint: 'فقط روی این گوشی. هرگز به او گفته نمی‌شود.',
  reportHint: 'بگویید چه اشکالی هست. گزارش‌ها خصوصی‌اند.',
  blockPerson: 'مسدود کردن {{name}}',
  blockHint: 'نمی‌تواند به شما پیام بدهد یا نمایه‌تان را پیدا کند.',

  reportPerson: 'گزارش {{name}}',
  reportReasonPrompt: 'نزدیک‌ترین دلیل را انتخاب کنید. هرگز نمی‌گوییم چه کسی گزارش کرده.',
  reasonHarassment: 'آزار یا قلدری',
  reasonChildSafety: 'ایمنی کودک',
  reasonScam: 'کلاهبرداری یا پیشنهاد جعلی',
  reasonSpam: 'هرزنامه',
  reasonNudity: 'برهنگی یا محتوای جنسی',
  reasonHate: 'سخن نفرت',
  reasonImpersonation: 'جعل هویت',
  reasonOther: 'چیز دیگر',
  reportDetailsLabel: 'چیز دیگری هست که باید بدانیم؟',
  reportEmergencyNote: 'اگر کسی همین حالا در خطر است، با اورژانس محلی هم تماس بگیرید.',
  reportThanks: 'ممنون که گفتید. تیم ما نگاه می‌کند.',

  blockConfirmTitle: '{{name}} مسدود شود؟',
  blockConfirmBody:
    'نمایه و پست‌هایتان را نمی‌بیند، نمی‌تواند به شما پیام بدهد، و شما هم او را نمی‌بینید. از تنظیمات می‌توانید این را برگردانید.',
  blockedToast: '{{name}} مسدود شد. از تنظیمات می‌توانید این را برگردانید.',

  // ── رشته ───────────────────────────────────────────────────────────────────
  conversationNotOpened: 'آن گفت‌وگو باز نشد.',
  loadingMessages: 'بارگذاری پیام‌ها',
  threadStart: 'این شروع گفت‌وگوی شماست. سلام کنید.',
  threadStartWith: 'این شروع گفت‌وگوی شما با {{name}} است. سلام کنید.',

  closedTitle: 'این گفت‌وگو بسته است',
  closedBody: 'این حساب را مسدود کرده‌اید، پس هیچ‌کدام دیگری را نمی‌بینید. از تنظیمات می‌توانید این را برگردانید.',
  closedAction: 'بازگشت به پیام‌ها',
  blockedFromThread: 'دیگر از این حساب خبری نمی‌گیرید.',

  // ── سرصفحه‌ی رشته ──────────────────────────────────────────────────────────
  backToMessages: 'بازگشت به پیام‌ها',
  openProfileOf: 'باز کردن نمایه‌ی {{name}}',
  loadingConversation: 'بارگذاری گفت‌وگو',
  moreOptions: 'گزینه‌های بیشتر',

  // ── یک پیام ────────────────────────────────────────────────────────────────
  messageFailedA11y: 'پیام فرستاده نشد. برای تلاش دوباره بزنید.',
  notSent: 'فرستاده نشد — برای تکرار بزنید',
  sending: 'در حال فرستادن',

  // ── نوار زیر ۱۸ ────────────────────────────────────────────────────────────
  /* متن انطباق. معنا دقیق است و در هر زبان باید دقیق بماند: کسی که به او
     پیام می‌دهید زیر ۱۸ است، و والد یا سرپرستش می‌تواند ببیند این گفت‌وگو
     وجود دارد — نه اینکه داخلش چیست. */
  minorBanner:
    'به ورزشکاری زیر ۱۸ پیام می‌دهید. والد یا سرپرستش می‌تواند ببیند این گفت‌وگو وجود دارد.',

  // ── پیام مسدود ─────────────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: 'پیام اینجا محدود است',
  blockedVerifiedSenderBody:
    '{{name}} زیر ۱۸ است. فقط مربی‌ها و باشگاه‌هایی که تأیید کرده‌ایم می‌توانند با او گفت‌وگو شروع کنند.',
  blockedGuardianConsentTitle: 'منتظر والد یا سرپرست',
  blockedGuardianConsentBody: '{{name}} زیر ۱۸ است، و والد یا سرپرستش هنوز پیام‌رسانی را تأیید نکرده.',
  blockedMessagesOffTitle: 'پیام‌ها خاموش است',
  blockedMessagesOffBody: '{{name}} انتخاب کرده الان پیام نگیرد.',
  blockedOnlyFollowedTitle: 'برای پیام تازه باز نیست',
  blockedOnlyFollowedBody: '{{name}} فقط از کسانی که دنبال می‌کند پیام می‌گیرد.',
  blockedOnlyVerifiedTitle: 'فقط حساب‌های تأییدشده',
  blockedOnlyVerifiedBody: '{{name}} فقط از مربی‌ها و باشگاه‌های تأییدشده پیام می‌گیرد.',
  blockedNotFoundTitle: 'این حساب رفته',
  blockedNotFoundBody: 'کسی که به او پیام می‌دادید دیگر در AceAiX نیست.',
  blockedDefaultTitle: 'اینجا نمی‌توانید پیام بدهید',
  blockedDefaultBody: 'الان نمی‌توانیم پیام را به {{name}} برسانیم.',

  howTitle: 'پیام‌رسانی چطور کار می‌کند',
  howSubtitle: 'AceAiX برای ورزشکاران جوان ساخته شده، پس اینکه چه کسی می‌تواند گفت‌وگو شروع کند عمداً محدود است.',
  howMinorsTitle: 'ورزشکاران زیر ۱۸ محافظت بیشتر دارند',
  howMinorsBody:
    'یک بزرگسال فقط وقتی می‌تواند با ورزشکار زیر ۱۸ گفت‌وگو شروع کند که او را به‌عنوان مربی یا باشگاه تأیید کرده باشیم، و والد یا سرپرست ورزشکار پیام‌رسانی را تأیید کرده باشد.',
  howInboxTitle: 'هر کس صندوق خودش را انتخاب می‌کند',
  howInboxBody:
    'هر کس می‌تواند پیام را به مربی‌ها و باشگاه‌های تأییدشده محدود کند، به کسانی که دنبال می‌کند، یا کاملاً خاموش کند. این انتخاب مال خود اوست و ما آن را نادیده نمی‌گیریم.',
  howTemporaryTitle: 'هیچ‌چیز اینجا دائمی نیست',
  howTemporaryBody:
    'اگر سرپرست پیام‌رسانی را تأیید کند، یا آن شخص تنظیم صندوق را عوض کند، این رشته خودش باز می‌شود. دنبال کردن هم کمک می‌کند.',
  howWrongTitle: 'اگر چیزی نادرست به نظر رسید',
  howWrongBody:
    'از منوی «…» بالای هر گفت‌وگو گزارش یا مسدود کنید. گزارش‌ها خصوصی‌اند — هرگز به طرف دیگر نمی‌گوییم چه کسی گزارشش کرده.',
  gotIt: 'فهمیدم',

  // ── کادر نوشتن ─────────────────────────────────────────────────────────────
  composerPlaceholder: 'یک پیام بنویسید',
  composerPlaceholderNamed: 'پیام به {{name}}',
  sendMessage: 'فرستادن پیام',

  // ── اعلان‌ها ───────────────────────────────────────────────────────────────
  notificationsTitle: 'اعلان‌ها',
  sectionNew: 'تازه',
  sectionThisWeek: 'این هفته',
  likedYourPosts_one: '{{name}} {{count}} پست شما را پسندید',
  likedYourPosts_other: '{{name}} {{count}} پست شما را پسندید',
  moreNotifications_one: '+{{count}} اعلان دیگر',
  moreNotifications_other: '+{{count}} اعلان دیگر',
  sectionEarlier: 'زودتر',
  markAllRead: 'همه خوانده شود',
  markAllReadA11y_one: '{{count}} اعلان خوانده شود',
  markAllReadA11y_other: 'هر {{count}} اعلان خوانده شود',
  notificationsEmptyTitle: 'چیز تازه‌ای نیست',
  notificationsEmptyBody: 'یک کلیپ بگذارید یا چند باشگاه را دنبال کنید تا اینجا پر شود.',
  notificationsEmptyAction: 'افرادی برای دنبال کردن پیدا کنید',

  // ── یک اعلان ───────────────────────────────────────────────────────────────
  /* خود جمله از سرور از قبل نوشته می‌رسد — یادداشت KNOWN GAP در
     NotificationRow. فقط پیشوند بازیگر مال ماست: سرور نام تازه‌ترین بازیگر را
     جلو می‌گذارد و بقیه را می‌شمارد، و groupedTitle جایی است که زبانی که
     راست‌به‌چپ خوانده می‌شود می‌تواند دو نیمه را جابه‌جا کند. */
  actorAndOthers_one: '{{name}} و {{count}} نفر دیگر',
  actorAndOthers_other: '{{name}} و {{count}} نفر دیگر',
  groupedTitle: '{{actors}}{{rest}}',
  unread: 'نخوانده',
  meetupNearbyTitle: 'بازی تازه‌ی {{sport}} در {{city}}',
  mentionedInPost: '{{name}} در یک پست به شما اشاره کرد',
  mentionedInComment: '{{name}} در یک نظر به شما اشاره کرد',
  taggedInPost: '{{name}} در یک پست شما را برچسب زد',
  referralJoined: '{{name}} از راه دعوت شما پیوست',
  referralJoinedNoName: 'یک دوست از راه دعوت شما پیوست',
  referralTokenTitle: 'یک توکن گرفتید',
  referralTokenBody_one: '{{n}} دوست از راه دعوت شما به AceAiX پیوست.',
  referralTokenBody_other: '{{n}} دوست از راه دعوت شما به AceAiX پیوست.',
  sportApproved: 'ورزشتان تأیید شد: {{sport}}',
  sportMatched: 'ورزشتان روی {{sport}} تنظیم شد',
  sportRejected: 'درخواست ورزشتان تأیید نشد',
  /* روی گوشی از نام بازیگر ساخته می‌شود. {{actors}} خود نام است، یا
     «نام و چند نفر دیگر» وقتی چند نفر همان کار را کرده‌اند. */
  followedYou: '{{actors}} شما را دنبال کرد',
  likedYourPost: '{{actors}} پست شما را پسندید',
  commentedOnPost: '{{actors}} روی پست شما نظر داد',
  repliedToYou: '{{actors}} به شما پاسخ داد',
  sentYouMessage: '{{actors}} به شما پیام داد',
  viewedYourProfile: '{{actors}} نمایه‌ی شما را دید',
  challengeConfirmed: 'شرکت شما در {{challenge}} تأیید شد',
  challengeConfirmedPlain: 'شرکت شما تأیید شد',
  challengeAnotherGo: 'شرکت شما در {{challenge}} یک بار دیگر می‌خواهد',
  challengeAnotherGoPlain: 'شرکت شما یک بار دیگر می‌خواهد',
  challengeCoachConfirmed: 'یک مربی دید و نتیجه را تأیید کرد.',
  challengeCoachRetry: 'شرح را دوباره بخوانید و یک کلیپ تازه بفرستید.',
  /* روی گوشی از انگلیسی دقیقی که سرور ذخیره کرده شناخته می‌شود.
     نام‌ها، عنوان‌ها و دلیل مدیر همان‌طور که نوشته شده می‌مانند. */
  clubPageVerified: 'صفحه‌ی باشگاهتان تأیید شد',
  clubVerificationRejected: 'تأیید باشگاهتان پذیرفته نشد',
  clubVerificationMoreInfo: 'برای تأیید باشگاه به اطلاعات بیشتر نیاز داریم',
  clubInviteAccepted: 'دعوتتان پذیرفته شد',
  guardianApproved: 'والدتان حسابتان را تأیید کرد',
  guardianChanged: 'والدتان آنچه می‌توانید بکنید را عوض کرد',
  guardianNotApproved: 'والدتان درخواستتان را تأیید نکرد',
  guardianWithdrawn: 'تأیید والدتان پس گرفته شد',
  giCompleted: '{{name}} بازی‌های هوش بازی را تمام کرد',
  giCompletedPrivate: 'نتایج خصوصی است، مگر خودشان بخواهند به اشتراک بگذارند.',
  sportFitCompleted: '{{name}} تناسب ورزش را تمام کرد',
  sportFitPrivate: 'جواب‌ها و نتیجه فقط برای خودشان خصوصی است.',
  scoreTierReached: 'به رده‌ی {{tier}} رسیدید',
  scoreTierNow: 'امتیاز استعدادتان حالا {{score}} است.',
  clubInviteRun: 'دعوت شدید در گرداندن {{club}} کمک کنید',
  clubEventCancelled: '{{event}} لغو شد',
  clubEventRegistered: '{{name}} برای {{event}} ثبت‌نام کرد',
  clubEventChildRegistered: 'فرزندتان برای {{event}} ثبت‌نام کرد',
  clubSquadAdded: '{{club}} شما را به ترکیب {{squad}} خود اضافه کرد',
  clubMatchLive: '{{club}} برابر {{opponent}} زنده است',
  meetupWantsToJoin: '{{name}} می‌خواهد به {{meetup}} بپیوندد',
  meetupYouAreIn: 'داخلید: {{meetup}}',
  meetupNotThisTime: 'این بار نه: {{meetup}}',
  meetupCalledOff: '{{meetup}} لغو شد',
  challengeEntered: '{{name}} در {{challenge}} شرکت کرد',
  challengeNewClip: 'یک کلیپ تازه منتظر شماست.',
  /* درخواست، مربیگری، توصیه و حمایت. نام‌ها، عنوان‌ها، یک مهارت و یک دلیل
     همان‌طور که نوشته شده می‌مانند. «یک جلسه» تنها عنوان جلسه‌ای است که
     خود سرور می‌گذارد. */
  appliedTo: '{{name}} برای {{what}} درخواست داد',
  applicationNow: 'درخواست شما برای {{opportunity}} حالا {{status}} است',
  endorsedYouFor: '{{name}} شما را برای {{skill}} توصیه کرد',
  bookedService: '{{name}} {{service}} را رزرو کرد',
  bookingCancelledByGuardian: 'یک سرپرست یک رزرو را لغو کرد',
  coachingCancelledByAce: 'AceAiX یک جلسه‌ی مربیگری را لغو کرد: {{reason}}',
  cancelledSessionOn: '{{name}} جلسه را در {{date}} لغو کرد',
  parentCancelled: 'والدتان {{session}} را لغو کرد',
  childParentCancelled: 'والد {{child}}، {{session}} را لغو کرد',
  cancelledSession: '{{name}} {{session}} را لغو کرد',
  aSession: 'یک جلسه',
  sponsorshipOfferFor: '{{sponsor}} برای {{request}} پیشنهاد حمایت داد',
  sponsorshipOfferToChild: '{{sponsor}} به فرزندتان پیشنهاد حمایت داد',
  anAthlete: 'یک ورزشکار',
  childAppliedToCall: 'فرزندتان برای یک فراخوان حمایت درخواست داد: {{call}}',
  acceptedYourOffer: '{{name}} پیشنهاد حمایت شما را پذیرفت',
  declinedYourOffer: '{{name}} پیشنهاد حمایت شما را رد کرد',
  acceptedYourApplication: '{{name}} درخواست حمایت شما را پذیرفت',
  declinedYourApplication: '{{name}} درخواست حمایت شما را رد کرد',
  childParentAcceptedOffer: 'والد {{child}} پیشنهاد حمایت شما را پذیرفت',
  childParentDeclinedOffer: 'والد {{child}} پیشنهاد حمایت شما را رد کرد',
  childParentWithdrewCall: 'والد {{child}} درخواست برای فراخوان شما را پس گرفت',
  parentAcceptedOfferFrom: 'والدتان پیشنهاد حمایت از {{brand}} را پذیرفت',
  parentDeclinedOfferFrom: 'والدتان پیشنهاد حمایت از {{brand}} را رد کرد',
  parentWithdrewApplication: 'والدتان درخواست شما برای {{brand}} را پس گرفت',
  childOfferAccepted: 'یک پیشنهاد حمایت برای فرزندتان پذیرفته شد',
  childOfferDeclined: 'یک پیشنهاد حمایت برای فرزندتان رد شد',
  childApplicationAccepted: 'یک درخواست حمایت برای فرزندتان پذیرفته شد',
  childApplicationDeclined: 'یک درخواست حمایت برای فرزندتان رد شد',
};
