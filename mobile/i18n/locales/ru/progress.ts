/**
 * Серии и достижения.
 *
 * `streakNoPressure` — ключевая фраза этого файла: она прямо говорит, что
 * пропущенный день не стоит ничего, кроме текущей серии. Никогда не превращайте
 * её в предупреждение.
 */
export const progress = {
  title: 'Достижения',
  subtitle: 'Всё это — за то, что ты действительно сделал.',
  earnedOf: '{{earned}} из {{total}}',
  unlockedOn: 'Получено {{date}}',
  tileEarnedA11y: '{{title}}. Получено {{date}}. {{hint}}',
  tileLockedA11y: '{{title}}. Пока не получено. {{hint}}',

  groupStart: 'Начало',
  groupSeen: 'Тебя замечают',
  groupScore: 'Твой балл',
  groupStreak: 'Ты заходишь',

  rarityCommon: 'Обычное',
  rarityRare: 'Редкое',
  rarityEpic: 'Особое',

  days_one: '{{count}} день',
  days_few: '{{count}} дня',
  days_many: '{{count}} дней',
  days_other: '{{count}} дня',

  streakChipA11y: 'Серия: {{days}}',
  streakChipHint: 'Откроет, что такое серия, и последние семь дней',
  streakSheetTitle: 'Твоя серия',
  streakWhat:
    'Серия считает дни подряд, когда ты открывал AceAiX. И всё — просто заходить. Она не связана с публикациями и никогда не меняет твой Talent Score.',
  streakNoPressure:
    'Пропустишь день — не потеряешь ничего, кроме текущей серии. Самая длинная серия остаётся, балл остаётся, а счёт начнётся заново, когда заглянешь в следующий раз.',
  streakNoneTitle: 'Серии пока нет',
  streakNoneBody:
    'Она начнётся в первый день, когда ты откроешь приложение. Ничего включать не нужно.',

  calendarTitle: 'Последние 7 дней',
  calendarA11y: 'Последние семь дней. Ты был здесь {{count}} из них.',
  streakCurrent: 'Сейчас',
  streakLongest: 'Рекорд',
  streakTotal: 'Дней всего',

  gotIt: 'Понятно',

  nextTierTitle: 'Следующий уровень',
  pointsToNext_one: '{{count}} балл до уровня {{tier}}',
  pointsToNext_few: '{{count}} балла до уровня {{tier}}',
  pointsToNext_many: '{{count}} баллов до уровня {{tier}}',
  pointsToNext_other: '{{count}} балла до уровня {{tier}}',
  tierStartsAt: '{{tier}} начинается с {{score}}',
  tierTopTitle: 'Высший уровень',
  tierTopBody: 'Выше «Элиты» ничего нет. Держи профиль актуальным — и уровень останется твоим.',
  tierTopA11y: 'Уровень «Элита», Talent Score {{score}}. Это высший уровень.',
  scoreNotReadyTitle: 'Talent Score пока нет',
  scoreNotReadyBody: 'Добавь вид спорта и позицию — и балл появится.',

  celebrateAchievementEyebrow: 'Достижение получено',
  celebrateTierEyebrow: 'Новый уровень',
  celebrateStreakEyebrow: 'Серия',
  celebrateTierBody: 'Твой Talent Score достиг {{score}}.',
  celebrateStreakBody: 'Ты продолжаешь заходить. Вот это и есть самое сложное.',
  streakMilestone_one: '{{count}} день подряд',
  streakMilestone_few: '{{count}} дня подряд',
  streakMilestone_many: '{{count}} дней подряд',
  streakMilestone_other: '{{count}} дня подряд',
  andMore_one: 'и ещё {{count}} на твоей стене',
  andMore_few: 'и ещё {{count}} на твоей стене',
  andMore_many: 'и ещё {{count}} на твоей стене',
  andMore_other: 'и ещё {{count}} на твоей стене',
  celebrateNice: 'Отлично',
  celebrateNext: 'Дальше',
  celebrateShare: 'Поделиться',
  shareTierMessage: 'Я вышел на уровень {{tier}} в AceAiX — Talent Score {{score}}.',

  achievements: {
    first_post: {
      title: 'Первый пост',
      hint: 'Ты опубликовал что-то впервые.',
    },
    first_clip: {
      title: 'Первый клип',
      hint: 'Ты добавил первое видео в свои лучшие моменты.',
    },
    three_clips: {
      title: 'Три клипа',
      hint: 'Три видео в лучших моментах. Уже нарезка, которую скаут может посмотреть.',
    },
    first_match: {
      title: 'Первый матч',
      hint: 'Ты записал свой первый матч.',
    },
    ten_matches: {
      title: 'Десять матчей',
      hint: 'Десять матчей в твоей статистике.',
    },
    first_application: {
      title: 'Первая заявка',
      hint: 'Ты подал первую заявку на просмотр или возможность.',
    },
    first_follower: {
      title: 'Первый подписчик',
      hint: 'На тебя подписались.',
    },
    ten_followers: {
      title: 'Десять подписчиков',
      hint: 'На тебя подписаны десять человек.',
    },
    fifty_followers: {
      title: 'Пятьдесят подписчиков',
      hint: 'На тебя подписаны пятьдесят человек.',
    },
    first_endorsement: {
      title: 'Первая рекомендация',
      hint: 'Тренер или клуб поручился за тебя.',
    },
    verified: {
      title: 'Подтверждён',
      hint: 'Твой аккаунт подтверждён, и всем видно, что это правда ты.',
    },
    profile_complete: {
      title: 'Профиль заполнен',
      hint: 'Максимум по профильной части твоего Talent Score.',
    },
    tier_bronze: {
      title: 'Бронза',
      hint: 'Твой Talent Score достиг 40.',
    },
    tier_silver: {
      title: 'Серебро',
      hint: 'Твой Talent Score достиг 55.',
    },
    tier_gold: {
      title: 'Золото',
      hint: 'Твой Talent Score достиг 70.',
    },
    tier_elite: {
      title: 'Элита',
      hint: 'Твой Talent Score достиг 85.',
    },
    streak_3: {
      title: 'Три дня',
      hint: 'Ты открывал AceAiX три дня подряд.',
    },
    streak_7: {
      title: 'Целая неделя',
      hint: 'Ты открывал AceAiX семь дней подряд.',
    },
    streak_30: {
      title: 'Тридцать дней',
      hint: 'Ты открывал AceAiX тридцать дней подряд.',
    },
  },
};
