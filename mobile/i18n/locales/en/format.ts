/**
 * Units and relative times used by `lib/format.ts`.
 *
 * These are abbreviations that appear beside a name or a count, so they need
 * to stay short in every language — "2h", not "2 hours ago".
 */
export const format = {
  minutesShort: '{{n}}m',
  hoursShort: '{{n}}h',
  daysShort: '{{n}}d',
  weeksShort: '{{n}}w',
  monthsShort: '{{n}}mo',
  yearsShort: '{{n}}y',

  closed: 'Closed',
  closesToday: 'Closes today',
  oneDayLeft: '1 day left',
  daysLeft: '{{n}} days left',
  closesOn: 'Closes {{date}}',

  heightCm: '{{n}} cm',
  weightKg: '{{n}} kg',
};
