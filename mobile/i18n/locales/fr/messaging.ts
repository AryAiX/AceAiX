/**
 * Messagerie et notifications.
 *
 * Regroupé dans l’ordre où on les rencontre : la boîte de réception et une de
 * ses lignes, le menu de sécurité derrière chaque « … », puis la conversation —
 * en-tête, séparateurs de jour, bulles, bandeau des moins de 18 ans, la carte
 * qui remplace l’éditeur quand un message ne peut pas être remis, et l’éditeur
 * lui-même — et enfin l’écran des notifications et une de ses lignes.
 *
 * Deux choses vivent volontairement ailleurs. Les motifs de signalement ne sont
 * que des libellés : les valeurs écrites dans la table de modération sont des
 * constantes anglaises du composant. Et les motifs de blocage renvoyés par la
 * base (`minor_requires_verified_sender` et compagnie) ne sont jamais traduits
 * non plus — seule l’explication affichée pour chacun l’est.
 */
export const messaging = {
  // ── Boîte de réception ─────────────────────────────────────────────────────
  inboxTitle: 'Messages',
  inboxEmptyTitle: 'Aucun message',
  inboxEmptyBody: 'Quand un coach ou un club te contacte, ça arrive ici.',
  inboxEmptyAction: 'Aller dans Découvrir',

  // ── Une ligne de conversation ──────────────────────────────────────────────
  previewBlocked: 'Tu as bloqué ce compte',
  previewNone: 'Aucun message',
  unreadMessages_one: '{{count}} message non lu',
  unreadMessages_many: '{{count}} messages non lus',
  unreadMessages_other: '{{count}} messages non lus',
  /* Affiché dans le badge à la place d’un nombre à quatre chiffres. */
  unreadOverflow: '99+',
  conversationHint: 'Ouvre la conversation. Appui long pour plus d’options.',

  // ── Menu de sécurité (ligne de la boîte et « … » de la conversation) ───────
  thisPerson: 'cette personne',
  thisPersonSentence: 'Cette personne',
  muteConversation: 'Mettre en sourdine',
  unmuteConversation: 'Réactiver les notifications',
  muteHint: 'Seulement sur ce téléphone. La personne n’en sait rien.',
  reportHint: 'Dis-nous ce qui ne va pas. Les signalements restent privés.',
  blockPerson: 'Bloquer {{name}}',
  blockHint: 'Cette personne ne pourra plus t’écrire ni voir ton profil.',

  reportPerson: 'Signaler {{name}}',
  reportReasonPrompt: 'Choisis le motif le plus proche. On ne dit jamais qui a signalé.',
  reasonHarassment: 'Harcèlement ou intimidation',
  reasonChildSafety: 'Protection des mineurs',
  reasonScam: 'Arnaque ou fausse offre',
  reasonSpam: 'Spam',
  reasonNudity: 'Nudité ou contenu sexuel',
  reasonHate: 'Discours haineux',
  reasonImpersonation: 'Usurpation d’identité',
  reasonOther: 'Autre chose',
  reportDetailsLabel: 'Autre chose à nous dire ?',
  reportEmergencyNote:
    'Si quelqu’un est en danger en ce moment, contacte aussi les secours de ton pays.',
  reportThanks: 'Merci de nous l’avoir dit. Notre équipe va regarder.',

  blockConfirmTitle: 'Bloquer {{name}} ?',
  blockConfirmBody:
    'Cette personne ne verra plus ton profil ni tes posts, ne pourra plus t’écrire, et tu ne la verras plus. Tu peux annuler ça dans les réglages.',
  blockedToast: '{{name}} est bloqué. Tu peux annuler ça dans les réglages.',

  // ── Conversation ───────────────────────────────────────────────────────────
  conversationNotOpened: 'On n’a pas pu ouvrir cette conversation.',
  loadingMessages: 'Chargement des messages',
  threadStart: 'C’est le début de la conversation. Dis bonjour.',
  threadStartWith: 'C’est le début de ta conversation avec {{name}}. Dis bonjour.',

  closedTitle: 'Cette conversation est fermée',
  closedBody:
    'Tu as bloqué ce compte : aucun de vous deux ne verra l’autre. Tu peux annuler ça dans les réglages.',
  closedAction: 'Retour aux messages',
  blockedFromThread: 'Tu n’auras plus de nouvelles de ce compte.',

  // ── En-tête de conversation ────────────────────────────────────────────────
  backToMessages: 'Retour aux messages',
  openProfileOf: 'Ouvrir le profil de {{name}}',
  loadingConversation: 'Chargement de la conversation',
  moreOptions: 'Plus d’options',

  // ── Un message ─────────────────────────────────────────────────────────────
  messageFailedA11y: 'L’envoi du message a échoué. Appuie pour réessayer.',
  notSent: 'Non envoyé — appuie pour réessayer',
  sending: 'Envoi',

  // ── Bandeau des moins de 18 ans ────────────────────────────────────────────
  /* Texte de conformité. Le sens est exact et doit le rester dans toutes les
     langues : la personne à qui l’on écrit a moins de 18 ans, et son parent ou
     tuteur peut voir que cette conversation existe — pas ce qu’elle contient. */
  minorBanner:
    'Tu écris à un athlète de moins de 18 ans. Son parent ou tuteur peut voir que cette conversation existe.',

  // ── Message bloqué ─────────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: 'Les messages sont limités ici',
  blockedVerifiedSenderBody:
    '{{name}} a moins de 18 ans. Seuls les coachs et les clubs que nous avons vérifiés peuvent engager une conversation avec lui.',
  blockedGuardianConsentTitle: 'En attente d’un parent ou tuteur',
  blockedGuardianConsentBody:
    '{{name}} a moins de 18 ans, et son parent ou tuteur n’a pas encore autorisé les messages.',
  blockedMessagesOffTitle: 'Messages désactivés',
  blockedMessagesOffBody: '{{name}} a choisi de ne pas recevoir de messages en ce moment.',
  blockedOnlyFollowedTitle: 'Pas ouvert aux nouveaux messages',
  blockedOnlyFollowedBody: '{{name}} n’accepte les messages que des gens qu’il suit.',
  blockedOnlyVerifiedTitle: 'Comptes vérifiés seulement',
  blockedOnlyVerifiedBody:
    '{{name}} n’accepte les messages que des coachs et des clubs vérifiés.',
  blockedNotFoundTitle: 'Ce compte n’existe plus',
  blockedNotFoundBody: 'La personne à qui tu écrivais n’est plus sur AceAiX.',
  blockedDefaultTitle: 'Tu ne peux pas écrire ici',
  blockedDefaultBody: 'On ne peut pas remettre de message à {{name}} pour le moment.',

  howTitle: 'Comment marche la messagerie',
  howSubtitle:
    'AceAiX est fait pour de jeunes athlètes : qui peut engager une conversation est donc limité, exprès.',
  howMinorsTitle: 'Les athlètes de moins de 18 ans sont plus protégés',
  howMinorsBody:
    'Un adulte ne peut engager une conversation avec un athlète de moins de 18 ans que si nous l’avons vérifié comme coach ou club, et si le parent ou tuteur de l’athlète a autorisé les messages.',
  howInboxTitle: 'Chacun choisit sa boîte de réception',
  howInboxBody:
    'Chacun peut limiter les messages aux coachs et clubs vérifiés, aux gens qu’il suit, ou les couper complètement. Ce choix lui appartient et on ne passe pas outre.',
  howTemporaryTitle: 'Rien ici n’est définitif',
  howTemporaryBody:
    'Si un tuteur autorise les messages, ou si la personne change son réglage, cette conversation s’ouvre toute seule. Vous suivre mutuellement aide aussi.',
  howWrongTitle: 'Si quelque chose ne va pas',
  howWrongBody:
    'Signale ou bloque depuis le menu « … » en haut de n’importe quelle conversation. Les signalements sont privés — on ne dit jamais à l’autre personne qui l’a signalée.',
  gotIt: 'Compris',

  // ── Éditeur ────────────────────────────────────────────────────────────────
  composerPlaceholder: 'Écris un message',
  composerPlaceholderNamed: 'Écrire à {{name}}',
  sendMessage: 'Envoyer le message',

  // ── Notifications ──────────────────────────────────────────────────────────
  notificationsTitle: 'Notifications',
  sectionNew: 'Nouveau',
  sectionEarlier: 'Plus tôt',
  markAllRead: 'Tout marquer comme lu',
  markAllReadA11y_one: 'Marquer {{count}} notification comme lue',
  markAllReadA11y_many: 'Marquer les {{count}} notifications comme lues',
  markAllReadA11y_other: 'Marquer les {{count}} notifications comme lues',
  notificationsEmptyTitle: 'Rien de nouveau',
  notificationsEmptyBody: 'Poste un clip ou suis quelques clubs et ça va se remplir.',
  notificationsEmptyAction: 'Trouver des gens à suivre',

  // ── Une notification ───────────────────────────────────────────────────────
  /* La phrase elle-même arrive du serveur déjà écrite — voir la note KNOWN GAP
     dans NotificationRow. Seul le préfixe d’acteur est à nous : le serveur met
     le nom du dernier acteur devant et compte les autres, et `groupedTitle` est
     l’endroit où une langue qui se lit de droite à gauche peut inverser les deux
     moitiés. */
  actorAndOthers_one: '{{name}} et {{count}} autre',
  actorAndOthers_many: '{{name}} et {{count}} autres',
  actorAndOthers_other: '{{name}} et {{count}} autres',
  groupedTitle: '{{actors}}{{rest}}',
  unread: 'Non lu',
};
