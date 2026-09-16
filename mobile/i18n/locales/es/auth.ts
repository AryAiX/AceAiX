/**
 * El recorrido sin sesión iniciada: bienvenida, inicio de sesión, registro y
 * las dos pantallas de contraseña.
 *
 * Los textos sobre la edad y sobre la madre, el padre o el tutor son textos de
 * cumplimiento. Trece años es la edad mínima para tener una cuenta, y quien
 * tiene entre 13 y 17 necesita la aprobación de su madre, padre o tutor antes
 * de que puedan encontrarle o escribirle. Traduce las palabras, nunca la regla.
 */
export const auth = {
  // ── Estructura del asistente, compartida con el de perfil ─────────────────
  stepCounter: '{{current}}/{{total}}',
  stepProgress: 'Paso {{current}} de {{total}}',
  stepBack: 'Volver un paso',

  // ── Campos y mensajes que se usan en más de una pantalla ──────────────────
  emailLabel: 'Correo electrónico',
  passwordLabel: 'Contraseña',
  emailRequired: 'Escribe tu correo electrónico.',
  emailInvalid: 'Ese correo no parece correcto.',
  passwordRequired: 'Escribe tu contraseña.',
  passwordMinLength_one: 'Usa al menos {{count}} carácter.',
  passwordMinLength_many: 'Usa al menos {{count}} caracteres.',
  passwordMinLength_other: 'Usa al menos {{count}} caracteres.',
  passwordLengthPlaceholder_one: 'Al menos {{count}} carácter',
  passwordLengthPlaceholder_many: 'Al menos {{count}} caracteres',
  passwordLengthPlaceholder_other: 'Al menos {{count}} caracteres',
  createAccount: 'Crear cuenta',
  checkYourEmail: 'Revisa tu correo',
  sentTo: 'Enviado a',
  backToSignIn: 'Volver a iniciar sesión',

  // ── Términos y privacidad ─────────────────────────────────────────────────
  /* Las dos etiquetas de enlace van dentro de la frase, así que se pueden
     mover a donde el idioma las pida. */
  legalContinue: 'Al continuar aceptas nuestros {{terms}} y nuestra {{privacy}}.',
  legalAgree: 'Acepto los {{terms}} y la {{privacy}}.',
  legalTermsLink: 'Términos',
  legalTermsA11y: 'Leer los Términos del servicio',
  legalPrivacyA11y: 'Leer la Política de privacidad',
  legalAgreeA11y: 'Acepto los Términos del servicio y la Política de privacidad',

  // ── Medidor de seguridad de la contraseña ─────────────────────────────────
  password: {
    tooShortLabel: 'Muy corta',
    weakLabel: 'Débil',
    weakHint: 'Añade una mayúscula y un número.',
    goodLabel: 'Buena',
    goodHint: 'Añade un número o un símbolo para reforzarla.',
    strongLabel: 'Fuerte',
    strongHint: 'Es una buena contraseña.',
    meterSummary: '{{label}} · {{hint}}',
  },

  // ── Bienvenida ────────────────────────────────────────────────────────────
  welcome: {
    headline: 'Que te vean.',
    subheadline: 'Tu talento, descubierto.',
    body: 'Crea tu perfil, consigue tu Puntuación de talento y deja que entrenadores y clubes te encuentren.',
    highlightScore: 'Una Puntuación de talento sobre 100 que enseña dónde estás',
    highlightTrials: 'Pruebas y vacantes reales de clubes y academias',
    highlightGuardian:
      '¿Menor de 18? Tu madre, padre o tutor aprueba tu perfil antes de que nadie pueda encontrarte',
    signIn: 'Ya tengo cuenta',
  },

  // ── Iniciar sesión ────────────────────────────────────────────────────────
  signIn: {
    title: 'Hola de nuevo',
    subtitle: 'Inicia sesión para seguir donde lo dejaste.',
    passwordPlaceholder: 'Tu contraseña',
    forgot: '¿Olvidaste tu contraseña?',
    forgotA11y: 'Restablecer tu contraseña',
    submit: 'Iniciar sesión',
    newHere: '¿No tienes cuenta en {{app}}?',
    createAccount: 'Crear una cuenta',
  },

  // ── Registro ──────────────────────────────────────────────────────────────
  signUp: {
    roleTitle: '¿Quién eres?',
    roleSubtitle:
      'Con esto preparamos el perfil adecuado. Puedes cambiarlo más adelante con nuestro equipo de soporte.',
    roleAthleteTitle: 'Soy deportista',
    roleAthleteSubtitle: 'Crea tu perfil y deja que te descubran',
    roleCoachTitle: 'Soy entrenador',
    roleCoachSubtitle: 'Encuentra jugadores y comparte vacantes',
    roleClubTitle: 'Soy un club o una academia',
    roleClubSubtitle: 'Busca talento y publica pruebas',
    roleGuardianTitle: 'Soy madre, padre o tutor',
    roleGuardianSubtitle: 'Acompaña y aprueba el perfil de tu hijo o hija',

    nameTitle: '¿Cómo te llamas?',
    nameSubtitle:
      'Usa tu nombre real: los entrenadores necesitan saber a quién están viendo.',
    firstNameLabel: 'Nombre',
    firstNamePlaceholder: 'Sara',
    firstNameRequired: 'Escribe tu nombre.',
    lastNameLabel: 'Apellido',
    lastNamePlaceholder: 'Karimi',
    lastNameRequired: 'Escribe tu apellido.',

    dobTitle: '¿Cuándo naciste?',
    dobSubtitle:
      'Te lo preguntamos para proteger a los deportistas más jóvenes. Tu fecha exacta no se le muestra nunca a nadie, solo un rango de edad.',
    dobChoose: 'Elige tu fecha de nacimiento',
    dobChange: 'Cambiar',
    dobSelectedA11y: 'Fecha de nacimiento, {{date}}. Cambiarla',
    dobDayLabel: 'Día',
    dobDayPlaceholder: '04',
    dobMonthLabel: 'Mes',
    dobMonthPlaceholder: '09',
    dobYearLabel: 'Año',
    dobYearPlaceholder: '2010',
    dobTooYoung:
      'Tienes que tener al menos {{age}} años para tener una cuenta de {{app}}. Toca {{action}} y te contamos qué hacer.',
    dobMinorTitle: 'Necesitas a tu madre, padre o tutor',
    dobMinorBody:
      'Como eres menor de 18, tu madre, padre o tutor tiene que aprobar tu perfil antes de que los entrenadores puedan encontrarte. Enseguida te pedimos su correo y le llega un mensaje corto con la explicación.',

    blockedTitle: 'Vuelve cuando cumplas {{age}}',
    blockedBody:
      '{{app}} es para deportistas de {{age}} años en adelante, así que todavía no podemos crearte una cuenta. Esa norma protege a los más pequeños en internet y no podemos hacer excepciones.',
    blockedEncouragement:
      'Sigue entrenando. Cuando cumplas {{age}}, vuelve: tu perfil te está esperando.',
    blockedBackToStart: 'Volver al principio',
    blockedWrongDate: 'Me equivoqué de fecha',

    accountTitle: 'Prepara tu acceso',
    accountSubtitle:
      'Un correo y una contraseña. Te enviamos un enlace para confirmar que la dirección es tuya.',
    termsRequired: 'Acepta los Términos y la Política de privacidad para continuar.',
  },

  // ── Revisa tu correo ──────────────────────────────────────────────────────
  checkEmail: {
    body: 'Te enviamos un enlace para confirmar tu dirección. Ábrelo y luego vuelve e inicia sesión.',
    spamHint:
      '¿Todavía nada? Puede tardar un minuto y a veces cae en spam o en promociones.',
    resendCountdown_one: 'Reenviar en {{count}} s',
    resendCountdown_many: 'Reenviar en {{count}} s',
    resendCountdown_other: 'Reenviar en {{count}} s',
    resend: 'Reenviar correo',
    resendSuccess: 'Enviado. Vuelve a mirar tu bandeja de entrada.',
  },

  // ── Contraseña olvidada ───────────────────────────────────────────────────
  forgotPassword: {
    title: '¿Olvidaste tu contraseña?',
    subtitle:
      'Dinos con qué correo te registraste y te enviamos un enlace para crear una nueva.',
    submit: 'Enviar enlace',
    sentBody:
      'Si hay una cuenta con esa dirección, ya va en camino un enlace para crear una contraseña nueva. El enlace sirve una sola vez y caduca al cabo de un rato.',
  },

  // ── Nueva contraseña ──────────────────────────────────────────────────────
  resetPassword: {
    title: 'Crea una contraseña nueva',
    subtitle:
      'Elige algo que no uses en ningún otro sitio. Después entras directamente.',
    newPasswordLabel: 'Contraseña nueva',
    repeatLabel: 'Repite la contraseña nueva',
    repeatPlaceholder: 'Escríbela otra vez',
    repeatRequired: 'Escribe otra vez la contraseña nueva.',
    mismatch: 'Las dos contraseñas no coinciden.',
    submit: 'Guardar contraseña',
    success: 'Contraseña cambiada. Ya estás dentro.',
    expiredHint:
      'Si este enlace caducó, pide uno nuevo desde la pantalla de inicio de sesión.',
  },
};
