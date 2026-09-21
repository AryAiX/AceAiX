/**
 * Deportes, posiciones y niveles.
 *
 * La clave en inglés es lo que se guarda en la base de datos: el deporte de un
 * deportista es «Football» en todos los idiomas, o un entrenador de Madrid y
 * otro de Dubái estarían buscando en dos catálogos distintos. Solo se traduce
 * la etiqueta.
 */
export const sports = {
  football: 'Fútbol',
  basketball: 'Baloncesto',
  tennis: 'Tenis',
  athletics: 'Atletismo',
  swimming: 'Natación',
  cricket: 'Críquet',
  volleyball: 'Voleibol',
  handball: 'Balonmano',
  padel: 'Pádel',
  chess: 'Ajedrez',
  esports: 'Esports',
  martialArts: 'Artes marciales',

  allSports: 'Todos los deportes',
  anySport: 'Cualquier deporte',
  anyPosition: 'Cualquier posición',

  position: {
    goalkeeper: 'Portero',
    centreBack: 'Central',
    fullBack: 'Lateral',
    wingBack: 'Carrilero',
    defensiveMidfielder: 'Mediocentro defensivo',
    centralMidfielder: 'Mediocentro',
    attackingMidfielder: 'Mediapunta',
    winger: 'Extremo',
    striker: 'Delantero',

    pointGuard: 'Base',
    shootingGuard: 'Escolta',
    smallForward: 'Alero',
    powerForward: 'Ala-pívot',
    centre: 'Pívot',

    singles: 'Individual',
    doubles: 'Dobles',

    sprints: 'Velocidad',
    middleDistance: 'Medio fondo',
    longDistance: 'Fondo',
    jumps: 'Saltos',
    throws: 'Lanzamientos',
    hurdles: 'Vallas',

    freestyle: 'Estilo libre',
    backstroke: 'Espalda',
    breaststroke: 'Braza',
    butterfly: 'Mariposa',
    individualMedley: 'Estilos individual',

    batter: 'Bateador',
    bowler: 'Lanzador',
    allRounder: 'Todoterreno',
    wicketKeeper: 'Receptor',

    setter: 'Colocador',
    outsideHitter: 'Atacante exterior',
    opposite: 'Opuesto',
    middleBlocker: 'Central',
    libero: 'Líbero',

    leftWing: 'Extremo izquierdo',
    leftBack: 'Lateral izquierdo',
    centreBackHandball: 'Central',
    rightBack: 'Lateral derecho',
    rightWing: 'Extremo derecho',
    pivot: 'Pivote',

    rightSide: 'Lado derecho',
    leftSide: 'Lado izquierdo',

    classical: 'Clásico',
    rapid: 'Rápido',
    blitz: 'Blitz',

    entry: 'Entrada',
    support: 'Apoyo',
    igl: 'Líder en partida',
    mid: 'Mid',
    jungle: 'Jungla',
    duelist: 'Duelista',

    judo: 'Judo',
    karate: 'Kárate',
    taekwondo: 'Taekwondo',
    boxing: 'Boxeo',
    wrestling: 'Lucha',
    mma: 'MMA',
  },

  level: {
    grassroots: 'Base',
    grassrootsHint: 'Equipo escolar o de barrio',
    academy: 'Academia',
    academyHint: 'Academia de club o equipo de cantera',
    amateur: 'Amateur',
    amateurHint: 'Competición amateur federada',
    semiPro: 'Semiprofesional',
    semiProHint: 'Remunerado, a tiempo parcial',
    professional: 'Profesional',
    professionalHint: 'Contrato a tiempo completo',
  },

  side: {
    right: 'Derecha',
    left: 'Izquierda',
    both: 'Ambas',
  },

  opportunityType: {
    trial: 'Prueba',
    trialHint: 'Sesión abierta o jornada de evaluación',
    scholarship: 'Beca',
    scholarshipHint: 'Plaza en una academia o una universidad',
    contract: 'Contrato',
    contractHint: 'Contrato u oferta para jugar',
    camp: 'Campamento',
    campHint: 'Campamento de entrenamiento o escaparate',
  },
};
