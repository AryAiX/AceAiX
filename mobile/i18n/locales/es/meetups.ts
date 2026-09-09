/**
 * Meetups — arranging to actually play with people. Spanish.
 *
 * Two words carry weight through translation and are kept apart here:
 *
 *   * a **spot** is a place in the game, so it is `plaza`: a person, never a
 *     patch of ground. The geography in this file is `ciudad`, `zona` and
 *     `sitio`, and none of those three may drift into the counts.
 *   * **host** is `anfitrión`, or the verb `organizar` where a verb reads
 *     better. Never `capitán`, never `entrenador`. This person put one game
 *     together and picks who plays, and that is the whole of it.
 *
 * Generic masculine (`anfitrión`, `el primero`) follows the rest of the
 * catalogue, and every plural carries `_many` beside `_one`/`_other`, as every
 * other Spanish file here does. The dash the English uses to hang a second
 * clause becomes a colon, which is what the other Spanish files do too.
 *
 * The feature is eighteen-plus, enforced in the database. Nothing here has to
 * explain that to a minor, because a minor never sees these strings.
 */
export const meetups = {
  // ── La pestaña ─────────────────────────────────────────────────────────────
  title: 'Jugar',
  subtitle: 'Encuentra gente con quien jugar, estés donde estés',

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  searchPlace: '¿Dónde? Ciudad, zona o sitio',
  searchPlaceHint: 'Donde estás, o adonde vas',
  anySport: 'Cualquier deporte',
  anyLevel: 'Cualquier nivel',
  anyDate: 'Cualquier fecha',
  today: 'Hoy',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mes',
  filters: 'Filtros',
  clearFilters: 'Borrar',

  emptyTitle: 'Aquí todavía no hay nada',
  emptyBody:
    'Nadie ha publicado un partido en este sitio y en estas fechas. Sé el primero: seguro que hay alguien más buscando.',
  emptyAction: 'Publicar un partido',
  emptySearchTitle: 'Nada coincide',
  emptySearchBody: 'Prueba con más fechas, o con una zona de al lado.',

  // ── Una tarjeta ────────────────────────────────────────────────────────────
  spotsLeft_one: 'Queda {{count}} plaza',
  spotsLeft_many: 'Quedan {{count}} plazas',
  spotsLeft_other: 'Quedan {{count}} plazas',
  spotsOf: '{{taken}} de {{total}}',
  full: 'Completo',
  cancelled: 'Cancelado',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'Anfitrión',
  hostedBy: 'Lo organiza {{name}}',
  costEach: '{{cost}} cada uno',

  levelAny: 'Cualquier nivel',
  levelBeginner: 'Principiante',
  levelIntermediate: 'Intermedio',
  levelAdvanced: 'Avanzado',
  levelCompetitive: 'Competitivo',

  // ── Publicar uno ───────────────────────────────────────────────────────────
  createTitle: 'Publicar un partido',
  createSubtitle:
    'Di a qué quieres jugar, dónde y cuándo. La gente pide entrar y tú decides.',
  fieldSport: 'Deporte',
  fieldTitle: '¿Qué es?',
  fieldTitlePlaceholder: 'Fútbol 5 del sábado',
  fieldCountry: 'País',
  fieldCity: 'Ciudad',
  fieldArea: 'Zona',
  fieldAreaPlaceholder: 'Al Jadaf, Marina, Puerto Banús…',
  fieldVenue: 'Sitio',
  fieldVenuePlaceholder: 'El campo, la pista o el club',
  fieldWhen: 'Cuándo',
  fieldEnds: 'Hasta',
  fieldSpots: '¿Cuántos jugadores, tú incluido?',
  fieldSpotsHint: 'Dos para pelotear. Diez para un fútbol 5.',
  fieldLevel: 'Nivel',
  fieldNote: '¿Algo más?',
  fieldNotePlaceholder: 'Traed botas. Solemos ir a tomar algo después.',
  fieldCost: 'Precio por persona',
  fieldCostPlaceholder: '25 AED, o gratis',
  post: 'Publicar',
  posted: 'Publicado. Ya se puede encontrar.',

  // ── Apuntarse ──────────────────────────────────────────────────────────────
  askToJoin: 'Pedir entrar',
  askMessage: 'Escribe algo al anfitrión',
  askMessagePlaceholder: 'Juego de lateral izquierdo y me conozco el campo.',
  requested: 'Pedido: esperando al anfitrión',
  joined: 'Estás dentro',
  declined: 'Esta vez no',
  askSent: 'Enviado. El anfitrión te dirá algo.',
  youAreHosting: 'Este partido lo organizas tú',
  leave: 'Salir del partido',
  leaveConfirmTitle: '¿Salir del partido?',
  leaveConfirmBody: 'Tu plaza queda libre otra vez y se lo decimos al anfitrión.',
  left: 'Has salido. Tu plaza vuelve a estar libre.',

  // ── Organizar ──────────────────────────────────────────────────────────────
  requests: 'Solicitudes',
  requests_one: '{{count}} solicitud',
  requests_many: '{{count}} solicitudes',
  requests_other: '{{count}} solicitudes',
  noRequests: 'Todavía no ha pedido entrar nadie.',
  accept: 'Aceptar',
  decline: 'Rechazar',
  accepted: '{{name}} está dentro.',
  declinedToast: 'Rechazada.',
  going: 'Quién va',
  cancel: 'Cancelar el partido',
  cancelConfirmTitle: '¿Cancelar el partido?',
  cancelConfirmBody: 'Se avisará a todos los que van. Esto no se puede deshacer.',
  cancelled_toast: 'Cancelado. Ya lo saben todos los que iban.',

  // ── Míos ───────────────────────────────────────────────────────────────────
  mine: 'Míos',
  minePast: 'Pasados',
  mineEmptyTitle: 'Nada a la vista',
  mineEmptyBody: 'Aquí aparecen los partidos que publiques o a los que te unas.',

  // ── Accesibilidad ──────────────────────────────────────────────────────────
  a11yCard: '{{title}} en {{city}}, {{spots}}',
  a11yAccept: 'Aceptar a {{name}}',
  a11yDecline: 'Rechazar a {{name}}',
};
