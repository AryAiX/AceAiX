/**
 * L’arbre des réglages — chaque écran sous `app/settings/`, les briques dont ils
 * sont faits, et le cadre autour des quatre documents légaux.
 *
 * Tout ce qui concerne le signalement, le blocage, les tuteurs ou la protection
 * des moins de 18 ans vit plutôt dans `safety.ts`, pour que ces textes puissent
 * être relus à part. Le vocabulaire partagé (Enregistrer, Annuler, Vérifié,
 * Débloquer, Score Talent, les noms des quatre documents) vient de `common.ts`
 * et n’est pas répété ici.
 *
 * Note sur les valeurs stockées : les sports, postes, niveaux et pays choisis
 * par un recruteur sont stockés en anglais et traduits à l’affichage via
 * `constants/sports.ts`. Seuls les libellés autour sont dans ce fichier.
 */
export const settings = {
  // ── Accueil des réglages (app/settings/index.tsx) ──────────────────────────
  title: 'Réglages',

  sectionAccount: 'Compte',
  accountTitle: 'Compte',
  accountSubtitle: 'E-mail, mot de passe, vérification',
  appearanceTitle: 'Apparence',
  appearanceSubtitle: 'Clair, sombre ou comme ton téléphone',
  notificationsTitle: 'Notifications',
  notificationsSubtitle: 'Choisis ce qui te parvient',

  sectionPrivacySafety: 'Confidentialité et sécurité',
  privacyTitle: 'Confidentialité',
  privacySubtitle: 'Qui peut t’écrire et te trouver',

  sectionScouting: 'Recrutement',
  scoutingFooter: 'On s’en sert pour classer qui apparaît en premier dans Découvrir.',
  scoutingTitle: 'Ce que tu cherches',
  scoutingSubtitle: 'Sports, postes, niveaux et âge',

  sectionAbout: 'À propos',
  supportTitle: 'Contacter le support',
  supportFallback: 'Écris-nous à {{email}}',
  versionTitle: 'Version',

  signOut: 'Se déconnecter',
  signOutConfirmTitle: 'Se déconnecter ?',
  signOutConfirmBody: 'Il te faudra ton e-mail et ton mot de passe pour revenir.',

  /** « AceAiX by AryAiX » — les deux noms sont des marques, passées telles quelles. */
  productBy: '{{product}} par {{company}}',

  // ── Compte (app/settings/account.tsx) ──────────────────────────────────────
  sectionSignIn: 'Connexion',
  signInFooter:
    'Ton e-mail sert à te connecter et à te joindre au sujet de ton compte. Pour le changer, écris à {{email}}.',
  emailLabel: 'E-mail',
  notSignedIn: 'Non connecté',

  sectionVerification: 'Vérification',
  verificationTitle: 'Vérification',
  requestVerification: 'Demander la vérification',
  verificationCheckedSubtitle: 'Ton compte est vérifié',
  verificationAskSubtitle: 'Demande-nous de vérifier ton compte',
  verificationInReview: 'En cours d’examen',
  verificationSentOn: 'Envoyée le {{date}}',
  verificationApproved: 'Acceptée',
  verificationApprovedSubtitle: 'Ton badge arrive',
  verificationRejected: 'Refusée',
  verificationRejectedSubtitle: 'Tu peux envoyer une nouvelle demande',
  verificationRequestSent: 'Demande envoyée. On va la regarder bientôt.',

  sectionYourData: 'Tes données',
  dataFooter:
    'Le fichier est en JSON : ton profil, tes posts, commentaires, abonnements, candidatures et médias, exactement comme nous les conservons.',
  downloadMyData: 'Télécharger mes données',
  downloadSubtitle: 'Récupère une copie de tout ce qui est sur ton compte',
  preparingFile: 'Préparation de ton fichier…',
  preparingShort: 'Préparation…',
  exportSaved: '{{name}} enregistré',

  // Fiche de changement de mot de passe
  changePassword: 'Changer de mot de passe',
  changePasswordSubtitle: 'Tu resteras connecté sur cet appareil.',
  currentPassword: 'Mot de passe actuel',
  currentPasswordPlaceholder: 'Ton mot de passe actuel',
  newPassword: 'Nouveau mot de passe',
  newPasswordHint_one: 'Au moins {{count}} caractère.',
  newPasswordHint_many: 'Au moins {{count}} caractères.',
  newPasswordHint_other: 'Au moins {{count}} caractères.',
  newPasswordPlaceholder: 'Quelque chose que toi seul connais',
  confirmNewPassword: 'Confirme le nouveau mot de passe',
  confirmNewPasswordPlaceholder: 'Tape-le encore',
  passwordTooShort_one: 'Choisis un mot de passe d’au moins {{count}} caractère.',
  passwordTooShort_many: 'Choisis un mot de passe d’au moins {{count}} caractères.',
  passwordTooShort_other: 'Choisis un mot de passe d’au moins {{count}} caractères.',
  passwordsDoNotMatch: 'Ces deux mots de passe ne sont pas les mêmes.',
  passwordUnchanged: 'C’est déjà ton mot de passe actuel.',
  passwordCurrentWrong: 'Ce mot de passe actuel n’est pas le bon.',
  passwordChanged: 'Mot de passe changé.',
  passwordPhishingNote:
    'On ne demande jamais ton mot de passe par e-mail ni par message. Si quelqu’un le fait, ce n’est pas nous.',

  // ── Confidentialité (app/settings/privacy.tsx) ─────────────────────────────
  messagePrivacyHeading: 'Qui peut t’écrire',
  messagePrivacyHint:
    'Cela ne concerne que les nouvelles conversations. Celles que tu as déjà restent ouvertes.',

  privacyEveryone: 'Tout le monde',
  privacyEveryoneHint: 'N’importe qui sur AceAiX peut engager une conversation avec toi.',
  privacyVerified: 'Coachs et clubs vérifiés',
  privacyVerifiedHint: 'Seulement les comptes que nous avons vérifiés, plus les gens qui te suivent.',
  privacyFollowing: 'Les gens que tu suis',
  privacyFollowingHint: 'Seuls les comptes que tu suis déjà peuvent écrire en premier.',
  privacyNobody: 'Personne',
  privacyNobodyHint: 'Personne ne peut lancer de nouvelle conversation. Les conversations existantes continuent.',

  discoveryHeading: 'Apparaître dans les recherches des recruteurs',
  discoveryHint: 'Quand c’est activé, les coachs et les clubs peuvent te trouver dans Découvrir.',
  discoverable: 'Visible',
  discoverableOn: 'Ton profil peut apparaître dans les recherches',
  discoverableOff: 'Tu es masqué des recherches',

  publicWebHeading: 'Montrer mon profil aux visiteurs non connectés',
  publicWebAdult:
    'Les profils adultes réglés pour apparaître dans les recherches peuvent aussi être vus sur le web par une personne non connectée. Désactiver « {{setting}} » au-dessus te retire des deux.',
  readPrivacyPolicy: 'Lire toute la politique de confidentialité',

  // ── Notifications (app/settings/notifications.tsx) ─────────────────────────
  pushOffTitle: 'Les notifications push sont désactivées',
  pushOffBody:
    'Ton téléphone empêche AceAiX d’envoyer des notifications : rien de ce qui suit ne peut te parvenir quand l’app est fermée.',
  turnOnPush: 'Activer les push',
  pushStillOff: 'Les push sont toujours désactivées. Tu peux les activer dans les réglages de ton téléphone.',
  autoSaveNote: 'Les changements s’enregistrent tout seuls.',

  sectionHowWeReach: 'Comment on te joint',
  pushTitle: 'Notifications push',
  pushSubtitle: 'Sur ton téléphone, même quand l’app est fermée',
  emailTitle: 'E-mail',
  emailSubtitle: 'Des résumés de temps en temps dans ta boîte',

  sectionActivity: 'Activité',
  activityFooter: 'Cela règle aussi ce qui apparaît dans tes notifications dans l’app.',
  notifyFollows: 'Nouveaux abonnés',
  notifyMessages: 'Messages',
  notifyComments: 'Commentaires',
  notifyLikes: 'Likes',

  sectionOpportunities: 'Opportunités et ton score',
  notifyOpportunities: 'Nouvelles opportunités',
  notifyApplications: 'Suivi des candidatures',
  notifyScoutInterest: 'Intérêt des recruteurs',
  notifyScoreUpdates: 'Évolutions du Score Talent',

  noMarketingNote:
    'On n’envoie jamais de notifications marketing, et on ne vend tes coordonnées à personne qui le ferait.',

  // ── Préférences de recrutement (app/settings/scouting.tsx) ─────────────────
  scoutingIntro:
    'Cela détermine qui Découvrir te montre en premier, et de quels athlètes on te parle. Laisse vide pour dire « peu importe ».',
  scoutingSports: 'Sports',
  scoutingSportsHint: 'Choisis tous les sports pour lesquels tu recrutes.',
  scoutingPositions: 'Postes',
  scoutingPositionsHint: 'Seulement les postes des sports que tu as choisis.',
  scoutingPositionsEmpty: 'Choisis d’abord un sport et ses postes apparaîtront ici.',
  scoutingLevels: 'Niveaux',
  scoutingCountries: 'Pays',
  scoutingCountriesHint: 'Où l’athlète est basé.',

  ageRange: 'Tranche d’âge',
  youngest: 'Âge min',
  oldest: 'Âge max',
  yearsSuffix: 'ans',

  minimumTalentScore: 'Score Talent minimum',
  atLeast: 'Au moins',
  anyScoreHint: 'Tous les scores, y compris les athlètes qui n’en ont pas encore',
  minScoreHint: 'Seulement les athlètes à {{score}} ou plus',

  filters: 'Filtres',
  openToOffersOnly: 'Ouverts aux offres seulement',
  openToOffersHint: 'Masquer les athlètes qui n’ont pas dit qu’ils cherchaient',
  notifyNewMatches: 'Me prévenir des nouveaux profils',
  notifyNewMatchesHint: 'Quand un athlète qui correspond arrive ou progresse',

  savePreferences: 'Enregistrer les préférences',
  preferencesSaved: 'Enregistré. Découvrir s’appuiera là-dessus à partir de maintenant.',

  // ── Apparence (app/settings/appearance.tsx) ────────────────────────────────
  themeHeading: 'Thème',
  themeBody:
    'Système suit le réglage de ton téléphone, y compris son horaire de nuit.',
  themeSystem: 'Système',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  preview: 'Aperçu',
  themeSystemNoteLight: 'Ton téléphone est actuellement en mode clair.',
  themeSystemNoteDark: 'Ton téléphone est actuellement en mode sombre.',
  themeAlwaysLight: 'Toujours clair, quel que soit le réglage de ton téléphone.',
  themeAlwaysDark: 'Toujours sombre, quel que soit le réglage de ton téléphone.',

  /* L’aperçu est un post inventé, montré seulement pour juger le thème. */
  previewName: 'Layla Haddad',
  previewCity: 'Dubaï',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'Deux buts et une passe dé dans le derby. Le clip complet est sur mon profil.',

  // ── Supprimer le compte (app/settings/delete-account.tsx) ──────────────────
  deleteAccountTitle: 'Supprimer le compte',
  deleteAccountSubtitle: 'Supprimer définitivement ton profil et tout ce qu’il contient',
  deleteCannotUndoTitle: 'C’est irréversible',
  deleteCannotUndoBody:
    'Supprimer ton compte le retire définitivement. Nous n’avons aucun moyen de le récupérer, et te réinscrire repart de zéro — un nouveau profil, et un Score Talent qui recommence à zéro.',

  beforeYouGo: 'Avant de partir',
  takeABreakTitle: 'Fais plutôt une pause',
  takeABreakBody:
    'Désactive la visibilité et tu disparais des recherches des recruteurs. Ton profil, tes posts et ton score restent exactement comme ils sont, et tu peux réactiver quand tu veux.',
  turnOffDiscovery: 'Désactiver la visibilité',
  discoveryAlreadyOff: 'La visibilité est déjà désactivée',
  hiddenFromSearchToast: 'Tu es masqué des recherches des recruteurs. Rien n’a été supprimé.',
  deleteExportBody:
    'Garde une copie de ton profil, tes posts, commentaires, abonnements et candidatures avant que quoi que ce soit soit retiré. Une fois le compte supprimé, on ne peut plus te l’envoyer.',

  whatGetsDeleted: 'Ce qui est supprimé',
  removedProfile: 'Ton profil, ta photo et tout ce que tu y as écrit',
  removedPosts: 'Chaque post, commentaire et like que tu as fait',
  removedMessages: 'Tes messages, dans toutes les conversations',
  removedApplications: 'Tes candidatures et toutes les opportunités enregistrées',
  removedScore: 'Ton Score Talent et tout son historique',
  removedFollows: 'Tes abonnés et tous ceux que tu suis',
  retentionNote:
    'Nous gardons un petit nombre d’éléments pendant une durée limitée là où la loi l’exige — les traces de sécurité et de modération, et ce qui est nécessaire pour répondre à une action en justice. Plus rien de ton profil n’est montré à qui que ce soit.',

  /**
   * Le mot à taper pour confirmer la suppression. À traduire par le mot que les
   * gens taperaient réellement dans cette langue ; la comparaison ignore la
   * casse.
   */
  deleteConfirmWord: 'SUPPRIMER',
  typeToContinue: 'Tape {{word}} pour continuer',
  deleteMyAccount: 'Supprimer mon compte',
  changedYourMind: 'Tu as changé d’avis ? Reviens en arrière — rien ne s’est encore passé.',
  deleteConfirmTitle: 'Supprimer ton compte ?',
  deleteConfirmBody:
    'C’est la dernière étape. Ton profil, tes posts, tes messages, tes candidatures et ton Score Talent sont supprimés définitivement et ne peuvent pas être récupérés.',
  deletePermanently: 'Supprimer définitivement',
  keepMyAccount: 'Garder mon compte',

  // ── Contrôles de réglages partagés (components/settings/) ──────────────────
  nothingToChoose: 'Rien à choisir ici pour l’instant.',
  stepperDecrease: 'Diminuer {{label}}',
  stepperIncrease: 'Augmenter {{label}}',
  stepperValue: '{{label}} {{value}}',
  /** Une ligne de choix lue à voix haute : son libellé, puis la ligne qui l’explique. */
  radioA11y: '{{label}}. {{hint}}',

  // ── Cadre des écrans légaux (app/legal/) ───────────────────────────────────
  /* Les documents eux-mêmes sont publiés en anglais et ne sont jamais
     traduits — seul le cadre autour l’est. */
  legalUpdated: 'Mis à jour le {{date}}',
  legalLinkExternal: '{{label}}, s’ouvre hors de l’app',

  // ── Configuration manquante (components/common/ConfigMissing.tsx) ──────────
  configMissingTitle: 'Configuration manquante',
  configMissingBody:
    'AceAiX ne peut pas joindre son backend : les variables d’environnement Supabase ne sont pas définies pour ce build.',
  configMissingHint:
    'Ajoute-les à `mobile/.env` pour le développement local, ou comme secrets EAS pour un build, puis redémarre le bundler.',
};
