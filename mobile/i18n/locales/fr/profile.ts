/**
 * Les profils — le mien, celui de quelqu’un d’autre, les onglets en dessous,
 * les listes d’abonnés et le formulaire de modification.
 *
 * Regroupés dans l’ordre des écrans. Tout ce qui apparaît aussi ailleurs dans
 * l’app (Abonnés, Posts, Clips, Matchs, Recommandé, Suivre, Message, Vérifié)
 * vient de `common` au lieu d’être répété ici.
 *
 * Note sur les valeurs stockées : les sports, postes, niveaux et côté fort sont
 * conservés en anglais dans la base et traduits à l’affichage via
 * `constants/sports.ts`. Les noms de pays sont stockés tels qu’ils ont été
 * saisis, donc ils ne sont pas traduits non plus — voir PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── Le profil de quelqu’un d’autre (app/u/[id].tsx) ────────────────────────
  title: 'Profil',
  thisPerson: 'Cette personne',

  notFoundTitle: 'Profil introuvable',
  notFoundBody: 'Le lien que tu as suivi ne mène à personne sur AceAiX.',
  notFoundAction: 'Retour',

  blockedTitle: 'Tu ne peux pas voir ce profil',
  blockedByYouBody: 'Tu as bloqué {{name}}. Débloque cette personne pour revoir son profil.',
  blockedBody: 'Ce profil ne t’est pas accessible.',
  unblockedToast: 'Débloqué.',

  suspendedTitle: 'Ce compte n’est pas disponible',
  suspendedBody: 'Il est suspendu le temps que notre équipe l’examine.',

  // ── En-tête du profil (components/profile/ProfileHeader.tsx) ───────────────
  openToOffers: 'Ouvert aux offres',
  followersA11y_one: '{{count}} abonné. Ouvre la liste.',
  followersA11y_many: '{{count}} abonnés. Ouvre la liste.',
  followersA11y_other: '{{count}} abonnés. Ouvre la liste.',
  followingA11y_one: 'Suit {{count}} personne. Ouvre la liste.',
  followingA11y_many: 'Suit {{count}} personnes. Ouvre la liste.',
  followingA11y_other: 'Suit {{count}} personnes. Ouvre la liste.',

  editProfile: 'Modifier le profil',
  settings: 'Réglages',
  moreOptions: 'Plus d’options',
  messageLimitedHint: 'Les messages sont limités pour ce compte. Appuie pour savoir pourquoi.',

  shareProfile: 'Partager le profil',
  /** L’URL n’est pas traduite ; seulement la phrase autour. */
  shareMessage: '{{name}} sur AceAiX — {{url}}',

  reportAccount: 'Signaler ce compte',
  reportAccountSubtitle: 'Notre équipe examine chaque signalement',
  reportSheetSubtitle: 'Choisis le motif le plus proche. Personne n’est prévenu que tu as signalé.',
  reportThanks: 'Merci. Notre équipe va regarder.',
  reportReason: {
    childSafety: 'Protection des mineurs',
    childSafetyHint: 'Un mineur est en danger ou visé',
    harassment: 'Intimidation ou harcèlement',
    harassmentHint: 'Attaques visant quelqu’un',
    hate: 'Discours haineux',
    hateHint: 'Attaques sur ce que quelqu’un est',
    nudity: 'Nudité ou contenu sexuel',
    nudityHint: 'Contenu qui n’a rien à faire ici',
    violence: 'Violence ou menaces',
    violenceHint: 'Menaces ou images choquantes',
    impersonation: 'Se fait passer pour quelqu’un d’autre',
    impersonationHint: 'Un faux compte',
    scam: 'Arnaque ou fraude',
    scamHint: 'Faux essais, frais ou offres',
    spam: 'Spam',
    spamHint: 'Posts répétés ou non désirés',
    other: 'Autre chose',
    otherHint: 'Dis-le avec tes mots',
  },

  blockPerson: 'Bloquer {{name}}',
  blockPersonSubtitle: 'Cette personne ne pourra plus te trouver ni t’écrire',
  blockConfirmTitle: 'Bloquer {{name}} ?',
  blockConfirmBody:
    '{{name}} ne pourra plus t’écrire, te suivre, ni voir ce que tu publies. Tu peux annuler ça dans les réglages.',
  blockedToast: '{{name}} ne peut plus te voir ni t’écrire.',

  /** Réponses en langage clair à « pourquoi je ne peux pas écrire à cette personne ? ». */
  messageBlockTitle: 'Tu ne peux pas écrire à ce compte',
  messageBlockNote:
    'Ces règles protègent les jeunes athlètes. Elles sont fixées par l’athlète, son parent ou tuteur, et par AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'Cet athlète a moins de 18 ans. Seuls les coachs et clubs vérifiés peuvent engager une conversation avec lui.',
    minorRequiresGuardianConsent:
      'Le parent ou tuteur de cet athlète n’a pas encore autorisé les messages.',
    recipientMessagesOff: 'Cette personne a désactivé les messages.',
    recipientOnlyAcceptsFollowed: 'Cette personne n’accepte les messages que des gens qu’elle suit.',
    recipientOnlyAcceptsVerified: 'Cette personne n’accepte les messages que des comptes vérifiés.',
    notPermitted: 'Tu ne peux pas engager de conversation avec ce compte pour le moment.',
    notFound: 'On n’a pas trouvé ce compte.',
  },
  gotIt: 'Compris',

  // ── Ligne de statistiques (components/profile/StatRow.tsx) ─────────────────
  statA11y: '{{value}} {{label}}',

  // ── Onglets (components/profile/ProfileTabs.tsx) ───────────────────────────
  tabHighlights: 'Highlights',
  tabCareer: 'Carrière',

  // ── Onglet Posts (components/profile/PostsTab.tsx) ─────────────────────────
  postsEmptyTitleSelf: 'Aucun post',
  postsEmptyTitleOther: 'Rien de publié',
  postsEmptyBodySelf:
    'Partage un entraînement, un résultat ou un clip. Les profils actifs sont plus vus.',
  postsEmptyBodyOther: 'Quand cette personne publiera, ça apparaîtra ici.',
  postsEmptyAction: 'Écrire un post',

  // ── Grille média (components/profile/MediaGrid.tsx) ────────────────────────
  addHighlight: 'Ajouter un highlight',
  videoClipA11y: 'Clip vidéo',
  photoA11y: 'Photo',

  // ── Onglet Highlights (components/profile/HighlightsTab.tsx) ───────────────
  photoPermission: 'AceAiX a besoin de ta permission pour ouvrir tes photos.',

  noHighlightsTitle: 'Aucun highlight ici',
  noHighlightsBody: 'Les highlights font partie d’un profil d’athlète.',
  clipsEmptyTitleSelf: 'Les coachs regardent avant de lire.',
  clipsEmptyTitleOther: 'Aucun clip',
  clipsEmptyBodySelf: 'Ajoute ton premier clip. Trois clips courts, c’est le bon dosage.',
  clipsEmptyBodyOther: 'Quand cette personne mettra un clip, ça apparaîtra ici.',
  clipsEmptyAction: 'Ajouter ton premier clip',

  nameClipTitle: 'Nomme ce clip',
  nameClipSubtitle: 'Un titre court aide le coach à savoir ce qu’il regarde.',
  clipTitleLabel: 'Titre',
  clipTitlePlaceholderVideo: 'ex. Frappe du gauche contre Al Wasl',
  clipTitlePlaceholderPhoto: 'ex. Finale de coupe',
  addToProfile: 'Ajouter au profil',
  clipAddedToast: 'Ajouté. Les coachs peuvent le regarder.',
  clipRemovedToast: 'Retiré.',

  holdToRemoveClip: 'Appuie longuement sur un clip pour le retirer.',
  removeClipTitle: 'Retirer ce clip ?',
  removeClipBody: 'Il sera enlevé de ton profil. Ton Score Talent peut baisser.',
  mediaLoadFailed: 'Ce fichier n’a pas pu être chargé. Réessaie dans un instant.',

  // ── Onglet Carrière (components/profile/CareerTab.tsx) ─────────────────────
  noCareerTitle: 'Aucun parcours',
  noCareerBody: 'Cette section est réservée aux profils d’athlètes.',
  add: 'Ajouter',

  matchesEmptyTitleSelf: 'Aucun match enregistré',
  matchesEmptyTitleOther: 'Aucun match',
  matchesEmptyBodySelf: 'Noter les 12 derniers mois montre ta forme actuelle à un coach.',
  matchesEmptyBodyOther: 'Rien n’a encore été noté ici.',
  matchFallback: 'Match',
  matchVersus: 'contre {{opponent}}',
  matchMinutes: '{{n}} min',
  matchGoals_one: '{{count}} but',
  matchGoals_many: '{{count}} buts',
  matchGoals_other: '{{count}} buts',
  matchAssists_one: '{{count}} passe déc.',
  matchAssists_many: '{{count}} passes déc.',
  matchAssists_other: '{{count}} passes déc.',

  honoursTitle: 'Palmarès',
  honoursEmptyTitleSelf: 'Aucun titre',
  honoursEmptyTitleOther: 'Aucun titre indiqué',
  honoursEmptyBodySelf: 'Titres de championnat, coupes, joueur de la saison — tout ce que tu as gagné compte.',

  certificatesTitle: 'Diplômes',
  certificatesEmptyTitleSelf: 'Aucun diplôme',
  certificatesEmptyTitleOther: 'Aucun diplôme indiqué',
  certificatesEmptyBodySelf: 'Diplômes d’entraîneur, premiers secours, protection de l’enfance, langues.',

  endorsementsTitle: 'Recommandations',
  endorsementsEmptyTitle: 'Aucune recommandation',
  endorsementsEmptyBodySelf:
    'Demande à un coach qui connaît ton jeu. Une recommandation d’un coach vérifié pèse lourd.',

  logMatchTitle: 'Noter un match',
  logMatchSubtitle: 'Juste ce dont tu te souviens — tu pourras compléter plus tard.',
  matchDate: 'Date',
  matchDateHint: 'Année-mois-jour',
  matchCompetition: 'Compétition',
  matchCompetitionPlaceholder: 'Championnat U16',
  matchOpponent: 'Adversaire',
  matchOpponentPlaceholder: 'Al Nasr',
  matchResult: 'Résultat',
  matchResultPlaceholder: 'Victoire 3-1',
  matchMinutesLabel: 'Minutes',
  matchGoalsLabel: 'Buts',
  matchAssistsLabel: 'Passes décisives',
  saveMatch: 'Enregistrer le match',
  matchDateInvalid: 'Utilise le format AAAA-MM-JJ, par exemple 2026-03-14.',
  matchAddedToast: 'Match ajouté.',

  addHonourTitle: 'Ajouter un titre',
  honourTitleLabel: 'Qu’est-ce que tu as gagné ?',
  honourTitlePlaceholder: 'Champion U16',
  honourOrgLabel: 'Qui l’a décerné',
  honourOrgPlaceholder: 'Ligue jeunes de Dubaï',
  honourYearLabel: 'Année',
  saveHonour: 'Enregistrer le titre',
  honourTitleRequired: 'Donne un nom à ce titre.',
  honourAddedToast: 'Titre ajouté.',

  addCertificateTitle: 'Ajouter un diplôme',
  certificateTitleLabel: 'Diplôme',
  certificateTitlePlaceholder: 'Premiers secours',
  certificateIssuerLabel: 'Délivré par',
  certificateIssuerPlaceholder: 'Croissant-Rouge',
  certificateYearLabel: 'Année',
  saveCertificate: 'Enregistrer le diplôme',
  certificateTitleRequired: 'Donne un nom à ce diplôme.',
  certificateAddedToast: 'Diplôme ajouté.',

  // ── Liste de personnes (components/profile/PeopleList.tsx) ─────────────────
  searchThisList: 'Rechercher dans la liste',
  noMatchTitle: 'Personne ne correspond',
  noMatchBody: 'Essaie un autre nom.',
  openProfileA11y: 'Ouvrir le profil de {{name}}',

  // ── Abonnés et abonnements (app/u/[id]/…) ──────────────────────────────────
  followersEmptyTitle: 'Aucun abonné',
  followersEmptyBodySelf: 'Poste un clip ou une actu. On suit les athlètes qui se montrent.',
  followersEmptyBodyOther: 'Personne ne suit encore ce compte.',
  followingEmptyTitleSelf: 'Tu ne suis encore personne',
  followingEmptyTitleOther: 'Ne suit encore personne',
  followingEmptyBodySelf: 'Suis des clubs, des coachs et des athlètes pour remplir ton fil.',
  followingEmptyBodyOther: 'Ce compte ne suit encore personne.',

  // ── Modifier le profil (app/edit-profile.tsx) ──────────────────────────────
  /* `editProfile` plus haut sert de titre à cet écran comme de libellé au bouton. */
  firstNameRequired: 'Ton prénom ne peut pas être vide.',
  savedScoreUp_one: 'Enregistré — ton Score Talent a gagné {{count}} point.',
  savedScoreUp_many: 'Enregistré — ton Score Talent a gagné {{count}} points.',
  savedScoreUp_other: 'Enregistré — ton Score Talent a gagné {{count}} points.',
  savedScoreDown_one: 'Enregistré — ton Score Talent a perdu {{count}} point.',
  savedScoreDown_many: 'Enregistré — ton Score Talent a perdu {{count}} points.',
  savedScoreDown_other: 'Enregistré — ton Score Talent a perdu {{count}} points.',

  sectionYou: 'Toi',
  changePhotoA11y: 'Changer ta photo de profil',
  uploadingPhoto: 'Envoi…',
  tapToChangePhoto: 'Appuie pour changer ta photo',
  addCover: 'Ajouter une couverture',
  changeCover: 'Changer la couverture',
  uploadingCover: 'Envoi de la couverture…',
  removeCover: 'Retirer la couverture',
  changeCoverA11y: 'Changer la photo de couverture de ton profil',
  viewPhotoA11y: 'Voir la photo de {{name}}',
  firstName: 'Prénom',
  lastName: 'Nom',
  bio: 'À propos de toi',
  bioPlaceholder: 'Tu joues à quel poste, et tu travailles quoi en ce moment ?',
  bioCounter: '{{n}} / {{max}}',
  city: 'Ville',
  cityPlaceholder: 'Dubaï',
  country: 'Pays',
  countryPlaceholder: 'Choisis un pays',
  countryA11y: 'Pays. Actuellement {{value}}. Ouvre un sélecteur.',
  notSet: 'non renseigné',

  sectionSport: 'Ton sport',
  sport: 'Sport',
  sportPlaceholder: 'Choisis ton sport',
  sportA11y: 'Sport. Actuellement {{value}}. Ouvre un sélecteur.',
  position: 'Poste',
  level: 'Niveau',
  levelHintDefault: 'Choisis le niveau auquel tu joues en ce moment.',
  league: 'Championnat ou compétition',
  leaguePlaceholder: 'Ligue jeunes de Dubaï',
  club: 'Club actuel',
  clubPlaceholder: 'Académie Al Nasr',
  clubHint: 'Un club relié améliore ton score de crédibilité.',

  sectionPhysical: 'Physique',
  height: 'Taille',
  heightUnit: 'cm',
  weight: 'Poids',
  weightUnit: 'kg',
  dominantSide: 'Côté fort',

  sectionAvailability: 'Disponibilité',
  openToOffersHint: 'Les coachs le voient sur ton profil.',

  chooseSportTitle: 'Choisis ton sport',
  /** L’emoji n’est pas traduit ; seul l’ordre du signe et du nom l’est. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: 'Tu vis où ?',
  searchCountries: 'Rechercher un pays',
  useTypedCountry: 'Utiliser « {{country}} »',
  useTypedCountryHint: 'Pas dans la liste ? Ajoute-le toi-même.',
  countryTypeToAdd: 'Commence à taper pour ajouter ton pays.',

  // ── La carte de joueur ─────────────────────────────────────────────────────
  playerCard: 'Carte de joueur',
  playerCardHint: 'Une carte que tu peux enregistrer et publier.',
  playerCardBody: 'Tout ce qu’un recruteur regarde en premier, en une seule image.',
  playerCardSaved: 'Enregistrée.',
  playerCardShared: 'Carte prête à partager.',
  playerCardFailed: 'Impossible de créer la carte. Réessaie dans un instant.',
  playerCardShare: 'Partager',
  playerCardSave: 'Enregistrer l’image',
};
