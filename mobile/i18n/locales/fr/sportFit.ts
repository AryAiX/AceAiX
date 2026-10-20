/**
 * Sport Fit — un court questionnaire sur l’état d’esprit et les sports vers
 * lesquels il oriente.
 *
 * Règles de ton, dans toutes les langues :
 *
 *   * Une piste à explorer, jamais un verdict. Jamais « tu devrais arrêter »,
 *     « tu n’es pas fait pour », « ta personnalité ». Le joueur continue de
 *     pratiquer ce qu’il aime ; ceci ouvre seulement des portes.
 *   * Jamais de vocabulaire clinique : pas de « test psychologique »,
 *     « diagnostic », « type de personnalité », « trouble ». C’est un
 *     questionnaire sur ta façon de t’entraîner et ce que tu ressens en match.
 *   * Les phrases sont à la première personne, simples, lisibles à treize ans.
 *     Les traductions de `item.*` doivent être relues par un psychologue du
 *     sport de langue maternelle française avant le lancement (docs/31 §6).
 */
export const sportFit = {
  // ── Noms ───────────────────────────────────────────────────────────────────
  title: 'Sport Fit',
  tagline: 'Les sports qui collent à ton état d’esprit',

  // ── La carte du profil ─────────────────────────────────────────────────────
  cardCta: 'Trouve les sports qui te correspondent',
  cardCtaBody: '22 phrases rapides, environ 4 minutes. Visible uniquement par toi.',
  cardResult: 'Meilleure affinité : {{sport}}',
  cardResultBody: 'Puis {{second}} et {{third}}',
  cardPrivate: 'Visible uniquement par toi',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'Ta façon de penser montre où tu peux briller',
  introBody:
    'Dis-nous comment tu t’entraînes et ce que tu ressens en match. On compare tes réponses avec ce que douze sports demandent dans la tête d’un joueur, et on te montre les trois qui te correspondent le mieux, et pourquoi.',
  introPoint1: '22 phrases, environ 4 minutes. Il n’y a pas de bonne ou de mauvaise réponse.',
  introPoint2: 'Privé : les clubs et les recruteurs ne voient jamais tes réponses ni ton résultat.',
  introPoint3: 'Si tu as joué à Intelligence de jeu, ta lecture du jeu compte aussi.',
  introStart: 'C’est parti',
  introNotMedical: 'C’est un questionnaire, pas une évaluation médicale ou psychologique.',
  introGiHint: 'Joue d’abord à Intelligence de jeu pour un résultat plus précis.',
  introGiAction: 'Jouer aux jeux',

  // ── Accord parental ────────────────────────────────────────────────────────
  consentTitle: 'Demande d’abord à un parent',
  consentBody:
    'Là où tu vis, les joueurs de moins de {{age}} ans ont besoin de l’accord d’un parent ou tuteur avant de répondre. On lui enverra un court e-mail pour lui expliquer Sport Fit.',
  consentPendingTitle: 'En attente de ton parent',
  consentPendingBody:
    'Nous leur avons demandé. L’e-mail contient une case « Sport Fit » : demande-leur de la cocher, et le questionnaire se débloquera ici.',
  consentAction: 'Demander à mon parent',
  consentAgeUnknownTitle: 'Ajoute ta date de naissance',
  consentAgeUnknownBody: 'On en a besoin pour savoir si un parent doit d’abord donner son accord.',
  consentAgeUnknownAction: 'Modifier le profil',
  notAthleteTitle: 'Pour les athlètes',
  notAthleteBody: 'Sport Fit fait partie du profil d’un athlète.',
  suspendedBody: 'Indisponible pendant que ton compte est en cours de vérification.',

  // ── Questions ──────────────────────────────────────────────────────────────
  questionsTitle: 'Sport Fit',
  progress: '{{n}} sur {{total}}',
  questionHint: 'À quel point c’est vrai pour toi ?',
  answer1: 'Pas du tout d’accord',
  answer2: 'Pas d’accord',
  answer3: 'Je ne sais pas',
  answer4: 'D’accord',
  answer5: 'Tout à fait d’accord',
  back: 'Retour',
  submitting: 'On cherche tes sports…',
  leaveTitle: 'T’arrêter ici ?',
  leaveBody: 'Tes réponses jusqu’ici ne seront pas enregistrées.',
  leaveConfirm: 'Arrêter',
  leaveCancel: 'Continuer',

  item: {
    drive1: 'Je m’entraîne même quand personne ne me surveille.',
    drive2: 'Je fais mon sport surtout parce que j’adore progresser.',
    drive3: 'Au bout de quelques semaines, je perds souvent l’envie de m’entraîner.',
    composure1: 'Dans les grands moments d’un match, j’arrive à rester calme.',
    composure2: 'Avant une compétition, le stress me fait souvent moins bien jouer.',
    composure3: 'Quand le score est serré, j’ai envie d’avoir le ballon ou de jouer le prochain point.',
    team1: 'Une victoire, c’est encore mieux quand je la partage avec mes coéquipiers.',
    team2: 'Je préfère que mon résultat ne dépende que de moi.',
    team3: 'J’aime que mes coéquipiers comptent sur moi, et pouvoir compter sur eux.',
    focus1: 'Je peux garder mon attention sur une seule tâche pendant longtemps.',
    focus2: 'Le bruit du public ou des autres joueurs me déconcentre facilement.',
    focus3: 'Je peux passer toute une séance à travailler un seul petit détail.',
    boldness1: 'J’aime les duels en un contre un avec un adversaire.',
    boldness2: 'Le contact physique pendant un match ne me dérange pas.',
    boldness3: 'Je préfère les activités où il y a peu de risques de me blesser.',
    resilience1: 'Après une erreur, je me concentre vite sur l’action suivante.',
    resilience2: 'Une défaite me donne envie de m’entraîner encore plus.',
    resilience3: 'Quand un coach me critique, j’y repense pendant des jours.',
    discipline1: 'J’aime suivre une routine d’entraînement fixe.',
    discipline2: 'Je peux répéter le même exercice plein de fois pour bien le réussir.',
    discipline3: 'Je m’ennuie vite quand l’entraînement est répétitif.',
    check1: 'Pour montrer que tu lis bien chaque phrase, choisis « D’accord » pour celle-ci.',
  },

  // ── Résultat inutilisable : on recommence ──────────────────────────────────
  retryTitle: 'On recommence',
  retryTooFast: 'C’était très rapide. Prends un moment pour chaque phrase, pour que le résultat ait du sens.',
  retryCheck: 'Une phrase te demandait de choisir « D’accord ». Lis bien chaque phrase et réessaie.',
  retryStraight: 'Toutes tes réponses étaient les mêmes. Réfléchis à chaque phrase séparément et réessaie.',
  retryAction: 'Recommencer',

  // ── Résultat ───────────────────────────────────────────────────────────────
  resultsTitle: 'Ton Sport Fit',
  resultsSubtitle: 'Les sports qui collent à ta façon de penser',
  fitLabel: '{{fit}} % d’affinité',
  topPick: 'Meilleure affinité',
  whyTitle: 'Pourquoi ça colle',
  developTitle: 'À développer',
  allSportsTitle: 'Tous les sports',
  mindsetTitle: 'Ton état d’esprit',
  teamSpectrumSolo: 'Solo',
  teamSpectrumTeam: 'Équipe',
  fromGames: 'D’après Intelligence de jeu',
  takenOn: 'Répondu le {{date}}',
  nextRetake: 'Tu pourras répondre à nouveau à partir du {{date}}',
  findCoaches: 'Trouver des coachs',
  footnote:
    'Une piste à explorer, pas un verdict. Sport Fit regarde seulement ton état d’esprit et ta lecture du jeu, pas ton corps, ta condition physique, ta technique ni ton expérience. Continue de jouer à ce que tu aimes.',
  privacyTitle: 'Tes réponses sont privées',
  privacyBody:
    'Toi seul peux les voir. Elles ne sont pas montrées aux clubs ni aux recruteurs et ne comptent pas dans ton Score Talent.',
  deleteAction: 'Supprimer mes réponses',
  deleteTitle: 'Supprimer tes réponses Sport Fit ?',
  deleteBody: 'Tes réponses et ton résultat seront supprimés définitivement. Tu peux répondre à nouveau quand tu veux.',
  deleteConfirm: 'Supprimer',
  deleted: 'Tes réponses Sport Fit ont été supprimées',

  dimension: {
    drive: 'Motivation',
    composure: 'Sang-froid',
    focus: 'Concentration',
    resilience: 'Rebond',
    team: 'Équipe ou solo',
    boldness: 'Audace',
    discipline: 'Routine',
    reading: 'Lecture du jeu',
    speed: 'Réflexes',
  },
  dimensionWhat: {
    drive: 'Avoir envie de t’entraîner et de progresser pour le plaisir',
    composure: 'Rester calme quand ça compte',
    focus: 'Garder ton attention là où il faut',
    resilience: 'Te remettre des erreurs et des coups durs',
    team: 'Si tu préfères une équipe ou ton propre résultat',
    boldness: 'Aimer les duels, le contact et le risque',
    discipline: 'Aimer la répétition et les entraînements structurés',
    reading: 'À quelle vitesse tu lis le jeu, d’après tes jeux',
    speed: 'À quelle vitesse tu réagis, d’après tes jeux',
  },
  strength: {
    drive: 'Tu t’entraînes parce que tu veux progresser',
    composure: 'Tu restes calme quand le score est serré',
    focus: 'Tu arrives à garder ton attention longtemps',
    resilience: 'Tu rebondis vite après une erreur',
    boldness: 'Tu aimes les duels et les batailles physiques',
    discipline: 'Tu aimes la routine et répéter un geste',
    reading: 'Tu lis le jeu vite',
    speed: 'Tu réagis vite',
  },
  develop: {
    drive: 'Fixe-toi un petit objectif par semaine et coche-le une fois atteint.',
    composure: 'Entraîne-toi à une courte routine de respiration avant les moments clés.',
    focus: 'Entraîne-toi avec un mot-clé qui ramène ton attention.',
    resilience: 'Après une erreur, fais un geste pour repartir à zéro (un clap, une respiration) et passe à la suite.',
    boldness: 'Joue plus de petits matchs où tu dois gagner ton duel.',
    discipline: 'Transforme la répétition en jeu : compte, chronomètre ou note tes exercices.',
    reading: 'Regarde des matchs et dis à voix haute ce que tu ferais ensuite.',
    speed: 'Ajoute de courts exercices de réaction à ton échauffement.',
  },
  teamMatch: {
    team: 'Tu aimes partager l’effort avec une équipe',
    pairs: 'Tu aimes jouer avec un partenaire',
    solo: 'Tu aimes porter ton propre résultat',
  },
  sportWhy: {
    football: 'Des décisions rapides avec dix coéquipiers, pendant quatre-vingt-dix minutes.',
    basketball: 'Des décisions en continu, à toute vitesse, dans une petite équipe.',
    volleyball: 'Des réactions rapides et de la confiance en chaque coéquipier, à chaque point.',
    handball: 'Vitesse, contact et courage dans un sport d’équipe rapide.',
    cricket: 'Une longue concentration et des nerfs calmes, seul au bâton au sein d’une équipe.',
    padel: 'Lire vite la balle avec un partenaire à tes côtés.',
    esports: 'Concentration, lecture rapide et esprit d’équipe sur un écran.',
    tennis: 'Toi seul face à un adversaire, point après point.',
    martialArts: 'Courage, maîtrise et calme dans un combat en un contre un.',
    chess: 'Une concentration profonde et des décisions calmes, seul devant l’échiquier.',
    swimming: 'Ta propre course, construite sur la routine et un long entraînement.',
    athletics: 'Ton propre résultat, construit sur la discipline et la motivation.',
  },

  // ── Accord du tuteur (réglages → tuteur) ───────────────────────────────────
  scopeMindset: 'Peut répondre au questionnaire Sport Fit',
  scopeMindsetOff: 'Questionnaire Sport Fit non autorisé',
  addMindset: 'Demander l’ajout de Sport Fit',
  addMindsetHint:
    'Ton parent a approuvé ton profil, mais pas Sport Fit. On va lui envoyer un nouveau lien — il doit cocher « Sport Fit ».',
  addMindsetSent: 'Demande envoyée à {{email}}. Sport Fit se débloque dès son accord.',
};
