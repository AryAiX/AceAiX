/**
 * Invitations — un lien personnel, le cercle qu’il construit, et les jetons.
 *
 * Règles de ton, dans toutes les langues :
 *
 *   * Amical, esprit d’équipe : « fais venir tes coéquipiers », jamais
 *     « gagne de l’argent ».
 *   * Les jetons sont des points AceAiX. Jamais d’argent, de pièces, de cash,
 *     de crypto ni de récompense ayant une valeur ; jamais de promesse sur ce
 *     qu’ils permettront d’obtenir.
 *   * Un ami n’est jamais désigné autrement que par son prénom.
 */
export const invites = {
  // ── Noms ───────────────────────────────────────────────────────────────────
  title: 'Inviter des amis',
  circleTitle: 'Mon cercle',
  tagline: 'Fais venir tes coéquipiers. Tous les 10 amis inscrits, tu gagnes un jeton.',

  // ── La carte du profil ─────────────────────────────────────────────────────
  cardCta: 'Invite tes amis',
  cardCtaBody: 'Tous les 10 amis inscrits, tu gagnes 1 jeton.',
  cardProgress: '{{n}} sur {{total}} avant ton prochain jeton',
  cardTokens: 'Jetons : {{n}}',

  // ── L’écran du cercle ──────────────────────────────────────────────────────
  linkTitle: 'Ton lien d’invitation',
  codeLabel: 'Ton code',
  share: 'Partager l’invitation',
  copy: 'Copier le lien',
  copied: 'Lien copié',
  shareMessage:
    'Rejoins-moi sur AceAiX, là où les athlètes se font repérer par les coachs et les clubs. Inscris-toi avec mon lien : {{link}}. Ou entre mon code {{code}} après ton inscription.',
  shareTitle: 'Rejoins-moi sur AceAiX',
  nextToken: 'Encore {{n}} avant ton prochain jeton',
  tokensLabel: 'Jetons',
  countedLabel: 'Inscrits',
  pendingLabel: 'En cours',
  howTitle: 'Comment ça marche',
  how1: 'Partage ton lien ou ton code avec tes amis.',
  how2: 'Un ami compte dès qu’il a fini de créer son profil. Un ami de moins de 18 ans compte dès qu’un parent a donné son accord.',
  how3: 'Tous les 10 amis qui comptent, tu gagnes 1 jeton.',
  tokensNote: 'Les jetons sont des points AceAiX. Ils n’ont aucune valeur en argent et ne peuvent être ni achetés, ni vendus, ni transférés.',
  membersTitle: 'Les amis que tu as invités',
  membersEmpty: 'Personne pour l’instant. Partage ton lien pour lancer ton cercle.',
  statusQualified: 'Compte',
  statusPending: 'Profil en cours',
  invitedBy: 'Invitation de {{name}}',
  ledgerTitle: 'Historique des jetons',
  ledgerGained: '+{{n}} jeton',
  ledgerLost: '−{{n}} jeton : une invitation ne compte plus',

  // ── Saisir un code à la main ───────────────────────────────────────────────
  enterCodeTitle: 'Tu as reçu une invitation ?',
  enterCodeBody: 'Entre le code d’invitation de ton ami. Tu peux le faire pendant les 14 premiers jours après ton inscription.',
  enterCodePlaceholder: 'Code d’invitation',
  enterCodeAction: 'Ajouter le code',
  enterCodeInvalid: 'Un code d’invitation contient 8 lettres et chiffres.',
  claimed: 'Tu as rejoint AceAiX grâce à l’invitation de {{name}}',

  notEligibleTitle: 'Les invitations sont réservées aux athlètes et aux coachs',
  notEligibleBody: 'Si quelqu’un t’a envoyé une invitation, son prénom s’affiche ici.',

  // ── Le profil de quelqu’un d’autre ─────────────────────────────────────────
  badgeTier: 'A fait venir {{n}}+ personnes sur AceAiX',

  // ── L’écran d’accueil d’un lien d’invitation ───────────────────────────────
  landingTitle: '{{name}} t’invite sur AceAiX',
  landingTitleNoName: 'On t’invite sur AceAiX',
  landingBody:
    'AceAiX, c’est là où les jeunes athlètes se font repérer par les coachs et les clubs. Crée ton compte gratuit pour nous rejoindre.',
  landingSignUp: 'Créer mon compte',
  landingSignIn: 'J’ai déjà un compte',
  landingInvalidTitle: 'Ce lien d’invitation n’est pas valide',
  landingInvalidBody: 'Demande à ton ami de te le renvoyer. Tu peux quand même créer un compte.',
  landingSignedIn: 'Tu as déjà un compte',
  landingSignedInBody: 'Si ton compte a moins de 14 jours, tu peux encore ajouter cette invitation.',
  landingAddInvite: 'Ajouter cette invitation',
  landingContinue: 'Continuer',
  landingCopy: 'Copier',
  landingCopied: 'Code copié',
  landingCopyFailed: 'Le code n’a pas pu être copié. Sélectionne-le et copie-le toi-même.',
  landingDownload:
    'Télécharge AceAiX, inscris-toi et saisis ce code dans l’app pendant tes 14 premiers jours.',
  landingAppStore: 'Télécharger sur l’App Store',
  landingGooglePlay: 'Télécharger sur Google Play',
};
