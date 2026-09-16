/**
 * Wer sich ein Profil angesehen hat.
 *
 * Die Ehrlichkeitsregel, die die Übersetzung überstehen muss: Nur geprüfte
 * Trainer, Scouts und Vereine werden mit Namen genannt. Alle anderen werden
 * nur gezählt. Jede Formulierung, die nahelegt, die Namensliste sei
 * vollständig — „hier sind alle, die reingeschaut haben“ —, ist falsch, denn
 * sie ist es mit Absicht nicht.
 */
export const views = {
  title: 'Wer dein Profil angesehen hat',
  subtitle: 'Trainer, Scouts und Vereine aus den letzten {{days}} Tagen.',

  homeTitleNone: 'Diese Woche hat noch niemand reingeschaut',
  homeTitle_one: '{{count}} Person hat dein Profil angesehen',
  homeTitle_other: '{{count}} Personen haben dein Profil angesehen',
  homeProfessional_one: '{{count}} davon war Trainer, Scout oder Verein',
  homeProfessional_other: '{{count}} davon waren Trainer, Scouts oder Vereine',
  homeClubs_one: 'aus {{count}} Verein',
  homeClubs_other: 'aus {{count}} Vereinen',
  homeEmptyBody:
    'Lad einen Clip hoch oder trag ein Spiel ein — Profile mit Videos werden zuerst geöffnet.',
  homeCta: 'Wer war das',

  namedTitle: 'Mit Namen',
  namedBody: 'Geprüfte Trainer, Scouts und Vereine.',
  unnamedTitle_one: 'Und {{count}} weiterer Aufruf',
  unnamedTitle_other: 'Und {{count}} weitere Aufrufe',
  unnamedBody:
    'Von Konten, die wir nicht geprüft haben, und von anderen Sportlern. Die nennen wir nicht beim Namen.',

  viewedAgo: 'Angesehen {{when}}',
  viewsCount_one: '{{count}} Mal',
  viewsCount_other: '{{count}} Mal',
  newBadge_one: '{{count}} neu',
  newBadge_other: '{{count}} neu',

  emptyTitle: 'Noch nichts',
  emptyBody: 'Wenn ein Trainer dein Profil öffnet, steht es hier.',

  rangeWeek: 'Diese Woche',
  rangeMonth: 'Letzte 30 Tage',

  whyTitle: 'Warum manche Namen fehlen',
  whyBody:
    'Wir nennen geprüfte Trainer, Scouts und Vereine — Menschen, die beruflich auf ein Profil schauen, das du veröffentlicht hast, um gefunden zu werden. Ungeprüfte Konten und andere Sportler werden gezählt, aber nie genannt. Diese Regel gilt für alle gleich.',
};
