/**
 * Quién ha estado mirando un perfil.
 *
 * La regla de honestidad que tiene que sobrevivir a la traducción: solo se
 * nombra a entrenadores, reclutadores y clubes verificados. A los demás se les
 * cuenta. Cualquier redacción que dé a entender que la lista con nombres está
 * completa —«aquí está todo el que te miró»— es falsa, porque a propósito no
 * lo está.
 */
export const views = {
  title: 'Quién miró tu perfil',
  subtitle: 'Entrenadores, reclutadores y clubes de los últimos {{days}} días.',

  homeTitleNone: 'Esta semana todavía no te ha mirado nadie',
  homeTitle_one: '{{count}} persona miró tu perfil',
  homeTitle_many: '{{count}} personas miraron tu perfil',
  homeTitle_other: '{{count}} personas miraron tu perfil',
  homeProfessional_one: '{{count}} era entrenador, reclutador o club',
  homeProfessional_many: '{{count}} eran entrenadores, reclutadores o clubes',
  homeProfessional_other: '{{count}} eran entrenadores, reclutadores o clubes',
  homeClubs_one: 'de {{count}} club',
  homeClubs_many: 'de {{count}} clubes',
  homeClubs_other: 'de {{count}} clubes',
  homeEmptyBody:
    'Añade un clip o registra un partido: los perfiles con imágenes se abren antes.',
  homeCta: 'Ver quién',

  namedTitle: 'Con nombre',
  namedBody: 'Entrenadores, reclutadores y clubes verificados.',
  unnamedTitle_one: 'Y {{count}} visita más',
  unnamedTitle_many: 'Y {{count}} visitas más',
  unnamedTitle_other: 'Y {{count}} visitas más',
  unnamedBody:
    'De cuentas que no hemos verificado y de otros deportistas. A esas no las nombramos.',

  viewedAgo: 'Te miró {{when}}',
  viewsCount_one: '{{count}} vez',
  viewsCount_many: '{{count}} veces',
  viewsCount_other: '{{count}} veces',
  newBadge_one: '{{count}} nueva',
  newBadge_many: '{{count}} nuevas',
  newBadge_other: '{{count}} nuevas',

  emptyTitle: 'Todavía nada',
  emptyBody: 'Cuando un entrenador abra tu perfil, aparecerá aquí.',

  rangeWeek: 'Esta semana',
  rangeMonth: 'Últimos 30 días',

  whyTitle: 'Por qué faltan algunos nombres',
  whyBody:
    'Damos el nombre de entrenadores, reclutadores y clubes verificados: gente que actúa de forma profesional sobre un perfil que publicaste para que te encontraran. Las cuentas sin verificar y los demás deportistas se cuentan, pero no se nombran nunca. Esa regla no cambia para nadie.',
};
