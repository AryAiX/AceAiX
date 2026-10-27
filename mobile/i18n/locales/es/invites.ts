/**
 * Invitaciones: un enlace personal, el círculo que construye y los tokens.
 *
 * Reglas de tono en cualquier idioma:
 *
 *   * Cercano y de equipo: «trae a tus compañeros de equipo», nunca «gana
 *     dinero».
 *   * Los tokens son puntos de AceAiX. Nunca los llames dinero, monedas,
 *     efectivo, cripto ni premios con valor; nunca prometas lo que se podrá
 *     conseguir con ellos.
 *   * A una amistad solo se la nombra por su nombre de pila.
 */
export const invites = {
  // ── Nombres ────────────────────────────────────────────────────────────────
  title: 'Invita a tus amistades',
  circleTitle: 'Mi círculo',
  tagline: 'Trae a tu equipo. Por cada 10 amistades que se unan, consigues un token.',

  // ── Tarjeta del perfil ─────────────────────────────────────────────────────
  cardCta: 'Invita a tus amistades',
  cardCtaBody: 'Por cada 10 amistades que se unan, consigues 1 token.',
  cardProgress: '{{n}} de {{total}} para tu próximo token',
  cardTokens: 'Tokens: {{n}}',

  // ── Pantalla del círculo ───────────────────────────────────────────────────
  linkTitle: 'Tu enlace de invitación',
  codeLabel: 'Tu código',
  share: 'Compartir invitación',
  copy: 'Copiar enlace',
  copied: 'Enlace copiado',
  shareMessage:
    'Únete a AceAiX, donde entrenadores y clubes descubren a deportistas. Regístrate con mi enlace: {{link}}. O introduce mi código {{code}} después de registrarte.',
  shareTitle: 'Únete a AceAiX conmigo',
  nextToken: 'Te faltan {{n}} para tu próximo token',
  tokensLabel: 'Tokens',
  countedLabel: 'Se unieron',
  pendingLabel: 'Configurando',
  howTitle: 'Cómo funciona',
  how1: 'Comparte tu enlace o tu código con tus amistades.',
  how2: 'Una amistad cuenta cuando termina de configurar su perfil. Si es menor de 18 años, cuenta cuando su madre, padre o tutor lo aprueba.',
  how3: 'Por cada 10 amistades que cuenten, consigues 1 token.',
  tokensNote: 'Los tokens son puntos de AceAiX. No tienen valor en efectivo y no se pueden comprar, vender ni transferir.',
  membersTitle: 'Amistades que invitaste',
  membersEmpty: 'Todavía nadie. Comparte tu enlace para empezar tu círculo.',
  statusQualified: 'Cuenta',
  statusPending: 'Configurando su perfil',
  invitedBy: 'Te invitó {{name}}',
  ledgerTitle: 'Historial de tokens',
  ledgerGained: '+{{n}} token',
  ledgerLost: '−{{n}} token: una invitación ya no cuenta',

  // ── Introducir un código a mano ────────────────────────────────────────────
  enterCodeTitle: '¿Te invitaron?',
  enterCodeBody:
    'Introduce el código de invitación de tu amistad durante los primeros 14 días. Cuando termines tu perfil, tienes un día para añadirlo.',
  enterCodePlaceholder: 'Código de invitación',
  enterCodeAction: 'Añadir código',
  enterCodeInvalid: 'Un código de invitación tiene 8 letras y números.',
  claimed: 'Te uniste con la invitación de {{name}}',

  notEligibleTitle: 'Las invitaciones son para deportistas y entrenadores',
  notEligibleBody: 'Si alguien te invitó, aparece aquí.',

  // ── Perfil de otra persona ─────────────────────────────────────────────────
  badgeTier: 'Ha traído a {{n}} o más personas a AceAiX',

  // ── Pantalla de llegada de un enlace de invitación ─────────────────────────
  landingTitle: '{{name}} te invitó a AceAiX',
  landingTitleNoName: 'Tienes una invitación a AceAiX',
  landingBody:
    'AceAiX es donde entrenadores y clubes descubren a jóvenes deportistas. Crea tu cuenta gratis para unirte.',
  landingSignUp: 'Crear mi cuenta',
  landingSignIn: 'Ya tengo una cuenta',
  landingInvalidTitle: 'Este enlace de invitación no es válido',
  landingInvalidBody: 'Pide a tu amistad que te lo vuelva a enviar. Aun así, puedes crear una cuenta.',
  landingSignedIn: 'Ya tienes una cuenta',
  landingSignedInBody: 'Si te uniste en los últimos 14 días, todavía puedes añadir esta invitación.',
  landingAddInvite: 'Añadir esta invitación',
  landingContinue: 'Continuar',
  landingCopy: 'Copiar',
  landingCopied: 'Código copiado',
  landingCopyFailed: 'No se pudo copiar el código. Selecciónalo y cópialo tú.',
  landingDownload:
    'Descarga AceAiX, regístrate e introduce este código en la app durante tus primeros 14 días.',
  landingAppStore: 'Consíguela en el App Store',
  landingGooglePlay: 'Consíguela en Google Play',
};
