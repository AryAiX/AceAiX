/**
 * Дерево настроек — все экраны из `app/settings/`, части, из которых они
 * собраны, и оболочка вокруг четырёх правовых документов.
 *
 * Всё про жалобы, блокировки, родителей и защиту тех, кому нет 18, живёт в
 * `safety.ts`, чтобы этот текст можно было проверить отдельно. Общий словарь
 * (Сохранить, Отмена, Подтверждён, Разблокировать, Оценка таланта, названия
 * четырёх документов) берётся из `common.ts` и здесь не повторяется.
 *
 * Про хранимые значения: виды спорта, позиции, уровни и страны, которые
 * выбирает скаут, хранятся по-английски и переводятся при отрисовке через
 * `constants/sports.ts`. В этом файле только подписи вокруг них.
 */
export const settings = {
  // ── Главная настроек (app/settings/index.tsx) ──────────────────────────────
  title: 'Настройки',

  sectionAccount: 'Аккаунт',
  accountTitle: 'Аккаунт',
  accountSubtitle: 'Почта, пароль, проверка',
  appearanceTitle: 'Оформление',
  appearanceSubtitle: 'Светлое, тёмное или как на телефоне',
  notificationsTitle: 'Уведомления',
  notificationsSubtitle: 'Выбери, что до тебя доходит',

  sectionPrivacySafety: 'Приватность и безопасность',
  privacyTitle: 'Приватность',
  privacySubtitle: 'Кто может тебе писать и находить тебя',

  sectionScouting: 'Скаутинг',
  scoutingFooter: 'По этому мы решаем, кто окажется первым в поиске.',
  scoutingTitle: 'Кого ты ищешь',
  scoutingSubtitle: 'Виды спорта, позиции, уровни и возраст',

  sectionAbout: 'О приложении',
  supportTitle: 'Написать в поддержку',
  supportFallback: 'Напиши нам на {{email}}',
  versionTitle: 'Версия',

  signOut: 'Выйти',
  signOutConfirmTitle: 'Выйти?',
  signOutConfirmBody: 'Чтобы вернуться, понадобятся почта и пароль.',

  /** «AceAiX by AryAiX» — оба названия бренды и подставляются как есть. */
  productBy: '{{product}} от {{company}}',

  // ── Аккаунт (app/settings/account.tsx) ─────────────────────────────────────
  sectionSignIn: 'Вход',
  signInFooter:
    'По этой почте ты входишь, и на неё же мы пишем об аккаунте. Чтобы её сменить, напиши на {{email}}.',
  emailLabel: 'Почта',
  notSignedIn: 'Вход не выполнен',

  sectionVerification: 'Проверка',
  verificationTitle: 'Проверка',
  requestVerification: 'Запросить проверку',
  verificationCheckedSubtitle: 'Твой аккаунт проверен',
  verificationAskSubtitle: 'Попроси нас проверить аккаунт',
  verificationInReview: 'На рассмотрении',
  verificationSentOn: 'Отправлено {{date}}',
  verificationApproved: 'Одобрено',
  verificationApprovedSubtitle: 'Значок уже в пути',
  verificationRejected: 'Не одобрено',
  verificationRejectedSubtitle: 'Можно отправить новый запрос',
  verificationRequestSent: 'Запрос отправлен. Скоро посмотрим.',

  sectionYourData: 'Твои данные',
  dataFooter:
    'Файл в формате JSON: профиль, посты, комментарии, подписки, отклики и медиа — ровно так, как они у нас хранятся.',
  downloadMyData: 'Скачать мои данные',
  downloadSubtitle: 'Получить копию всего, что есть в аккаунте',
  preparingFile: 'Готовим файл…',
  preparingShort: 'Готовим…',
  exportSaved: 'Сохранено: {{name}}',

  // Смена пароля
  changePassword: 'Сменить пароль',
  changePasswordSubtitle: 'На этом устройстве ты останешься в аккаунте.',
  currentPassword: 'Текущий пароль',
  currentPasswordPlaceholder: 'Пароль, который сейчас',
  newPassword: 'Новый пароль',
  newPasswordHint_one: 'Минимум {{count}} символ.',
  newPasswordHint_few: 'Минимум {{count}} символа.',
  newPasswordHint_many: 'Минимум {{count}} символов.',
  newPasswordHint_other: 'Минимум {{count}} символа.',
  newPasswordPlaceholder: 'То, что знаешь только ты',
  confirmNewPassword: 'Подтверди новый пароль',
  confirmNewPasswordPlaceholder: 'Введи ещё раз',
  passwordTooShort_one: 'Выбери пароль не короче {{count}} символа.',
  passwordTooShort_few: 'Выбери пароль не короче {{count}} символов.',
  passwordTooShort_many: 'Выбери пароль не короче {{count}} символов.',
  passwordTooShort_other: 'Выбери пароль не короче {{count}} символа.',
  passwordsDoNotMatch: 'Эти два пароля не совпадают.',
  passwordUnchanged: 'Это тот же пароль, что и сейчас.',
  passwordCurrentWrong: 'Текущий пароль указан неверно.',
  passwordChanged: 'Пароль изменён.',
  passwordPhishingNote:
    'Мы никогда не спрашиваем пароль по почте или в сообщении. Если кто-то спрашивает — это не мы.',

  // ── Приватность (app/settings/privacy.tsx) ─────────────────────────────────
  messagePrivacyHeading: 'Кто может тебе писать',
  messagePrivacyHint:
    'Это касается только новых переписок. Те, что уже открыты, остаются открытыми.',

  privacyEveryone: 'Все',
  privacyEveryoneHint: 'Любой в AceAiX может начать с тобой переписку.',
  privacyVerified: 'Проверенные тренеры и клубы',
  privacyVerifiedHint: 'Только проверенные нами аккаунты и те, кто на тебя подписан.',
  privacyFollowing: 'Твои подписки',
  privacyFollowingHint: 'Написать первыми могут только аккаунты из твоих подписок.',
  privacyNobody: 'Никто',
  privacyNobodyHint: 'Новую переписку не начнёт никто. Уже открытые продолжают работать.',

  discoveryHeading: 'Появляться в поиске скаутов',
  discoveryHint: 'Когда включено, тренеры и клубы находят тебя в поиске.',
  discoverable: 'Видимость в поиске',
  discoverableOn: 'Профиль может появляться в поиске',
  discoverableOff: 'Профиль скрыт из поиска',

  publicWebHeading: 'Показывать профиль тем, кто не вошёл',
  publicWebAdult:
    'Взрослые профили, которым разрешено появляться в поиске, видны в вебе и тем, кто не вошёл в аккаунт. Если выключить «{{setting}}» выше, профиль пропадёт и оттуда, и отсюда.',
  readPrivacyPolicy: 'Прочитать Политику конфиденциальности целиком',

  // ── Уведомления (app/settings/notifications.tsx) ───────────────────────────
  pushOffTitle: 'Пуш-уведомления выключены',
  pushOffBody:
    'Телефон не разрешает AceAiX отправлять уведомления, поэтому ничего из списка ниже не дойдёт до тебя, пока приложение закрыто.',
  turnOnPush: 'Включить пуш',
  pushStillOff: 'Пуш всё ещё выключен. Включить его можно в настройках телефона.',
  autoSaveNote: 'Изменения сохраняются сами.',

  sectionHowWeReach: 'Как мы с тобой связываемся',
  pushTitle: 'Пуш-уведомления',
  pushSubtitle: 'На телефоне, пока приложение закрыто',
  emailTitle: 'Почта',
  emailSubtitle: 'Редкие сводки на твою почту',

  sectionActivity: 'Активность',
  activityFooter: 'Это же управляет тем, что попадает в уведомления внутри приложения.',
  notifyFollows: 'Новые подписчики',
  notifyMessages: 'Сообщения',
  notifyComments: 'Комментарии',
  notifyLikes: 'Лайки',

  sectionOpportunities: 'Возможности и твоя оценка',
  notifyOpportunities: 'Новые возможности',
  notifyApplications: 'Обновления по откликам',
  notifyScoutInterest: 'Интерес скаутов',
  notifyScoreUpdates: 'Изменения оценки таланта',

  noMarketingNote:
    'Мы никогда не шлём рекламные пуши и не продаём твои данные тем, кто их шлёт.',

  // ── Настройки скаутинга (app/settings/scouting.tsx) ────────────────────────
  scoutingIntro:
    'От этого зависит, кого поиск покажет тебе первым и о каких спортсменах мы сообщим. Оставь поле пустым — это значит «без предпочтений».',
  scoutingSports: 'Виды спорта',
  scoutingSportsHint: 'Отметь все виды спорта, по которым набираешь.',
  scoutingPositions: 'Позиции',
  scoutingPositionsHint: 'Только позиции из выбранных видов спорта.',
  scoutingPositionsEmpty: 'Сначала выбери вид спорта — его позиции появятся здесь.',
  scoutingLevels: 'Уровни',
  scoutingCountries: 'Страны',
  scoutingCountriesHint: 'Где находится спортсмен.',

  ageRange: 'Возраст',
  youngest: 'Младший',
  oldest: 'Старший',
  yearsSuffix: 'лет',

  minimumTalentScore: 'Минимальная оценка таланта',
  atLeast: 'Не меньше',
  anyScoreHint: 'Любая оценка, включая тех, у кого её ещё нет',
  minScoreHint: 'Только спортсмены с оценкой от {{score}}',

  filters: 'Фильтры',
  openToOffersOnly: 'Только открытые к предложениям',
  openToOffersHint: 'Скрыть тех, кто не отметил, что ищет варианты',
  notifyNewMatches: 'Сообщать о новых совпадениях',
  notifyNewMatchesHint: 'Когда подходящий спортсмен приходит или растёт',

  savePreferences: 'Сохранить настройки',
  preferencesSaved: 'Сохранено. Поиск будет учитывать это дальше.',

  // ── Оформление (app/settings/appearance.tsx) ───────────────────────────────
  themeHeading: 'Тема',
  themeBody:
    'Системная повторяет то, что стоит на телефоне, включая ночное расписание.',
  themeSystem: 'Системная',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  preview: 'Предпросмотр',
  themeSystemNoteLight: 'Сейчас на телефоне светлая тема.',
  themeSystemNoteDark: 'Сейчас на телефоне тёмная тема.',
  themeAlwaysLight: 'Всегда светлая, что бы ни стояло на телефоне.',
  themeAlwaysDark: 'Всегда тёмная, что бы ни стояло на телефоне.',

  /* Предпросмотр — выдуманный пост, показан только чтобы оценить тему. */
  previewName: 'Лейла Хаддад',
  previewCity: 'Дубай',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'Два гола и ассист в дерби. Полный клип у меня в профиле.',

  // ── Удаление аккаунта (app/settings/delete-account.tsx) ────────────────────
  deleteAccountTitle: 'Удалить аккаунт',
  deleteAccountSubtitle: 'Навсегда удалить профиль и всё, что в нём',
  deleteCannotUndoTitle: 'Это нельзя отменить',
  deleteCannotUndoBody:
    'Удаление аккаунта убирает его навсегда. Вернуть его мы не можем, а новая регистрация начинается с пустого места: новый профиль и оценка таланта с нуля.',

  beforeYouGo: 'Прежде чем уйти',
  takeABreakTitle: 'Может, просто сделать паузу',
  takeABreakBody:
    'Выключи видимость — и ты пропадёшь из поиска скаутов. Профиль, посты и оценка останутся как есть, а включить обратно можно когда захочешь.',
  turnOffDiscovery: 'Выключить видимость',
  discoveryAlreadyOff: 'Видимость уже выключена',
  hiddenFromSearchToast: 'Профиль скрыт из поиска скаутов. Ничего не удалено.',
  deleteExportBody:
    'Сохрани копию профиля, постов, комментариев, подписок и откликов, пока ничего не удалено. После удаления аккаунта отправить её мы уже не сможем.',

  whatGetsDeleted: 'Что будет удалено',
  removedProfile: 'Твой профиль, фото и всё, что в нём написано',
  removedPosts: 'Все твои посты, комментарии и лайки',
  removedMessages: 'Твои сообщения во всех переписках',
  removedApplications: 'Твои отклики и все сохранённые возможности',
  removedScore: 'Твоя оценка таланта и вся её история',
  removedFollows: 'Твои подписчики и все твои подписки',
  retentionNote:
    'Небольшую часть записей мы храним ограниченное время там, где этого требует закон: записи о безопасности и модерации и всё, что нужно для ответа на юридическое требование. Ничего из твоего профиля больше никому не показывается.',

  /**
   * Слово, которое вводят для подтверждения удаления. Переведи его в то слово,
   * которое человек действительно напечатал бы на этом языке; регистр при
   * сравнении не важен.
   */
  deleteConfirmWord: 'УДАЛИТЬ',
  typeToContinue: 'Введи {{word}}, чтобы продолжить',
  deleteMyAccount: 'Удалить мой аккаунт',
  changedYourMind: 'Хочешь отменить? Просто вернись — пока ничего не произошло.',
  deleteConfirmTitle: 'Удалить твой аккаунт?',
  deleteConfirmBody:
    'Это последний шаг. Профиль, посты, сообщения, отклики и оценка таланта удаляются навсегда и восстановлению не подлежат.',
  deletePermanently: 'Удалить навсегда',
  keepMyAccount: 'Оставить аккаунт',

  // ── Общие элементы настроек (components/settings/) ─────────────────────────
  nothingToChoose: 'Здесь пока нечего выбирать.',
  stepperDecrease: 'Уменьшить: {{label}}',
  stepperIncrease: 'Увеличить: {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** Строка переключателя, прочитанная вслух: подпись, затем пояснение. */
  radioA11y: '{{label}}. {{hint}}',

  // ── Оболочка правовых экранов (app/legal/) ─────────────────────────────────
  /* Сами документы опубликованы на английском и не переводятся — переводится
     только обвязка вокруг них. */
  legalUpdated: 'Обновлено {{date}}',
  legalLinkExternal: '{{label}}, откроется вне приложения',

  // ── Нет конфигурации (components/common/ConfigMissing.tsx) ─────────────────
  configMissingTitle: 'Нет конфигурации',
  configMissingBody:
    'AceAiX не может достучаться до бэкенда: для этой сборки не заданы переменные окружения Supabase.',
  configMissingHint:
    'Добавь их в `mobile/.env` для локальной разработки или в секреты EAS для сборки, затем перезапусти бандлер.',
};
