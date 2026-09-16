/**
 * Единицы и относительное время, которые использует `lib/format.ts`.
 *
 * Это сокращения, стоящие рядом с именем или счётчиком, поэтому на любом языке
 * они должны оставаться короткими — «2 ч», а не «2 часа назад».
 */
export const format = {
  minutesShort: '{{n}} мин',
  hoursShort: '{{n}} ч',
  daysShort: '{{n}} дн',
  weeksShort: '{{n}} нед',
  monthsShort: '{{n}} мес',
  yearsShort: '{{n}} г',

  closed: 'Закрыто',
  closesToday: 'Закрывается сегодня',
  oneDayLeft: 'Остался 1 день',
  daysLeft: 'Осталось {{n}} дн.',
  closesOn: 'Закрывается {{date}}',

  heightCm: '{{n}} см',
  weightKg: '{{n}} кг',
};
