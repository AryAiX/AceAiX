/**
 * Sports, positions and levels.
 *
 * The English key is what is stored in the database — an athlete's sport is
 * "Football" in every language, or a coach in Madrid and a coach in Dubai
 * would be searching two different catalogues. Only the label is translated.
 */
export const sports = {
  football: 'Football',
  basketball: 'Basketball',
  tennis: 'Tennis',
  athletics: 'Athletics',
  swimming: 'Swimming',
  cricket: 'Cricket',
  volleyball: 'Volleyball',
  handball: 'Handball',
  padel: 'Padel',
  chess: 'Chess',
  esports: 'Esports',
  martialArts: 'Martial arts',

  allSports: 'All sports',
  anySport: 'Any sport',
  anyPosition: 'Any position',

  position: {
    goalkeeper: 'Goalkeeper',
    centreBack: 'Centre-back',
    fullBack: 'Full-back',
    wingBack: 'Wing-back',
    defensiveMidfielder: 'Defensive midfielder',
    centralMidfielder: 'Central midfielder',
    attackingMidfielder: 'Attacking midfielder',
    winger: 'Winger',
    striker: 'Striker',

    pointGuard: 'Point guard',
    shootingGuard: 'Shooting guard',
    smallForward: 'Small forward',
    powerForward: 'Power forward',
    centre: 'Centre',

    singles: 'Singles',
    doubles: 'Doubles',

    sprints: 'Sprints',
    middleDistance: 'Middle distance',
    longDistance: 'Long distance',
    jumps: 'Jumps',
    throws: 'Throws',
    hurdles: 'Hurdles',

    freestyle: 'Freestyle',
    backstroke: 'Backstroke',
    breaststroke: 'Breaststroke',
    butterfly: 'Butterfly',
    individualMedley: 'Individual medley',

    batter: 'Batter',
    bowler: 'Bowler',
    allRounder: 'All-rounder',
    wicketKeeper: 'Wicket-keeper',

    setter: 'Setter',
    outsideHitter: 'Outside hitter',
    opposite: 'Opposite',
    middleBlocker: 'Middle blocker',
    libero: 'Libero',

    leftWing: 'Left wing',
    leftBack: 'Left back',
    centreBackHandball: 'Centre back',
    rightBack: 'Right back',
    rightWing: 'Right wing',
    pivot: 'Pivot',

    rightSide: 'Right side',
    leftSide: 'Left side',

    classical: 'Classical',
    rapid: 'Rapid',
    blitz: 'Blitz',

    entry: 'Entry',
    support: 'Support',
    igl: 'In-game leader',
    mid: 'Mid',
    jungle: 'Jungle',
    duelist: 'Duelist',

    judo: 'Judo',
    karate: 'Karate',
    taekwondo: 'Taekwondo',
    boxing: 'Boxing',
    wrestling: 'Wrestling',
    mma: 'MMA',
  },

  level: {
    grassroots: 'Grassroots',
    grassrootsHint: 'School or community team',
    academy: 'Academy',
    academyHint: 'Club academy or development squad',
    amateur: 'Amateur',
    amateurHint: 'Registered amateur competition',
    semiPro: 'Semi-pro',
    semiProHint: 'Paid, part-time',
    professional: 'Professional',
    professionalHint: 'Full-time contract',
  },

  side: {
    right: 'Right',
    left: 'Left',
    both: 'Both',
  },

  opportunityType: {
    trial: 'Trial',
    trialHint: 'Open session or assessment day',
    scholarship: 'Scholarship',
    scholarshipHint: 'Academy or university place',
    contract: 'Contract',
    contractHint: 'Playing contract or offer',
    camp: 'Camp',
    campHint: 'Training camp or showcase',
  },
};
