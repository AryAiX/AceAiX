/**
 * Seguridad: bloqueos, permiso de la madre, el padre o el tutor, y todo lo que
 * protege a un menor.
 *
 * Está separado de `settings.ts` a propósito: es texto de cumplimiento, y quien
 * lo revise tiene que poder leerlo entero de una vez, en cualquier idioma, sin
 * atravesar selectores de tema e interruptores de notificaciones.
 *
 * Aquí todos los significados pesan. Trece años es la edad mínima. Quien tiene
 * entre 13 y 17 años no aparece en las búsquedas y nadie puede escribirle hasta
 * que su madre, padre o tutor lo apruebe. A un menor nunca se le ofrece «Todo
 * el mundo» como ajuste de bandeja de entrada. Traduce las palabras; no
 * suavices, no generalices y no dejes fuera ninguna condición.
 *
 * Los motivos de denuncia se guardan en inglés en la base de datos: solo se
 * traduce la etiqueta que lee quien denuncia.
 */
export const safety = {
  // ── Bloqueos (app/settings/blocked.tsx) ────────────────────────────────────
  blockedTitle: 'Cuentas bloqueadas',
  blockedEmptyTitle: 'No has bloqueado a nadie.',
  blockedEmptyBody:
    'Bloquear a alguien impide que te escriba, que te siga y que vea tus publicaciones. Nunca se lo decimos.',
  blockedCount_one:
    'Hay {{count}} cuenta bloqueada. No puede escribirte, ni seguirte, ni ver tus publicaciones.',
  blockedCount_many:
    'Hay {{count}} cuentas bloqueadas. No pueden escribirte, ni seguirte, ni ver tus publicaciones.',
  blockedCount_other:
    'Hay {{count}} cuentas bloqueadas. No pueden escribirte, ni seguirte, ni ver tus publicaciones.',
  unblockConfirmTitle: '¿Desbloquear a {{name}}?',
  unblockConfirmBody:
    'Podrá encontrarte, seguirte y escribirte otra vez, según tus ajustes de privacidad. No se le avisa en ningún caso.',
  unblockedToast: 'Desbloqueaste a {{name}}',

  /** Aparece en la pantalla de privacidad, donde se explica el bloqueo pero no se hace. */
  blockingExplainer:
    'Bloquear a alguien impide que te escriba, que te siga y que vea tus publicaciones, y no se le avisa. Puedes deshacerlo en {{settings}} y luego {{blocked}}.',

  // ── Menores (app/settings/privacy.tsx) ─────────────────────────────────────
  minorMessagingNote:
    'Como eres menor de 18, «Todo el mundo» no es una opción. Solo los entrenadores y clubes verificados pueden escribirte primero, y solo cuando tu madre, padre o tutor haya aprobado los mensajes.',
  minorNeverPublic:
    'Eres menor de 18, así que tu perfil no se le muestra nunca a alguien que no ha iniciado sesión. No hay ningún ajuste para esto ni forma de desactivarlo: lo impone nuestra base de datos, no la app.',
  minorsNeverPublicNote:
    'Los perfiles de menores de 18 no se muestran nunca a visitantes sin sesión iniciada, digan lo que digan sus ajustes.',
  discoveryWaitingGuardian: 'Esperando a tu madre, padre o tutor',
  guardianApprovalNeeded: 'Antes tiene que aprobarlo tu madre, padre o tutor.',
  askGuardian: 'Pedírselo a tu madre, padre o tutor',

  /** Pantalla de cuenta: para qué existe la verificación y qué desbloquea. */
  verificationFooter:
    'Una insignia de verificación les dice a los deportistas y a los clubes que hemos comprobado quién eres. Además, los adultos verificados son los únicos que pueden empezar una conversación con un deportista menor de 18.',

  /** Preferencias de reclutamiento: qué puede y qué no puede hacer un reclutador con un menor. */
  scoutingMinorNote:
    'Los deportistas menores de 18 solo aparecen aquí cuando su madre, padre o tutor lo ha aprobado, y solo puedes escribirles si tu cuenta está verificada.',

  // ── Permiso del adulto responsable (app/settings/guardian.tsx) ─────────────
  guardianTitle: 'Madre, padre o tutor',
  guardianAthletesTitle: 'Deportistas a tu cargo',
  guardianSubtitleMinor: 'Permiso para tu perfil',

  // Lo que aprueba un adulto, permiso a permiso
  scopeDiscovery: 'Aparecer en las búsquedas de reclutadores',
  scopeDiscoveryOff: 'Oculto en las búsquedas',
  scopeMessaging: 'Recibir mensajes de entrenadores y clubes verificados',
  scopeMessagingOff: 'Nadie puede escribir primero',
  scopeMedia: 'Mostrar fotos y videos en el perfil',
  scopeMediaOff: 'Sin fotos ni videos',

  // Lo que ve el deportista joven
  minorHeading: 'Tu madre, padre o tutor',
  minorIntro:
    'Eres menor de 18, así que un adulto tiene que aprobar tu perfil antes de que los entrenadores y los clubes puedan encontrarte. Hasta que lo haga, no apareces en las búsquedas y nadie puede escribirte primero.',

  consentApproved: 'Aprobado',
  consentActive: 'Activo',
  consentGrantedMeta: '{{name}} · {{date}}',
  whatTheyApproved: 'Lo que aprobó',
  changeConsentNote:
    'Para cambiar algo de esto, pídele a {{name}} que abra el enlace que le enviamos a {{email}}, o que escriba a {{contact}}.',
  withdrawPermission: 'Retirar el permiso',

  consentWaitingTitle: 'Esperando la aprobación',
  consentPending: 'Pendiente',
  consentSentOn: 'Enviado el {{date}}',
  consentEmailNote_one:
    'Le enviamos un enlace seguro por correo. Funciona durante {{count}} día. Si no le llegó, pídele que mire su carpeta de spam y vuelve a enviarlo.',
  consentEmailNote_many:
    'Le enviamos un enlace seguro por correo. Funciona durante {{count}} días. Si no le llegó, pídele que mire su carpeta de spam y vuelve a enviarlo.',
  consentEmailNote_other:
    'Le enviamos un enlace seguro por correo. Funciona durante {{count}} días. Si no le llegó, pídele que mire su carpeta de spam y vuelve a enviarlo.',
  resendEmail: 'Reenviar el correo',
  resentToast: 'Enviamos el correo otra vez.',

  consentRevokedNote:
    'El permiso se retiró el {{date}}. Tu perfil está oculto en las búsquedas hasta que un adulto vuelva a aprobarlo.',

  // Pedir permiso
  askForPermission: 'Pedir permiso',
  askSomeoneElse: 'Pedírselo a otra persona',
  requestFormHint:
    'Le enviaremos un enlace por correo. Elige qué permite y puede cambiar de opinión cuando quiera.',
  guardianNameLabel: 'Su nombre completo',
  guardianNamePlaceholder: 'p. ej. Amina Haddad',
  guardianEmailLabel: 'Su correo electrónico',
  relationshipQuestion: '¿Quién es para ti?',
  relationshipParent: 'Madre o padre',
  relationshipGuardian: 'Tutor',
  relationshipOther: 'Otro',
  guardianEmailUseNote:
    'Usa una dirección real que revise. Solo la usamos para pedir el permiso y para avisarle de cambios en tu cuenta.',
  sendRequest: 'Enviar la solicitud',
  sendNewRequest: 'Enviar otra solicitud',
  replacesPending: 'Enviar otra solicitud sustituye a la que está esperando.',
  requestSentToast: 'Enviada. Pídele que mire su bandeja de entrada.',
  nameRequired: 'Escribe su nombre completo.',
  emailInvalid: 'Ese correo no parece correcto.',

  whatChangesHeading: 'Qué cambia cuando lo apruebe',
  whatChangesBody:
    'Tu perfil puede aparecer en las búsquedas de reclutadores, y los entrenadores y clubes verificados pueden enviarte un primer mensaje. No cambia nada más, y tu edad exacta y tu fecha de nacimiento siguen siendo privadas.',
  readChildSafety: 'Leer nuestras Normas de protección de menores',

  withdrawConfirmTitle: '¿Retirar el permiso?',
  withdrawConfirmBody:
    'Tu perfil volverá a estar oculto en las búsquedas de reclutadores, y los entrenadores no podrán empezar conversaciones nuevas contigo. Puedes volver a pedir permiso cuando quieras.',
  withdraw: 'Retirar',
  consentWithdrawnToast:
    'Permiso retirado. Tu perfil vuelve a estar oculto en las búsquedas.',

  // Lo que ve el adulto responsable
  approvingHeading: 'Aprobar a un deportista joven',
  approvingBody1:
    'Cuando alguien de 13 a 17 años te nombra como su madre, padre o tutor, te enviamos un enlace seguro por correo. Al abrirlo puedes aprobar o rechazar tres cosas por separado: aparecer en las búsquedas de reclutadores, recibir mensajes de entrenadores y clubes verificados, y mostrar fotos y videos.',
  approvingBody2_one:
    'El enlace funciona durante {{count}} día. Hasta que lo uses, su perfil sigue oculto en las búsquedas y ningún adulto puede escribirle. Puedes cambiar o retirar tu decisión cuando quieras desde ese mismo enlace, o escribiendo a {{email}}.',
  approvingBody2_many:
    'El enlace funciona durante {{count}} días. Hasta que lo uses, su perfil sigue oculto en las búsquedas y ningún adulto puede escribirle. Puedes cambiar o retirar tu decisión cuando quieras desde ese mismo enlace, o escribiendo a {{email}}.',
  approvingBody2_other:
    'El enlace funciona durante {{count}} días. Hasta que lo uses, su perfil sigue oculto en las búsquedas y ningún adulto puede escribirle. Puedes cambiar o retirar tu decisión cuando quieras desde ese mismo enlace, o escribiendo a {{email}}.',
  guardianPhishingNote:
    'Nunca te pediremos un pago, un dato bancario ni una copia de un documento de identidad por correo. Si un mensaje dice ser de AceAiX y te pide alguna de esas cosas, no es nuestro.',

  linkedAthletes: 'Deportistas vinculados a ti',
  noLinkedAthletes:
    'Todavía no te ha nombrado nadie. Cuando lo hagan, la solicitud llega por correo y aparece aquí.',
  linkApprovedOn: 'Aprobado el {{date}}',
  linkRequestedOn: 'Solicitado el {{date}}',
  linkWithdrawn: 'Permiso retirado',
  linkExpired: 'Solicitud caducada',
  badgeWithdrawn: 'Retirado',
  badgeExpired: 'Caducada',

  // Lo que un adulto puede ver de una conversación: que existe, nunca sus palabras
  whoTheyTalkTo: 'Con quién habla',
  noConversations: 'Todavía no hay conversaciones.',
  messageContentsNote:
    'AceAiX no te muestra el contenido de sus mensajes. Si algo te preocupa, escribe a {{email}}.',

  guardianContactNote:
    'Dudas sobre la cuenta de un menor: {{privacyEmail}}. Cualquier cosa sobre su seguridad: {{safetyEmail}}.',

  // Un adulto que llegó a la pantalla del adulto responsable
  adultNothingTitle: 'Nada que aprobar',
  adultNothingBody:
    'El permiso de la madre, el padre o el tutor se aplica a las cuentas de personas de 13 a 17 años. La tuya es una cuenta de adulto, así que tu perfil y tus mensajes se rigen por tus propios ajustes de privacidad.',
};
