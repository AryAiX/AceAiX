/**
 * الصفحة الرئيسية، ومحرّر المنشور، والمنشور الواحد.
 *
 * مرتّبة بترتيب لقاء المستخدم بها: الرئيسية، ثم البطاقة وإجراءاتها، ثم
 * التعليقات، ثم قائمة الأمان خلف كل «…»، ثم المحرّر، وشاشة المنشور الواحد،
 * وأخيرًا شاشة الرابط المعطّل.
 *
 * أسباب الإبلاغ تظهر هنا كعناوين فقط — أما القيم المرسلة إلى جدول الإشراف
 * فثوابت إنجليزية داخل المكوّن ولا تُترجَم أبدًا.
 */
export const feed = {
  // ── الرئيسية ──────────────────────────────────────────────────────────────
  scopeForYou: 'لك',
  scopeFollowing: 'من تتابعهم',

  messages: 'الرسائل',
  messagesUnread_zero: 'الرسائل، لا رسائل غير مقروءة',
  messagesUnread_one: 'الرسائل، رسالة واحدة غير مقروءة',
  messagesUnread_two: 'الرسائل، رسالتان غير مقروءتين',
  messagesUnread_few: 'الرسائل، {{count}} رسائل غير مقروءة',
  messagesUnread_many: 'الرسائل، {{count}} رسالة غير مقروءة',
  messagesUnread_other: 'الرسائل، {{count}} رسالة غير مقروءة',
  notifications: 'الإشعارات',
  notificationsNew_zero: 'الإشعارات، لا شيء جديد',
  notificationsNew_one: 'الإشعارات، إشعار جديد واحد',
  notificationsNew_two: 'الإشعارات، إشعاران جديدان',
  notificationsNew_few: 'الإشعارات، {{count}} إشعارات جديدة',
  notificationsNew_many: 'الإشعارات، {{count}} إشعارًا جديدًا',
  notificationsNew_other: 'الإشعارات، {{count}} إشعار جديد',

  emptyFollowingTitle: 'لا شيء من متابَعيك بعد',
  emptyFollowingBody:
    'تابع اللاعبين والمدرّبين والأندية الذين يهمّونك، وستظهر منشوراتهم هنا.',
  emptyFollowingAction: 'ابحث عمّن تتابعه',
  emptyForYouTitle: 'صفحتك تستعد',
  emptyForYouBody:
    'تابع بعض اللاعبين لتمتلئ، أو انشر تحديثًا خاصًا بك للبداية.',
  emptyForYouAction: 'ابحث عن أشخاص',

  // ── بطاقة المنشور ─────────────────────────────────────────────────────────
  openProfileOf: 'فتح ملف {{name}}',
  postMoreOptions: 'خيارات أخرى لمنشور {{name}}، منها الإبلاغ والحظر',
  showFullCaption: 'عرض النص كاملًا',
  openPost: 'فتح المنشور',

  // ── إعجاب، تعليق، مشاركة، حفظ ─────────────────────────────────────────────
  likePost: 'الإعجاب بهذا المنشور',
  unlikePost: 'إلغاء الإعجاب بهذا المنشور',
  readAndAddComments: 'قراءة التعليقات وإضافة تعليق',
  sharePost: 'مشاركة هذا المنشور',
  savePost: 'حفظ هذا المنشور',
  removeFromSaved: 'إزالة من المحفوظات',

  // ── الوسائط ───────────────────────────────────────────────────────────────
  mediaSwipe_zero: 'لا عناصر',
  mediaSwipe_one: 'عنصر واحد، اسحب لرؤية المزيد',
  mediaSwipe_two: 'عنصران، اسحب لرؤية المزيد',
  mediaSwipe_few: '{{count}} عناصر، اسحب لرؤية المزيد',
  mediaSwipe_many: '{{count}} عنصرًا، اسحب لرؤية المزيد',
  mediaSwipe_other: '{{count}} عنصر، اسحب لرؤية المزيد',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'مقطع فيديو',
  soundOn: 'تشغيل الصوت',
  soundOff: 'كتم الصوت',

  // ── التعليقات ─────────────────────────────────────────────────────────────
  commentsTitle: 'التعليقات',
  commentsHeading_zero: 'التعليقات ({{count}})',
  commentsHeading_one: 'التعليقات ({{count}})',
  commentsHeading_two: 'التعليقات ({{count}})',
  commentsHeading_few: 'التعليقات ({{count}})',
  commentsHeading_many: 'التعليقات ({{count}})',
  commentsHeading_other: 'التعليقات ({{count}})',
  noCommentsTitle: 'لا تعليقات بعد',
  noCommentsBody: 'قل شيئًا مشجّعًا.',
  reply: 'رد',
  replyTo: 'الرد على {{name}}',
  replyingTo: 'ترد على {{name}}',
  stopReplying: 'إيقاف الرد',
  commentPlaceholder: 'أضف تعليقًا…',
  writeComment: 'اكتب تعليقًا',
  postComment: 'نشر التعليق',
  ownCommentOptions: 'خيارات تعليقك',
  reportOrBlockPerson: 'الإبلاغ عن {{name}} أو حظره',

  // ── قائمة الأمان ──────────────────────────────────────────────────────────
  thisPerson: 'هذا الشخص',
  actionsOwnPost: 'منشورك',
  actionsOwnComment: 'تعليقك',
  actionsPost: 'هذا المنشور',
  actionsComment: 'هذا التعليق',
  linkCopied: 'نُسخ الرابط',
  linkCopyFailed: 'لم نتمكن من نسخ الرابط.',
  deletePost: 'حذف المنشور',
  deleteComment: 'حذف التعليق',
  reportPost: 'الإبلاغ عن المنشور',
  reportComment: 'الإبلاغ عن التعليق',
  reportHint: 'أخبرنا بما فيه من خطأ. البلاغات سرّية.',
  blockPerson: 'حظر {{name}}',
  blockHint: 'لن يستطيع إيجادك ولا مراسلتك.',

  reportThisPost: 'الإبلاغ عن هذا المنشور',
  reportThisComment: 'الإبلاغ عن هذا التعليق',
  reportReasonPrompt: 'اختر أقرب سبب. لا نخبرهم أبدًا بمن أبلغ.',
  reasonSpam: 'رسائل مزعجة',
  reasonHarassment: 'تحرّش أو تنمّر',
  reasonNudity: 'عُري أو محتوى جنسي',
  reasonViolence: 'عنف',
  reasonHate: 'خطاب كراهية',
  reasonImpersonation: 'انتحال شخصية',
  reasonChildSafety: 'سلامة الأطفال',
  reasonScam: 'احتيال',
  reasonOther: 'شيء آخر',
  reportDetailsLabel: 'هل من شيء آخر يجب أن نعرفه؟',
  reportEmergencyNote:
    'إن كان أحد في خطر الآن، تواصل مع خدمات الطوارئ المحلية أيضًا.',
  reportThanks: 'شكرًا لإخبارنا. سيطّلع فريقنا على الأمر.',

  blockConfirmTitle: 'حظر {{name}}؟',
  blockConfirmBody:
    'لن يرى ملفك ولا منشوراتك، ولن يستطيع مراسلتك، ولن تراه أنت. يمكنك التراجع من الإعدادات.',
  blockedToast: 'تم حظر {{name}}. يمكنك التراجع من الإعدادات.',

  deletePostConfirmTitle: 'حذف هذا المنشور؟',
  deleteCommentConfirmTitle: 'حذف هذا التعليق؟',
  deleteConfirmBody: 'لا يمكن التراجع عن هذا.',
  keepIt: 'الإبقاء عليه',
  postDeleted: 'حُذف المنشور',
  commentDeleted: 'حُذف التعليق',

  // ── محرّر المنشور ─────────────────────────────────────────────────────────
  composeTitle: 'منشور جديد',
  cancelAndClose: 'إلغاء وإغلاق',
  postButton: 'نشر',
  uploading: 'جارٍ الرفع {{done}} من {{total}}…',
  audienceA11y: 'من يرى هذا: {{audience}}. تغييره.',
  composePlaceholder: 'شارك تحديثًا أو نتيجة أو لقطة…',
  composeA11y: 'ما الذي تريد مشاركته؟',
  charCount: '{{used}}/{{max}}',
  clip: 'لقطة',
  selectedPhoto: 'الصورة المختارة {{index}}',
  selectedVideo: 'الفيديو المختار {{index}}',
  removePhoto: 'إزالة الصورة {{index}}',
  removeVideo: 'إزالة الفيديو {{index}}',
  addMedia: 'إضافة صورة أو فيديو',
  addMediaA11y: 'إضافة صورة أو فيديو',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'يحتاج AceAiX إلى إذن لفتح صورك. فعّله من الإعدادات.',
  posted: 'نُشر',
  /* مكتوب لابن الثالثة عشرة: قصير وواضح والأمثلة الثلاثة كلها موجودة. */
  safetyNote: 'كن لطيفًا. لا تشارك عنوانك ولا رقم هاتفك ولا مدرستك.',

  audienceSheetTitle: 'من يرى هذا؟',
  audienceEveryone: 'الجميع',
  audienceEveryoneDetail: 'يراه أي شخص على AceAiX.',
  audienceFollowersDetail: 'من يتابعونك فقط.',
  audienceConnections: 'المتصلون',
  audienceConnectionsDetail: 'من تتابعهم ويتابعونك فقط.',

  discardTitle: 'تجاهل هذا المنشور؟',
  discardBody: 'لن يُحفَظ ما كتبته ولا ما اخترته.',
  discard: 'تجاهل',
  keepWriting: 'متابعة الكتابة',

  // ── منشور واحد ────────────────────────────────────────────────────────────
  postTitle: 'منشور',
  postUnavailableTitle: 'لم يعد هذا المنشور متاحًا',
  postUnavailableBody: 'ربما حُذف أو أُزيل.',
  postUnavailableBodyRules:
    'ربما حُذف، أو أُزيل لمخالفته قواعدنا.',
  goBack: 'رجوع',

  // ── رابط معطّل ────────────────────────────────────────────────────────────
  notFoundTitle: 'هذه الصفحة لم تعد هنا',
  notFoundBody: 'الرابط الذي فتحته لا يؤدي إلى شيء في AceAiX.',
  notFoundAction: 'العودة إلى الرئيسية',
};
