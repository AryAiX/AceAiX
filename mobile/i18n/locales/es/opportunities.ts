/**
 * Oportunidades: el tablón de pruebas, un anuncio completo, la cola de revisión
 * del club, el formulario para publicar y la página de club a la que apunta una
 * oportunidad.
 *
 * Cuatro cosas conviene saber antes de traducir:
 *
 *  - `status.*` está escrito dos veces a propósito. El mismo valor guardado se
 *    lee distinto según quién mire la misma fila: `rejected` es un dato en la
 *    lista de un reclutador y una frase en la pantalla de alguien de 15 años.
 *    Traduce las dos voces; nunca las fundas en una.
 *  - `match.reason.*` es la lectura del deportista de un motivo que la base de
 *    datos emite en inglés. Los textos originales siguen en el código como
 *    claves de búsqueda: véase components/opportunities/MatchExplain.tsx.
 *  - `post.safetyBody` es texto de cumplimiento. Mantén su significado exacto
 *    —menores de 18, madre, padre o tutor informado, anuncios retirados— y deja
 *    `{{guidelines}}` donde la frase lo pida: ahí es donde se dibuja el enlace a
 *    las Normas de la comunidad.
 *  - Los deportes, las posiciones, los niveles y los tipos de oportunidad se
 *    guardan en inglés y se traducen a través de `constants/sports.ts`. Aquí no
 *    se repite ninguno.
 */
export const opportunities = {
  // ── Pestaña Oportunidades ───────────────────────────────────────────────────
  title: 'Oportunidades',
  athleteSubtitle: 'Pruebas, becas, contratos, campamentos',
  recruiterSubtitle: 'Tus anuncios y quién los solicitó',

  /** Todos los marcadores de esta zona dicen lo mismo: tablón, anuncio, club. */
  savedToast: 'Guardado. Lo tienes en Guardados.',

  tabs: {
    open: 'Abiertas',
    saved: 'Guardadas',
    applied: 'Solicitadas',
    postings: 'Mis anuncios',
    applicants: 'Candidatos',
  },

  /** Los deportes vienen de `sports.allSports`; solo la fila de tipo es nuestra. */
  allTypes: 'Todo',

  athlete: {
    appliedOn: 'Solicitada el {{date}}',

    openEmptyFilteredTitle: 'Nada coincide con esos filtros',
    openEmptyFilteredBody: 'Bórralos para ver todo lo que está abierto ahora mismo.',
    clearFilters: 'Borrar filtros',

    openEmptyTitle: 'Todavía no hay nada abierto en tu deporte',
    openEmptyBody: 'Sigue a clubes para enterarte antes.',
    findClubs: 'Buscar clubes',

    savedEmptyTitle: 'Todavía no guardaste nada',
    savedEmptyBody: 'Toca el marcador en todo aquello a lo que quieras volver.',
    browseOpen: 'Ver lo que está abierto',

    appliedEmptyTitle: 'Todavía no hay solicitudes',
    appliedEmptyBody: 'Cuando envíes una solicitud, podrás seguir aquí cada respuesta.',
    seeWhatsOpen: 'Ver lo que está abierto',
  },

  recruiter: {
    active: 'Activo',
    closed: 'Cerrado',
    /* Los dos de abajo se dicen dentro de una frase más larga, de ahí la minúscula. */
    activeA11y: 'activo',
    closedA11y: 'cerrado',
    openPosting: 'Abre el anuncio',
    reviewApplicants: 'Revisar candidatos',

    postingsEmptyTitle: 'Todavía no hay anuncios',
    postingsEmptyBody:
      'Publica una prueba, una beca o un campamento y lo verán primero los deportistas que encajan.',

    allApplicants:
      'Todos los que solicitaron alguno de tus anuncios, primero los que mejor encajan.',
    applicantsEmptyTitle: 'Todavía no hay candidatos',
    applicantsEmptyBody: 'Aparecerán aquí en cuanto alguien lo solicite.',
  },

  // ── Tarjeta de oportunidad ──────────────────────────────────────────────────
  card: {
    independent: 'Anuncio independiente',
    open: 'Abre la oportunidad',
    /* Se dice al final de la frase de accesibilidad de la tarjeta. */
    closedA11y: 'cerrada',
    save: 'Guardar {{title}} para después',
    unsave: 'Quitar {{title}} de guardados',
  },

  // ── En qué punto está una solicitud ─────────────────────────────────────────
  status: {
    /** Lo que lee el deportista que la envió. */
    athlete: {
      applied: 'Enviada',
      in_review: 'La están leyendo',
      shortlisted: 'En la preselección',
      invited: 'Invitación a la prueba',
      rejected: 'Esta vez no',
      withdrawn: 'Retirada',
    },
    /** Lo que lee el club que la revisa. */
    recruiter: {
      applied: 'Nueva',
      in_review: 'En revisión',
      shortlisted: 'Preseleccionado',
      invited: 'Invitado',
      rejected: 'Rechazado',
      withdrawn: 'Retirada',
    },
  },

  // ── El número de coincidencia y sus motivos ─────────────────────────────────
  match: {
    percentA11y: '{{percent}} por ciento de coincidencia',
    fitPercentA11y: '{{percent}} por ciento de encaje',
    why: 'Por qué encaja contigo',
    /** La lectura del deportista de lo que devolvió `private.match_reasons`. */
    reason: {
      sport: 'Tu deporte',
      position: 'Tu posición',
      region: 'Cerca de ti',
      topTier: 'Tu puntuación de talento es del nivel más alto',
      strongScore: 'Buena puntuación de talento',
    },
  },

  // ── Fila de candidato ───────────────────────────────────────────────────────
  applicant: {
    open: 'Abre su solicitud',
    talentScoreA11y: 'puntuación de talento {{score}}',
  },

  // ── Una oportunidad, completa ───────────────────────────────────────────────
  detail: {
    title: 'Oportunidad',
    more: 'Más acciones',
    /** La línea que va encima del enlace en un mensaje compartido. */
    shareText: '{{title}} — {{club}}',
    shareClubFallback: 'en AceAiX',

    missingTitle: 'No encontramos eso',
    missingBody: 'El enlace puede estar roto o caducado.',
    goneTitle: 'Esta ya no está',
    goneBody: 'El club la retiró, o se cerró. Hay muchas más abiertas.',
    seeWhatsOpen: 'Ver lo que está abierto',

    save: 'Guardar para después',
    unsave: 'Quitar de guardados',

    reviewApplicants_one: 'Revisar {{count}} candidato',
    reviewApplicants_many: 'Revisar {{count}} candidatos',
    reviewApplicants_other: 'Revisar {{count}} candidatos',

    withdraw: 'Retirar la solicitud',
    withdrawA11y: 'Retirar esta solicitud',
    withdrawn: 'Retirada.',
    applicationsClosed: 'Solicitudes cerradas',

    openClub: 'Abrir {{club}}',
    viewClub: 'Ver el club',
    postedByMember: 'Publicado por un miembro',
    closed: 'Cerrada',

    about: 'Sobre esto',

    factType: 'Tipo',
    factSport: 'Deporte',
    factPosition: 'Posición',
    factWhere: 'Dónde',
    factDeadline: 'Fecha límite',
    factPosted: 'Publicado',
    noDeadline: 'Sin fecha límite',

    /* Una prueba es una cita real con desconocidos. Que esto quede claro. */
    safety:
      'Avisa a tu madre, padre, tutor o entrenador antes de ir a algo en persona. Nadie en AceAiX debería pedirte dinero nunca.',

    menuTitle: 'Esta oportunidad',
    reportHint: 'Cuéntanos qué pasa. Las denuncias son privadas.',
  },

  report: {
    title: 'Denunciar este anuncio',
    subtitle: 'Elige el motivo más cercano. Nunca decimos quién denunció.',
    thanks: 'Gracias por contárnoslo. Nuestro equipo lo revisará.',
    reason: {
      childSafety: 'Protección de menores',
      childSafetyHint: 'No es seguro para menores de 18',
      scam: 'Estafa o petición de dinero',
      impersonation: 'Se hace pasar por un club real',
      misleading: 'Engañoso o falso',
      spam: 'Spam',
      other: 'Otra cosa',
    },
  },

  apply: {
    send: 'Enviar solicitud',
    sent: 'Enviada. Verán tu perfil junto a ella.',
    messageLabel: 'Tu mensaje',
    messagePlaceholder: 'Cuéntales por qué encajas: con dos o tres líneas basta.',
    whatTheySee: 'Lo que van a ver',
    seeProfile: 'Tu nombre y tu perfil',
    seeScore: 'Tu Puntuación de talento',
    seeHighlights: 'Tus destacados y tus estadísticas',
    seeMessage: 'El mensaje que escribas arriba',
    guardianNotice: 'Tu madre, padre o tutor podrá ver las solicitudes que envíes.',
  },

  // ── Revisar quién lo solicitó ───────────────────────────────────────────────
  applicants: {
    title: 'Candidatos',
    /** La fila de filtros reutiliza los estados del reclutador; solo «todos» es nuestro. */
    filterAll: 'Todos',
    /** Un filtro: la fase y cuántos están en ella. */
    filterChip: '{{label}} {{count}}',
    ranked: 'Ordenados por cuánto encaja cada deportista con este anuncio.',

    missingTitle: 'No encontramos ese anuncio',
    missingBody: 'El enlace puede estar roto o caducado.',
    backToOpportunities: 'Volver a oportunidades',

    lockedTitle: 'No puedes revisar este anuncio',
    lockedBody:
      'Solo el club o el entrenador que lo publicó, y el personal que añadió, pueden ver quién lo solicitó.',

    emptyTitle: 'Todavía no lo solicitó nadie',
    emptyBody:
      'Los deportistas que encajan con este anuncio lo ven primero. Dale un día o dos.',
    emptyStageTitle: 'Nadie en esa fase',
    emptyStageBody: 'Prueba con otro filtro.',
    showEveryone: 'Ver a todos',

    scoreLine: 'Puntuación de talento {{score}}',
    noMessage: 'No escribió ningún mensaje.',
    viewProfile: 'Ver el perfil completo',

    moveForward: 'Pasar de fase',
    shortlist: 'Preseleccionar',
    shortlistDone: 'Preseleccionado.',
    invite: 'Invitar a la prueba',
    inviteDone: 'Invitado a la prueba.',
    reject: 'Rechazar',
    rejectDone: 'Marcado como rechazado.',

    notified: 'Recibirá el aviso: AceAiX se lo envía por ti.',
  },

  // ── Publicar una oportunidad ────────────────────────────────────────────────
  post: {
    title: 'Publicar una oportunidad',
    submit: 'Publicar',
    posted: 'Publicado. Lo verán primero los deportistas que encajan.',
    checkFields: 'Revisa los campos marcados.',

    titleLabel: 'Título',
    titlePlaceholder: 'Prueba de portero sub-16',
    titleHint: 'Corto y concreto. Es lo primero que miran los deportistas.',
    titleError: 'Ponle un título que los deportistas reconozcan.',

    typeLabel: '¿Qué es?',
    typeError: 'Elige qué es esto.',
    /** Se lee como una sola frase: el tipo y luego lo que significa. */
    typeA11y: '{{label}}. {{hint}}',

    sportLabel: 'Deporte',
    sportError: 'Elige el deporte.',

    positionLabel: 'Posición',
    positionHint: 'Déjalo abierto si puede solicitarlo cualquier posición.',
    positionAny: 'Cualquiera',

    whereLabel: 'Dónde',
    wherePlaceholder: 'Dubái, EAU',
    whereError: '¿Dónde ocurre esto?',

    deadlineLabel: 'Las solicitudes cierran',
    deadlineNone: 'Sin fecha límite',
    deadlineChoose: 'Elige una fecha de cierre',
    deadlineChange: 'Las solicitudes cierran el {{date}}. Cambiar la fecha',
    deadlineClearA11y: 'Borrar la fecha de cierre',
    deadlineError: 'Elige una fecha futura.',

    detailsLabel: 'Detalles',
    detailsPlaceholder: 'Qué pasa ese día, para quién es y qué hay que llevar.',
    detailsError_one: 'Cuenta un poco más: al menos {{count}} carácter.',
    detailsError_many: 'Cuenta un poco más: al menos {{count}} caracteres.',
    detailsError_other: 'Cuenta un poco más: al menos {{count}} caracteres.',

    previewTitle: 'Lo que verán los deportistas',
    previewHint:
      'El porcentaje de coincidencia se calcula para cada deportista, así que aquí no se muestra.',
    previewPlaceholder: 'Aquí va tu título',

    /* Texto de cumplimiento. Cada parte pesa: mantén las tres. */
    safetyTitle: 'Antes de publicar',
    safetyBody:
      'Muchos deportistas de AceAiX son menores de 18. Las pruebas deben hacerse con su madre, padre o tutor informado, y AceAiX puede retirar los anuncios que no cumplan nuestras {{guidelines}}.',
    safetyLinkA11y: 'Leer las Normas de la comunidad',
  },

  // ── Página del club ─────────────────────────────────────────────────────────
  org: {
    missingTitle: 'No encontramos ese club',
    missingBody: 'El enlace puede estar roto o caducado.',
    backToDiscover: 'Volver a descubrir',
    goneTitle: 'Este club no está en AceAiX',
    goneBody: 'Puede que se haya eliminado.',

    /* `club` y `federation` vienen de common; una academia solo es un tipo de
       organización, así que vive aquí. */
    typeAcademy: 'Academia',

    /* `value` es el recuento ya abreviado para la insignia: «1,2 K». */
    followers_one: '{{value}} seguidor',
    followers_many: '{{value}} seguidores',
    followers_other: '{{value}} seguidores',
    followA11y: 'Seguir a {{name}}',
    unfollowA11y: 'Dejar de seguir a {{name}}',

    tabAbout: 'Información',
    tabOpenings: 'Vacantes',
    tabOpeningsCount: 'Vacantes {{count}}',

    noIntro: 'Este club todavía no escribió una presentación.',
    factType: 'Tipo',
    factLeague: 'Liga',
    factBasedIn: 'Con sede en',

    unverified:
      'AceAiX todavía no ha verificado este club. Comprueba con quién hablas antes de viajar a ningún sitio.',

    openingsEmptyTitle: 'Ahora mismo no hay nada abierto',
    openingsEmptyFollowing: 'Ya les sigues, así que te enterarás cuando abran algo.',
    openingsEmptyBody: 'Síguelos para enterarte antes cuando abran algo.',
  },
};
