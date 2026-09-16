/**
 * Unidades y tiempos relativos que usa `lib/format.ts`.
 *
 * Son abreviaturas que aparecen junto a un nombre o a un recuento, así que
 * tienen que seguir siendo cortas en todos los idiomas: «2 h», no «hace 2
 * horas».
 */
export const format = {
  minutesShort: '{{n}} min',
  hoursShort: '{{n}} h',
  daysShort: '{{n}} d',
  weeksShort: '{{n}} sem',
  monthsShort: '{{n}} m',
  yearsShort: '{{n}} a',

  closed: 'Cerrado',
  closesToday: 'Cierra hoy',
  oneDayLeft: 'Queda 1 día',
  daysLeft: 'Quedan {{n}} días',
  closesOn: 'Cierra el {{date}}',

  heightCm: '{{n}} cm',
  weightKg: '{{n}} kg',
};
