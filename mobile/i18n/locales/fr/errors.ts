/**
 * Ce qui peut mal tourner, dit simplement.
 *
 * `lib/errors.ts` fait correspondre les codes de la base et les chaînes d’auth
 * Supabase à ces clés, pour qu’une erreur apparaisse dans la langue du lecteur
 * où qu’elle soit interceptée.
 */
export const errors = {
  generic: 'Une erreur est survenue. Réessaie.',
  offline: 'Pas de connexion. Vérifie ton accès à Internet et réessaie.',
  sessionExpired: 'Ta session a expiré. Reconnecte-toi.',
  notSignedIn: 'Tu dois être connecté pour faire ça.',

  // Indications de la base
  guardianConsentRequired:
    'Un parent ou tuteur doit valider ton profil avant qu’il puisse apparaître dans les recherches.',
  messagingNotPermitted:
    'Tu ne peux pas écrire à ce compte. Il n’accepte peut-être que les messages des coachs et des clubs vérifiés.',
  rateLimited: 'Tu vas trop vite. Attends un instant et réessaie.',
  ageBelowMinimum: 'Il faut avoir au moins 13 ans pour utiliser AceAiX.',

  // Codes de la base
  alreadyExists: 'Cela existe déjà.',
  missingReference: 'Un élément nécessaire est manquant. Essaie d’actualiser.',
  invalidDetails: 'Certaines de ces informations ne sont pas valides.',
  noPermission: 'Tu n’as pas la permission de faire ça.',
  notFound: 'On n’a pas trouvé ça.',

  // Authentification
  invalidCredentials: 'Cet e-mail ou ce mot de passe n’est pas correct.',
  emailNotConfirmed: 'Regarde ta boîte de réception et confirme d’abord ton adresse e-mail.',
  emailInUse: 'Un compte utilise déjà cet e-mail. Essaie de te connecter.',
  passwordTooShort: 'Choisis un mot de passe d’au moins 8 caractères.',
  tooManyAttempts: 'Trop de tentatives. Attends quelques minutes et réessaie.',

  // Défis et équipes supportées
  challengeClosed: 'Ce défi est terminé.',
  challengeNotAllowed: 'Seuls les coachs et les clubs vérifiés peuvent proposer un défi.',
  clipRequired: 'Choisis d’abord un de tes clips publics.',
  ageOutOfRange: 'Ce défi s’adresse à une autre catégorie d’âge.',
  favoriteTeamsMax: 'Cinq équipes, c’est la limite — retires-en une pour en ajouter une autre.',
  profileIncomplete: 'Complète d’abord ton profil d’athlète.',
  notAnAthlete: 'Seuls les athlètes ont un Score Talent.',
};
