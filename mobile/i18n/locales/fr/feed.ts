/**
 * Le fil, l’éditeur de post et un post seul.
 *
 * Regroupés dans l’ordre où on les rencontre : l’accueil, puis une carte et ses
 * actions, puis les commentaires, puis le menu de sécurité derrière chaque
 * « … », puis l’éditeur, l’écran d’un post seul et l’écran de lien mort.
 *
 * Les motifs de signalement n’apparaissent ici que comme libellés — les valeurs
 * envoyées à la table de modération sont des constantes anglaises du composant
 * et ne sont jamais traduites.
 */
export const feed = {
  // ── Accueil ────────────────────────────────────────────────────────────────
  scopeForYou: 'Pour toi',
  scopeFollowing: 'Abonnements',

  messages: 'Messages',
  messagesUnread_one: 'Messages, {{count}} non lu',
  messagesUnread_many: 'Messages, {{count}} non lus',
  messagesUnread_other: 'Messages, {{count}} non lus',
  notifications: 'Notifications',
  notificationsNew_one: 'Notifications, {{count}} nouvelle',
  notificationsNew_many: 'Notifications, {{count}} nouvelles',
  notificationsNew_other: 'Notifications, {{count}} nouvelles',

  emptyFollowingTitle: 'Rien de tes contacts pour l’instant',
  emptyFollowingBody:
    'Abonne-toi aux athlètes, coachs et clubs qui t’intéressent et leurs posts apparaîtront ici.',
  emptyFollowingAction: 'Trouver des gens à suivre',
  emptyForYouTitle: 'Ton fil se met en route',
  emptyForYouBody:
    'Abonne-toi à quelques athlètes pour le remplir, ou poste ta propre actu pour lancer les choses.',
  emptyForYouAction: 'Trouver des gens',

  // ── Carte de post ──────────────────────────────────────────────────────────
  openProfileOf: 'Ouvrir le profil de {{name}}',
  postMoreOptions: 'Plus d’options pour le post de {{name}}, dont signaler et bloquer',
  showFullCaption: 'Afficher la légende entière',
  openPost: 'Ouvrir le post',

  // ── Like, commentaire, partage, enregistrement ─────────────────────────────
  likePost: 'Liker ce post',
  unlikePost: 'Retirer le like',
  readAndAddComments: 'Lire et ajouter des commentaires',
  sharePost: 'Partager ce post',
  savePost: 'Enregistrer ce post',
  removeFromSaved: 'Retirer des enregistrements',

  // ── Médias ─────────────────────────────────────────────────────────────────
  mediaSwipe_one: '{{count}} élément, balaie pour voir la suite',
  mediaSwipe_many: '{{count}} éléments, balaie pour voir la suite',
  mediaSwipe_other: '{{count}} éléments, balaie pour voir la suite',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'Clip vidéo',
  soundOn: 'Activer le son',
  soundOff: 'Couper le son',

  // ── Commentaires ───────────────────────────────────────────────────────────
  commentsTitle: 'Commentaires',
  commentsHeading_one: 'Commentaires ({{count}})',
  commentsHeading_many: 'Commentaires ({{count}})',
  commentsHeading_other: 'Commentaires ({{count}})',
  noCommentsTitle: 'Aucun commentaire',
  noCommentsBody: 'Dis un mot d’encouragement.',
  reply: 'Répondre',
  replyTo: 'Répondre à {{name}}',
  replyingTo: 'Réponse à {{name}}',
  stopReplying: 'Annuler la réponse',
  commentPlaceholder: 'Ajoute un commentaire…',
  writeComment: 'Écrire un commentaire',
  postComment: 'Publier le commentaire',
  ownCommentOptions: 'Options de ton commentaire',
  reportOrBlockPerson: 'Signaler ou bloquer {{name}}',

  // ── Menu de sécurité ───────────────────────────────────────────────────────
  thisPerson: 'cette personne',
  actionsOwnPost: 'Ton post',
  actionsOwnComment: 'Ton commentaire',
  actionsPost: 'Ce post',
  actionsComment: 'Ce commentaire',
  linkCopied: 'Lien copié',
  linkCopyFailed: 'On n’a pas pu copier ce lien.',
  deletePost: 'Supprimer le post',
  deleteComment: 'Supprimer le commentaire',
  reportPost: 'Signaler le post',
  reportComment: 'Signaler le commentaire',
  reportHint: 'Dis-nous ce qui ne va pas. Les signalements restent privés.',
  blockPerson: 'Bloquer {{name}}',
  blockHint: 'Cette personne ne pourra plus te trouver ni t’écrire.',

  reportThisPost: 'Signaler ce post',
  reportThisComment: 'Signaler ce commentaire',
  reportReasonPrompt: 'Choisis le motif le plus proche. On ne dit jamais qui a signalé.',
  reasonSpam: 'Spam',
  reasonHarassment: 'Harcèlement ou intimidation',
  reasonNudity: 'Nudité ou contenu sexuel',
  reasonViolence: 'Violence',
  reasonHate: 'Discours haineux',
  reasonImpersonation: 'Usurpation d’identité',
  reasonChildSafety: 'Protection des mineurs',
  reasonScam: 'Arnaque',
  reasonOther: 'Autre chose',
  reportDetailsLabel: 'Autre chose à nous dire ?',
  reportEmergencyNote:
    'Si quelqu’un est en danger en ce moment, contacte aussi les secours de ton pays.',
  reportThanks: 'Merci de nous l’avoir dit. Notre équipe va regarder.',

  blockConfirmTitle: 'Bloquer {{name}} ?',
  blockConfirmBody:
    'Cette personne ne verra plus ton profil ni tes posts, ne pourra plus t’écrire, et tu ne la verras plus. Tu peux annuler ça dans les réglages.',
  blockedToast: '{{name}} est bloqué. Tu peux annuler ça dans les réglages.',

  deletePostConfirmTitle: 'Supprimer ce post ?',
  deleteCommentConfirmTitle: 'Supprimer ce commentaire ?',
  deleteConfirmBody: 'C’est définitif.',
  keepIt: 'Le garder',
  postDeleted: 'Post supprimé',
  commentDeleted: 'Commentaire supprimé',

  // ── Éditeur ────────────────────────────────────────────────────────────────
  composeTitle: 'Nouveau post',
  cancelAndClose: 'Annuler et fermer',
  postButton: 'Publier',
  uploading: 'Envoi de {{done}} sur {{total}}…',
  audienceA11y: 'Qui peut voir ça : {{audience}}. Modifier.',
  composePlaceholder: 'Partage une actu, un résultat ou un clip…',
  composeA11y: 'Qu’est-ce que tu veux partager ?',
  charCount: '{{used}}/{{max}}',
  clip: 'Clip',
  selectedPhoto: 'Photo sélectionnée {{index}}',
  selectedVideo: 'Vidéo sélectionnée {{index}}',
  removePhoto: 'Retirer la photo {{index}}',
  removeVideo: 'Retirer la vidéo {{index}}',
  addMedia: 'Ajouter une photo ou une vidéo',
  addMediaA11y: 'Ajouter une photo ou une vidéo',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX a besoin de ta permission pour ouvrir tes photos. Active-la dans les réglages.',
  posted: 'Publié',
  /* Écrit pour un jeune de 13 ans : court, simple, et les trois exemples gardés. */
  safetyNote: 'Reste sympa. Ne donne pas ton adresse, ton numéro ni ton école.',

  audienceSheetTitle: 'Qui peut voir ça ?',
  audienceEveryone: 'Tout le monde',
  audienceEveryoneDetail: 'N’importe qui sur AceAiX peut le voir.',
  audienceFollowersDetail: 'Seulement les gens qui te suivent.',
  audienceConnections: 'Contacts',
  audienceConnectionsDetail: 'Seulement les gens que tu suis et qui te suivent.',

  discardTitle: 'Abandonner ce post ?',
  discardBody: 'Ton texte et ce que tu as choisi ne seront pas enregistrés.',
  discard: 'Abandonner',
  keepWriting: 'Continuer à écrire',

  // ── Un post ────────────────────────────────────────────────────────────────
  postTitle: 'Post',
  postUnavailableTitle: 'Ce post n’est plus disponible',
  postUnavailableBody: 'Il a peut-être été supprimé ou retiré.',
  postUnavailableBodyRules:
    'Il a peut-être été supprimé, ou retiré parce qu’il ne respectait pas nos règles.',
  goBack: 'Retour',

  // ── Lien mort ──────────────────────────────────────────────────────────────
  notFoundTitle: 'Cette page n’existe plus',
  notFoundBody: 'Le lien que tu as suivi ne mène nulle part dans AceAiX.',
  notFoundAction: 'Retour à l’accueil',
};
