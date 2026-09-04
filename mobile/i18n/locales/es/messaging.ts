/**
 * Mensajes y notificaciones.
 *
 * Agrupado en el orden en que se encuentran: la bandeja de entrada y una de sus
 * filas, el menú de seguridad que hay detrás de cada «…», luego la conversación
 * —cabecera, separadores de día, burbujas, el aviso de menores de 18, la
 * tarjeta que sustituye al editor cuando un mensaje no se puede entregar y el
 * propio editor— y por último la pantalla de notificaciones y una de sus filas.
 *
 * Dos cosas viven a propósito en otro sitio. Los motivos de denuncia son solo
 * etiquetas: los valores que se escriben en la tabla de moderación son
 * constantes en inglés dentro del componente. Y los motivos de bloqueo que
 * devuelve la base de datos (`minor_requires_verified_sender` y compañía)
 * tampoco se traducen nunca: solo se traduce la explicación de cada uno.
 */
export const messaging = {
  // ── Bandeja de entrada ─────────────────────────────────────────────────────
  inboxTitle: 'Mensajes',
  inboxEmptyTitle: 'Todavía no hay mensajes',
  inboxEmptyBody: 'Cuando un entrenador o un club te escriba, llegará aquí.',
  inboxEmptyAction: 'Ir a Descubrir',

  // ── Una fila de conversación ───────────────────────────────────────────────
  previewBlocked: 'Bloqueaste esta cuenta',
  previewNone: 'Todavía no hay mensajes',
  unreadMessages_one: '{{count}} mensaje sin leer',
  unreadMessages_many: '{{count}} mensajes sin leer',
  unreadMessages_other: '{{count}} mensajes sin leer',
  /* Se muestra en la insignia en vez de un número de cuatro cifras. */
  unreadOverflow: '99+',
  conversationHint: 'Abre la conversación. Mantén pulsado para más opciones.',

  // ── Menú de seguridad (fila de la bandeja y «…» de la conversación) ────────
  thisPerson: 'esta persona',
  thisPersonSentence: 'Esta persona',
  muteConversation: 'Silenciar conversación',
  unmuteConversation: 'Dejar de silenciar',
  muteHint: 'Solo en este teléfono. Nunca se lo decimos.',
  reportHint: 'Cuéntanos qué pasa. Las denuncias son privadas.',
  blockPerson: 'Bloquear a {{name}}',
  blockHint: 'No podrá escribirte ni encontrar tu perfil.',

  reportPerson: 'Denunciar a {{name}}',
  reportReasonPrompt: 'Elige el motivo más cercano. Nunca decimos quién denunció.',
  reasonHarassment: 'Acoso o intimidación',
  reasonChildSafety: 'Protección de menores',
  reasonScam: 'Estafa u oferta falsa',
  reasonSpam: 'Spam',
  reasonNudity: 'Desnudos o contenido sexual',
  reasonHate: 'Discurso de odio',
  reasonImpersonation: 'Suplantación de identidad',
  reasonOther: 'Otra cosa',
  reportDetailsLabel: '¿Algo más que debamos saber?',
  reportEmergencyNote:
    'Si alguien está en peligro ahora mismo, avisa también a los servicios de emergencia de tu zona.',
  reportThanks: 'Gracias por contárnoslo. Nuestro equipo lo revisará.',

  blockConfirmTitle: '¿Bloquear a {{name}}?',
  blockConfirmBody:
    'No verá tu perfil ni tus publicaciones, no podrá escribirte y tú tampoco le verás. Puedes deshacerlo en Ajustes.',
  blockedToast: 'Bloqueaste a {{name}}. Puedes deshacerlo en Ajustes.',

  // ── Conversación ───────────────────────────────────────────────────────────
  conversationNotOpened: 'No pudimos abrir esa conversación.',
  loadingMessages: 'Cargando mensajes',
  threadStart: 'Aquí empieza la conversación. Saluda.',
  threadStartWith: 'Aquí empieza tu conversación con {{name}}. Saluda.',

  closedTitle: 'Esta conversación está cerrada',
  closedBody:
    'Bloqueaste esta cuenta, así que ninguno de los dos verá al otro. Puedes deshacerlo en Ajustes.',
  closedAction: 'Volver a mensajes',
  blockedFromThread: 'No volverás a saber de esta cuenta.',

  // ── Cabecera de la conversación ────────────────────────────────────────────
  backToMessages: 'Volver a mensajes',
  openProfileOf: 'Abrir el perfil de {{name}}',
  loadingConversation: 'Cargando la conversación',
  moreOptions: 'Más opciones',

  // ── Un mensaje ─────────────────────────────────────────────────────────────
  messageFailedA11y: 'El mensaje no se envió. Toca para intentarlo otra vez.',
  notSent: 'No enviado: toca para reintentar',
  sending: 'Enviando',

  // ── Aviso de menores de 18 ─────────────────────────────────────────────────
  /* Texto de cumplimiento. El significado es exacto y tiene que seguir siéndolo
     en todos los idiomas: la persona a la que se escribe es menor de 18, y su
     madre, padre o tutor puede ver que esta conversación existe, no lo que hay
     dentro. */
  minorBanner:
    'Estás escribiendo a un deportista menor de 18. Su madre, padre o tutor puede ver que esta conversación existe.',

  // ── Mensaje bloqueado ──────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: 'Aquí los mensajes están limitados',
  blockedVerifiedSenderBody:
    '{{name}} es menor de 18. Solo pueden empezar una conversación los entrenadores y clubes que hemos verificado.',
  blockedGuardianConsentTitle: 'Esperando a su madre, padre o tutor',
  blockedGuardianConsentBody:
    '{{name}} es menor de 18 y su madre, padre o tutor todavía no aprobó los mensajes.',
  blockedMessagesOffTitle: 'Los mensajes están desactivados',
  blockedMessagesOffBody: '{{name}} prefiere no recibir mensajes ahora mismo.',
  blockedOnlyFollowedTitle: 'No acepta mensajes nuevos',
  blockedOnlyFollowedBody:
    '{{name}} solo acepta mensajes de las personas a las que sigue.',
  blockedOnlyVerifiedTitle: 'Solo cuentas verificadas',
  blockedOnlyVerifiedBody:
    '{{name}} solo acepta mensajes de entrenadores y clubes verificados.',
  blockedNotFoundTitle: 'Esta cuenta ya no está',
  blockedNotFoundBody: 'La persona a la que escribías ya no está en AceAiX.',
  blockedDefaultTitle: 'Aquí no puedes escribir',
  blockedDefaultBody: 'Ahora mismo no podemos entregar mensajes a {{name}}.',

  howTitle: 'Cómo funcionan los mensajes',
  howSubtitle:
    'AceAiX está hecho para deportistas jóvenes, así que quién puede empezar una conversación está limitado a propósito.',
  howMinorsTitle: 'Los menores de 18 tienen protección extra',
  howMinorsBody:
    'Un adulto solo puede empezar una conversación con un deportista menor de 18 si le hemos verificado como entrenador o club y si su madre, padre o tutor aprobó los mensajes.',
  howInboxTitle: 'Cada persona elige su bandeja de entrada',
  howInboxBody:
    'Cualquiera puede limitar los mensajes a entrenadores y clubes verificados, a las personas a las que sigue, o desactivarlos del todo. Esa decisión es suya y no la cambiamos.',
  howTemporaryTitle: 'Nada de esto es para siempre',
  howTemporaryBody:
    'Si su madre, padre o tutor aprueba los mensajes, o si esa persona cambia su ajuste, esta conversación se abre sola. Seguirse mutuamente también ayuda.',
  howWrongTitle: 'Si algo no va bien',
  howWrongBody:
    'Denuncia o bloquea desde el menú «…» de arriba en cualquier conversación. Las denuncias son privadas: nunca le decimos a la otra persona quién la denunció.',
  gotIt: 'Entendido',

  // ── Editor ─────────────────────────────────────────────────────────────────
  composerPlaceholder: 'Escribe un mensaje',
  composerPlaceholderNamed: 'Escribe a {{name}}',
  sendMessage: 'Enviar mensaje',

  // ── Notificaciones ─────────────────────────────────────────────────────────
  notificationsTitle: 'Notificaciones',
  sectionNew: 'Nuevas',
  sectionEarlier: 'Antes',
  markAllRead: 'Marcar todas como leídas',
  markAllReadA11y_one: 'Marcar {{count}} notificación como leída',
  markAllReadA11y_many: 'Marcar las {{count}} notificaciones como leídas',
  markAllReadA11y_other: 'Marcar las {{count}} notificaciones como leídas',
  notificationsEmptyTitle: 'Nada nuevo',
  notificationsEmptyBody:
    'Publica un clip o sigue a unos cuantos clubes y esto se llenará.',
  notificationsEmptyAction: 'Buscar a quién seguir',

  // ── Una notificación ───────────────────────────────────────────────────────
  /* La frase llega ya escrita desde el servidor: véase la nota KNOWN GAP en
     NotificationRow. Solo el prefijo con los nombres es nuestro: el servidor
     pone delante el nombre más reciente y cuenta el resto, y `groupedTitle` es
     donde un idioma que se lee de derecha a izquierda puede reordenar las dos
     mitades. */
  actorAndOthers_one: '{{name}} y {{count}} más',
  actorAndOthers_many: '{{name}} y {{count}} más',
  actorAndOthers_other: '{{name}} y {{count}} más',
  groupedTitle: '{{actors}}{{rest}}',
  unread: 'Sin leer',
};
