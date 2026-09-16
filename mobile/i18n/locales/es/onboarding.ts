/**
 * El asistente de perfil, que se ejecuta una vez después del registro.
 *
 * Lo comparten tres caminos: un deportista que crea su perfil, un entrenador o
 * club que cuenta a quién busca, y una madre, un padre o un tutor que está aquí
 * para vigilar el perfil de un menor, no para crear el suyo.
 *
 * Los textos sobre la madre, el padre o el tutor son textos de cumplimiento.
 * Quien tiene entre 13 y 17 años no aparece en las búsquedas y nadie puede
 * escribirle hasta que su madre, padre o tutor lo apruebe: dilo con claridad y
 * no lo suavices nunca.
 */
export const onboarding = {
  // ── Estructura del asistente ──────────────────────────────────────────────
  loading: 'Preparando tu perfil',
  signOut: 'Cerrar sesión',
  skipForNow: 'Omitir por ahora',
  finish: 'Empezar a explorar',

  // ── Selector de país, compartido por deportistas y reclutadores ───────────
  countryLabel: 'País',
  countrySearchPlaceholder: 'Buscar países',
  countryNoMatch: 'Ningún país coincide. Prueba con una búsqueda más corta.',
  countryShowAll: 'Ver todos los países',

  // ── Deportista: deporte, posición, nivel ──────────────────────────────────
  sportTitle: '¿Qué deporte practicas?',
  sportSubtitle: 'Elige el deporte en el que más compites.',

  positionTitle: '¿En qué posición juegas?',
  positionSubtitle:
    'Elige la posición en la que juegas más a menudo. Puedes añadir más después.',
  positionNoneTitle: 'Aquí no hay posiciones',
  positionNoneBody:
    'Este deporte no se juega por posiciones, así que no hay nada que elegir. Toca {{action}} y sigue.',

  levelTitle: '¿En qué nivel estás?',
  levelSubtitle:
    'Sé sincero: los entrenadores buscan por nivel, y encajar bien vale más que exagerar.',

  // ── Deportista: dónde juegas ──────────────────────────────────────────────
  placeTitle: '¿Dónde juegas ahora?',
  placeSubtitle: 'Tu club y tu ciudad ayudan a que te encuentren los entrenadores cercanos.',
  clubLabel: 'Club o academia',
  clubPlaceholder: 'Academia Al Wasl',
  clubHint: 'Déjalo vacío si ahora mismo no estás en ningún club.',
  cityLabel: 'Ciudad',
  cityPlaceholder: 'Dubái',

  // ── Deportista: datos físicos ─────────────────────────────────────────────
  physicalTitle: 'Unos números',
  physicalSubtitle:
    'Todo opcional. Los reclutadores se fijan en ellos, pero puedes omitirlo y añadirlos cuando quieras.',
  heightLabel: 'Altura',
  heightPlaceholder: '172',
  heightHint: 'en cm',
  heightOutOfRange: 'Escribe una altura entre {{min}} y {{max}} cm.',
  weightLabel: 'Peso',
  weightPlaceholder: '64',
  weightHint: 'en kg',
  weightOutOfRange: 'Escribe un peso entre {{min}} y {{max}} kg.',
  strongSide: 'Lado dominante',

  // ── Aprobación del adulto, que se le pide al deportista menor de edad ─────
  guardianTitle: 'Incluye a un adulto',
  guardianSubtitle:
    'Eres menor de 18, así que tu madre, padre o tutor aprueba tu perfil antes de que nadie pueda encontrarte.',
  guardianApprovalTitle: 'Qué le pedimos que apruebe',
  guardianApprovalBody:
    'Le enviamos un correo con un enlace. Le explica quiénes somos y le pide que diga sí o no a dos cosas por separado. Puede cambiar de opinión y desactivar cualquiera de las dos cuando quiera, y no le escribiremos por nada más.',
  guardianSearchTitle: 'Apareces en las búsquedas',
  guardianSearchBody:
    'Los entrenadores y los clubes pueden encontrar tu perfil cuando buscan jugadores.',
  guardianMessageTitle: 'Los entrenadores verificados pueden escribirte',
  guardianMessageBody:
    'Solo adultos que hemos verificado. Nadie más puede empezar un chat contigo.',
  guardianWhoTitle: '¿Quién es?',
  guardianRelationshipParent: 'Mi madre o mi padre',
  guardianRelationshipGuardian: 'Otro tutor',
  guardianNameLabel: 'Su nombre',
  guardianNamePlaceholder: 'Leila Karimi',
  guardianNameRequired: 'Escribe su nombre.',
  guardianEmailLabel: 'Su correo',
  guardianEmailHint: 'Comprueba que está bien: el enlace de aprobación llega ahí.',
  guardianEmailRequired: 'Escribe su correo electrónico.',
  guardianEmailInvalid: 'Ese correo no parece correcto.',
  guardianSkip: 'Hacerlo después',
  guardianSkipHint:
    'Tu perfil sigue oculto para los entrenadores hasta que un adulto lo apruebe.',
  guardianSkipA11y:
    'Hacerlo después. Tu perfil sigue oculto hasta que tu madre, padre o tutor lo apruebe.',
  guardianSkipSheetTitle: '¿Lo dejas para después?',
  guardianSkipSheetMessage:
    'Tu perfil seguirá oculto. Los entrenadores no te encontrarán en las búsquedas y nadie podrá escribirte hasta que tu madre, padre o tutor lo apruebe. Puedes enviar el correo cuando quieras desde Ajustes.',
  guardianSkipSheetConfirm: 'Sí, lo dejo para después',
  guardianSkipSheetCancel: 'Mejor lo añado ahora',

  // ── Foto ──────────────────────────────────────────────────────────────────
  photoTitle: 'Ponle cara al nombre',
  photoSubtitle:
    'Una foto tuya, nítida y sin nadie más. Los perfiles con foto se miran mucho más.',
  photoSaved: 'Guardada. Se te ve bien.',
  photoOptional: 'Omítelo si prefieres hacerlo después: aquí nada es obligatorio.',
  photoChoose: 'Elegir de mis fotos',
  photoChooseAnother: 'Elegir otra foto',
  photoTake: 'Tomar una foto',
  photoUnreadable: 'No pudimos leer esa foto. Prueba con otra.',
  photoLibraryDenied:
    '{{app}} necesita permiso para abrir tus fotos. Puedes activarlo en Ajustes.',
  photoLibraryFailed: 'No pudimos abrir tus fotos. Inténtalo otra vez.',
  photoCameraDenied:
    '{{app}} necesita permiso para usar la cámara. Puedes activarlo en Ajustes.',
  photoCameraFailed: 'No pudimos abrir la cámara. Inténtalo otra vez.',

  // ── Reclutador: deportes, cargo, lugar, objetivo ──────────────────────────
  recruiterSportsTitle: '¿En qué deportes trabajas?',
  recruiterSportsSubtitle:
    'Elige los que quieras. Con esto te mostramos a los deportistas adecuados.',

  recruiterRoleTitle: 'Cuéntanos tu cargo',
  recruiterRoleSubtitle:
    'Lo ven los deportistas y sus familias, así que hazlo simple y verdadero.',
  recruiterRoleLabel: 'Tu cargo',
  recruiterRolePlaceholderClub: 'Director de la academia',
  recruiterRolePlaceholderCoach: 'Entrenador principal, sub-16',
  recruiterRoleRequired: 'Cuéntanos a qué te dedicas.',
  recruiterClubLabel: 'Nombre del club o la academia',
  recruiterClubHintClub: 'Lo usaremos al crear la página de tu club.',
  recruiterClubHintCoach: 'Déjalo vacío si trabajas por tu cuenta.',

  recruiterPlaceTitle: '¿Dónde estás?',
  recruiterPlaceSubtitle: 'Ponemos arriba del todo a los deportistas que tienes cerca.',

  recruiterTargetTitle: '¿A quién buscas?',
  recruiterTargetSubtitle:
    'Con una respuesta aproximada basta. Puedes cambiarlo todo después en tus ajustes.',
  recruiterPositionsTitle: 'Posiciones',
  recruiterPositionsEmpty: 'Vuelve un paso y elige un deporte para ver sus posiciones.',
  recruiterAgeGroupTitle: 'Grupo de edad',
  recruiterMinorsNote:
    'Los deportistas menores de 18 solo aparecen cuando su madre, padre o tutor ha aprobado su perfil.',
  ageBandAny: 'Cualquier edad',
  ageBandUnder14: 'Menos de 14',
  ageBand14To16: 'De 14 a 16',
  ageBand16To18: 'De 16 a 18',
  ageBand18To21: 'De 18 a 21',
  ageBand21Plus: '21 o más',

  // ── Madre, padre o tutor: cómo funciona ───────────────────────────────────
  guardianIntroTitle: 'Cómo funciona para ti',
  guardianIntroSubtitle:
    'Estás aquí para cuidar el perfil de tu hijo o hija, no para crear uno tuyo.',
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: 'Vincúlate con tu hijo o hija',
  guardianIntroLinkBody:
    'Abre Ajustes y elige Madre, padre o tutor. Si ya te envió un correo de aprobación, el enlace os conecta al momento.',
  guardianIntroDecideTitle: 'Decide qué puede hacer',
  guardianIntroDecideBody:
    'Dices sí o no a dos cosas: si los entrenadores pueden encontrarle en las búsquedas y si los entrenadores verificados pueden escribirle.',
  guardianIntroChangeTitle: 'Cambia de opinión cuando quieras',
  guardianIntroChangeBody:
    'Puedes desactivar cualquiera de las dos en cualquier momento desde Ajustes, y su perfil sale de las búsquedas al instante.',
  guardianIntroFooter:
    'Hasta que lo apruebes, el perfil de tu hijo o hija sigue oculto. Nadie puede buscarle y ningún adulto puede escribirle primero.',

  // ── Final: deportista ─────────────────────────────────────────────────────
  scoreLoading: 'Calculando tu puntuación',
  scoreErrorNote:
    'Tu perfil se guarda igual: puedes seguir y consultar tu puntuación después.',
  athleteDoneTitle: 'Bien hecho',
  athleteDoneTitleNamed: 'Bien hecho, {{name}}',
  athleteDoneScored: 'Tu perfil ya está activo. Aquí es donde empiezas: {{tier}}.',
  athleteDoneNoScore:
    'Tu perfil ya está activo. Añade un poco más y tu Puntuación de talento aparecerá en él.',
  tipsTitle: 'Cómo subirla',
  tipPoints: '+{{points}}',
  tipsEmpty:
    'Publica una jugada, añade tus estadísticas y pide a tu club que te respalde. Cada cosa que añadas mueve la puntuación.',
  guardianRequested:
    'Le escribimos a {{name}}. En cuanto lo apruebe, los entrenadores podrán encontrarte. Hasta entonces tu perfil sigue siendo privado.',
  guardianPendingTitle: 'Queda una cosa',
  guardianPendingBody:
    'Tu perfil está oculto hasta que tu madre, padre o tutor lo apruebe. Puedes enviarle el correo cuando quieras desde Ajustes.',

  // ── Final: reclutador, adulto responsable y todos los demás ───────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: 'Ya está todo listo',
  recruiterDoneTitleNamed: 'Ya está todo listo, {{name}}',
  recruiterDoneBody:
    'Empezaremos a mostrarte deportistas que encajan con lo que buscas.',
  recruiterDonePointSearch: 'Busca y filtra deportistas en Descubrir',
  recruiterDonePointPost: 'Publica pruebas y vacantes para que los deportistas las soliciten',
  recruiterDonePointVerified: 'Verifícate para escribir a deportistas menores de 18',
  doneTitle: 'Todo listo',
  guardianDoneBody: 'Tu cuenta está lista. Vincularte con tu hijo o hija lleva un minuto.',
  basicDoneBody: 'Echa un vistazo y prepara el resto cuando quieras.',
  guardianDoneNote:
    'Ajustes y luego Madre, padre o tutor. Si tu hijo o hija ya te envió un correo de aprobación, al abrir el enlace se conectan las cuentas.',
};
