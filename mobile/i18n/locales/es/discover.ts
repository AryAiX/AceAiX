/**
 * Descubrimiento y búsqueda.
 *
 * Agrupado en el orden de las pantallas: la pestaña Descubrir (primero la cara
 * del reclutador, luego la de Explorar del deportista), las piezas que ambos
 * comparten —motivos de coincidencia, tarjetas, filas— y por último la pantalla
 * de búsqueda.
 *
 * Dos cosas conviene saber antes de traducir:
 *
 *  - `reason.*` refleja los textos que emite `private.match_reasons` en SQL. El
 *    texto en inglés es el de la base de datos; estas claves solo son cómo se
 *    lee en voz alta.
 *  - `board.*` lo leen adolescentes mirando dónde están. Aquí nada le dice a
 *    nadie que va por detrás, y ninguna traducción debería hacerlo: la
 *    clasificación nombra puestos que la gente ya ocupa y mira hacia delante.
 */
export const discover = {
  // ── Pestaña Descubrir ──────────────────────────────────────────────────────
  title: 'Descubre talento',
  athleteSubtitle: 'Clubes, entrenadores y dónde estás tú',
  searchPeople: 'Buscar personas y clubes',
  queryPlaceholder: 'Nombre, club, posición',
  queryLabel: 'Buscar deportistas',
  filterResults: 'Filtrar resultados',
  filterResultsActive: 'Filtrar resultados, hay filtros activos',

  // Nombres de pestaña y ámbito compartidos entre Explorar y la búsqueda.
  tabAthletes: 'Deportistas',
  tabCoaches: 'Entrenadores',
  tabClubs: 'Clubes',
  tabLeaderboard: 'Clasificación',

  // ── Seleccionados para ti ──────────────────────────────────────────────────
  matchedForYou: 'Seleccionados para ti',
  editBrief: 'Editar criterios',
  noneFitBrief: 'Todavía no encaja nadie con tus criterios. Amplíalos y seguimos buscando.',
  briefTitle: 'Cuéntanos a quién buscas',
  briefBody:
    'Define una vez tu deporte, las posiciones y el rango de edad. Después cada deportista muestra cuánto encaja, y los motivos detrás del número.',
  briefAction: 'Definir mis criterios',
  briefSaved: 'Guardado. A partir de ahora buscaremos con esto.',

  // ── Lista de resultados ────────────────────────────────────────────────────
  searching: 'Buscando…',
  sortedByA11y: 'Ordenado por {{sort}}. Cambiar el orden',
  rankedByFit: 'Ordenados por encaje. Cada tarjeta muestra los motivos de su coincidencia.',
  rankedByScore:
    'Ordenados por puntuación de talento. Añade un filtro para ver cuánto encaja cada deportista contigo.',
  savedToShortlist: 'Guardado en tu preselección',
  emptyTitle: 'Ningún deportista coincide',
  emptyFilteredBody:
    'Prueba a ampliar el rango de edad, añadir un país o borrar la búsqueda.',
  emptyOpenBody: 'Los deportistas aparecen aquí a medida que completan su perfil.',
  clearFilters: 'Borrar filtros',

  // ── Hoja de ordenación ─────────────────────────────────────────────────────
  sortTitle: 'Ordenar resultados',
  sort: {
    match: 'Mejor coincidencia',
    matchHint: 'Cuánto encaja cada deportista con tus filtros',
    score: 'Puntuación más alta',
    scoreHint: 'Puntuación de talento, de mayor a menor',
    recent: 'Activos hace poco',
    recentHint: 'Perfiles actualizados más recientemente',
    name: 'Nombre',
    nameHint: 'De la A a la Z',
  },

  // ── Hoja de filtros ────────────────────────────────────────────────────────
  filters: {
    title: 'Filtrar resultados',
    subtitle:
      'Cada filtro que pongas se convierte en un motivo detrás del porcentaje de coincidencia.',
    preferencesTitle: '¿A quién buscas?',
    preferencesSubtitle:
      'Lo usamos para elegir a los deportistas de Seleccionados para ti, y para explicar cada coincidencia.',

    sport: 'Deporte',
    position: 'Posición',
    positionHint: 'Elige primero un deporte.',
    level: 'Nivel',
    country: 'País',
    findCountry: 'Buscar un país',
    moreCountries_one: '{{count}} más: escribe para acotar la lista.',
    moreCountries_many: '{{count}} más: escribe para acotar la lista.',
    moreCountries_other: '{{count}} más: escribe para acotar la lista.',
    noCountryMatch: 'Ningún país coincide.',

    age: 'Edad',
    anyAge: 'Cualquier edad',
    youngest: 'Mínima',
    oldest: 'Máxima',
    any: 'Cualquiera',

    minScore: 'Puntuación de talento mínima',
    anyScore: 'Cualquier puntuación',
    tierAndAbove: '{{tier}} o superior',
    scoreFloor: 'Solo deportistas con {{score}} o más.',

    openOnly: 'Solo abiertos a ofertas',
    openOnlyA11y: 'Mostrar solo deportistas abiertos a ofertas',

    // Controles de paso. `name` es uno de los tres de abajo, para que un lector
    // de pantalla diga «Aumentar edad mínima».
    decrease: 'Reducir {{name}}',
    increase: 'Aumentar {{name}}',
    youngestAgeName: 'edad mínima',
    oldestAgeName: 'edad máxima',
    minScoreName: 'puntuación de talento mínima',

    // El botón promete un número real, contado antes de tocarlo.
    showResults: 'Ver resultados',
    noMatchesYet: 'Ninguna coincidencia',
    showCount_one: 'Ver {{count}} resultado',
    showCount_many: 'Ver {{count}} resultados',
    showCount_other: 'Ver {{count}} resultados',
  },

  // ── La insignia de coincidencia y sus motivos ──────────────────────────────
  matchPercentA11y: '{{percent}} por ciento de coincidencia',
  /** Refleja `private.match_reasons`. Véase components/discover/MatchBadge.tsx. */
  reason: {
    sport: 'Practica tu deporte',
    position: 'Coincide con la posición que buscas',
    age: 'Dentro de tu rango de edad',
    level: 'Compite en el nivel que buscas',
    country: 'Está en tu zona',
    topTier: 'Puntuación de talento del nivel más alto',
    strongScore: 'Buena puntuación de talento',
  },

  // ── Tarjeta de deportista ──────────────────────────────────────────────────
  card: {
    openProfile: 'Abre el perfil',
    scorePillA11y: 'Puntuación de talento {{score}} sobre 100, nivel {{tier}}',
    talentScoreA11y: 'puntuación de talento {{score}}',
    openToOffers: 'Abierto a ofertas',
    save: 'Guardar a {{name}} en tu preselección',
    unsave: 'Quitar a {{name}} de tu preselección',
  },

  // ── Explorar: la cara de Descubrir para el deportista ──────────────────────
  explore: {
    searchClubsPlaceholder: 'Buscar clubes y academias',
    searchClubsA11y: 'Buscar clubes',
    searchCoachesPlaceholder: 'Buscar entrenadores',
    searchCoachesA11y: 'Buscar entrenadores',
    anywhere: 'En cualquier lugar',
    countryTitle: 'País',
    countrySubtitle: 'Acota la clasificación a un solo país.',

    noClubsFound: 'No se encontraron clubes',
    noClubsFoundBody: 'Prueba con un nombre más corto, o busca la ciudad.',
    noClubsYet: 'Todavía no hay clubes',
    noClubsYetBody: 'Los clubes aparecen aquí a medida que se unen a AceAiX.',

    noCoachesFound: 'No se encontraron entrenadores',
    noCoachesFoundBody:
      'Prueba con parte del nombre, o borra la búsqueda para verlos a todos.',
    noCoachesYet: 'Todavía no hay entrenadores',
    noCoachesYetBody: 'Los entrenadores aparecen aquí a medida que se unen a AceAiX.',
  },

  // ── Clasificación ──────────────────────────────────────────────────────────
  // Que anime en todos los idiomas. Un puesto es un lugar que alguien ocupa,
  // nunca una carencia, y el pie va dirigido a todos los que siguen subiendo.
  board: {
    caption:
      'Mejores puntuaciones de talento en {{scope}}. Las puntuaciones se mueven según crecen los perfiles.',
    everySport: 'todos los deportes',
    scopeInCountry: '{{sport}}, {{country}}',
    keepBuilding:
      'Cada destacado, estadística y verificación que añadas mueve tu puntuación. Sigue construyendo.',
    emptyTitle: 'Todavía no hay nada en esta clasificación',
    emptyBody: 'Prueba con otro deporte u otro país, o sé el primero en aparecer.',
    you: 'Tú',
    rankA11y: 'Número {{rank}}',
    youA11y: '{{name}}, eres tú',
    scoreA11y: 'puntuación de talento {{score}}, nivel {{tier}}',
  },

  // ── Filas de club y de entrenador ──────────────────────────────────────────
  club: {
    /* `club` y `federation` vienen de common; una academia solo es un tipo de
       organización, así que vive aquí. */
    typeAcademy: 'Academia',
    openClub: 'Abre la página del club',
  },
  followers_one: '{{value}} seguidor',
  followers_many: '{{value}} seguidores',
  followers_other: '{{value}} seguidores',
  followA11y: 'Seguir a {{name}}',
  unfollowA11y: 'Dejar de seguir a {{name}}',

  // ── Pantalla de búsqueda ───────────────────────────────────────────────────
  search: {
    back: 'Volver',
    fieldPlaceholder: 'Deportistas, entrenadores, clubes',
    fieldA11y: 'Buscar en AceAiX',
    recent: 'Recientes',
    clearRecentsA11y: 'Borrar búsquedas recientes',
    trySport: 'Prueba con un deporte',
    emptyTitle: 'Nada para «{{term}}»',
    emptyBody:
      'Prueba con menos palabras, o con un club, una ciudad o una posición. También puedes cambiar de pestaña arriba.',
    clearSearch: 'Borrar la búsqueda',
  },
};
