/**
 * Meetups — arranging to actually play with people. Arabic.
 *
 * Arabic runs right to left and the app sets direction itself. Never put
 * directional marks (U+200E, U+200F, RLE/PDF) or hand-reordered punctuation
 * into these strings: write the sentence plainly and let the layout turn it.
 *
 * Two words carry weight through translation and must not be collapsed:
 *
 *   * a **spot** is a place in the game, a person. Here it is `مكان`, and in
 *     this file `مكان` is never anything else. Geography has its own words:
 *     `الملعب` for the venue, `المنطقة` for the area, `المدينة` for the city.
 *   * **host** is `المنظّم` — whoever organised this one game and decides
 *     who comes. Never `مدرّب` (coach) or `قائد` (captain): the word must
 *     carry no authority past the last whistle.
 *
 * Plurals are `_one` and `_other` only, matching the English keys. Arabic has
 * six categories, but the runtime falls back to `_other`, so `_other` is
 * written for the counts a casual game actually shows — three to nine.
 *
 * Second person singular, the same voice as the rest of the Arabic catalogue.
 *
 * Everyone reading these strings is eighteen or over — the database enforces
 * it and the tab is hidden otherwise — so nothing here explains that.
 */
export const meetups = {
  // ── التبويب ────────────────────────────────────────────────────────────────
  title: 'اللعب',
  subtitle: 'اعثر على من تلعب معه، أينما كنت',

  // ── البحث ──────────────────────────────────────────────────────────────────
  searchPlace: 'أين؟ المدينة أو المنطقة أو الملعب',
  searchPlaceHint: 'حيث أنت الآن، أو حيث أنت ذاهب',
  anySport: 'أي رياضة',
  anyLevel: 'أي مستوى',
  anyDate: 'أي تاريخ',
  today: 'اليوم',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  filters: 'تصفية',
  clearFilters: 'مسح',

  emptyTitle: 'لا شيء هنا بعد',
  emptyBody: 'لم ينشر أحد مباراة هنا في هذا الوقت. كن الأول — غالبًا هناك من يبحث مثلك.',
  emptyAction: 'انشر مباراة',
  emptySearchTitle: 'لا شيء يطابق',
  emptySearchBody: 'جرّب مدى تواريخ أوسع، أو منطقة قريبة.',

  // ── البطاقة ────────────────────────────────────────────────────────────────
  spotsLeft_zero: 'لم تبق أماكن',
  spotsLeft_one: 'بقي مكان واحد',
  spotsLeft_two: 'بقي مكانان',
  spotsLeft_few: 'بقيت {{count}} أماكن',
  spotsLeft_many: 'بقي {{count}} مكانًا',
  spotsLeft_other: 'بقي {{count}} مكان',
  spotsOf: '{{taken}} من {{total}}',
  full: 'مكتمل',
  cancelled: 'ملغاة',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'المنظّم',
  hostedBy: 'نظّمها {{name}}',
  costEach: '{{cost}} للفرد',

  levelAny: 'أي مستوى',
  levelBeginner: 'مبتدئ',
  levelIntermediate: 'متوسّط',
  levelAdvanced: 'متقدّم',
  levelCompetitive: 'تنافسي',

  // ── نشر مباراة ─────────────────────────────────────────────────────────────
  createTitle: 'انشر مباراة',
  createSubtitle: 'قل ما تريد أن تلعبه، وأين، ومتى. الناس يطلبون الانضمام، والقرار لك.',
  fieldSport: 'الرياضة',
  fieldTitle: 'ما هي؟',
  fieldTitlePlaceholder: 'خماسي السبت',
  fieldCountry: 'الدولة',
  fieldCity: 'المدينة',
  fieldArea: 'المنطقة',
  fieldAreaPlaceholder: 'الجدّاف، المارينا، بويرتو بانوس…',
  fieldVenue: 'الملعب',
  fieldVenuePlaceholder: 'الملعب أو الصالة أو النادي',
  fieldWhen: 'متى',
  fieldEnds: 'حتى',
  fieldSpots: 'كم لاعبًا، بمن فيهم أنت؟',
  fieldSpotsHint: 'اثنان إن أردت شريكًا تلعب معه. عشرة لمباراة خماسية.',
  fieldLevel: 'المستوى',
  fieldNote: 'شيء آخر؟',
  fieldNotePlaceholder: 'أحضر حذاءك. عادةً نشرب قهوة بعدها.',
  fieldCost: 'التكلفة للفرد',
  fieldCostPlaceholder: '25 درهمًا، أو مجانًا',
  post: 'انشرها',
  posted: 'نُشرت. يستطيع الناس أن يجدوها الآن.',

  // ── الانضمام ───────────────────────────────────────────────────────────────
  askToJoin: 'اطلب الانضمام',
  askMessage: 'قل شيئًا للمنظّم',
  askMessagePlaceholder: 'ألعب ظهيرًا أيسر وأعرف الملعب.',
  requested: 'طلبت — بانتظار المنظّم',
  joined: 'أنت في المباراة',
  declined: 'ليس هذه المرّة',
  askSent: 'أُرسل. المنظّم سيردّ عليك.',
  youAreHosting: 'أنت من ينظّمها',
  leave: 'غادر هذه المباراة',
  leaveConfirmTitle: 'تغادر هذه المباراة؟',
  leaveConfirmBody: 'يعود مكانك متاحًا للآخرين، ويُبلَّغ المنظّم.',
  left: 'غادرت. مكانك صار متاحًا من جديد.',

  // ── التنظيم ────────────────────────────────────────────────────────────────
  requests: 'الطلبات',
  requests_zero: 'لا طلبات',
  requests_one: 'طلب واحد',
  requests_two: 'طلبان',
  requests_few: '{{count}} طلبات',
  requests_many: '{{count}} طلبًا',
  requests_other: '{{count}} طلب',
  noRequests: 'لم يطلب أحد بعد.',
  accept: 'قبول',
  decline: 'رفض',
  accepted: '{{name}} في المباراة.',
  declinedToast: 'رُفض.',
  going: 'القادمون',
  cancel: 'ألغِ هذه المباراة',
  cancelConfirmTitle: 'تلغي هذه المباراة؟',
  cancelConfirmBody: 'سيُبلَّغ كل من ينوي الحضور. ولا رجوع عن هذا.',
  cancelled_toast: 'أُلغيت. أُبلِغ كل من كان قادمًا.',

  // ── مبارياتي ───────────────────────────────────────────────────────────────
  mine: 'مبارياتي',
  minePast: 'السابقة',
  mineEmptyTitle: 'لا شيء قادم',
  mineEmptyBody: 'المباريات التي تنشرها أو تنضمّ إليها تظهر هنا.',

  // ── إمكانية الوصول ─────────────────────────────────────────────────────────
  a11yCard: '{{title}} في {{city}}، {{spots}}',
  a11yAccept: 'قبول {{name}}',
  a11yDecline: 'رفض {{name}}',
};
