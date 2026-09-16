/**
 * El feed, el editor y una publicación suelta.
 *
 * Agrupado en el orden en que se encuentran: inicio, luego una tarjeta y sus
 * acciones, luego los comentarios, luego el menú de seguridad que hay detrás de
 * cada «…», y después el editor, la pantalla de una publicación y la del enlace
 * roto.
 *
 * Los motivos de denuncia aparecen aquí solo como etiquetas: los valores que se
 * envían a la tabla de moderación son constantes en inglés dentro del
 * componente y no se traducen nunca.
 */
export const feed = {
  // ── Inicio ─────────────────────────────────────────────────────────────────
  scopeForYou: 'Para ti',
  scopeFollowing: 'Siguiendo',

  messages: 'Mensajes',
  messagesUnread_one: 'Mensajes, {{count}} sin leer',
  messagesUnread_many: 'Mensajes, {{count}} sin leer',
  messagesUnread_other: 'Mensajes, {{count}} sin leer',
  notifications: 'Notificaciones',
  notificationsNew_one: 'Notificaciones, {{count}} nueva',
  notificationsNew_many: 'Notificaciones, {{count}} nuevas',
  notificationsNew_other: 'Notificaciones, {{count}} nuevas',

  emptyFollowingTitle: 'Todavía no hay nada de los tuyos',
  emptyFollowingBody:
    'Sigue a deportistas, entrenadores y clubes que te interesen y sus publicaciones aparecerán aquí.',
  emptyFollowingAction: 'Buscar a quién seguir',
  emptyForYouTitle: 'Tu feed está calentando',
  emptyForYouBody:
    'Sigue a unos cuantos deportistas para llenarlo, o publica algo tuyo para empezar.',
  emptyForYouAction: 'Buscar gente',

  // ── Tarjeta de publicación ─────────────────────────────────────────────────
  openProfileOf: 'Abrir el perfil de {{name}}',
  postMoreOptions:
    'Más opciones para la publicación de {{name}}, incluidas denunciar y bloquear',
  showFullCaption: 'Ver el texto completo',
  openPost: 'Abrir la publicación',

  // ── Me gusta, comentar, compartir, guardar ─────────────────────────────────
  likePost: 'Dar me gusta a esta publicación',
  unlikePost: 'Quitar el me gusta de esta publicación',
  readAndAddComments: 'Leer y añadir comentarios',
  sharePost: 'Compartir esta publicación',
  savePost: 'Guardar esta publicación',
  removeFromSaved: 'Quitar de guardados',

  // ── Contenido ──────────────────────────────────────────────────────────────
  mediaSwipe_one: '{{count}} elemento, desliza para ver más',
  mediaSwipe_many: '{{count}} elementos, desliza para ver más',
  mediaSwipe_other: '{{count}} elementos, desliza para ver más',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'Clip de video',
  soundOn: 'Activar el sonido',
  soundOff: 'Desactivar el sonido',

  // ── Comentarios ────────────────────────────────────────────────────────────
  commentsTitle: 'Comentarios',
  commentsHeading_one: 'Comentarios ({{count}})',
  commentsHeading_many: 'Comentarios ({{count}})',
  commentsHeading_other: 'Comentarios ({{count}})',
  noCommentsTitle: 'Todavía no hay comentarios',
  noCommentsBody: 'Di algo que anime.',
  reply: 'Responder',
  replyTo: 'Responder a {{name}}',
  replyingTo: 'Respondiendo a {{name}}',
  stopReplying: 'Dejar de responder',
  commentPlaceholder: 'Añade un comentario…',
  writeComment: 'Escribir un comentario',
  postComment: 'Publicar comentario',
  ownCommentOptions: 'Opciones de tu comentario',
  reportOrBlockPerson: 'Denunciar o bloquear a {{name}}',

  // ── Menú de seguridad ──────────────────────────────────────────────────────
  thisPerson: 'esta persona',
  actionsOwnPost: 'Tu publicación',
  actionsOwnComment: 'Tu comentario',
  actionsPost: 'Esta publicación',
  actionsComment: 'Este comentario',
  linkCopied: 'Enlace copiado',
  linkCopyFailed: 'No pudimos copiar ese enlace.',
  deletePost: 'Eliminar publicación',
  deleteComment: 'Eliminar comentario',
  reportPost: 'Denunciar publicación',
  reportComment: 'Denunciar comentario',
  reportHint: 'Cuéntanos qué pasa. Las denuncias son privadas.',
  blockPerson: 'Bloquear a {{name}}',
  blockHint: 'No podrá encontrarte ni escribirte.',

  reportThisPost: 'Denunciar esta publicación',
  reportThisComment: 'Denunciar este comentario',
  reportReasonPrompt: 'Elige el motivo más cercano. Nunca decimos quién denunció.',
  reasonSpam: 'Spam',
  reasonHarassment: 'Acoso o intimidación',
  reasonNudity: 'Desnudos o contenido sexual',
  reasonViolence: 'Violencia',
  reasonHate: 'Discurso de odio',
  reasonImpersonation: 'Suplantación de identidad',
  reasonChildSafety: 'Protección de menores',
  reasonScam: 'Estafa',
  reasonOther: 'Otra cosa',
  reportDetailsLabel: '¿Algo más que debamos saber?',
  reportEmergencyNote:
    'Si alguien está en peligro ahora mismo, avisa también a los servicios de emergencia de tu zona.',
  reportThanks: 'Gracias por contárnoslo. Nuestro equipo lo revisará.',

  blockConfirmTitle: '¿Bloquear a {{name}}?',
  blockConfirmBody:
    'No verá tu perfil ni tus publicaciones, no podrá escribirte y tú tampoco le verás. Puedes deshacerlo en Ajustes.',
  blockedToast: 'Bloqueaste a {{name}}. Puedes deshacerlo en Ajustes.',

  deletePostConfirmTitle: '¿Eliminar esta publicación?',
  deleteCommentConfirmTitle: '¿Eliminar este comentario?',
  deleteConfirmBody: 'Esto no se puede deshacer.',
  keepIt: 'Conservarlo',
  postDeleted: 'Publicación eliminada',
  commentDeleted: 'Comentario eliminado',

  // ── Editor ─────────────────────────────────────────────────────────────────
  composeTitle: 'Nueva publicación',
  cancelAndClose: 'Cancelar y cerrar',
  postButton: 'Publicar',
  uploading: 'Subiendo {{done}} de {{total}}…',
  audienceA11y: 'Quién puede ver esto: {{audience}}. Cambiarlo.',
  composePlaceholder: 'Comparte una novedad, un resultado o un clip…',
  composeA11y: '¿Qué quieres compartir?',
  charCount: '{{used}}/{{max}}',
  clip: 'Clip',
  selectedPhoto: 'Foto seleccionada {{index}}',
  selectedVideo: 'Video seleccionado {{index}}',
  removePhoto: 'Quitar la foto {{index}}',
  removeVideo: 'Quitar el video {{index}}',
  addMedia: 'Añadir foto o video',
  addMediaA11y: 'Añadir una foto o un video',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX necesita permiso para abrir tus fotos. Actívalo en Ajustes.',
  posted: 'Publicado',
  /* Escrito para alguien de 13 años: corto, sencillo y con los tres ejemplos. */
  safetyNote: 'Sé amable. No compartas tu dirección, tu teléfono ni tu escuela.',

  audienceSheetTitle: '¿Quién puede ver esto?',
  audienceEveryone: 'Todo el mundo',
  audienceEveryoneDetail: 'Cualquiera en AceAiX puede verlo.',
  audienceFollowersDetail: 'Solo quienes te siguen.',
  audienceConnections: 'Conexiones',
  audienceConnectionsDetail: 'Solo las personas a las que sigues y que te siguen.',

  discardTitle: '¿Descartar esta publicación?',
  discardBody: 'No se guardará lo que escribiste ni lo que elegiste.',
  discard: 'Descartar',
  keepWriting: 'Seguir escribiendo',

  // ── Una publicación ────────────────────────────────────────────────────────
  postTitle: 'Publicación',
  postUnavailableTitle: 'Esta publicación ya no está disponible',
  postUnavailableBody: 'Puede que se haya eliminado o retirado.',
  postUnavailableBodyRules:
    'Puede que se haya eliminado, o que se haya retirado por incumplir nuestras normas.',
  goBack: 'Volver',

  // ── Enlace roto ────────────────────────────────────────────────────────────
  notFoundTitle: 'Esta página ya no existe',
  notFoundBody: 'El enlace que seguiste no lleva a ninguna parte dentro de AceAiX.',
  notFoundAction: 'Volver al inicio',
};
