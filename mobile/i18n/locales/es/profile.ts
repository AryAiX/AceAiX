/**
 * Perfiles: el mío, el de otra persona, las pestañas de debajo, las listas de
 * seguidores y el formulario de edición.
 *
 * Agrupado en el orden de las pantallas. Todo lo que además aparece en otras
 * partes de la app (Seguidores, Publicaciones, Clips, Partidos, Avales, Seguir,
 * Mensaje, Verificado) se toma de `common` en vez de repetirse aquí.
 *
 * Sobre los valores guardados: los deportes, las posiciones, los niveles y el
 * lado dominante se guardan en inglés en la base de datos y se traducen al
 * mostrarlos, a través de `constants/sports.ts`. Los nombres de país se guardan
 * tal y como se escribieron, así que tampoco se traducen: véase
 * PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── El perfil de otra persona (app/u/[id].tsx) ─────────────────────────────
  title: 'Perfil',
  thisPerson: 'Esta persona',

  notFoundTitle: 'No encontramos ese perfil',
  notFoundBody: 'El enlace que seguiste no apunta a nadie de AceAiX.',
  notFoundAction: 'Volver',

  blockedTitle: 'No puedes ver este perfil',
  blockedByYouBody: 'Bloqueaste a {{name}}. Desbloquéale para ver su perfil otra vez.',
  blockedBody: 'Este perfil no está disponible para ti.',
  unblockedToast: 'Desbloqueado.',

  suspendedTitle: 'Esta cuenta no está disponible',
  suspendedBody: 'Está suspendida mientras nuestro equipo la revisa.',

  // ── Cabecera del perfil (components/profile/ProfileHeader.tsx) ─────────────
  openToOffers: 'Abierto a ofertas',
  followersA11y_one: '{{count}} seguidor. Abre la lista.',
  followersA11y_many: '{{count}} seguidores. Abre la lista.',
  followersA11y_other: '{{count}} seguidores. Abre la lista.',
  followingA11y_one: 'Sigue a {{count}} persona. Abre la lista.',
  followingA11y_many: 'Sigue a {{count}} personas. Abre la lista.',
  followingA11y_other: 'Sigue a {{count}} personas. Abre la lista.',

  editProfile: 'Editar perfil',
  settings: 'Ajustes',
  moreOptions: 'Más opciones',
  messageLimitedHint:
    'Los mensajes están limitados en esta cuenta. Toca para saber por qué.',

  shareProfile: 'Compartir perfil',
  /** El enlace no se traduce; solo la frase que lo rodea. */
  shareMessage: '{{name}} en AceAiX — {{url}}',

  reportAccount: 'Denunciar esta cuenta',
  reportAccountSubtitle: 'Nuestro equipo revisa todas las denuncias',
  reportSheetSubtitle:
    'Elige el motivo más cercano. A nadie se le dice que le denunciaste.',
  reportThanks: 'Gracias. Nuestro equipo lo revisará.',
  reportReason: {
    childSafety: 'Protección de menores',
    childSafetyHint: 'Un menor corre riesgo o es el objetivo',
    harassment: 'Acoso o intimidación',
    harassmentHint: 'Ataques dirigidos a alguien',
    hate: 'Discurso de odio',
    hateHint: 'Ataques por cómo es una persona',
    nudity: 'Desnudos o contenido sexual',
    nudityHint: 'Contenido que no debería estar aquí',
    violence: 'Violencia o amenazas',
    violenceHint: 'Amenazas o imágenes explícitas',
    impersonation: 'Se hace pasar por otra persona',
    impersonationHint: 'Una cuenta falsa',
    scam: 'Estafa o fraude',
    scamHint: 'Pruebas, cobros u ofertas falsas',
    spam: 'Spam',
    spamHint: 'Publicaciones repetidas o no deseadas',
    other: 'Otra cosa',
    otherHint: 'Cuéntanoslo con tus palabras',
  },

  blockPerson: 'Bloquear a {{name}}',
  blockPersonSubtitle: 'No podrá encontrarte ni escribirte',
  blockConfirmTitle: '¿Bloquear a {{name}}?',
  blockConfirmBody:
    '{{name}} no podrá escribirte, ni seguirte, ni ver lo que publicas. Puedes deshacerlo en Ajustes.',
  blockedToast: '{{name}} ya no puede verte ni escribirte.',

  /** Respuestas claras a «¿por qué no puedo escribir a esta persona?». */
  messageBlockTitle: 'No puedes escribir a esta cuenta',
  messageBlockNote:
    'Estas reglas protegen a los deportistas jóvenes. Las ponen el propio deportista, su madre, padre o tutor, y AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'Este deportista es menor de 18. Solo pueden empezar una conversación los entrenadores y clubes verificados.',
    minorRequiresGuardianConsent:
      'La madre, el padre o el tutor de este deportista todavía no aprobó los mensajes.',
    recipientMessagesOff: 'Esta persona desactivó los mensajes.',
    recipientOnlyAcceptsFollowed: 'Esta persona solo acepta mensajes de quienes sigue.',
    recipientOnlyAcceptsVerified:
      'Esta persona solo acepta mensajes de cuentas verificadas.',
    notPermitted: 'Ahora mismo no puedes empezar una conversación con esta cuenta.',
    notFound: 'No encontramos esta cuenta.',
  },
  gotIt: 'Entendido',

  // ── Fila de estadísticas (components/profile/StatRow.tsx) ──────────────────
  statA11y: '{{value}} {{label}}',

  // ── Pestañas (components/profile/ProfileTabs.tsx) ──────────────────────────
  tabHighlights: 'Destacados',
  tabCareer: 'Trayectoria',

  // ── Pestaña de publicaciones (components/profile/PostsTab.tsx) ─────────────
  postsEmptyTitleSelf: 'Todavía no hay publicaciones',
  postsEmptyTitleOther: 'Aún no ha publicado nada',
  postsEmptyBodySelf:
    'Comparte un entrenamiento, un resultado o un clip. Los perfiles activos se ven más.',
  postsEmptyBodyOther: 'Cuando publique algo, aparecerá aquí.',
  postsEmptyAction: 'Escribir una publicación',

  // ── Cuadrícula de contenido (components/profile/MediaGrid.tsx) ─────────────
  addHighlight: 'Añadir destacado',
  videoClipA11y: 'Clip de video',
  photoA11y: 'Foto',

  // ── Pestaña de destacados (components/profile/HighlightsTab.tsx) ───────────
  photoPermission: 'AceAiX necesita permiso para abrir tus fotos.',

  noHighlightsTitle: 'Aquí no hay destacados',
  noHighlightsBody: 'Los destacados forman parte del perfil de un deportista.',
  clipsEmptyTitleSelf: 'Los entrenadores miran antes de leer.',
  clipsEmptyTitleOther: 'Todavía no hay clips',
  clipsEmptyBodySelf: 'Añade tu primer clip. Tres cortos es el punto justo.',
  clipsEmptyBodyOther: 'Cuando suba un clip, aparecerá aquí.',
  clipsEmptyAction: 'Añadir tu primer clip',

  nameClipTitle: 'Ponle nombre a este clip',
  nameClipSubtitle: 'Un título corto ayuda al entrenador a saber qué está viendo.',
  clipTitleLabel: 'Título',
  clipTitlePlaceholderVideo: 'p. ej. Definición de zurda ante el Al Wasl',
  clipTitlePlaceholderPhoto: 'p. ej. Final de copa',
  addToProfile: 'Añadir al perfil',
  clipAddedToast: 'Añadido. Los entrenadores ya pueden verlo.',
  clipRemovedToast: 'Quitado.',

  holdToRemoveClip: 'Mantén pulsado un clip para quitarlo.',
  removeClipTitle: '¿Quitar este clip?',
  removeClipBody: 'Saldrá de tu perfil. Tu Puntuación de talento puede bajar.',
  mediaLoadFailed: 'No se pudo cargar este archivo. Inténtalo dentro de un momento.',

  // ── Pestaña de trayectoria (components/profile/CareerTab.tsx) ──────────────
  noCareerTitle: 'Sin trayectoria',
  noCareerBody: 'Esta sección es para perfiles de deportistas.',
  add: 'Añadir',

  matchesEmptyTitleSelf: 'Sin partidos registrados',
  matchesEmptyTitleOther: 'Todavía no hay partidos',
  matchesEmptyBodySelf:
    'Registrar los últimos 12 meses le enseña a un entrenador tu estado de forma.',
  matchesEmptyBodyOther: 'Aquí todavía no se registró nada.',
  matchFallback: 'Partido',
  matchVersus: 'vs. {{opponent}}',
  matchMinutes: '{{n}} min',
  matchGoals_one: '{{count}} gol',
  matchGoals_many: '{{count}} goles',
  matchGoals_other: '{{count}} goles',
  matchAssists_one: '{{count}} asistencia',
  matchAssists_many: '{{count}} asistencias',
  matchAssists_other: '{{count}} asistencias',

  honoursTitle: 'Palmarés',
  honoursEmptyTitleSelf: 'Todavía sin títulos',
  honoursEmptyTitleOther: 'Sin títulos en la lista',
  honoursEmptyBodySelf:
    'Ligas, copas, jugador de la temporada: cuenta todo lo que hayas ganado.',

  certificatesTitle: 'Certificados',
  certificatesEmptyTitleSelf: 'Todavía no hay certificados',
  certificatesEmptyTitleOther: 'Sin certificados en la lista',
  certificatesEmptyBodySelf:
    'Títulos de entrenador, primeros auxilios, protección de menores, idiomas.',

  endorsementsTitle: 'Avales',
  endorsementsEmptyTitle: 'Todavía no hay avales',
  endorsementsEmptyBodySelf:
    'Pídeselo a un entrenador que conozca tu juego. El de un entrenador verificado cuenta mucho.',

  logMatchTitle: 'Registrar un partido',
  logMatchSubtitle: 'Solo lo que recuerdes: puedes añadir más después.',
  matchDate: 'Fecha',
  matchDateHint: 'Año-mes-día',
  matchCompetition: 'Competición',
  matchCompetitionPlaceholder: 'Liga sub-16',
  matchOpponent: 'Rival',
  matchOpponentPlaceholder: 'Al Nasr',
  matchResult: 'Resultado',
  matchResultPlaceholder: 'Victoria 3-1',
  matchMinutesLabel: 'Minutos',
  matchGoalsLabel: 'Goles',
  matchAssistsLabel: 'Asistencias',
  saveMatch: 'Guardar partido',
  matchDateInvalid: 'Usa el formato AAAA-MM-DD, por ejemplo 2026-03-14.',
  matchAddedToast: 'Partido añadido.',

  addHonourTitle: 'Añadir un título',
  honourTitleLabel: '¿Qué ganaste?',
  honourTitlePlaceholder: 'Campeón de la liga sub-16',
  honourOrgLabel: 'Quién lo dio',
  honourOrgPlaceholder: 'Liga Juvenil de Dubái',
  honourYearLabel: 'Año',
  saveHonour: 'Guardar título',
  honourTitleRequired: 'Ponle un nombre al título.',
  honourAddedToast: 'Título añadido.',

  addCertificateTitle: 'Añadir un certificado',
  certificateTitleLabel: 'Certificado',
  certificateTitlePlaceholder: 'Primeros auxilios',
  certificateIssuerLabel: 'Emitido por',
  certificateIssuerPlaceholder: 'Media Luna Roja',
  certificateYearLabel: 'Año',
  saveCertificate: 'Guardar certificado',
  certificateTitleRequired: 'Ponle un nombre al certificado.',
  certificateAddedToast: 'Certificado añadido.',

  // ── Lista de personas (components/profile/PeopleList.tsx) ──────────────────
  searchThisList: 'Buscar en esta lista',
  noMatchTitle: 'Nadie coincide',
  noMatchBody: 'Prueba con otro nombre.',
  openProfileA11y: 'Abrir el perfil de {{name}}',

  // ── Seguidores y seguidos (app/u/[id]/…) ───────────────────────────────────
  followersEmptyTitle: 'Todavía no hay seguidores',
  followersEmptyBodySelf:
    'Publica un clip o una novedad. La gente sigue a los deportistas que aparecen.',
  followersEmptyBodyOther: 'Todavía nadie sigue esta cuenta.',
  followingEmptyTitleSelf: 'Todavía no sigues a nadie',
  followingEmptyTitleOther: 'Todavía no sigue a nadie',
  followingEmptyBodySelf:
    'Sigue a clubes, entrenadores y deportistas para llenar tu feed.',
  followingEmptyBodyOther: 'Esta cuenta todavía no sigue a nadie.',

  // ── Editar perfil (app/edit-profile.tsx) ───────────────────────────────────
  /* `editProfile`, arriba, es el título de esta pantalla y también el botón que la abre. */
  firstNameRequired: 'Tu nombre no puede quedar vacío.',
  savedScoreUp_one: 'Guardado. Tu Puntuación de talento subió {{count}} punto.',
  savedScoreUp_many: 'Guardado. Tu Puntuación de talento subió {{count}} puntos.',
  savedScoreUp_other: 'Guardado. Tu Puntuación de talento subió {{count}} puntos.',
  savedScoreDown_one: 'Guardado. Tu Puntuación de talento bajó {{count}} punto.',
  savedScoreDown_many: 'Guardado. Tu Puntuación de talento bajó {{count}} puntos.',
  savedScoreDown_other: 'Guardado. Tu Puntuación de talento bajó {{count}} puntos.',

  sectionYou: 'Tú',
  changePhotoA11y: 'Cambiar tu foto de perfil',
  uploadingPhoto: 'Subiendo…',
  tapToChangePhoto: 'Toca para cambiar tu foto',
  addCover: 'Añadir portada',
  changeCover: 'Cambiar portada',
  uploadingCover: 'Subiendo portada…',
  removeCover: 'Quitar portada',
  changeCoverA11y: 'Cambiar la portada de tu perfil',
  viewPhotoA11y: 'Ver la foto de {{name}}',
  firstName: 'Nombre',
  lastName: 'Apellido',
  bio: 'Sobre ti',
  bioPlaceholder: '¿En qué posición juegas y qué estás mejorando?',
  bioCounter: '{{n}} / {{max}}',
  city: 'Ciudad',
  cityPlaceholder: 'Dubái',
  country: 'País',
  countryPlaceholder: 'Elige un país',
  countryA11y: 'País. Ahora {{value}}. Abre un selector.',
  notSet: 'sin definir',

  sectionSport: 'Tu deporte',
  sport: 'Deporte',
  sportPlaceholder: 'Elige tu deporte',
  sportA11y: 'Deporte. Ahora {{value}}. Abre un selector.',
  position: 'Posición',
  level: 'Nivel',
  levelHintDefault: 'Elige el nivel en el que juegas ahora mismo.',
  league: 'Liga o competición',
  leaguePlaceholder: 'Liga Juvenil de Dubái',
  club: 'Club actual',
  clubPlaceholder: 'Academia Al Nasr',
  clubHint: 'Un club vinculado suma a tu puntuación de credibilidad.',

  sectionPhysical: 'Físico',
  height: 'Altura',
  heightUnit: 'cm',
  weight: 'Peso',
  weightUnit: 'kg',
  dominantSide: 'Lado dominante',

  sectionAvailability: 'Disponibilidad',
  openToOffersHint: 'Los entrenadores lo ven en tu perfil.',

  chooseSportTitle: 'Elige tu deporte',
  /** El emoji no se traduce; solo el orden de la marca y el nombre. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: '¿Dónde vives?',
  searchCountries: 'Buscar países',
  useTypedCountry: 'Usar «{{country}}»',
  useTypedCountryHint: '¿No está en la lista? Añádelo tú.',
  countryTypeToAdd: 'Empieza a escribir para añadir tu país.',

  // ── La tarjeta de jugador ──────────────────────────────────────────────────
  playerCard: 'Tarjeta de jugador',
  playerCardHint: 'Una tarjeta que puedes guardar y publicar.',
  playerCardBody: 'Todo lo que un reclutador miraría primero, en una sola imagen.',
  playerCardSaved: 'Guardada.',
  playerCardShared: 'Tarjeta lista para compartir.',
  playerCardFailed: 'No pudimos crear la tarjeta. Inténtalo de nuevo en un momento.',
  playerCardShare: 'Compartir',
  playerCardSave: 'Guardar imagen',
};
