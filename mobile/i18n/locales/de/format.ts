/**
 * Einheiten und relative Zeitangaben für `lib/format.ts`.
 *
 * Diese Kürzel stehen neben einem Namen oder einer Zahl und müssen deshalb in
 * jeder Sprache kurz bleiben — „2 Std.“, nicht „vor 2 Stunden“.
 */
export const format = {
  minutesShort: '{{n}} Min.',
  hoursShort: '{{n}} Std.',
  daysShort: '{{n}} Tg.',
  weeksShort: '{{n}} Wo.',
  monthsShort: '{{n}} Mon.',
  yearsShort: '{{n}} J.',

  closed: 'Geschlossen',
  closesToday: 'Endet heute',
  oneDayLeft: 'Noch 1 Tag',
  daysLeft: 'Noch {{n}} Tage',
  closesOn: 'Endet am {{date}}',

  heightCm: '{{n}} cm',
  weightKg: '{{n}} kg',
};
