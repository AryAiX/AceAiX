/**
 * Sports, postes et niveaux.
 *
 * La clé anglaise est ce qui est stocké dans la base — le sport d’un athlète est
 * « Football » dans toutes les langues, sinon un coach à Madrid et un coach à
 * Dubaï chercheraient dans deux catalogues différents. Seul le libellé est
 * traduit.
 */
export const sports = {
  football: 'Football',
  basketball: 'Basket-ball',
  tennis: 'Tennis',
  athletics: 'Athlétisme',
  swimming: 'Natation',
  cricket: 'Cricket',
  volleyball: 'Volley-ball',
  handball: 'Handball',
  padel: 'Padel',
  chess: 'Échecs',
  esports: 'Esport',
  martialArts: 'Arts martiaux',

  allSports: 'Tous les sports',
  anySport: 'Tout sport',
  anyPosition: 'Tout poste',

  position: {
    goalkeeper: 'Gardien',
    centreBack: 'Défenseur central',
    fullBack: 'Latéral',
    wingBack: 'Piston',
    defensiveMidfielder: 'Milieu défensif',
    centralMidfielder: 'Milieu central',
    attackingMidfielder: 'Milieu offensif',
    winger: 'Ailier',
    striker: 'Attaquant',

    pointGuard: 'Meneur',
    shootingGuard: 'Arrière',
    smallForward: 'Ailier',
    powerForward: 'Ailier fort',
    centre: 'Pivot',

    singles: 'Simple',
    doubles: 'Double',

    sprints: 'Sprint',
    middleDistance: 'Demi-fond',
    longDistance: 'Fond',
    jumps: 'Sauts',
    throws: 'Lancers',
    hurdles: 'Haies',

    freestyle: 'Nage libre',
    backstroke: 'Dos',
    breaststroke: 'Brasse',
    butterfly: 'Papillon',
    individualMedley: '4 nages',

    batter: 'Batteur',
    bowler: 'Lanceur',
    allRounder: 'Polyvalent',
    wicketKeeper: 'Gardien de guichet',

    setter: 'Passeur',
    outsideHitter: 'Réceptionneur-attaquant',
    opposite: 'Pointu',
    middleBlocker: 'Central',
    libero: 'Libéro',

    leftWing: 'Ailier gauche',
    leftBack: 'Arrière gauche',
    centreBackHandball: 'Demi-centre',
    rightBack: 'Arrière droit',
    rightWing: 'Ailier droit',
    pivot: 'Pivot',

    rightSide: 'Côté droit',
    leftSide: 'Côté gauche',

    classical: 'Classique',
    rapid: 'Rapide',
    blitz: 'Blitz',

    entry: 'Entry',
    support: 'Support',
    igl: 'Leader en jeu',
    mid: 'Mid',
    jungle: 'Jungle',
    duelist: 'Duelliste',

    judo: 'Judo',
    karate: 'Karaté',
    taekwondo: 'Taekwondo',
    boxing: 'Boxe',
    wrestling: 'Lutte',
    mma: 'MMA',
  },

  level: {
    grassroots: 'Loisir',
    grassrootsHint: 'Équipe scolaire ou de quartier',
    academy: 'Académie',
    academyHint: 'Académie de club ou centre de formation',
    amateur: 'Amateur',
    amateurHint: 'Compétition amateur officielle',
    semiPro: 'Semi-pro',
    semiProHint: 'Rémunéré, à temps partiel',
    professional: 'Professionnel',
    professionalHint: 'Contrat à temps plein',
  },

  side: {
    right: 'Droit',
    left: 'Gauche',
    both: 'Les deux',
  },

  opportunityType: {
    trial: 'Essai',
    trialHint: 'Séance ouverte ou journée de détection',
    scholarship: 'Bourse',
    scholarshipHint: 'Place en académie ou à l’université',
    contract: 'Contrat',
    contractHint: 'Contrat ou offre de joueur',
    camp: 'Stage',
    campHint: 'Stage d’entraînement ou showcase',
  },
};
