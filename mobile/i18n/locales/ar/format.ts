/**
 * الوحدات والأوقات النسبية التي يستخدمها `lib/format.ts`.
 *
 * هذه اختصارات تظهر بجانب اسم أو عدد، لذا يجب أن تبقى قصيرة في كل لغة —
 * «2 س» لا «قبل ساعتين».
 */
export const format = {
  minutesShort: '{{n}} د',
  hoursShort: '{{n}} س',
  daysShort: '{{n}} ي',
  weeksShort: '{{n}} أسبوع',
  monthsShort: '{{n}} شهر',
  yearsShort: '{{n}} سنة',

  closed: 'مغلق',
  closesToday: 'يُغلق اليوم',
  oneDayLeft: 'بقي يوم واحد',
  daysLeft: 'بقي {{n}} يوم',
  closesOn: 'يُغلق في {{date}}',

  heightCm: '{{n}} سم',
  weightKg: '{{n}} كجم',
};
