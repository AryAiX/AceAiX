/**
 * Лента, редактор поста и отдельный пост.
 *
 * Сгруппировано в том порядке, в каком человек с этим встречается: главная,
 * затем карточка и действия на ней, потом комментарии, потом меню безопасности
 * за каждым «…», затем редактор, экран одного поста и экран битой ссылки.
 *
 * Причины жалоб здесь — только подписи. Значения, которые уходят в таблицу
 * модерации, остаются английскими константами в компоненте и не переводятся.
 */
export const feed = {
  // ── Главная ────────────────────────────────────────────────────────────────
  scopeForYou: 'Для тебя',
  scopeFollowing: 'Подписки',

  messages: 'Сообщения',
  messagesUnread_one: 'Сообщения, {{count}} непрочитанное',
  messagesUnread_few: 'Сообщения, {{count}} непрочитанных',
  messagesUnread_many: 'Сообщения, {{count}} непрочитанных',
  messagesUnread_other: 'Сообщения, {{count}} непрочитанного',
  notifications: 'Уведомления',
  notificationsNew_one: 'Уведомления, {{count}} новое',
  notificationsNew_few: 'Уведомления, {{count}} новых',
  notificationsNew_many: 'Уведомления, {{count}} новых',
  notificationsNew_other: 'Уведомления, {{count}} нового',

  emptyFollowingTitle: 'От твоих подписок пока ничего нет',
  emptyFollowingBody:
    'Подпишись на спортсменов, тренеров и клубы, которые тебе интересны, — их посты появятся здесь.',
  emptyFollowingAction: 'Найти, на кого подписаться',
  emptyForYouTitle: 'Лента ещё разогревается',
  emptyForYouBody:
    'Подпишись на нескольких спортсменов или выложи свой пост, чтобы начать.',
  emptyForYouAction: 'Найти людей',

  // ── Карточка поста ─────────────────────────────────────────────────────────
  openProfileOf: 'Открыть профиль: {{name}}',
  postMoreOptions: 'Ещё действия для поста {{name}}, включая жалобу и блокировку',
  showFullCaption: 'Показать подпись целиком',
  openPost: 'Открыть пост',

  // ── Лайк, комментарий, репост, сохранение ──────────────────────────────────
  likePost: 'Поставить лайк',
  unlikePost: 'Убрать лайк',
  readAndAddComments: 'Читать и писать комментарии',
  sharePost: 'Поделиться постом',
  savePost: 'Сохранить пост',
  removeFromSaved: 'Убрать из сохранённых',

  // ── Медиа ──────────────────────────────────────────────────────────────────
  mediaSwipe_one: '{{count}} элемент, листай, чтобы увидеть больше',
  mediaSwipe_few: '{{count}} элемента, листай, чтобы увидеть больше',
  mediaSwipe_many: '{{count}} элементов, листай, чтобы увидеть больше',
  mediaSwipe_other: '{{count}} элемента, листай, чтобы увидеть больше',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'Видеоклип',
  soundOn: 'Включить звук',
  soundOff: 'Выключить звук',

  // ── Комментарии ────────────────────────────────────────────────────────────
  commentsTitle: 'Комментарии',
  commentsHeading_one: 'Комментарии ({{count}})',
  commentsHeading_few: 'Комментарии ({{count}})',
  commentsHeading_many: 'Комментарии ({{count}})',
  commentsHeading_other: 'Комментарии ({{count}})',
  noCommentsTitle: 'Комментариев пока нет',
  noCommentsBody: 'Скажи что-нибудь поддерживающее.',
  reply: 'Ответить',
  replyTo: 'Ответить: {{name}}',
  replyingTo: 'Ответ для {{name}}',
  stopReplying: 'Отменить ответ',
  commentPlaceholder: 'Добавь комментарий…',
  writeComment: 'Написать комментарий',
  postComment: 'Отправить комментарий',
  ownCommentOptions: 'Действия с твоим комментарием',
  reportOrBlockPerson: 'Пожаловаться на {{name}} или заблокировать',

  // ── Меню безопасности ──────────────────────────────────────────────────────
  thisPerson: 'этот человек',
  actionsOwnPost: 'Твой пост',
  actionsOwnComment: 'Твой комментарий',
  actionsPost: 'Этот пост',
  actionsComment: 'Этот комментарий',
  linkCopied: 'Ссылка скопирована',
  linkCopyFailed: 'Не удалось скопировать ссылку.',
  deletePost: 'Удалить пост',
  deleteComment: 'Удалить комментарий',
  reportPost: 'Пожаловаться на пост',
  reportComment: 'Пожаловаться на комментарий',
  reportHint: 'Расскажи, что не так. Жалобы анонимны.',
  blockPerson: 'Заблокировать {{name}}',
  blockHint: 'Он не сможет тебя найти и написать тебе.',

  reportThisPost: 'Пожаловаться на этот пост',
  reportThisComment: 'Пожаловаться на этот комментарий',
  reportReasonPrompt: 'Выбери подходящую причину. Мы никогда не говорим, кто пожаловался.',
  reasonSpam: 'Спам',
  reasonHarassment: 'Травля или преследование',
  reasonNudity: 'Нагота или сексуальный контент',
  reasonViolence: 'Насилие',
  reasonHate: 'Разжигание ненависти',
  reasonImpersonation: 'Выдаёт себя за другого',
  reasonChildSafety: 'Безопасность детей',
  reasonScam: 'Мошенничество',
  reasonOther: 'Что-то другое',
  reportDetailsLabel: 'Что ещё нам стоит знать?',
  reportEmergencyNote:
    'Если кто-то в опасности прямо сейчас, обратись ещё и в экстренные службы.',
  reportThanks: 'Спасибо за сигнал. Наша команда посмотрит.',

  blockConfirmTitle: 'Заблокировать {{name}}?',
  blockConfirmBody:
    'Он не увидит твой профиль и посты, не сможет тебе написать, и ты его тоже не увидишь. Отменить можно в настройках.',
  blockedToast: '{{name}} в чёрном списке. Отменить можно в настройках.',

  deletePostConfirmTitle: 'Удалить этот пост?',
  deleteCommentConfirmTitle: 'Удалить этот комментарий?',
  deleteConfirmBody: 'Это нельзя отменить.',
  keepIt: 'Оставить',
  postDeleted: 'Пост удалён',
  commentDeleted: 'Комментарий удалён',

  // ── Редактор поста ─────────────────────────────────────────────────────────
  composeTitle: 'Новый пост',
  cancelAndClose: 'Отменить и закрыть',
  postButton: 'Опубликовать',
  uploading: 'Загружено {{done}} из {{total}}…',
  audienceA11y: 'Кто это увидит: {{audience}}. Изменить.',
  composePlaceholder: 'Поделись новостью, результатом или клипом…',
  composeA11y: 'Чем хочешь поделиться?',
  charCount: '{{used}}/{{max}}',
  clip: 'Клип',
  selectedPhoto: 'Выбранное фото {{index}}',
  selectedVideo: 'Выбранное видео {{index}}',
  removePhoto: 'Убрать фото {{index}}',
  removeVideo: 'Убрать видео {{index}}',
  addMedia: 'Фото или видео',
  addMediaA11y: 'Добавить фото или видео',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX нужен доступ к твоим фото. Включи его в настройках телефона.',
  posted: 'Опубликовано',
  /* Написано для тринадцатилетнего: коротко, просто, все три примера на месте. */
  safetyNote: 'Будь добрее. Не пиши свой адрес, номер телефона и школу.',

  audienceSheetTitle: 'Кто это увидит?',
  audienceEveryone: 'Все',
  audienceEveryoneDetail: 'Любой в AceAiX сможет это увидеть.',
  audienceFollowersDetail: 'Только те, кто на тебя подписан.',
  audienceConnections: 'Взаимные подписки',
  audienceConnectionsDetail: 'Только те, с кем у вас взаимная подписка.',

  discardTitle: 'Удалить черновик?',
  discardBody: 'Текст и всё выбранное не сохранятся.',
  discard: 'Удалить',
  keepWriting: 'Продолжить писать',

  // ── Один пост ──────────────────────────────────────────────────────────────
  postTitle: 'Пост',
  postUnavailableTitle: 'Этого поста больше нет',
  postUnavailableBody: 'Возможно, его удалили или сняли.',
  postUnavailableBodyRules:
    'Возможно, его удалили или сняли за нарушение наших правил.',
  goBack: 'Назад',

  // ── Битая ссылка ───────────────────────────────────────────────────────────
  notFoundTitle: 'Такой страницы нет',
  notFoundBody: 'Эта ссылка никуда не ведёт в AceAiX.',
  notFoundAction: 'На главную',
};
