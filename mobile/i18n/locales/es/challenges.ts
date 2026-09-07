/**
 * Retos semanales de habilidad.
 *
 * Aquí hay dos palabras que pesan y que no se pueden fundir en una sola en
 * ningún idioma: un resultado **declarado** es lo que el deportista dice que
 * hizo, y uno **verificado** es lo que un entrenador vio y confirmó. La
 * clasificación solo se lee bien porque esas dos se distinguen a simple vista.
 *
 * El tono es el de un entrenador, no el de un juego. Sin cuentas atrás que
 * griten, sin «te estás quedando atrás», sin lenguaje de premios: un reto es
 * algo que hacer, y el clip que sacas de ahí es tuyo ganes o no.
 */
export const challenges = {
  // ── Lista ──────────────────────────────────────────────────────────────────
  title: 'Retos',
  subtitle: 'Los ponen entrenadores y clubes. Envía un clip y que lo revisen.',
  tabOpen: 'Abiertos',
  tabEntered: 'Participando',
  tabMine: 'Míos',

  emptyTitle: 'Ahora mismo no hay ningún reto abierto',
  emptyBody:
    'Los entrenadores publican casi todas las semanas. Te lo mostraremos aquí en cuanto se abra uno.',
  emptyEnteredTitle: 'Todavía no has participado en ninguno',
  emptyEnteredBody:
    'Elige cualquier reto abierto y envía un clip: un resultado verificado es la prueba más rápida que puedes conseguir.',
  emptyMineTitle: 'No has puesto ningún reto',
  emptyMineBody:
    'Pide una sola cosa concreta grabada y todas las respuestas serán comparables.',

  setBy: 'Puesto por {{name}}',
  closed: 'Cerrado',
  judging: 'En revisión',
  entries_one: '{{count}} participación',
  entries_many: '{{count}} participaciones',
  entries_other: '{{count}} participaciones',
  ageRange: 'De {{min}} a {{max}} años',
  ageMin: 'De {{min}} años en adelante',
  ageMax: 'Menores de {{max}}',

  // ── Detalle ────────────────────────────────────────────────────────────────
  briefTitle: 'Qué grabar',
  rulesTitle: 'Cómo se juzga',
  judgedNote:
    'Lo juzga el entrenador que lo puso: no hay ninguna cifra que batir, así que envía tu mejor intento.',
  measuredNote: 'Se mide en {{unit}}. {{direction}}',
  directionHigher: 'Cuanto más alto, mejor.',
  directionLower: 'Cuanto más bajo, mejor.',

  leaderboardTitle: 'Clasificación',
  leaderboardEmpty: 'Todavía no ha participado nadie. El primer clip marca la referencia.',
  verifiedBadge: 'Verificado',
  claimedBadge: 'Declarado',
  verifiedTooltip: 'Un entrenador vio este clip y confirmó el resultado.',
  claimedTooltip:
    'La cifra que dio el propio deportista. Ningún entrenador la ha comprobado todavía.',
  yourEntry: 'Tu participación',
  rankLabel: 'N.º {{rank}}',

  // ── Participar ─────────────────────────────────────────────────────────────
  enter: 'Participar',
  enterAgain: 'Enviar un intento mejor',
  withdraw: 'Retirar',
  withdrawConfirmTitle: '¿Retirar tu participación?',
  withdrawConfirmBody: 'Tu clip se queda en tu perfil. Solo sale de esta clasificación.',
  withdrawConfirmAction: 'Retirar',

  chooseClipTitle: '¿Qué clip?',
  chooseClipBody:
    'Elige uno de tus videos. Si el que buscas no está aquí, sube antes uno nuevo desde tu perfil.',
  noClipsTitle: 'Primero necesitas un clip',
  noClipsBody: 'Graba el intento, añádelo a tu perfil y vuelve para participar.',
  noClipsAction: 'Añadir un clip',

  resultLabel: 'Tu resultado',
  resultPlaceholder: 'p. ej. 214',
  noteLabel: '¿Algo que añadir?',
  notePlaceholder: 'El mejor de tres. El pie izquierdo sigue siendo el flojo.',
  submit: 'Enviar participación',
  submitted: 'Participación enviada. El entrenador la confirmará.',
  updated: 'Participación sustituida.',
  withdrawn: 'Participación retirada.',

  // ── Revisión, para el entrenador que lo puso ───────────────────────────────
  judgeTitle: 'Confirmar resultados',
  judgeBody: 'Mira el clip y después confirma la cifra o devuélvela.',
  judgeAccept: 'Confirmar',
  judgeReject: 'Devolver',
  judgeValueLabel: 'Resultado confirmado',
  judgeNoteLabel: 'Nota para el deportista',
  judgeNotePlaceholder: 'El balón tocó el suelo en el 0:18: la cuenta vuelve a empezar ahí.',
  judged: 'Resultado confirmado.',
  sentBack: 'Devuelto al deportista.',

  // ── Poner uno ──────────────────────────────────────────────────────────────
  newTitle: 'Poner un reto',
  newBody:
    'Pide una sola cosa concreta grabada. Cuanto más exacto sea el enunciado, más útiles serán las respuestas.',
  fieldTitle: 'Título',
  fieldTitlePlaceholder: 'Treinta segundos de toques',
  fieldBrief: 'Qué grabar',
  fieldBriefPlaceholder:
    'Una sola toma, solo pies y muslos, el teléfono en el suelo para que se vea todo el cuerpo.',
  fieldRules: 'Cómo se juzga',
  fieldRulesPlaceholder: 'Sin cortes. El mejor de tres, no un montaje.',
  fieldMeasured: '¿Hay alguna cifra?',
  measuredYes: 'Se mide',
  measuredNo: 'Se juzga',
  fieldMetricLabel: 'Qué se cuenta',
  fieldMetricLabelPlaceholder: 'Toques',
  fieldMetricUnit: 'Unidad',
  fieldMetricUnitPlaceholder: 'toques',
  fieldBetter: 'Mejor es',
  betterHigher: 'Más alto',
  betterLower: 'Más bajo',
  fieldAges: 'Grupo de edad',
  fieldCloses: 'Cierra',
  closesIn7: 'En una semana',
  closesIn14: 'En dos semanas',
  closesIn30: 'En un mes',
  create: 'Publicar reto',
  created: 'El reto ya está publicado.',

  // ── Tarjeta de inicio ──────────────────────────────────────────────────────
  homeTitle: 'El reto de esta semana',
  homeCta: 'Verlo',
  homeEnteredCta: 'Ver la clasificación',
};
