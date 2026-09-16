/**
 * Sportarten, Positionen und Spielklassen.
 *
 * Der englische Schlüssel steht in der Datenbank — eine Sportart heißt in
 * jeder Sprache „Football“, sonst würden ein Trainer in Madrid und einer in
 * Dubai zwei verschiedene Kataloge durchsuchen. Übersetzt ist nur die
 * Anzeige.
 */
export const sports = {
  football: 'Fußball',
  basketball: 'Basketball',
  tennis: 'Tennis',
  athletics: 'Leichtathletik',
  swimming: 'Schwimmen',
  cricket: 'Cricket',
  volleyball: 'Volleyball',
  handball: 'Handball',
  padel: 'Padel',
  chess: 'Schach',
  esports: 'Esports',
  martialArts: 'Kampfsport',

  allSports: 'Alle Sportarten',
  anySport: 'Egal welche Sportart',
  anyPosition: 'Egal welche Position',

  position: {
    goalkeeper: 'Torwart',
    centreBack: 'Innenverteidigung',
    fullBack: 'Außenverteidigung',
    wingBack: 'Flügelverteidigung',
    defensiveMidfielder: 'Defensives Mittelfeld',
    centralMidfielder: 'Zentrales Mittelfeld',
    attackingMidfielder: 'Offensives Mittelfeld',
    winger: 'Flügelspieler',
    striker: 'Stürmer',

    pointGuard: 'Point Guard',
    shootingGuard: 'Shooting Guard',
    smallForward: 'Small Forward',
    powerForward: 'Power Forward',
    centre: 'Center',

    singles: 'Einzel',
    doubles: 'Doppel',

    sprints: 'Sprint',
    middleDistance: 'Mittelstrecke',
    longDistance: 'Langstrecke',
    jumps: 'Sprung',
    throws: 'Wurf',
    hurdles: 'Hürden',

    freestyle: 'Freistil',
    backstroke: 'Rücken',
    breaststroke: 'Brust',
    butterfly: 'Schmetterling',
    individualMedley: 'Lagen',

    batter: 'Batter',
    bowler: 'Bowler',
    allRounder: 'Allrounder',
    wicketKeeper: 'Wicket-Keeper',

    setter: 'Zuspieler',
    outsideHitter: 'Außenangriff',
    opposite: 'Diagonal',
    middleBlocker: 'Mittelblock',
    libero: 'Libero',

    leftWing: 'Linksaußen',
    leftBack: 'Rückraum links',
    centreBackHandball: 'Rückraum Mitte',
    rightBack: 'Rückraum rechts',
    rightWing: 'Rechtsaußen',
    pivot: 'Kreisläufer',

    rightSide: 'Rechte Seite',
    leftSide: 'Linke Seite',

    classical: 'Klassisch',
    rapid: 'Schnellschach',
    blitz: 'Blitz',

    entry: 'Entry',
    support: 'Support',
    igl: 'In-Game-Leader',
    mid: 'Mid',
    jungle: 'Jungle',
    duelist: 'Duelist',

    judo: 'Judo',
    karate: 'Karate',
    taekwondo: 'Taekwondo',
    boxing: 'Boxen',
    wrestling: 'Ringen',
    mma: 'MMA',
  },

  level: {
    grassroots: 'Breitensport',
    grassrootsHint: 'Schul- oder Vereinsmannschaft vor Ort',
    academy: 'Akademie',
    academyHint: 'Vereinsakademie oder Nachwuchskader',
    amateur: 'Amateur',
    amateurHint: 'Gemeldeter Amateurwettbewerb',
    semiPro: 'Halbprofi',
    semiProHint: 'Bezahlt, in Teilzeit',
    professional: 'Profi',
    professionalHint: 'Vertrag in Vollzeit',
  },

  side: {
    right: 'Rechts',
    left: 'Links',
    both: 'Beide',
  },

  opportunityType: {
    trial: 'Probetraining',
    trialHint: 'Offenes Training oder Sichtungstag',
    scholarship: 'Stipendium',
    scholarshipHint: 'Platz in einer Akademie oder an einer Uni',
    contract: 'Vertrag',
    contractHint: 'Spielervertrag oder Angebot',
    camp: 'Camp',
    campHint: 'Trainingscamp oder Sichtung',
  },
};
