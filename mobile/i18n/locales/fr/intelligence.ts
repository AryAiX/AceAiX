/**
 * Intelligence de jeu — six petits jeux chronométrés sur la façon dont un
 * joueur lit le jeu.
 *
 * Règles de ton, dans toutes les langues :
 *
 *   * Ce sont des **jeux**, jamais un « examen », un « test d’intelligence » ni
 *     une « évaluation de toi ». Le public a treize ans et plus.
 *   * Jamais de vocabulaire clinique : pas de « diagnostic », « trouble »,
 *     « déficit », « capacités cognitives ». On mesure la vitesse, la
 *     concentration et les décisions sur ces jeux, ce jour-là — et le texte le
 *     dit.
 *   * Un chiffre bas n’est jamais un verdict. La note en bas de l’écran de
 *     résultats porte la même promesse que le Score Talent.
 */
export const intelligence = {
  // ── Noms ───────────────────────────────────────────────────────────────────
  title: 'Intelligence de jeu',
  short: 'QI de jeu',
  tagline: 'À quelle vitesse tu lis le jeu',

  // ── La carte du profil ─────────────────────────────────────────────────────
  cardCta: 'Joue aux six jeux',
  cardCtaBody: 'Environ 8 minutes. Montre aux clubs comment tu penses sur le terrain.',
  cardContinue: 'Termine tes jeux',
  cardContinueBody: '{{done}} sur 6 joués',
  cardTop: 'Top {{percent}} % de ta tranche d’âge',
  cardShared: 'Partagé avec les clubs',
  cardPrivate: 'Visible par toi seul',
  cardA11y: 'Intelligence de jeu {{score}} sur 100',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'Six jeux. Une image de ta façon de jouer.',
  introBody:
    'Des jeux rapides qui mesurent comment tu vois le terrain, comment tu décides sous pression et comment tu restes concentré. Les coachs y tiennent autant qu’à la vitesse ou à la technique.',
  introPoint1: 'Environ 8 minutes — tu peux t’arrêter entre deux jeux et revenir plus tard',
  introPoint2: 'Tes résultats restent privés jusqu’à ce que tu choisisses de les partager',
  introPoint3: 'Deux essais par jeu toutes les deux semaines. Ton meilleur compte.',
  introStart: 'C’est parti',
  introNotMedical: 'Ce sont des jeux, pas une évaluation médicale ou psychologique.',

  // ── Accord parental ────────────────────────────────────────────────────────
  consentTitle: 'Demande d’abord à un parent',
  consentBody:
    'Là où tu vis, les joueurs de moins de {{age}} ans ont besoin de l’accord d’un parent ou tuteur avant de jouer. On lui enverra un court e-mail pour lui expliquer les jeux.',
  consentPendingTitle: 'En attente de ton parent',
  consentPendingBody:
    'Nous leur avons demandé. L’e-mail contient une case « Game Intelligence » : demande-leur de la cocher, et les jeux se débloqueront ici.',
  consentAction: 'Demander à mon parent',
  consentAgeUnknownTitle: 'Ajoute ta date de naissance',
  consentAgeUnknownBody: 'On en a besoin pour savoir si un parent doit d’abord donner son accord.',
  consentAgeUnknownAction: 'Modifier le profil',
  notAthleteTitle: 'Pour les athlètes',
  notAthleteBody: 'L’Intelligence de jeu fait partie du profil d’un athlète. Tu peux voir les résultats que les athlètes partagent avec toi sur leur profil.',
  suspendedBody: 'Indisponible pendant que ton compte est en cours de vérification.',

  // ── Préparation ────────────────────────────────────────────────────────────
  readyTitle: 'Prépare-toi',
  readyBody: 'Ton résultat dépend du moment où tu joues.',
  readyQuiet: 'Un endroit calme, assis ou debout sans bouger',
  readyNotifications: 'Notifications coupées, pour que rien ne s’affiche en pleine partie',
  readyBattery: 'Assez de batterie, et le téléphone bien en main',
  readyFatigue: 'Tu te sens comment, là tout de suite ?',
  fatigue1: 'En forme',
  fatigue2: 'Bien',
  fatigue3: 'Ça va',
  fatigue4: 'Fatigué',
  fatigue5: 'Épuisé',
  readyTiredHint: 'Tu peux jouer, mais ton résultat risque d’être plus bas que d’habitude. Plus tard, ce serait peut-être mieux.',
  readyContinue: 'Je suis prêt',

  // ── Échauffement ───────────────────────────────────────────────────────────
  warmupTitle: 'Échauffement',
  warmupBody: 'Touche le cercle dès qu’il devient vert. Cinq fois. Ça règle les jeux sur ton téléphone.',
  warmupWait: 'Attends le vert…',
  warmupTap: 'Touche !',
  warmupEarly: 'Trop tôt — attends le vert',
  warmupDone: 'Échauffement terminé',

  // ── Accueil des jeux ───────────────────────────────────────────────────────
  hubTitle: 'Tes jeux',
  hubBody: 'Joue dans l’ordre que tu veux. Les jeux de foot comptent le plus.',
  hubPlayed: 'Joué',
  hubRetry: 'À refaire',
  hubNoAttempts: 'Prochain essai dans quelques jours',
  hubCountsMost: 'Compte le plus',
  hubMinutes: 'env. {{n}} min',
  hubSeconds: 'env. {{n}} s',
  hubFinish: 'Voir mes résultats',
  hubFinishNeeds: 'Jeux restants avant ton résultat : {{count}}',
  hubPause: 'Faire une pause',
  hubPauseBody: 'Ta progression est gardée pendant 24 heures.',

  // ── Un jeu ─────────────────────────────────────────────────────────────────
  practice: 'Entraînement',
  practiceBody: 'Quelques manches qui ne comptent pas.',
  practiceDone: 'Bien joué. Maintenant, pour de vrai.',
  startScored: 'Commencer',
  getReady: 'Prépare-toi',
  round: 'Manche {{n}} sur {{total}}',
  scoredLabel: 'Compte',
  submitting: 'Enregistrement…',
  gameDone: 'Terminé !',
  gameScore: '{{score}} / 100',
  gameInvalid: 'Cette manche n’a pas compté',
  gameInvalidBody: 'Quelque chose clochait — peut-être une distraction. Tu pourras réessayer plus tard.',
  gameIncomplete: 'Pas assez de touches pour noter cette manche',
  gameIncompleteBody: 'Aucun essai n’a été utilisé. Réessaie quand tu es prêt.',
  backToHub: 'Retour aux jeux',
  tryAgain: 'Réessayer',
  interrupted: 'Jeu en pause',
  interruptedBody: 'Tu as quitté l’app, donc cette manche a été annulée. Aucun essai n’a été utilisé.',
  timeUp: 'Temps écoulé !',

  tests: {
    pitchDecision: {
      name: 'Décision sur le terrain',
      what: 'Prise de décision',
      how: 'Regarde l’action. Quand elle se fige, tu as 3 secondes : touche un coéquipier pour lui passer le ballon, ou choisis Tirer ou Dribbler.',
      you: 'Toi',
      shoot: 'Tirer',
      dribble: 'Dribbler',
      pass: 'Touche un coéquipier pour passer',
    },
    anticipation: {
      name: 'Lis le ballon',
      what: 'Anticipation',
      how: 'Le ballon part vers le but, puis disparaît. Touche la ligne de but à l’endroit où il va la franchir.',
      tapLine: 'Touche là où il passe',
    },
    tracking: {
      name: 'Suis les joueurs',
      what: 'Vision du jeu',
      how: 'Certains ballons clignotent. Garde les yeux sur eux pendant que tous les ballons bougent. Puis touche ceux que tu suivais.',
      watch: 'Regarde ceux-là',
      follow: 'Suis-les…',
      pick: 'Touche ceux que tu as suivis · {{found}}/{{count}}',
      level: 'Niveau {{n}}',
    },
    goNoGo: {
      name: 'Vas-y / Stop',
      what: 'Maîtrise de soi',
      how: 'Touche le plus vite possible quand un ballon vert apparaît. Quand il est rouge, ne touche pas.',
      go: 'Vert : touche',
      stop: 'Rouge : non',
    },
    flanker: {
      name: 'Flèches focus',
      what: 'Concentration',
      how: 'Dans quel sens pointe la flèche du milieu ? Ignore les autres.',
      left: 'Gauche',
      right: 'Droite',
    },
    reaction: {
      name: 'Mains rapides',
      what: 'Vitesse de réaction',
      how: 'Une des quatre touches s’allume. Touche-la le plus vite possible.',
    },
  },

  // ── Résultats ──────────────────────────────────────────────────────────────
  resultsTitle: 'Ton Intelligence de jeu',
  analyzing: 'On rassemble tes résultats…',
  resultsNotEnough: 'Joue au moins à quatre jeux pour avoir ton résultat global.',
  confidence: 'Fiabilité',
  confidenceLow: 'Faible',
  confidenceMedium: 'Moyenne',
  confidenceHigh: 'Élevée',
  confidenceHint: 'Joue aux six jeux en étant en forme pour une fiabilité élevée.',
  strengths: 'Tes points forts',
  workOn: 'Un point à travailler',
  tipsTitle: 'Essaie ça',
  tip: {
    pitch_decision: 'Avant que le ballon arrive, jette un œil par-dessus tes deux épaules. Sache où tu vas passer avant d’en avoir besoin.',
    anticipation: 'Regarde le ballon dès le début de sa trajectoire — le départ de la courbe te dit où il va aller.',
    tracking: 'Relâche ton regard et observe l’espace entre les joueurs, pas un joueur à la fois.',
    go_no_go: 'Reste prêt, mais laisse la couleur décider. La vitesse compte moins que le bon choix.',
    flanker: 'Fixe le centre. Le bruit autour, c’est juste du bruit.',
    reaction: 'Détends ta main avant chaque manche — la tension te ralentit.',
  },
  history: 'Ta progression',
  nextRetest: 'Prochaine session complète : {{date}}',
  footnote:
    'Ces jeux mesurent comment tu y as joué aujourd’hui — vitesse, concentration et décisions — pas qui tu es ni le niveau que tu atteindras. Les scores montent avec l’entraînement, le sommeil et l’âge. Aucun coach ne décide quoi que ce soit à partir de ce seul chiffre.',
  notInTalentScore: 'Affiché à côté de ton Score Talent, pas ajouté à celui-ci — pour l’instant.',

  // ── Partage ────────────────────────────────────────────────────────────────
  shareTitle: 'Qui peut voir ça',
  shareClubs: 'Partager avec les coachs et les clubs',
  shareClubsBody: 'Les coachs, recruteurs et clubs qui consultent ton profil voient ton résultat global et celui de chaque jeu.',
  shareBadge: 'Afficher un badge sur mon profil',
  shareBadgeBody: 'Les autres joueurs voient seulement ton résultat global. Le partage doit être activé.',
  shareMinorNote: 'Ton profil n’est visible par les clubs qu’une fois que ton parent a donné son accord.',
  shareSaved: 'Enregistré',

  // ── Sur le profil de quelqu’un d’autre ─────────────────────────────────────
  theirTitle: 'Intelligence de jeu',
  theirTop: 'Top {{percent}} % de sa tranche d’âge',
  theirTests: '{{n}} jeux sur 6',
  theirPlayed: 'Joué le {{date}}',
  theirConfidence: 'Fiabilité : {{level}}',

  // ── Accord du tuteur (réglages → tuteur) ───────────────────────────────────
  scopeAssessments: 'Peut jouer aux jeux Intelligence de jeu',
  scopeAssessmentsOff: 'Jeux Intelligence de jeu non autorisés',
  addAssessments: 'Demander l’ajout de l’Intelligence de jeu',
  addAssessmentsHint:
    'Ton parent a approuvé ton profil, mais pas les jeux. On va lui envoyer un nouveau lien — il doit cocher « Intelligence de jeu ».',
  addAssessmentsSent: 'Demande envoyée à {{email}}. Les jeux se débloquent dès son accord.',
};
