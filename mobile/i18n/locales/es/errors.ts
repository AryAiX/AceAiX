/**
 * Lo que puede salir mal, dicho con claridad.
 *
 * `lib/errors.ts` asigna los códigos de la base de datos y los textos de
 * autenticación de Supabase a estas claves, así que un error aparece en el
 * idioma de quien lo lee esté donde esté capturado.
 */
export const errors = {
  generic: 'Algo salió mal. Vuelve a intentarlo.',
  offline: 'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
  sessionExpired: 'Tu sesión caducó. Inicia sesión otra vez.',
  notSignedIn: 'Tienes que iniciar sesión para hacer eso.',

  // Avisos de la base de datos
  guardianConsentRequired:
    'Tu madre, padre o tutor tiene que aprobar tu perfil antes de que pueda aparecer en las búsquedas.',
  messagingNotPermitted:
    'No puedes escribir a esta cuenta. Puede que solo acepte mensajes de entrenadores y clubes verificados.',
  rateLimited: 'Estás haciendo eso muy rápido. Espera un momento y vuelve a intentarlo.',
  ageBelowMinimum: 'Tienes que tener al menos 13 años para usar AceAiX.',

  // Códigos de la base de datos
  alreadyExists: 'Eso ya existe.',
  missingReference: 'Falta algo de lo que esto depende. Prueba a actualizar.',
  invalidDetails: 'Algunos de esos datos no son válidos.',
  noPermission: 'No tienes permiso para hacer eso.',
  notFound: 'No pudimos encontrar eso.',

  // Autenticación
  invalidCredentials: 'Ese correo o esa contraseña no son correctos.',
  emailNotConfirmed: 'Revisa tu bandeja de entrada y confirma antes tu correo.',
  emailInUse: 'Ya hay una cuenta con ese correo. Prueba a iniciar sesión.',
  passwordTooShort: 'Elige una contraseña de al menos 8 caracteres.',
  tooManyAttempts: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',

  // Retos y afición
  challengeClosed: 'Ese reto ya está cerrado.',
  challengeNotAllowed: 'Solo los entrenadores y clubes verificados pueden poner un reto.',
  clipRequired: 'Elige antes uno de tus propios clips públicos.',
  ageOutOfRange: 'Este reto es para otro grupo de edad.',
  favoriteTeamsMax: 'Cinco equipos es el límite: quita uno para añadir otro.',
  profileIncomplete: 'Completa antes tu perfil de deportista.',
  notAnAthlete: 'Solo los deportistas tienen Puntuación de talento.',
};
