/**
 * الفرق التي يشجّعها الشخص.
 *
 * تمييز واحد يجب أن ينجو من الترجمة: هذا تشجيع، لا انتماء وظيفي أبدًا.
 * «فرقك» تعني القمصان التي تملكها؛ أما المكان الذي يلعب فيه اللاعب فهو
 * «النادي الحالي» في `onboarding` و`profile`، والمترجم الذي يدمج الاثنين
 * يحوّل حقيقة أمام الكشّاف إلى مجرّد تفضيل.
 */
export const teams = {
  // ── خطوة التسجيل ───────────────────────────────────────────────────────────
  stepTitle: 'من تشجّع؟',
  stepBody: 'اختر حتى خمسة. لا علاقة لهذا بالمكان الذي تلعب فيه — هذا القميص الذي تملكه فقط.',
  stepSkip: 'تخطّي الآن',

  venueTitle: 'الملعب المفضّل',
  venueBody: 'ملعب تذهب إليه غدًا لو ناولك أحدهم تذكرة.',
  venuePlaceholder: 'سانتياغو برنابيو، آزادي، أولد ترافورد…',

  // ── قائمة الاختيار ─────────────────────────────────────────────────────────
  searchPlaceholder: 'ابحث في الأندية والمنتخبات',
  popular: 'الأكثر تشجيعًا الآن',
  selected_zero: '{{count}} فريق مختار',
  selected_one: '{{count}} فريق مختار',
  selected_two: '{{count}} فريقان مختاران',
  selected_few: '{{count}} فرق مختارة',
  selected_many: '{{count}} فريقًا مختارًا',
  selected_other: '{{count}} فريق مختار',
  maxReached: 'خمسة هي الحد — أزل واحدًا لتضيف آخر.',
  noResults: 'لا شيء يطابق “{{query}}”.',
  addCustom: 'أضف “{{name}}”',
  addCustomHint: 'لن يراه غيرك إلى أن نتحقّق منه.',
  addedCustom: 'أُضيف. هو على ملفك الآن.',
  followersCount_zero: '{{count}} مشجّع هنا',
  followersCount_one: '{{count}} مشجّع هنا',
  followersCount_two: '{{count}} مشجّعان هنا',
  followersCount_few: '{{count}} مشجّعين هنا',
  followersCount_many: '{{count}} مشجّعًا هنا',
  followersCount_other: '{{count}} مشجّع هنا',

  // ── على الملف الشخصي ───────────────────────────────────────────────────────
  supportsTitle: 'يشجّع',
  venueLabel: 'الملعب المفضّل',
  emptySelf: 'أضف الفرق التي تشجّعها — هي أسرع طريقة تجد بها من يشبهك.',
  emptyOther: 'لا فرق بعد.',
  editAction: 'تعديل الفرق',
  savedToast: 'تم تحديث الفرق.',

  // ── صفحة الفريق ────────────────────────────────────────────────────────────
  fansTitle: 'المشجّعون على AceAiX',
  fansEmpty: 'لا أحد هنا يشجّعهم بعد. ستكون الأول.',
  fansLoadMore: 'المزيد',
  alsoSupports: 'يشجّع أيضًا {{team}}',
  sharedTeams_zero: 'كلاكما يشجّع {{teams}}',
  sharedTeams_one: 'كلاكما يشجّع {{teams}}',
  sharedTeams_two: 'كلاكما يشجّع {{teams}}',
  sharedTeams_few: 'كلاكما يشجّع {{teams}}',
  sharedTeams_many: 'كلاكما يشجّع {{teams}}',
  sharedTeams_other: 'كلاكما يشجّع {{teams}}',
};
