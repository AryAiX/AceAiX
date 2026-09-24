/**
 * Inteligencia de juego: seis juegos cortos y cronometrados sobre cómo lee el
 * juego un deportista.
 *
 * Reglas de tono en cualquier idioma:
 *
 *   * Son **juegos**, nunca un «examen», un «test de inteligencia» ni una
 *     «evaluación de ti». Quien lo lee puede tener trece años.
 *   * Nada clínico: ni «diagnóstico», ni «trastorno», ni «déficit», ni
 *     «capacidad cognitiva». Medimos velocidad, concentración y decisiones en
 *     estos juegos, ese día, y el texto lo dice.
 *   * Un número bajo nunca es un veredicto. La nota al pie de la pantalla de
 *     resultados hace la misma promesa que la Puntuación de talento.
 */
export const intelligence = {
  // ── Nombres ────────────────────────────────────────────────────────────────
  title: 'Inteligencia de juego',
  short: 'IQ de juego',
  tagline: 'Lo rápido que lees el juego',

  // ── Tarjeta del perfil ─────────────────────────────────────────────────────
  cardCta: 'Juega los seis juegos',
  cardCtaBody: 'Unos 8 minutos. Enseña a los clubes cómo piensas en el campo.',
  cardContinue: 'Termina tus juegos',
  cardContinueBody: '{{done}} de 6 jugados',
  cardTop: 'Top {{percent}} % de tu grupo de edad',
  cardShared: 'Compartido con clubes',
  cardPrivate: 'Solo lo ves tú',
  cardA11y: 'Inteligencia de juego {{score}} sobre 100',

  // ── Introducción ───────────────────────────────────────────────────────────
  introTitle: 'Seis juegos. Una imagen de cómo juegas.',
  introBody:
    'Juegos rápidos que miden cómo ves el campo, cómo decides bajo presión y cómo mantienes la concentración. A los entrenadores les importa tanto como la velocidad o la técnica.',
  introPoint1: 'Unos 8 minutos: puedes parar entre juegos y volver más tarde',
  introPoint2: 'Tus resultados son privados hasta que decidas compartirlos',
  introPoint3: 'Dos intentos en cada juego cada dos semanas. Cuenta el mejor.',
  introStart: '¡A jugar!',
  introNotMedical: 'Son juegos, no una evaluación médica ni psicológica.',

  // ── Permiso ────────────────────────────────────────────────────────────────
  consentTitle: 'Pide permiso antes',
  consentBody:
    'Donde vives, quien tiene menos de {{age}} años necesita que su madre, padre o tutor diga que sí antes de jugar. Le enviaremos un correo corto explicando los juegos.',
  consentPendingTitle: 'Esperando a tu madre, padre o tutor',
  consentPendingBody:
    'Ya se lo hemos pedido. El correo tiene una casilla «Game Intelligence»: pídeles que la marquen y los juegos se desbloquearán aquí.',
  consentAction: 'Pedir permiso',
  consentAgeUnknownTitle: 'Añade tu fecha de nacimiento',
  consentAgeUnknownBody: 'La necesitamos para saber si antes tiene que aprobarlo tu madre, padre o tutor.',
  consentAgeUnknownAction: 'Editar perfil',
  notAthleteTitle: 'Para deportistas',
  notAthleteBody: 'La Inteligencia de juego forma parte del perfil de deportista. Puedes ver los resultados que los deportistas comparten contigo en su perfil.',
  suspendedBody: 'No está disponible mientras revisamos tu cuenta.',

  // ── Preparación ────────────────────────────────────────────────────────────
  readyTitle: 'Prepárate',
  readyBody: 'Tu resultado depende del momento en que juegas.',
  readyQuiet: 'En un sitio tranquilo, sentado o de pie sin moverte',
  readyNotifications: 'Notificaciones desactivadas, para que nada salte a mitad del juego',
  readyBattery: 'Batería suficiente y el móvil en la mano',
  readyFatigue: '¿Cómo de fresco te sientes ahora mismo?',
  fatigue1: 'Fresco',
  fatigue2: 'Bien',
  fatigue3: 'Normal',
  fatigue4: 'Cansado',
  fatigue5: 'Agotado',
  readyTiredHint: 'Puedes jugar, pero quizá tu resultado salga más bajo de lo normal. Puede que más tarde sea mejor.',
  readyContinue: 'Estoy listo',

  // ── Calentamiento ──────────────────────────────────────────────────────────
  warmupTitle: 'Calentamiento',
  warmupBody: 'Toca el círculo en cuanto se ponga verde. Cinco veces. Así ajustamos los juegos a tu móvil.',
  warmupWait: 'Espera al verde…',
  warmupTap: '¡Toca!',
  warmupEarly: 'Demasiado pronto: espera al verde',
  warmupDone: 'Calentamiento hecho',

  // ── Juegos ─────────────────────────────────────────────────────────────────
  hubTitle: 'Tus juegos',
  hubBody: 'Juega en el orden que quieras. Los juegos de fútbol son los que más cuentan.',
  hubPlayed: 'Jugado',
  hubRetry: 'Hay que repetir',
  hubNoAttempts: 'Siguiente intento en unos días',
  hubCountsMost: 'Cuenta más',
  hubMinutes: 'unos {{n}} min',
  hubSeconds: 'unos {{n}} s',
  hubFinish: 'Ver mis resultados',
  hubFinishNeeds: 'Juegos que faltan para tu resultado: {{count}}',
  hubPause: 'Tómate un descanso',
  hubPauseBody: 'Guardamos tu progreso durante 24 horas.',

  // ── Un juego ───────────────────────────────────────────────────────────────
  practice: 'Práctica',
  practiceBody: 'Unas rondas que no cuentan.',
  practiceDone: 'Bien. Ahora en serio.',
  startScored: 'Empezar',
  getReady: 'Prepárate',
  round: 'Ronda {{n}} de {{total}}',
  scoredLabel: 'Cuenta',
  submitting: 'Guardando…',
  gameDone: '¡Hecho!',
  gameScore: '{{score}} / 100',
  gameInvalid: 'Esa ronda no ha contado',
  gameInvalidBody: 'Algo no cuadraba; quizá una distracción. Puedes volver a intentarlo más tarde.',
  gameIncomplete: 'No hubo toques suficientes para puntuar esa ronda',
  gameIncompleteBody: 'No has gastado ningún intento. Vuelve a probar cuando estés listo.',
  backToHub: 'Volver a los juegos',
  tryAgain: 'Reintentar',
  interrupted: 'Juego en pausa',
  interruptedBody: 'Saliste de la app, así que esta ronda se ha cancelado. No has gastado ningún intento.',
  timeUp: '¡Tiempo!',

  tests: {
    pitchDecision: {
      name: 'Decisión en el campo',
      what: 'Toma de decisiones',
      how: 'Mira la jugada. Cuando se congele, tienes 3 segundos: toca a un compañero para pasar, o elige Tirar o Regatear.',
      you: 'Tú',
      shoot: 'Tirar',
      dribble: 'Regatear',
      pass: 'Toca a un compañero para pasar',
    },
    anticipation: {
      name: 'Lee el balón',
      what: 'Anticipación',
      how: 'El balón vuela hacia la portería y desaparece. Toca la línea de gol por donde va a cruzar.',
      tapLine: 'Toca por donde cruza',
    },
    tracking: {
      name: 'Sigue los desmarques',
      what: 'Visión',
      how: 'Algunos balones parpadean. No los pierdas de vista mientras todos se mueven. Luego toca los que seguías.',
      watch: 'Fíjate en estos',
      follow: 'Síguelos…',
      pick: 'Toca los que seguiste · {{found}}/{{count}}',
      level: 'Nivel {{n}}',
    },
    goNoGo: {
      name: 'Sigue / Para',
      what: 'Autocontrol',
      how: 'Toca lo más rápido que puedas cuando aparezca un balón verde. Si es rojo, no toques.',
      go: 'Verde: toca',
      stop: 'Rojo: no',
    },
    flanker: {
      name: 'Flechas de concentración',
      what: 'Concentración',
      how: '¿Hacia dónde apunta la flecha del centro? Ignora las demás.',
      left: 'Izquierda',
      right: 'Derecha',
    },
    reaction: {
      name: 'Manos rápidas',
      what: 'Velocidad de reacción',
      how: 'Se enciende uno de cuatro botones. Tócalo lo más rápido que puedas.',
    },
  },

  // ── Resultados ─────────────────────────────────────────────────────────────
  resultsTitle: 'Tu Inteligencia de juego',
  analyzing: 'Juntando tus resultados…',
  resultsNotEnough: 'Juega al menos cuatro juegos para tener tu resultado global.',
  confidence: 'Fiabilidad',
  confidenceLow: 'Baja',
  confidenceMedium: 'Media',
  confidenceHigh: 'Alta',
  confidenceHint: 'Juega los seis juegos descansado para una fiabilidad alta.',
  strengths: 'Tus puntos fuertes',
  workOn: 'Algo que mejorar',
  tipsTitle: 'Prueba esto',
  tip: {
    pitch_decision: 'Antes de que te llegue el balón, mira por encima de los dos hombros. Ten el pase pensado antes de necesitarlo.',
    anticipation: 'Mira el balón al principio del vuelo: el inicio de la curva te dice adónde va.',
    tracking: 'Relaja la mirada y fíjate en el espacio entre jugadores, no en un jugador cada vez.',
    go_no_go: 'Mantente listo, pero deja que decida el color. Acertar importa más que la velocidad.',
    flanker: 'Clava la vista en el centro. Lo que hay alrededor es ruido.',
    reaction: 'Relaja la mano antes de cada ronda: la tensión te hace más lento.',
  },
  history: 'Tu progreso',
  nextRetest: 'Próxima repetición completa: {{date}}',
  footnote:
    'Estos juegos miden cómo los jugaste hoy (velocidad, concentración y decisiones), no quién eres ni lo bueno que llegarás a ser. Los resultados suben con práctica, descanso y edad. Ningún entrenador decide nada solo por este número.',
  notInTalentScore: 'Aparece junto a tu Puntuación de talento, pero no se suma, por ahora.',

  // ── Compartir ──────────────────────────────────────────────────────────────
  shareTitle: 'Quién puede verlo',
  shareClubs: 'Compartir con entrenadores y clubes',
  shareClubsBody: 'Los entrenadores, ojeadores y clubes que ven tu perfil ven tu resultado global y el de cada juego.',
  shareBadge: 'Mostrar una insignia en mi perfil',
  shareBadgeBody: 'Los demás jugadores solo ven tu resultado global. Necesitas tener activado compartir.',
  shareMinorNote: 'Tu perfil solo lo ven los clubes cuando tu madre, padre o tutor lo haya aprobado.',
  shareSaved: 'Guardado',

  // ── En el perfil de otra persona ───────────────────────────────────────────
  theirTitle: 'Inteligencia de juego',
  theirTop: 'Top {{percent}} % de su grupo de edad',
  theirTests: '{{n}} de 6 juegos',
  theirPlayed: 'Jugado el {{date}}',
  theirConfidence: 'Fiabilidad {{level}}',

  // ── Permiso de la madre, el padre o el tutor (ajustes → tutor) ─────────────
  scopeAssessments: 'Puede jugar a los juegos de Inteligencia de juego',
  scopeAssessmentsOff: 'Juegos de Inteligencia de juego sin aprobar',
  addAssessments: 'Pedir permiso para Inteligencia de juego',
  addAssessmentsHint:
    'Tu madre, padre o tutor aprobó tu perfil, pero no los juegos. Le enviaremos un enlace nuevo: tiene que marcar «Inteligencia de juego».',
  addAssessmentsSent: 'Solicitud enviada a {{email}}. Los juegos se desbloquean cuando lo apruebe.',
};
