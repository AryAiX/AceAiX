/**
 * Sport Fit: un cuestionario corto sobre tu forma de pensar y los deportes
 * hacia los que apunta.
 *
 * Reglas de tono en cualquier idioma:
 *
 *   * Es una sugerencia para explorar, nunca un veredicto. Nunca «deberías
 *     dejarlo», «no estás hecho para», «tu personalidad». Quien lo lee sigue
 *     jugando a lo que le gusta; esto solo abre puertas.
 *   * Nada clínico: ni «test psicológico», ni «diagnóstico», ni «tipo de
 *     personalidad», ni «trastorno». Es un cuestionario sobre cómo entrenas y
 *     cómo te sientes en un partido.
 *   * Las frases van en primera persona, son sencillas y las entiende alguien
 *     de trece años. Las frases en negativo deben seguir en negativo y decir
 *     lo mismo (la puntuación depende de ello). Los textos de `item.*` los
 *     revisa antes del lanzamiento un psicólogo deportivo nativo (docs/31 §6).
 */
export const sportFit = {
  // ── Nombres ────────────────────────────────────────────────────────────────
  title: 'Sport Fit',
  tagline: 'Los deportes que encajan con tu forma de pensar',

  // ── Tarjeta del perfil ─────────────────────────────────────────────────────
  cardCta: 'Descubre los deportes que van contigo',
  cardCtaBody: '22 frases rápidas, unos 4 minutos. Solo para ti.',
  cardResult: 'Mejor opción: {{sport}}',
  cardResultBody: 'Después, {{second}} y {{third}}',
  cardPrivate: 'Solo lo ves tú',

  // ── Introducción ───────────────────────────────────────────────────────────
  introTitle: 'Tu forma de pensar influye en dónde brillas',
  introBody:
    'Cuéntanos cómo entrenas y cómo te sientes en un partido. Comparamos tus respuestas con lo que doce deportes piden a la mente de un jugador y te mostramos los tres que mejor encajan contigo, y por qué.',
  introPoint1: '22 frases, unos 4 minutos. No hay respuestas correctas ni incorrectas.',
  introPoint2: 'Privado: los clubes y ojeadores nunca ven tus respuestas ni tu resultado.',
  introPoint3: 'Si has jugado a Inteligencia de juego, tu lectura del juego también cuenta.',
  introStart: 'Empezar',
  introNotMedical: 'Es un cuestionario, no una evaluación médica ni psicológica.',
  introGiHint: 'Juega primero a Inteligencia de juego para un resultado más preciso.',
  introGiAction: 'Ir a los juegos',

  // ── Permiso ────────────────────────────────────────────────────────────────
  consentTitle: 'Pide permiso antes',
  consentBody:
    'Donde vives, quien tiene menos de {{age}} años necesita que su madre, padre o tutor diga que sí antes de responder. Le enviaremos un correo corto explicando Sport Fit.',
  consentPendingTitle: 'Esperando a tu madre, padre o tutor',
  consentPendingBody:
    'Ya se lo hemos pedido. El correo tiene una casilla «Sport Fit»: pídeles que la marquen y el cuestionario se desbloqueará aquí.',
  consentAction: 'Pedir permiso',
  consentAgeUnknownTitle: 'Añade tu fecha de nacimiento',
  consentAgeUnknownBody: 'La necesitamos para saber si antes tiene que aprobarlo tu madre, padre o tutor.',
  consentAgeUnknownAction: 'Editar perfil',
  notAthleteTitle: 'Para deportistas',
  notAthleteBody: 'Sport Fit forma parte del perfil de deportista.',
  suspendedBody: 'No está disponible mientras revisamos tu cuenta.',

  // ── Preguntas ──────────────────────────────────────────────────────────────
  questionsTitle: 'Sport Fit',
  progress: '{{n}} de {{total}}',
  questionHint: '¿Hasta qué punto es verdad para ti?',
  answer1: 'Totalmente en desacuerdo',
  answer2: 'En desacuerdo',
  answer3: 'No lo tengo claro',
  answer4: 'De acuerdo',
  answer5: 'Totalmente de acuerdo',
  back: 'Atrás',
  submitting: 'Buscando tus deportes…',
  leaveTitle: '¿Lo dejas aquí?',
  leaveBody: 'Las respuestas que llevas no se guardarán.',
  leaveConfirm: 'Dejarlo',
  leaveCancel: 'Seguir',

  item: {
    drive1: 'Entreno aunque nadie esté pendiente de mí.',
    drive2: 'Practico mi deporte sobre todo porque me encanta mejorar en él.',
    drive3: 'Después de unas semanas, muchas veces pierdo las ganas de entrenar.',
    composure1: 'En los momentos importantes de un partido, consigo mantener la calma.',
    composure2: 'Los nervios antes de una competición muchas veces hacen que juegue peor.',
    composure3: 'Cuando el marcador está ajustado, quiero el balón o el siguiente punto.',
    team1: 'Una victoria me sabe mejor cuando la comparto con mis compañeros.',
    team2: 'Prefiero que mi resultado dependa solo de mí.',
    team3: 'Me gusta tener compañeros que cuenten conmigo, y contar con ellos.',
    focus1: 'Puedo mantener la atención en una sola tarea durante mucho tiempo.',
    focus2: 'El ruido del público o de otros jugadores me distrae con facilidad.',
    focus3: 'Puedo pasar un entrenamiento entero trabajando un pequeño detalle.',
    boldness1: 'Disfruto de los duelos uno contra uno con un rival.',
    boldness2: 'El contacto físico en un partido no me echa para atrás.',
    boldness3: 'Prefiero actividades con poco riesgo de hacerme daño.',
    resilience1: 'Después de un error, me centro rápido en la siguiente jugada.',
    resilience2: 'Perder me da ganas de entrenar más duro.',
    resilience3: 'Cuando un entrenador me critica, le sigo dando vueltas durante días.',
    discipline1: 'Me gusta seguir una rutina de entrenamiento fija.',
    discipline2: 'Puedo repetir el mismo ejercicio muchas veces hasta que me sale bien.',
    discipline3: 'Me aburro rápido cuando el entrenamiento es repetitivo.',
    check1: 'Para demostrar que lees con atención, elige «De acuerdo» en esta.',
  },

  // ── No válido: otra vez ────────────────────────────────────────────────────
  retryTitle: 'Vamos a intentarlo otra vez',
  retryTooFast: 'Ha sido muy rápido. Tómate un momento con cada frase para que el resultado tenga sentido.',
  retryCheck: 'Una frase te pedía elegir «De acuerdo». Lee cada una con atención y vuelve a intentarlo.',
  retryStraight: 'Todas tus respuestas eran iguales. Piensa en cada frase por separado y vuelve a intentarlo.',
  retryAction: 'Empezar de nuevo',

  // ── Resultado ──────────────────────────────────────────────────────────────
  resultsTitle: 'Tu Sport Fit',
  resultsSubtitle: 'Los deportes que encajan con tu forma de pensar',
  fitLabel: '{{fit}} % de encaje',
  topPick: 'Mejor opción',
  whyTitle: 'Por qué encaja',
  developTitle: 'Para mejorar',
  allSportsTitle: 'Todos los deportes',
  mindsetTitle: 'Tu forma de pensar',
  teamSpectrumSolo: 'Individual',
  teamSpectrumTeam: 'Equipo',
  fromGames: 'De Inteligencia de juego',
  takenOn: 'Respondido el {{date}}',
  nextRetake: 'Puedes volver a responder a partir del {{date}}',
  findCoaches: 'Buscar entrenadores',
  footnote:
    'Una sugerencia para explorar, no un veredicto. Sport Fit solo tiene en cuenta tu forma de pensar y tu lectura del juego, no tu cuerpo, tu forma física, tu técnica ni tu experiencia. Sigue jugando a lo que te gusta.',
  privacyTitle: 'Tus respuestas son privadas',
  privacyBody:
    'Solo las ves tú. No se muestran a clubes ni ojeadores y no forman parte de tu Puntuación de talento.',
  deleteAction: 'Borrar mis respuestas',
  deleteTitle: '¿Borrar tus respuestas de Sport Fit?',
  deleteBody: 'Tus respuestas y tu resultado se borrarán para siempre. Puedes volver a responder cuando quieras.',
  deleteConfirm: 'Borrar',
  deleted: 'Tus respuestas de Sport Fit se han borrado',

  dimension: {
    drive: 'Motivación',
    composure: 'Calma',
    focus: 'Concentración',
    resilience: 'Capacidad de reponerte',
    team: 'Equipo o individual',
    boldness: 'Atrevimiento',
    discipline: 'Rutina',
    reading: 'Lectura del juego',
    speed: 'Reflejos',
  },
  dimensionWhat: {
    drive: 'Querer entrenar y mejorar por el gusto de hacerlo',
    composure: 'Mantener la calma cuando más importa',
    focus: 'Mantener la atención donde debe estar',
    resilience: 'Recuperarte de los errores y los contratiempos',
    team: 'Si prefieres un equipo o tu propio resultado',
    boldness: 'Disfrutar de los duelos, el contacto y el riesgo',
    discipline: 'Disfrutar de la repetición y del entrenamiento organizado',
    reading: 'Lo rápido que lees el juego, según tus juegos',
    speed: 'Lo rápido que reaccionas, según tus juegos',
  },
  strength: {
    drive: 'Entrenas porque quieres mejorar',
    composure: 'Mantienes la calma cuando el marcador está ajustado',
    focus: 'Puedes mantener la atención mucho tiempo',
    resilience: 'Te repones rápido de los errores',
    boldness: 'Disfrutas de los duelos y la lucha física',
    discipline: 'Disfrutas de la rutina y de repetir una técnica',
    reading: 'Lees el juego rápido',
    speed: 'Reaccionas rápido',
  },
  develop: {
    drive: 'Ponte un pequeño objetivo cada semana y márcalo cuando lo cumplas.',
    composure: 'Practica una rutina corta de respiración antes de los momentos clave.',
    focus: 'Entrena con una palabra clave que te devuelva la atención.',
    resilience: 'Después de un error, haz un gesto para reiniciar (una palmada, una respiración) y sigue.',
    boldness: 'Juega más partidos reducidos en los que tengas que ganar tu duelo.',
    discipline: 'Convierte la repetición en un juego: cuenta, cronometra o puntúa tus ejercicios.',
    reading: 'Mira partidos y di en voz alta qué harías a continuación.',
    speed: 'Añade ejercicios cortos de reacción a tu calentamiento.',
  },
  teamMatch: {
    team: 'Disfrutas compartiendo el esfuerzo con un equipo',
    pairs: 'Te gusta jugar en pareja',
    solo: 'Te gusta que tu resultado dependa de ti',
  },
  sportWhy: {
    football: 'Decisiones rápidas con diez compañeros, durante noventa minutos.',
    basketball: 'Decisiones constantes a toda velocidad, en un equipo pequeño.',
    volleyball: 'Reacciones rápidas y confianza en cada compañero en cada punto.',
    handball: 'Velocidad, contacto y valentía en un juego de equipo rápido.',
    cricket: 'Concentración larga y nervios templados: solo al bate, pero dentro de un equipo.',
    padel: 'Leer rápido la bola con un compañero a tu lado.',
    esports: 'Concentración, lectura rápida y trabajo en equipo en una pantalla.',
    tennis: 'Tú contra un rival, punto tras punto.',
    martialArts: 'Valentía, control y calma en el combate uno contra uno.',
    chess: 'Concentración profunda y decisiones con calma, solo ante el tablero.',
    swimming: 'Tu propia carrera, basada en la rutina y en muchas horas de entrenamiento.',
    athletics: 'Tu propio resultado, basado en la disciplina y la motivación.',
  },

  // ── Permiso de la madre, el padre o el tutor (ajustes → tutor) ─────────────
  scopeMindset: 'Puede responder el cuestionario de Sport Fit',
  scopeMindsetOff: 'Cuestionario de Sport Fit sin aprobar',
  addMindset: 'Pedir permiso para Sport Fit',
  addMindsetHint:
    'Tu madre, padre o tutor aprobó tu perfil, pero no Sport Fit. Le enviaremos un enlace nuevo: tiene que marcar «Sport Fit».',
  addMindsetSent: 'Solicitud enviada a {{email}}. Sport Fit se desbloquea cuando lo apruebe.',
};
