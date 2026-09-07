/**
 * Профили — свой, чужой, вкладки под ними, списки подписчиков и форма
 * редактирования.
 *
 * Сгруппировано в порядке экранов. Всё, что встречается и в других местах
 * приложения (Подписчики, Посты, Клипы, Матчи, Рекомендации, Подписаться,
 * Написать, Подтверждён), берётся из `common`, а не повторяется здесь.
 *
 * Про хранимые значения: виды спорта, позиции, уровни и ведущая сторона лежат
 * в базе по-английски и переводятся при отрисовке через `constants/sports.ts`.
 * Названия стран хранятся так, как их ввели, поэтому тоже не переводятся —
 * см. PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── Чужой профиль (app/u/[id].tsx) ─────────────────────────────────────────
  title: 'Профиль',
  thisPerson: 'Этот человек',

  notFoundTitle: 'Такой профиль не найден',
  notFoundBody: 'Эта ссылка ни на кого не ведёт в AceAiX.',
  notFoundAction: 'Назад',

  blockedTitle: 'Этот профиль недоступен',
  blockedByYouBody: '{{name}} в твоём чёрном списке. Разблокируй, чтобы снова видеть профиль.',
  blockedBody: 'Этот профиль тебе недоступен.',
  unblockedToast: 'Разблокировано.',

  suspendedTitle: 'Аккаунт недоступен',
  suspendedBody: 'Он приостановлен, пока наша команда его проверяет.',

  // ── Шапка профиля (components/profile/ProfileHeader.tsx) ───────────────────
  openToOffers: 'Открыт к предложениям',
  followersA11y_one: '{{count}} подписчик. Открывает список.',
  followersA11y_few: '{{count}} подписчика. Открывает список.',
  followersA11y_many: '{{count}} подписчиков. Открывает список.',
  followersA11y_other: '{{count}} подписчика. Открывает список.',
  followingA11y_one: '{{count}} подписка. Открывает список.',
  followingA11y_few: '{{count}} подписки. Открывает список.',
  followingA11y_many: '{{count}} подписок. Открывает список.',
  followingA11y_other: '{{count}} подписки. Открывает список.',

  editProfile: 'Редактировать профиль',
  settings: 'Настройки',
  moreOptions: 'Ещё действия',
  messageLimitedHint: 'Для этого аккаунта сообщения ограничены. Нажми, чтобы узнать почему.',

  shareProfile: 'Поделиться профилем',
  /** Ссылка не переводится — только предложение вокруг неё. */
  shareMessage: '{{name}} в AceAiX — {{url}}',

  reportAccount: 'Пожаловаться на аккаунт',
  reportAccountSubtitle: 'Мы разбираем каждую жалобу',
  reportSheetSubtitle: 'Выбери подходящую причину. Никто не узнает, что жалоба от тебя.',
  reportThanks: 'Спасибо. Наша команда это посмотрит.',
  reportReason: {
    childSafety: 'Безопасность детей',
    childSafetyHint: 'Несовершеннолетний в опасности или под прицелом',
    harassment: 'Травля или преследование',
    harassmentHint: 'Оскорбления в чей-то адрес',
    hate: 'Разжигание ненависти',
    hateHint: 'Нападки за то, кем человек является',
    nudity: 'Нагота или сексуальный контент',
    nudityHint: 'Такому здесь не место',
    violence: 'Насилие или угрозы',
    violenceHint: 'Угрозы или шокирующие кадры',
    impersonation: 'Выдаёт себя за другого',
    impersonationHint: 'Фальшивый аккаунт',
    scam: 'Мошенничество или обман',
    scamHint: 'Липовые просмотры, поборы, фальшивые предложения',
    spam: 'Спам',
    spamHint: 'Повторяющиеся или навязчивые посты',
    other: 'Что-то другое',
    otherHint: 'Расскажи своими словами',
  },

  blockPerson: 'Заблокировать {{name}}',
  blockPersonSubtitle: 'Он не сможет тебя найти и написать тебе',
  blockConfirmTitle: 'Заблокировать {{name}}?',
  blockConfirmBody:
    '{{name}} не сможет тебе писать, подписываться на тебя и видеть твои посты. Отменить можно в настройках.',
  blockedToast: '{{name}} больше не видит тебя и не может тебе писать.',

  /** Простой ответ на вопрос «почему я не могу написать этому человеку?». */
  messageBlockTitle: 'Этому аккаунту нельзя написать',
  messageBlockNote:
    'Эти правила защищают юных спортсменов. Их задают сам спортсмен, его родитель или опекун и AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'Этому спортсмену нет 18. Начать с ним переписку могут только проверенные тренеры и клубы.',
    minorRequiresGuardianConsent:
      'Родитель или опекун этого спортсмена пока не разрешил сообщения.',
    recipientMessagesOff: 'Этот человек выключил сообщения.',
    recipientOnlyAcceptsFollowed:
      'Этот человек принимает сообщения только от тех, на кого подписан.',
    recipientOnlyAcceptsVerified:
      'Этот человек принимает сообщения только от проверенных аккаунтов.',
    notPermitted: 'Начать переписку с этим аккаунтом сейчас нельзя.',
    notFound: 'Не удалось найти этот аккаунт.',
  },
  gotIt: 'Понятно',

  // ── Строка статистики (components/profile/StatRow.tsx) ─────────────────────
  statA11y: '{{value}} {{label}}',

  // ── Вкладки (components/profile/ProfileTabs.tsx) ───────────────────────────
  tabHighlights: 'Хайлайты',
  tabCareer: 'Карьера',

  // ── Вкладка постов (components/profile/PostsTab.tsx) ───────────────────────
  postsEmptyTitleSelf: 'Постов пока нет',
  postsEmptyTitleOther: 'Пока ничего не опубликовано',
  postsEmptyBodySelf:
    'Выложи тренировку, результат или клип. Активные профили смотрят чаще.',
  postsEmptyBodyOther: 'Когда здесь появится пост, он будет виден тут.',
  postsEmptyAction: 'Написать пост',

  // ── Сетка медиа (components/profile/MediaGrid.tsx) ─────────────────────────
  addHighlight: 'Добавить хайлайт',
  videoClipA11y: 'Видеоклип',
  photoA11y: 'Фото',

  // ── Вкладка хайлайтов (components/profile/HighlightsTab.tsx) ───────────────
  photoPermission: 'AceAiX нужен доступ к твоим фото.',

  noHighlightsTitle: 'Здесь нет хайлайтов',
  noHighlightsBody: 'Хайлайты бывают только в профиле спортсмена.',
  clipsEmptyTitleSelf: 'Тренер сначала смотрит, потом читает.',
  clipsEmptyTitleOther: 'Клипов пока нет',
  clipsEmptyBodySelf: 'Добавь первый клип. Три коротких — самое то.',
  clipsEmptyBodyOther: 'Когда появится клип, он будет здесь.',
  clipsEmptyAction: 'Добавить первый клип',

  nameClipTitle: 'Назови клип',
  nameClipSubtitle: 'Короткое название подскажет тренеру, что он смотрит.',
  clipTitleLabel: 'Название',
  clipTitlePlaceholderVideo: 'например: гол левой в матче с Аль-Васль',
  clipTitlePlaceholderPhoto: 'например: финал кубка',
  addToProfile: 'Добавить в профиль',
  clipAddedToast: 'Добавлено. Тренеры уже могут это посмотреть.',
  clipRemovedToast: 'Убрано.',

  holdToRemoveClip: 'Нажми и удерживай клип, чтобы убрать его.',
  removeClipTitle: 'Убрать этот клип?',
  removeClipBody: 'Он пропадёт из профиля. Оценка таланта может снизиться.',
  mediaLoadFailed: 'Не удалось загрузить файл. Попробуй чуть позже.',

  // ── Вкладка карьеры (components/profile/CareerTab.tsx) ─────────────────────
  noCareerTitle: 'Карьеры нет',
  noCareerBody: 'Этот раздел только для профилей спортсменов.',
  add: 'Добавить',

  matchesEmptyTitleSelf: 'Матчи не записаны',
  matchesEmptyTitleOther: 'Матчей пока нет',
  matchesEmptyBodySelf: 'Запиши последние 12 месяцев — тренер увидит твою нынешнюю форму.',
  matchesEmptyBodyOther: 'Здесь пока ничего не записано.',
  matchFallback: 'Матч',
  matchVersus: 'против {{opponent}}',
  matchMinutes: '{{n}} мин',
  matchGoals_one: '{{count}} гол',
  matchGoals_few: '{{count}} гола',
  matchGoals_many: '{{count}} голов',
  matchGoals_other: '{{count}} гола',
  matchAssists_one: '{{count}} ассист',
  matchAssists_few: '{{count}} ассиста',
  matchAssists_many: '{{count}} ассистов',
  matchAssists_other: '{{count}} ассиста',

  honoursTitle: 'Награды',
  honoursEmptyTitleSelf: 'Наград пока нет',
  honoursEmptyTitleOther: 'Награды не указаны',
  honoursEmptyBodySelf: 'Титулы в лиге, кубки, игрок сезона — считается любая победа.',

  certificatesTitle: 'Сертификаты',
  certificatesEmptyTitleSelf: 'Сертификатов пока нет',
  certificatesEmptyTitleOther: 'Сертификаты не указаны',
  certificatesEmptyBodySelf:
    'Тренерские лицензии, первая помощь, детская безопасность, языковые сертификаты.',

  endorsementsTitle: 'Рекомендации',
  endorsementsEmptyTitle: 'Рекомендаций пока нет',
  endorsementsEmptyBodySelf:
    'Попроси тренера, который знает твою игру. Рекомендация от проверенного тренера весит много.',

  logMatchTitle: 'Записать матч',
  logMatchSubtitle: 'Только то, что помнишь, — остальное добавишь позже.',
  matchDate: 'Дата',
  matchDateHint: 'Год-месяц-день',
  matchCompetition: 'Турнир',
  matchCompetitionPlaceholder: 'Лига U16',
  matchOpponent: 'Соперник',
  matchOpponentPlaceholder: 'Аль-Наср',
  matchResult: 'Результат',
  matchResultPlaceholder: 'Победа 3:1',
  matchMinutesLabel: 'Минуты',
  matchGoalsLabel: 'Голы',
  matchAssistsLabel: 'Ассисты',
  saveMatch: 'Сохранить матч',
  matchDateInvalid: 'Используй формат даты ГГГГ-ММ-ДД, например 2026-03-14.',
  matchAddedToast: 'Матч добавлен.',

  addHonourTitle: 'Добавить награду',
  honourTitleLabel: 'Что за награда?',
  honourTitlePlaceholder: 'Победа в лиге U16',
  honourOrgLabel: 'Кто вручил',
  honourOrgPlaceholder: 'Молодёжная лига Дубая',
  honourYearLabel: 'Год',
  saveHonour: 'Сохранить награду',
  honourTitleRequired: 'Дай награде название.',
  honourAddedToast: 'Награда добавлена.',

  addCertificateTitle: 'Добавить сертификат',
  certificateTitleLabel: 'Сертификат',
  certificateTitlePlaceholder: 'Первая помощь',
  certificateIssuerLabel: 'Кем выдан',
  certificateIssuerPlaceholder: 'Красный Полумесяц',
  certificateYearLabel: 'Год',
  saveCertificate: 'Сохранить сертификат',
  certificateTitleRequired: 'Дай сертификату название.',
  certificateAddedToast: 'Сертификат добавлен.',

  // ── Список людей (components/profile/PeopleList.tsx) ───────────────────────
  searchThisList: 'Поиск по списку',
  noMatchTitle: 'Никто не подходит',
  noMatchBody: 'Попробуй другое имя.',
  openProfileA11y: 'Открыть профиль: {{name}}',

  // ── Подписчики и подписки (app/u/[id]/…) ───────────────────────────────────
  followersEmptyTitle: 'Подписчиков пока нет',
  followersEmptyBodySelf: 'Выложи клип или новость. Подписываются на тех, кого видно.',
  followersEmptyBodyOther: 'На этот аккаунт пока никто не подписан.',
  followingEmptyTitleSelf: 'У тебя пока нет подписок',
  followingEmptyTitleOther: 'Подписок пока нет',
  followingEmptyBodySelf: 'Подпишись на клубы, тренеров и спортсменов, чтобы наполнить ленту.',
  followingEmptyBodyOther: 'Этот аккаунт пока ни на кого не подписан.',

  // ── Редактирование профиля (app/edit-profile.tsx) ──────────────────────────
  /* `editProfile` выше — и заголовок этого экрана, и кнопка, которая его открывает. */
  firstNameRequired: 'Имя не может быть пустым.',
  savedScoreUp_one: 'Сохранено — оценка таланта выросла на {{count}} балл.',
  savedScoreUp_few: 'Сохранено — оценка таланта выросла на {{count}} балла.',
  savedScoreUp_many: 'Сохранено — оценка таланта выросла на {{count}} баллов.',
  savedScoreUp_other: 'Сохранено — оценка таланта выросла на {{count}} балла.',
  savedScoreDown_one: 'Сохранено — оценка таланта снизилась на {{count}} балл.',
  savedScoreDown_few: 'Сохранено — оценка таланта снизилась на {{count}} балла.',
  savedScoreDown_many: 'Сохранено — оценка таланта снизилась на {{count}} баллов.',
  savedScoreDown_other: 'Сохранено — оценка таланта снизилась на {{count}} балла.',

  sectionYou: 'О тебе',
  changePhotoA11y: 'Сменить фото профиля',
  uploadingPhoto: 'Загрузка…',
  tapToChangePhoto: 'Нажми, чтобы сменить фото',
  addCover: 'Добавить обложку',
  changeCover: 'Сменить обложку',
  uploadingCover: 'Загрузка обложки…',
  removeCover: 'Убрать обложку',
  changeCoverA11y: 'Сменить обложку профиля',
  viewPhotoA11y: 'Посмотреть фото {{name}}',
  firstName: 'Имя',
  lastName: 'Фамилия',
  bio: 'О себе',
  bioPlaceholder: 'На какой позиции играешь и над чем сейчас работаешь?',
  bioCounter: '{{n}} / {{max}}',
  city: 'Город',
  cityPlaceholder: 'Дубай',
  country: 'Страна',
  countryPlaceholder: 'Выбери страну',
  countryA11y: 'Страна. Сейчас: {{value}}. Открывает выбор.',
  notSet: 'не указано',

  sectionSport: 'Твой спорт',
  sport: 'Вид спорта',
  sportPlaceholder: 'Выбери вид спорта',
  sportA11y: 'Вид спорта. Сейчас: {{value}}. Открывает выбор.',
  position: 'Позиция',
  level: 'Уровень',
  levelHintDefault: 'Выбери уровень, на котором играешь сейчас.',
  league: 'Лига или турнир',
  leaguePlaceholder: 'Молодёжная лига Дубая',
  club: 'Текущий клуб',
  clubPlaceholder: 'Академия Аль-Наср',
  clubHint: 'Привязанный клуб добавляет очков достоверности.',

  sectionPhysical: 'Физические данные',
  height: 'Рост',
  heightUnit: 'см',
  weight: 'Вес',
  weightUnit: 'кг',
  dominantSide: 'Ведущая сторона',

  sectionAvailability: 'Доступность',
  openToOffersHint: 'Тренеры видят это в твоём профиле.',

  chooseSportTitle: 'Выбери вид спорта',
  /** Эмодзи не переводится — только порядок значка и названия. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: 'Где ты живёшь?',
  searchCountries: 'Поиск по странам',
  useTypedCountry: 'Использовать «{{country}}»',
  useTypedCountryHint: 'Нет в списке? Добавь свой вариант.',
  countryTypeToAdd: 'Начни печатать, чтобы добавить свою страну.',

  // ── Карточка игрока ────────────────────────────────────────────────────────
  playerCard: 'Карточка игрока',
  playerCardHint: 'Карточка, которую можно сохранить и выложить.',
  playerCardBody: 'Всё, на что скаут смотрит в первую очередь, в одной картинке.',
  playerCardSaved: 'Сохранено.',
  playerCardShared: 'Карточка готова к отправке.',
  playerCardFailed: 'Не получилось собрать карточку. Попробуй ещё раз через минуту.',
  playerCardShare: 'Поделиться',
  playerCardSave: 'Сохранить изображение',
};
