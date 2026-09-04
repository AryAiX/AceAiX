/**
 * Виды спорта, позиции и уровни.
 *
 * В базе данных хранится английский ключ — вид спорта спортсмена остаётся
 * «Football» на любом языке, иначе тренер в Мадриде и тренер в Дубае искали бы
 * по двум разным справочникам. Переводится только подпись.
 */
export const sports = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  tennis: 'Теннис',
  athletics: 'Лёгкая атлетика',
  swimming: 'Плавание',
  cricket: 'Крикет',
  volleyball: 'Волейбол',
  handball: 'Гандбол',
  padel: 'Падел',
  chess: 'Шахматы',
  esports: 'Киберспорт',
  martialArts: 'Единоборства',

  allSports: 'Все виды спорта',
  anySport: 'Любой вид спорта',
  anyPosition: 'Любая позиция',

  position: {
    goalkeeper: 'Вратарь',
    centreBack: 'Центральный защитник',
    fullBack: 'Крайний защитник',
    wingBack: 'Латераль',
    defensiveMidfielder: 'Опорный полузащитник',
    centralMidfielder: 'Центральный полузащитник',
    attackingMidfielder: 'Атакующий полузащитник',
    winger: 'Вингер',
    striker: 'Нападающий',

    pointGuard: 'Разыгрывающий',
    shootingGuard: 'Атакующий защитник',
    smallForward: 'Лёгкий форвард',
    powerForward: 'Тяжёлый форвард',
    centre: 'Центровой',

    singles: 'Одиночный разряд',
    doubles: 'Парный разряд',

    sprints: 'Спринт',
    middleDistance: 'Средние дистанции',
    longDistance: 'Длинные дистанции',
    jumps: 'Прыжки',
    throws: 'Метания',
    hurdles: 'Барьерный бег',

    freestyle: 'Вольный стиль',
    backstroke: 'На спине',
    breaststroke: 'Брасс',
    butterfly: 'Баттерфляй',
    individualMedley: 'Комплексное плавание',

    batter: 'Бэтсмен',
    bowler: 'Боулер',
    allRounder: 'Универсал',
    wicketKeeper: 'Уикет-кипер',

    setter: 'Связующий',
    outsideHitter: 'Доигровщик',
    opposite: 'Диагональный',
    middleBlocker: 'Центральный блокирующий',
    libero: 'Либеро',

    leftWing: 'Левый крайний',
    leftBack: 'Левый полусредний',
    centreBackHandball: 'Центральный разыгрывающий',
    rightBack: 'Правый полусредний',
    rightWing: 'Правый крайний',
    pivot: 'Линейный',

    rightSide: 'Правая сторона',
    leftSide: 'Левая сторона',

    classical: 'Классика',
    rapid: 'Рапид',
    blitz: 'Блиц',

    entry: 'Энтри',
    support: 'Саппорт',
    igl: 'Игровой лидер',
    mid: 'Мид',
    jungle: 'Лесник',
    duelist: 'Дуэлянт',

    judo: 'Дзюдо',
    karate: 'Карате',
    taekwondo: 'Тхэквондо',
    boxing: 'Бокс',
    wrestling: 'Борьба',
    mma: 'ММА',
  },

  level: {
    grassroots: 'Начальный',
    grassrootsHint: 'Школьная или дворовая команда',
    academy: 'Академия',
    academyHint: 'Академия клуба или команда развития',
    amateur: 'Любительский',
    amateurHint: 'Официальные любительские соревнования',
    semiPro: 'Полупрофи',
    semiProHint: 'С оплатой, неполная занятость',
    professional: 'Профессионал',
    professionalHint: 'Контракт с полной занятостью',
  },

  side: {
    right: 'Правая',
    left: 'Левая',
    both: 'Обе',
  },

  opportunityType: {
    trial: 'Просмотр',
    trialHint: 'Открытая тренировка или день отбора',
    scholarship: 'Стипендия',
    scholarshipHint: 'Место в академии или университете',
    contract: 'Контракт',
    contractHint: 'Игровой контракт или предложение',
    camp: 'Сборы',
    campHint: 'Тренировочный сбор или шоукейс',
  },
};
