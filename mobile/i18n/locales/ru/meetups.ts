/**
 * Meetups, in Russian — arranging to actually play with people.
 *
 * Two words carry the meaning and must not be collapsed into one another:
 *
 *   * a **spot** is a place in the game, so it is «место» and only ever a place
 *     for a person. The geography is «площадка» (venue), «район» (area) and
 *     «город» (city); never let «место» drift into meaning any of those.
 *   * the **host** is «организатор» — whoever posted this one game and decides
 *     who comes. Not «капитан», not «тренер», and not «хозяин», which would put
 *     the game on their turf. The word carries no authority past this one game.
 *
 * Plurals follow the rest of the Russian catalogue: `_one`, `_few`, `_many`,
 * `_other`, where `_other` repeats the `_few` wording because that is the form
 * `Intl.PluralRules('ru')` picks for fractions. The parity test in
 * `tests/unit/i18n.test.ts` requires exactly those four, no more and no fewer.
 *
 * Everything is «ты», as everywhere else in this catalogue. Gendered past tense
 * is avoided on purpose — the app does not know who is reading — so `left` says
 * «Ты больше не в игре» rather than «Ты вышел».
 */
export const meetups = {
  // ── Вкладка ────────────────────────────────────────────────────────────────
  title: 'Играть',
  subtitle: 'Найди, с кем поиграть, — дома или в поездке',

  // ── Поиск ──────────────────────────────────────────────────────────────────
  searchPlace: 'Где? Город, район или площадка',
  searchPlaceHint: 'Там, где ты сейчас, или там, куда собираешься',
  anySport: 'Любой вид спорта',
  anyLevel: 'Любой уровень',
  anyDate: 'Любая дата',
  today: 'Сегодня',
  thisWeek: 'Эта неделя',
  thisMonth: 'Этот месяц',
  filters: 'Фильтры',
  clearFilters: 'Сбросить',

  emptyTitle: 'Здесь пока пусто',
  emptyBody: 'На это время здесь никто игру не выложил. Выложи свою — кто-то рядом наверняка тоже ищет.',
  emptyAction: 'Выложить игру',
  emptySearchTitle: 'Ничего не нашлось',
  emptySearchBody: 'Попробуй расширить даты или взять соседний район.',

  // ── Карточка ───────────────────────────────────────────────────────────────
  spotsLeft_one: 'Осталось {{count}} место',
  spotsLeft_few: 'Осталось {{count}} места',
  spotsLeft_many: 'Осталось {{count}} мест',
  spotsLeft_other: 'Осталось {{count}} места',
  spotsOf: '{{taken}} из {{total}}',
  full: 'Мест нет',
  cancelled: 'Отменена',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'Организатор',
  hostedBy: 'Организует {{name}}',
  costEach: '{{cost}} с человека',

  levelAny: 'Любой уровень',
  levelBeginner: 'Начинающий',
  levelIntermediate: 'Средний',
  levelAdvanced: 'Продвинутый',
  levelCompetitive: 'Соревновательный',

  // ── Как выложить свою ──────────────────────────────────────────────────────
  createTitle: 'Выложить игру',
  createSubtitle: 'Напиши, во что хочешь играть, где и когда. Люди будут проситься, а решаешь ты.',
  fieldSport: 'Вид спорта',
  fieldTitle: 'Что за игра?',
  fieldTitlePlaceholder: 'Футбол 5×5 в субботу',
  fieldCountry: 'Страна',
  fieldCity: 'Город',
  fieldArea: 'Район',
  fieldAreaPlaceholder: 'Аль-Джадаф, Марина, Пуэрто-Банус…',
  fieldVenue: 'Площадка',
  fieldVenuePlaceholder: 'Поле, корт или клуб',
  fieldWhen: 'Когда',
  fieldEnds: 'До',
  fieldSpots: 'Сколько игроков, считая тебя?',
  fieldSpotsHint: 'Двое — если нужен партнёр по корту. Десять — на футбол 5×5.',
  fieldLevel: 'Уровень',
  fieldNote: 'Что-нибудь ещё?',
  fieldNotePlaceholder: 'Возьми бутсы. После обычно идём куда-нибудь посидеть.',
  fieldCost: 'Сколько с человека',
  fieldCostPlaceholder: '25 AED или бесплатно',
  post: 'Выложить',
  posted: 'Готово. Теперь игру можно найти.',

  // ── Как попасть в чужую ────────────────────────────────────────────────────
  askToJoin: 'Попроситься в игру',
  askMessage: 'Напиши пару слов организатору',
  askMessagePlaceholder: 'Играю левого защитника, поле знаю.',
  requested: 'Заявка отправлена — ждём организатора',
  joined: 'Ты в игре',
  declined: 'В этот раз не вышло',
  askSent: 'Отправлено. Организатор ответит.',
  youAreHosting: 'Эту игру организуешь ты',
  leave: 'Выйти из игры',
  leaveConfirmTitle: 'Выйти из игры?',
  leaveConfirmBody: 'Твоё место снова станет свободным, а организатор об этом узнает.',
  left: 'Ты больше не в игре. Место снова свободно.',

  // ── Если организуешь ты ────────────────────────────────────────────────────
  requests: 'Заявки',
  requests_one: '{{count}} заявка',
  requests_few: '{{count}} заявки',
  requests_many: '{{count}} заявок',
  requests_other: '{{count}} заявки',
  noRequests: 'Пока никто не просился.',
  accept: 'Принять',
  decline: 'Отклонить',
  accepted: '{{name}} в игре.',
  declinedToast: 'Отклонено.',
  going: 'Идут',
  cancel: 'Отменить игру',
  cancelConfirmTitle: 'Отменить игру?',
  cancelConfirmBody: 'Все, кто собирался прийти, об этом узнают. Вернуть игру уже не получится.',
  cancelled_toast: 'Игра отменена. Все, кто шёл, уже знают.',

  // ── Мои игры ───────────────────────────────────────────────────────────────
  mine: 'Мои',
  minePast: 'Прошедшие',
  mineEmptyTitle: 'Впереди пока ничего',
  mineEmptyBody: 'Игры, которые ты выложишь или к которым присоединишься, появятся здесь.',

  // ── Доступность ────────────────────────────────────────────────────────────
  a11yCard: '{{title}}, {{city}}, {{spots}}',
  a11yAccept: 'Принять {{name}}',
  a11yDecline: 'Отклонить {{name}}',
};
