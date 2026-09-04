/**
 * Unités et temps relatifs utilisés par `lib/format.ts`.
 *
 * Ce sont des abréviations qui apparaissent à côté d’un nom ou d’un compteur :
 * elles doivent rester courtes dans toutes les langues — « 2 h », pas « il y a
 * 2 heures ».
 *
 * L’espace entre le nombre et son unité est une insécable ( ), pour que
 * « 172 cm » ne se coupe jamais en fin de ligne.
 */
export const format = {
  minutesShort: '{{n}} min',
  hoursShort: '{{n}} h',
  daysShort: '{{n}} j',
  weeksShort: '{{n}} sem',
  monthsShort: '{{n}} mois',
  yearsShort: '{{n}} an',

  closed: 'Clos',
  closesToday: 'Clôture aujourd’hui',
  oneDayLeft: '1 jour restant',
  daysLeft: '{{n}} jours restants',
  closesOn: 'Clôture le {{date}}',

  heightCm: '{{n}} cm',
  weightKg: '{{n}} kg',
};
