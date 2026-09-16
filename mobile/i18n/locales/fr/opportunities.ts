/**
 * Les opportunités : le tableau des essais, une annonce en entier, la file de
 * candidatures d’un club, le formulaire de publication et la page de club vers
 * laquelle pointe une opportunité.
 *
 * Quatre choses à savoir avant de traduire :
 *
 *  - `status.*` est volontairement écrit deux fois. La même valeur stockée se
 *    lit différemment selon qui regarde la ligne : `rejected` est un fait sur la
 *    liste d’un recruteur et une phrase sur l’écran d’un jeune de 15 ans.
 *    Traduis les deux voix ; ne les fusionne jamais.
 *  - `match.reason.*` est la lecture, côté athlète, d’une raison produite en
 *    anglais par la base. Les chaînes anglaises restent dans le code comme clés
 *    de correspondance — voir components/opportunities/MatchExplain.tsx.
 *  - `post.safetyBody` est un texte de conformité. Garde son sens exact —
 *    mineurs, parent ou tuteur informé, annonces retirées — et garde
 *    `{{guidelines}}` là où la phrase en a besoin : c’est là que se place le lien
 *    vers les règles de la communauté.
 *  - Les sports, postes, niveaux et types d’opportunité sont stockés en anglais
 *    et traduits via `constants/sports.ts`. Rien ici ne les répète.
 */
export const opportunities = {
  // ── Onglet Opportunités ─────────────────────────────────────────────────────
  title: 'Opportunités',
  athleteSubtitle: 'Essais, bourses, contrats, stages',
  recruiterSubtitle: 'Tes annonces et qui a postulé',

  /** Chaque favori de cette zone dit la même chose : tableau, annonce, club. */
  savedToast: 'Enregistré. Retrouve-le dans Enregistrés.',

  tabs: {
    open: 'Ouverts',
    saved: 'Enregistrés',
    applied: 'Candidatures',
    postings: 'Mes annonces',
    applicants: 'Candidats',
  },

  /** Les sports viennent de `sports.allSports` ; seule la ligne de type est à nous. */
  allTypes: 'Tout',

  athlete: {
    appliedOn: 'Postulé le {{date}}',

    openEmptyFilteredTitle: 'Rien ne correspond à ces filtres',
    openEmptyFilteredBody: 'Efface-les pour voir tout ce qui est ouvert en ce moment.',
    clearFilters: 'Effacer les filtres',

    openEmptyTitle: 'Rien d’ouvert dans ton sport',
    openEmptyBody: 'Suis des clubs pour être au courant en premier.',
    findClubs: 'Trouver des clubs',

    savedEmptyTitle: 'Rien d’enregistré',
    savedEmptyBody: 'Appuie sur le marque-page de tout ce que tu veux retrouver.',
    browseOpen: 'Voir ce qui est ouvert',

    appliedEmptyTitle: 'Aucune candidature',
    appliedEmptyBody: 'Quand tu postules, tu peux suivre chaque réponse ici.',
    seeWhatsOpen: 'Voir ce qui est ouvert',
  },

  recruiter: {
    active: 'Active',
    closed: 'Close',
    /* Les deux ci-dessous sont dites dans une phrase plus longue, d’où la minuscule. */
    activeA11y: 'active',
    closedA11y: 'close',
    openPosting: 'Ouvre l’annonce',
    reviewApplicants: 'Examiner les candidats',

    postingsEmptyTitle: 'Aucune annonce',
    postingsEmptyBody:
      'Publie un essai, une bourse ou un stage et les athlètes qui correspondent le verront en premier.',

    allApplicants: 'Tous ceux qui ont postulé à l’une de tes annonces, les plus proches d’abord.',
    applicantsEmptyTitle: 'Aucun candidat',
    applicantsEmptyBody: 'Ils apparaîtront ici dès que quelqu’un postulera.',
  },

  // ── Carte d’opportunité ─────────────────────────────────────────────────────
  card: {
    independent: 'Annonce indépendante',
    open: 'Ouvre l’opportunité',
    /* Dit à la fin de la phrase d’accessibilité de la carte. */
    closedA11y: 'close',
    save: 'Enregistrer {{title}} pour plus tard',
    unsave: 'Retirer {{title}} des enregistrements',
  },

  // ── Où en est une candidature ───────────────────────────────────────────────
  status: {
    /** Ce que lit l’athlète qui l’a envoyée. */
    athlete: {
      applied: 'Envoyée',
      in_review: 'En lecture',
      shortlisted: 'Présélectionné',
      invited: 'Invité à l’essai',
      rejected: 'Pas cette fois',
      withdrawn: 'Retirée',
    },
    /** Ce que lit le club qui l’examine. */
    recruiter: {
      applied: 'Nouvelle',
      in_review: 'En cours',
      shortlisted: 'Présélectionné',
      invited: 'Invité',
      rejected: 'Refusé',
      withdrawn: 'Retirée',
    },
  },

  // ── Le pourcentage d’affinité et les raisons derrière ───────────────────────
  match: {
    percentA11y: '{{percent}} pour cent d’affinité',
    fitPercentA11y: '{{percent}} pour cent de correspondance',
    why: 'Pourquoi ça te correspond',
    /** La lecture, côté athlète, de ce que `private.match_reasons` a renvoyé. */
    reason: {
      sport: 'Ton sport',
      position: 'Ton poste',
      region: 'Près de chez toi',
      topTier: 'Ton score talent est au plus haut palier',
      strongScore: 'Score talent solide',
    },
  },

  // ── Ligne de candidat ───────────────────────────────────────────────────────
  applicant: {
    open: 'Ouvre sa candidature',
    talentScoreA11y: 'score talent {{score}}',
  },

  // ── Une opportunité, en entier ──────────────────────────────────────────────
  detail: {
    title: 'Opportunité',
    more: 'Plus d’actions',
    /** La ligne au-dessus du lien dans un message partagé. */
    shareText: '{{title}} — {{club}}',
    shareClubFallback: 'sur AceAiX',

    missingTitle: 'On ne trouve pas ça',
    missingBody: 'Le lien est peut-être cassé ou périmé.',
    goneTitle: 'Celle-ci n’est plus là',
    goneBody: 'Le club l’a retirée, ou elle est close. Il y en a plein d’autres.',
    seeWhatsOpen: 'Voir ce qui est ouvert',

    save: 'Enregistrer pour plus tard',
    unsave: 'Retirer des enregistrements',

    reviewApplicants_one: 'Examiner {{count}} candidat',
    reviewApplicants_many: 'Examiner {{count}} candidats',
    reviewApplicants_other: 'Examiner {{count}} candidats',

    withdraw: 'Retirer ma candidature',
    withdrawA11y: 'Retirer cette candidature',
    withdrawn: 'Retirée.',
    applicationsClosed: 'Candidatures closes',

    openClub: 'Ouvrir {{club}}',
    viewClub: 'Voir le club',
    postedByMember: 'Publié par un membre',
    closed: 'Close',

    about: 'À propos',

    factType: 'Type',
    factSport: 'Sport',
    factPosition: 'Poste',
    factWhere: 'Lieu',
    factDeadline: 'Date limite',
    factPosted: 'Publié le',
    noDeadline: 'Pas de date limite',

    /* Un essai est une vraie rencontre avec un inconnu. Reste simple. */
    safety:
      'Préviens un parent, un tuteur ou un coach avant d’aller à un rendez-vous en personne. Personne sur AceAiX ne doit jamais te demander de l’argent.',

    menuTitle: 'Cette opportunité',
    reportHint: 'Dis-nous ce qui ne va pas. Les signalements restent privés.',
  },

  report: {
    title: 'Signaler cette annonce',
    subtitle: 'Choisis le motif le plus proche. On ne dit jamais qui a signalé.',
    thanks: 'Merci de nous l’avoir dit. Notre équipe va regarder.',
    reason: {
      childSafety: 'Protection des mineurs',
      childSafetyHint: 'Dangereux pour les moins de 18 ans',
      scam: 'Arnaque ou demande d’argent',
      impersonation: 'Se fait passer pour un vrai club',
      misleading: 'Trompeur ou faux',
      spam: 'Spam',
      other: 'Autre chose',
    },
  },

  apply: {
    send: 'Envoyer ma candidature',
    sent: 'Envoyée. Ils verront ton profil avec.',
    messageLabel: 'Ton message',
    messagePlaceholder: 'Dis-leur pourquoi tu corresponds — deux ou trois lignes suffisent.',
    whatTheySee: 'Ce qu’ils verront',
    seeProfile: 'Ton nom et ton profil',
    seeScore: 'Ton Score Talent',
    seeHighlights: 'Tes highlights et tes stats',
    seeMessage: 'Le message que tu écris au-dessus',
    guardianNotice: 'Ton parent ou tuteur pourra voir les candidatures que tu envoies.',
  },

  // ── Examiner qui a postulé ──────────────────────────────────────────────────
  applicants: {
    title: 'Candidats',
    /** La ligne de filtres réutilise les statuts recruteur ; seul « tous » est à nous. */
    filterAll: 'Tous',
    /** Une puce de filtre : l’étape, puis combien y sont. */
    filterChip: '{{label}} {{count}}',
    ranked: 'Classé selon la correspondance de chaque athlète avec cette annonce.',

    missingTitle: 'On ne trouve pas cette annonce',
    missingBody: 'Le lien est peut-être cassé ou périmé.',
    backToOpportunities: 'Retour aux opportunités',

    lockedTitle: 'Tu ne peux pas examiner cette annonce',
    lockedBody:
      'Seuls le club ou le coach qui l’a publiée — et le staff qu’il a ajouté — peuvent voir qui a postulé.',

    emptyTitle: 'Personne n’a encore postulé',
    emptyBody: 'Les athlètes qui correspondent la voient en premier. Laisse un jour ou deux.',
    emptyStageTitle: 'Personne à cette étape',
    emptyStageBody: 'Essaie un autre filtre.',
    showEveryone: 'Afficher tout le monde',

    scoreLine: 'Score Talent {{score}}',
    noMessage: 'Aucun message écrit.',
    viewProfile: 'Voir le profil complet',

    moveForward: 'Les faire avancer',
    shortlist: 'Présélectionner',
    shortlistDone: 'Présélectionné.',
    invite: 'Inviter à l’essai',
    inviteDone: 'Invité à l’essai.',
    reject: 'Refuser',
    rejectDone: 'Marqué comme refusé.',

    notified: 'Ils seront prévenus — AceAiX s’en charge pour toi.',
  },

  // ── Publier une opportunité ─────────────────────────────────────────────────
  post: {
    title: 'Publier une opportunité',
    submit: 'Publier',
    posted: 'Publié. Les athlètes qui correspondent le verront en premier.',
    checkFields: 'Vérifie les champs signalés.',

    titleLabel: 'Titre',
    titlePlaceholder: 'Essai gardien U16',
    titleHint: 'Court et précis. C’est ce que les athlètes lisent en premier.',
    titleError: 'Donne-lui un titre que les athlètes reconnaîtront.',

    typeLabel: 'C’est quoi ?',
    typeError: 'Choisis de quoi il s’agit.',
    /** Lu comme une seule phrase : le type, puis ce qu’il veut dire. */
    typeA11y: '{{label}}. {{hint}}',

    sportLabel: 'Sport',
    sportError: 'Choisis le sport.',

    positionLabel: 'Poste',
    positionHint: 'Laisse ouvert si tous les postes peuvent postuler.',
    positionAny: 'Tous',

    whereLabel: 'Lieu',
    wherePlaceholder: 'Dubaï, Émirats arabes unis',
    whereError: 'Ça se passe où ?',

    deadlineLabel: 'Clôture des candidatures',
    deadlineNone: 'Pas de date limite',
    deadlineChoose: 'Choisir une date de clôture',
    deadlineChange: 'Candidatures closes le {{date}}. Changer la date',
    deadlineClearA11y: 'Effacer la date de clôture',
    deadlineError: 'Choisis une date dans le futur.',

    detailsLabel: 'Détails',
    detailsPlaceholder: 'Ce qui se passe le jour J, pour qui c’est, quoi apporter.',
    detailsError_one: 'Dis-en un peu plus — au moins {{count}} caractère.',
    detailsError_many: 'Dis-en un peu plus — au moins {{count}} caractères.',
    detailsError_other: 'Dis-en un peu plus — au moins {{count}} caractères.',

    previewTitle: 'Ce que les athlètes verront',
    previewHint: 'Le pourcentage d’affinité est calculé pour chaque athlète, il n’est donc pas affiché ici.',
    previewPlaceholder: 'Ton titre vient ici',

    /* Texte de conformité. Chaque clause compte — garde les trois. */
    safetyTitle: 'Avant de publier',
    safetyBody:
      'Beaucoup d’athlètes AceAiX ont moins de 18 ans. Les essais doivent se dérouler avec un parent ou tuteur informé, et AceAiX peut retirer les annonces qui ne respectent pas nos {{guidelines}}.',
    safetyLinkA11y: 'Lire les règles de la communauté',
  },

  // ── Page de club ────────────────────────────────────────────────────────────
  org: {
    missingTitle: 'On ne trouve pas ce club',
    missingBody: 'Le lien est peut-être cassé ou périmé.',
    backToDiscover: 'Retour à Découvrir',
    goneTitle: 'Ce club n’est pas sur AceAiX',
    goneBody: 'Il a peut-être été retiré.',

    /* `club` et `federation` viennent de common ; une académie n’est jamais
       qu’un type d’organisation, donc elle vit ici. */
    typeAcademy: 'Académie',

    /* `value` est le compte déjà abrégé pour le badge — « 1,2 k ». */
    followers_one: '{{value}} abonné',
    followers_many: '{{value}} abonnés',
    followers_other: '{{value}} abonnés',
    followA11y: 'Suivre {{name}}',
    unfollowA11y: 'Ne plus suivre {{name}}',

    tabAbout: 'À propos',
    tabOpenings: 'Places',
    tabOpeningsCount: 'Places {{count}}',

    noIntro: 'Ce club n’a pas encore écrit de présentation.',
    factType: 'Type',
    factLeague: 'Championnat',
    factBasedIn: 'Basé à',

    unverified:
      'AceAiX n’a pas encore vérifié ce club. Vérifie à qui tu parles avant de te déplacer.',

    openingsEmptyTitle: 'Rien d’ouvert en ce moment',
    openingsEmptyFollowing: 'Tu les suis, donc tu sauras quand quelque chose s’ouvrira.',
    openingsEmptyBody: 'Suis-les pour être au courant en premier.',
  },
};
