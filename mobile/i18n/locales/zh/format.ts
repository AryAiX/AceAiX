/**
 * `lib/format.ts` 用到的单位和相对时间。
 *
 * 这些是紧挨着名字或数字出现的缩写，在任何语言里都得保持短 ——
 * 写“2小时前”，不写“2 个小时以前”。
 */
export const format = {
  minutesShort: '{{n}}分钟前',
  hoursShort: '{{n}}小时前',
  daysShort: '{{n}}天前',
  weeksShort: '{{n}}周前',
  monthsShort: '{{n}}个月前',
  yearsShort: '{{n}}年前',

  closed: '已截止',
  closesToday: '今天截止',
  oneDayLeft: '还剩1天',
  daysLeft: '还剩{{n}}天',
  closesOn: '{{date}}截止',

  heightCm: '{{n}}厘米',
  weightKg: '{{n}}公斤',
};
