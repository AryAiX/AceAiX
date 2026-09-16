/**
 * El árbol de ajustes: todas las pantallas de `app/settings/`, las piezas con
 * las que están hechas y el marco alrededor de los cuatro documentos legales.
 *
 * Todo lo que trata de denuncias, bloqueos, adultos responsables o protección
 * de menores de 18 vive en `safety.ts`, para que ese texto se pueda revisar
 * aparte. El vocabulario compartido (Guardar, Cancelar, Verificado,
 * Desbloquear, Puntuación de talento, los nombres de los cuatro documentos)
 * viene de `common.ts` y no se repite aquí.
 *
 * Sobre los valores guardados: los deportes, las posiciones, los niveles y los
 * países que elige un reclutador se guardan en inglés y se traducen al
 * mostrarlos, a través de `constants/sports.ts`. En este archivo solo están las
 * etiquetas que los rodean.
 */
export const settings = {
  // ── Inicio de ajustes (app/settings/index.tsx) ─────────────────────────────
  title: 'Ajustes',

  sectionAccount: 'Cuenta',
  accountTitle: 'Cuenta',
  accountSubtitle: 'Correo, contraseña, verificación',
  appearanceTitle: 'Apariencia',
  appearanceSubtitle: 'Claro, oscuro o como tu teléfono',
  notificationsTitle: 'Notificaciones',
  notificationsSubtitle: 'Elige qué te llega',

  sectionPrivacySafety: 'Privacidad y seguridad',
  privacyTitle: 'Privacidad',
  privacySubtitle: 'Quién puede escribirte y encontrarte',

  sectionScouting: 'Reclutamiento',
  scoutingFooter: 'Lo usamos para ordenar quién aparece primero en Descubrir.',
  scoutingTitle: 'Lo que estás buscando',
  scoutingSubtitle: 'Deportes, posiciones, niveles y edad',

  sectionAbout: 'Acerca de',
  supportTitle: 'Contactar con soporte',
  supportFallback: 'Escríbenos a {{email}}',
  versionTitle: 'Versión',

  signOut: 'Cerrar sesión',
  signOutConfirmTitle: '¿Cerrar sesión?',
  signOutConfirmBody: 'Necesitarás tu correo y tu contraseña para volver a entrar.',

  /** «AceAiX de AryAiX»: los dos nombres son marcas y pasan tal cual. */
  productBy: '{{product}} de {{company}}',

  // ── Cuenta (app/settings/account.tsx) ──────────────────────────────────────
  sectionSignIn: 'Inicio de sesión',
  signInFooter:
    'Tu correo es con lo que inicias sesión y por donde te escribimos sobre tu cuenta. Para cambiarlo, escribe a {{email}}.',
  emailLabel: 'Correo electrónico',
  notSignedIn: 'Sin sesión iniciada',

  sectionVerification: 'Verificación',
  verificationTitle: 'Verificación',
  requestVerification: 'Solicitar la verificación',
  verificationCheckedSubtitle: 'Tu cuenta está comprobada',
  verificationAskSubtitle: 'Pídenos que comprobemos tu cuenta',
  verificationInReview: 'En revisión',
  verificationSentOn: 'Enviada el {{date}}',
  verificationApproved: 'Aprobada',
  verificationApprovedSubtitle: 'Tu insignia está en camino',
  verificationRejected: 'No aprobada',
  verificationRejectedSubtitle: 'Puedes enviar otra solicitud',
  verificationRequestSent: 'Solicitud enviada. La miraremos pronto.',

  sectionYourData: 'Tus datos',
  dataFooter:
    'El archivo es JSON: tu perfil, publicaciones, comentarios, seguimientos, solicitudes y contenido, tal y como los guardamos.',
  downloadMyData: 'Descargar mis datos',
  downloadSubtitle: 'Consigue una copia de todo lo que hay en tu cuenta',
  preparingFile: 'Preparando tu archivo…',
  preparingShort: 'Preparando…',
  exportSaved: 'Guardado {{name}}',

  // Hoja para cambiar la contraseña
  changePassword: 'Cambiar la contraseña',
  changePasswordSubtitle: 'Tu sesión seguirá abierta en este dispositivo.',
  currentPassword: 'Contraseña actual',
  currentPasswordPlaceholder: 'Tu contraseña de ahora',
  newPassword: 'Contraseña nueva',
  newPasswordHint_one: 'Al menos {{count}} carácter.',
  newPasswordHint_many: 'Al menos {{count}} caracteres.',
  newPasswordHint_other: 'Al menos {{count}} caracteres.',
  newPasswordPlaceholder: 'Algo que solo sepas tú',
  confirmNewPassword: 'Confirma la contraseña nueva',
  confirmNewPasswordPlaceholder: 'Escríbela otra vez',
  passwordTooShort_one: 'Elige una contraseña de al menos {{count}} carácter.',
  passwordTooShort_many: 'Elige una contraseña de al menos {{count}} caracteres.',
  passwordTooShort_other: 'Elige una contraseña de al menos {{count}} caracteres.',
  passwordsDoNotMatch: 'Esas dos contraseñas no son iguales.',
  passwordUnchanged: 'Esa es la contraseña que ya tienes.',
  passwordCurrentWrong: 'Esa contraseña actual no es correcta.',
  passwordChanged: 'Contraseña cambiada.',
  passwordPhishingNote:
    'Nunca te pedimos la contraseña por correo ni por mensaje. Si alguien lo hace, no somos nosotros.',

  // ── Privacidad (app/settings/privacy.tsx) ──────────────────────────────────
  messagePrivacyHeading: 'Quién puede escribirte',
  messagePrivacyHint:
    'Esto solo afecta a las conversaciones nuevas. Las que ya tienes siguen abiertas.',

  privacyEveryone: 'Todo el mundo',
  privacyEveryoneHint: 'Cualquiera en AceAiX puede empezar una conversación contigo.',
  privacyVerified: 'Entrenadores y clubes verificados',
  privacyVerifiedHint:
    'Solo cuentas que hemos comprobado, y las personas que te siguen.',
  privacyFollowing: 'Personas a las que sigues',
  privacyFollowingHint: 'Solo las cuentas que ya sigues pueden escribir primero.',
  privacyNobody: 'Nadie',
  privacyNobodyHint:
    'Nadie puede empezar una conversación nueva. Las que ya existen siguen funcionando.',

  discoveryHeading: 'Aparecer en las búsquedas de reclutadores',
  discoveryHint:
    'Cuando está activado, los entrenadores y los clubes pueden encontrarte en Descubrir.',
  discoverable: 'Visible',
  discoverableOn: 'Tu perfil puede aparecer en las búsquedas',
  discoverableOff: 'No apareces en las búsquedas',

  publicWebHeading: 'Mostrar mi perfil a quien no ha iniciado sesión',
  publicWebAdult:
    'Los perfiles de adultos que aparecen en las búsquedas también se pueden ver en la web sin haber iniciado sesión. Si desactivas «{{setting}}» arriba, sales de las dos cosas.',
  readPrivacyPolicy: 'Leer la Política de privacidad completa',

  // ── Notificaciones (app/settings/notifications.tsx) ────────────────────────
  pushOffTitle: 'Las notificaciones push están desactivadas',
  pushOffBody:
    'Tu teléfono no deja que AceAiX envíe notificaciones, así que nada de lo de abajo puede llegarte con la app cerrada.',
  turnOnPush: 'Activar las push',
  pushStillOff:
    'Las push siguen desactivadas. Puedes activarlas en los ajustes de tu teléfono.',
  autoSaveNote: 'Los cambios se guardan solos.',

  sectionHowWeReach: 'Cómo te avisamos',
  pushTitle: 'Notificaciones push',
  pushSubtitle: 'En tu teléfono, con la app cerrada',
  emailTitle: 'Correo electrónico',
  emailSubtitle: 'Resúmenes de vez en cuando a tu bandeja',

  sectionActivity: 'Actividad',
  activityFooter:
    'Esto también controla lo que aparece en tus notificaciones dentro de la app.',
  notifyFollows: 'Nuevos seguidores',
  notifyMessages: 'Mensajes',
  notifyComments: 'Comentarios',
  notifyLikes: 'Me gusta',

  sectionOpportunities: 'Oportunidades y tu puntuación',
  notifyOpportunities: 'Oportunidades nuevas',
  notifyApplications: 'Novedades de las solicitudes',
  notifyScoutInterest: 'Interés de reclutadores',
  notifyScoreUpdates: 'Cambios en la Puntuación de talento',

  noMarketingNote:
    'Nunca enviamos notificaciones push de publicidad, ni vendemos tus datos a quien las envíe.',

  // ── Preferencias de reclutamiento (app/settings/scouting.tsx) ──────────────
  scoutingIntro:
    'Esto define a quién te pone Descubrir delante primero y de qué deportistas te avisamos. Deja algo en blanco para decir «sin preferencia».',
  scoutingSports: 'Deportes',
  scoutingSportsHint: 'Elige todos los deportes para los que reclutas.',
  scoutingPositions: 'Posiciones',
  scoutingPositionsHint: 'Solo las posiciones de los deportes que elegiste.',
  scoutingPositionsEmpty: 'Elige primero un deporte y aparecerán aquí sus posiciones.',
  scoutingLevels: 'Niveles',
  scoutingCountries: 'Países',
  scoutingCountriesHint: 'Dónde está el deportista.',

  ageRange: 'Rango de edad',
  youngest: 'Mínima',
  oldest: 'Máxima',
  yearsSuffix: 'años',

  minimumTalentScore: 'Puntuación de talento mínima',
  atLeast: 'Al menos',
  anyScoreHint: 'Cualquier puntuación, incluidos los deportistas que aún no tienen',
  minScoreHint: 'Solo deportistas con {{score}} o más',

  filters: 'Filtros',
  openToOffersOnly: 'Solo abiertos a ofertas',
  openToOffersHint: 'Ocultar a los deportistas que no han dicho que buscan',
  notifyNewMatches: 'Avisarme de coincidencias nuevas',
  notifyNewMatchesHint: 'Cuando entra o mejora un deportista que encaja',

  savePreferences: 'Guardar preferencias',
  preferencesSaved: 'Guardado. Descubrir lo usará a partir de ahora.',

  // ── Apariencia (app/settings/appearance.tsx) ───────────────────────────────
  themeHeading: 'Tema',
  themeBody:
    'Sistema sigue lo que tenga puesto tu teléfono, incluido su horario nocturno.',
  themeSystem: 'Sistema',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  preview: 'Vista previa',
  themeSystemNoteLight: 'Ahora mismo tu teléfono está en modo claro.',
  themeSystemNoteDark: 'Ahora mismo tu teléfono está en modo oscuro.',
  themeAlwaysLight: 'Siempre claro, tenga lo que tenga tu teléfono.',
  themeAlwaysDark: 'Siempre oscuro, tenga lo que tenga tu teléfono.',

  /* La vista previa es una publicación inventada, solo para juzgar el tema. */
  previewName: 'Layla Haddad',
  previewCity: 'Dubái',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'Dos goles y una asistencia en el derbi. El clip entero en mi perfil.',

  // ── Eliminar la cuenta (app/settings/delete-account.tsx) ───────────────────
  deleteAccountTitle: 'Eliminar la cuenta',
  deleteAccountSubtitle: 'Borra para siempre tu perfil y todo lo que hay en él',
  deleteCannotUndoTitle: 'Esto no se puede deshacer',
  deleteCannotUndoBody:
    'Eliminar tu cuenta la borra para siempre. No hay forma de recuperarla, y registrarte otra vez empieza desde cero: un perfil nuevo y una Puntuación de talento que arranca en cero.',

  beforeYouGo: 'Antes de irte',
  takeABreakTitle: 'Mejor tómate un descanso',
  takeABreakBody:
    'Si desactivas la visibilidad, desapareces de las búsquedas de reclutadores. Tu perfil, tus publicaciones y tu puntuación se quedan igual, y puedes volver a activarla cuando quieras.',
  turnOffDiscovery: 'Desactivar la visibilidad',
  discoveryAlreadyOff: 'La visibilidad ya está desactivada',
  hiddenFromSearchToast:
    'Ya no apareces en las búsquedas de reclutadores. No se ha eliminado nada.',
  deleteExportBody:
    'Guarda una copia de tu perfil, publicaciones, comentarios, seguimientos y solicitudes antes de que se borre nada. Una vez eliminada la cuenta, ya no podemos enviártela.',

  whatGetsDeleted: 'Qué se elimina',
  removedProfile: 'Tu perfil, tu foto y todo lo que escribiste en él',
  removedPosts: 'Todas tus publicaciones, comentarios y me gusta',
  removedMessages: 'Tus mensajes, en todas las conversaciones',
  removedApplications: 'Tus solicitudes y las oportunidades que guardaste',
  removedScore: 'Tu Puntuación de talento y todo su historial',
  removedFollows: 'Tus seguidores y todas las cuentas que sigues',
  retentionNote:
    'Conservamos unos pocos registros durante un tiempo limitado cuando la ley lo exige: registros de seguridad y moderación, y lo necesario para responder a una reclamación legal. Nada de tu perfil se le vuelve a mostrar a nadie.',

  /**
   * La palabra que se escribe para confirmar la eliminación. Tradúcela por la
   * palabra que la gente escribiría de verdad en este idioma; la comparación no
   * distingue mayúsculas.
   */
  deleteConfirmWord: 'ELIMINAR',
  typeToContinue: 'Escribe {{word}} para continuar',
  deleteMyAccount: 'Eliminar mi cuenta',
  changedYourMind: '¿Cambiaste de idea? Vuelve atrás: todavía no ha pasado nada.',
  deleteConfirmTitle: '¿Eliminar tu cuenta?',
  deleteConfirmBody:
    'Este es el último paso. Tu perfil, tus publicaciones, tus mensajes, tus solicitudes y tu Puntuación de talento se eliminan para siempre y no se pueden recuperar.',
  deletePermanently: 'Eliminar para siempre',
  keepMyAccount: 'Conservar mi cuenta',

  // ── Controles compartidos de ajustes (components/settings/) ────────────────
  nothingToChoose: 'Aquí todavía no hay nada que elegir.',
  stepperDecrease: 'Reducir {{label}}',
  stepperIncrease: 'Aumentar {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** Una fila de opción leída en voz alta: su etiqueta y luego la línea que la explica. */
  radioA11y: '{{label}}. {{hint}}',

  // ── Marco de las pantallas legales (app/legal/) ────────────────────────────
  /* Los documentos se publican en inglés y no se traducen nunca: solo se
     traduce lo que los rodea. */
  legalUpdated: 'Actualizado el {{date}}',
  legalLinkExternal: '{{label}}, se abre fuera de la app',

  // ── Falta configuración (components/common/ConfigMissing.tsx) ──────────────
  configMissingTitle: 'Falta la configuración',
  configMissingBody:
    'AceAiX no puede llegar a su backend porque las variables de entorno de Supabase no están definidas para esta compilación.',
  configMissingHint:
    'Añádelas a `mobile/.env` para el desarrollo local, o como secretos de EAS para una compilación, y luego reinicia el bundler.',
};
