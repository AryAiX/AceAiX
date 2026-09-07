/**
 * Los equipos de los que alguien es aficionado.
 *
 * Una distinción tiene que sobrevivir a la traducción: esto es afición, nunca
 * empleo. «Tus equipos» son las camisetas que tiene; el sitio donde juega un
 * deportista es «club actual» en `onboarding` y `profile`, y quien junte las
 * dos cosas convierte el dato de un reclutador en una preferencia.
 */
export const teams = {
  // ── El paso del registro ───────────────────────────────────────────────────
  stepTitle: '¿De qué equipos eres?',
  stepBody:
    'Elige hasta cinco. No tiene nada que ver con dónde juegas: es solo la camiseta que tienes.',
  stepSkip: 'Ahora no',

  venueTitle: 'Estadio favorito',
  venueBody: 'Un estadio al que irías mañana mismo si alguien te diera una entrada.',
  venuePlaceholder: 'Santiago Bernabéu, Azadi, Old Trafford…',

  // ── Selector ───────────────────────────────────────────────────────────────
  searchPlaceholder: 'Buscar clubes y selecciones',
  popular: 'Populares ahora mismo',
  selected_one: '{{count}} seleccionado',
  selected_many: '{{count}} seleccionados',
  selected_other: '{{count}} seleccionados',
  maxReached: 'Cinco es el límite: quita uno para añadir otro.',
  noResults: 'Nada que coincida con «{{query}}».',
  addCustom: 'Añadir «{{name}}»',
  addCustomHint: 'Solo lo verás tú hasta que lo hayamos revisado.',
  addedCustom: 'Añadido. Ya está en tu perfil.',
  followersCount_one: '{{count}} aficionado aquí',
  followersCount_many: '{{count}} aficionados aquí',
  followersCount_other: '{{count}} aficionados aquí',

  // ── En un perfil ───────────────────────────────────────────────────────────
  supportsTitle: 'Equipos favoritos',
  venueLabel: 'Estadio favorito',
  emptySelf:
    'Añade los equipos de los que eres: es la forma más rápida de encontrar gente como tú.',
  emptyOther: 'Todavía sin equipos.',
  editAction: 'Editar equipos',
  savedToast: 'Equipos actualizados.',

  // ── La página del equipo ───────────────────────────────────────────────────
  fansTitle: 'Aficionados en AceAiX',
  fansEmpty: 'Aquí todavía no hay nadie de este equipo. Serías el primero.',
  fansLoadMore: 'Ver más',
  alsoSupports: 'También es de {{team}}',
  sharedTeams_one: 'Tú también eres de {{teams}}',
  sharedTeams_many: 'Tú también eres de {{teams}}',
  sharedTeams_other: 'Tú también eres de {{teams}}',
};
