/**
 * واحد‌ها و زمان‌های نسبی که `lib/format.ts` استفاده می‌کند.
 *
 * این‌ها کوته‌نوشته‌هایی هستند که کنار یک نام یا یک عدد می‌آیند، پس باید
 * در هر زبان کوتاه بمانند — «۲ س»، نه «۲ ساعت پیش».
 */
export const format = {
  minutesShort: '{{n}} د',
  hoursShort: '{{n}} س',
  daysShort: '{{n}} روز',
  weeksShort: '{{n}} هفته',
  monthsShort: '{{n}} ماه',
  yearsShort: '{{n}} سال',

  closed: 'بسته',
  closesToday: 'امروز بسته می‌شود',
  oneDayLeft: '۱ روز مانده',
  daysLeft: '{{n}} روز مانده',
  closesOn: '{{date}} بسته می‌شود',

  heightCm: '{{n}} س‌م',
  weightKg: '{{n}} ک‌گ',
};
