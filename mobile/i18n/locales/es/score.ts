/**
 * La Puntuación de talento: la tarjeta del perfil y la pantalla que hay detrás.
 *
 * Dos cosas tienen que sobrevivir intactas a la traducción:
 *
 * 1. Los pesos de los pilares. Son perfil 15, rendimiento 30, contenido 15,
 *    credibilidad 20 y actividad 20, y coinciden con
 *    `private.compute_talent_score`. Se puede reescribir un pilar, nunca
 *    renumerarlo.
 * 2. La explicación. Tiene que seguir diciendo que la puntuación sale de lo que
 *    hay en el perfil, que los datos que podemos comprobar valen más que los
 *    escritos a mano, y que el número mide un perfil y no a una persona.
 *    Ninguna de esas tres frases es decoración.
 *
 * Los nombres de nivel viven en `common` (tierRising … tierElite) porque se
 * leen en varios sitios.
 */
export const score = {
  // ── Tarjeta de puntuación (components/profile/ScoreCard.tsx) ───────────────
  cardEmptyBody: 'Tu puntuación aparece en cuanto tu deporte y tu posición estén en el perfil.',
  cardA11y:
    'Puntuación de talento {{score}} sobre 100, nivel {{tier}}. Abre el desglose completo.',
  tierLine: 'Nivel {{tier}}',
  topPercent: 'Top {{percent}} % de los deportistas de tu deporte',
  rankingBuilding: 'Tu clasificación crece a medida que completas tu perfil.',
  pointsUp_one: '+{{count}} punto',
  pointsUp_many: '+{{count}} puntos',
  pointsUp_other: '+{{count}} puntos',
  pointsDown_one: '-{{count}} punto',
  pointsDown_many: '-{{count}} puntos',
  pointsDown_other: '-{{count}} puntos',
  sinceLastTime: 'desde la última vez',

  // ── Pantalla de la puntuación (app/score.tsx) ──────────────────────────────
  howCalculated: 'Cómo se calcula',

  notReadyTitle: 'Tu puntuación todavía no está lista',
  notReadyBody:
    'Añade tu deporte y tu posición y podremos calcular tu Puntuación de talento.',
  notReadyAction: 'Completar tu perfil',

  deltaUpSince: '+{{count}} desde la última vez',
  deltaDownSince: '-{{count}} desde la última vez',

  curveTitle: 'Tu curva',
  historyLoading: 'Cargando tu historial…',
  historyEmpty:
    'Tu historial empieza a construirse hoy. Vuelve mañana para ver moverse la línea.',
  sparklineA11y_one: 'Historial de la puntuación de {{count}} día, de {{min}} a {{max}}.',
  sparklineA11y_many: 'Historial de la puntuación de {{count}} días, de {{min}} a {{max}}.',
  sparklineA11y_other: 'Historial de la puntuación de {{count}} días, de {{min}} a {{max}}.',
  sparklineA11yPlain: 'Historial de la puntuación',
  sparklineLow: 'Mínimo {{value}}',
  sparklineHigh: 'Máximo {{value}}',

  pillarsTitle: 'Qué forma tu puntuación',
  tipsTitle: 'Súbela',
  gotIt: 'Entendido',

  // ── Hoja explicativa (app/score.tsx) ───────────────────────────────────────
  howIntro:
    'Tu Puntuación de talento se calcula a partir de lo que hay en tu perfil, y de nada más. Cuentan cinco cosas:',
  howBulletProfile: 'Cuánto has rellenado tu perfil.',
  howBulletPerformance: 'Los partidos, los minutos y los números que registraste.',
  howBulletMedia: 'Los clips que un entrenador puede ver.',
  howBulletCredibility: 'La verificación, tu club y los avales de entrenadores.',
  howBulletEngagement: 'Lo activo que eres y quién ha mirado tu perfil.',
  howVerified:
    'La información que podemos comprobar cuenta más que la que escribes tú. Una cuenta verificada, un club vinculado y un partido confirmado por un club valen más que lo mismo escrito a mano.',
  howRecalculated:
    'Nuestros servidores vuelven a calcular el número cada vez que algo de eso cambia. Ni tú ni nadie más puede editarlo.',
  howNotYouTitle: 'Mide tu perfil, no a ti.',
  howNotYouBody:
    'Una puntuación baja significa que quedan cosas por añadir, no que seas peor jugador. Ningún entrenador decide solo con este número.',

  // ── Los cinco pilares (components/profile/PillarList.tsx) ──────────────────
  /** El peso es un número de la base de datos: traduce la etiqueta, no la cifra. */
  pillarWeight: '{{label}}  ·  {{weight}} %',
  pillarPerformance: 'Rendimiento',
  pillarPerformanceExplain: 'Partidos, minutos y números que registraste',
  pillarCredibility: 'Credibilidad',
  pillarCredibilityExplain: 'Verificación, tu club y avales',
  pillarEngagement: 'Actividad',
  pillarEngagementExplain: 'Lo activo que eres y quién te mira',
  pillarProfile: 'Perfil',
  pillarProfileExplain: 'Lo completo que está tu perfil',
  pillarMedia: 'Contenido',
  pillarMediaExplain: 'Clips que un entrenador puede ver de verdad',

  // ── Consejos (components/profile/TipList.tsx) ──────────────────────────────
  /**
   * Solo la etiqueta del botón es nuestra. El título y el detalle del consejo
   * los escribe `private.build_score_tips` y llegan en inglés: véase TipList.tsx.
   */
  tipPoints: '+{{points}} ptos',
  tipOpen: 'Abrir',
  tipAction: {
    addHighlights: 'Añadir un clip',
    completeProfile: 'Completar perfil',
    logMatches: 'Registrar un partido',
    getVerified: 'Verificarme',
    askEndorsement: 'Buscar un entrenador',
    linkClub: 'Vincular tu club',
    postUpdate: 'Publicar algo',
  },
  tipsEmptyTitle: 'No queda nada en la lista',
  tipsEmptyBody:
    'Ya hiciste todo lo que te sugeriríamos ahora mismo. Sigue jugando y sigue publicando.',

  // ── El simulador (app/score.tsx) ───────────────────────────────────────────
  simTitle: '¿Qué haría falta?',
  simBody:
    'Mueve un control para ver dónde quedaría el número. La proyección hace el mismo cálculo que tu puntuación real, en el servidor, así que no puede contradecirla en silencio.',
  simProjected: 'Proyectada',
  simNow: 'Ahora',
  simNoChange: 'Mueve algo para ver la diferencia.',
  simReset: 'Restablecer',
  simUnlocksTier: 'Eso te pondría en {{tier}}.',
  simGain_one: '+{{count}} punto',
  simGain_many: '+{{count}} puntos',
  simGain_other: '+{{count}} puntos',
  simHonest:
    'Es una proyección, no una promesa: da por hecho que el trabajo es real y que los resultados se sostienen.',

  simVideos: 'Clips destacados',
  simMatches: 'Partidos registrados este año',
  simVerified: 'De esos, verificados',
  simEndorsements: 'Avales',
  simExpert: 'De esos, de entrenadores o clubes',
  simPosts: 'Publicaciones este mes',
  simFollowers: 'Seguidores',
  simProfile: 'Campos del perfil rellenados',
  simAccountVerified: 'Cuenta verificada',
  simClubLinked: 'Club vinculado',

  // ── La lectura escrita (supabase/functions/talent-insights) ────────────────
  insightTitle: 'Lectura de tu perfil',
  insightLoading: 'Repasando tus números…',
  insightUnavailable:
    'El resumen escrito no está disponible ahora mismo. Los pilares de abajo dicen lo mismo con números.',
  insightRefresh: 'Escribirlo otra vez',
};
