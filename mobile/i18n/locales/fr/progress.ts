/**
 * Séries et trophées.
 *
 * `streakNoPressure` est la phrase essentielle de ce fichier : elle dit
 * explicitement qu’un jour manqué ne coûte rien d’autre que la série en cours.
 * Ne jamais la transformer en avertissement.
 */
export const progress = {
  title: 'Trophées',
  subtitle: 'Tout ce qui est ici vient de quelque chose que tu as vraiment fait.',
  earnedOf: '{{earned}} sur {{total}}',
  unlockedOn: 'Obtenu le {{date}}',
  tileEarnedA11y: '{{title}}. Obtenu le {{date}}. {{hint}}',
  tileLockedA11y: '{{title}}. Pas encore obtenu. {{hint}}',

  groupStart: 'Pour commencer',
  groupSeen: 'Se faire remarquer',
  groupScore: 'Ton score',
  groupStreak: 'Être là',

  rarityCommon: 'Courant',
  rarityRare: 'Rare',
  rarityEpic: 'Remarquable',

  days_one: '{{count}} jour',
  days_many: '{{count}} jours',
  days_other: '{{count}} jours',

  streakChipA11y: 'Série : {{days}}',
  streakChipHint: 'Explique ce qu’est une série et montre les sept derniers jours',
  streakSheetTitle: 'Ta série',
  streakWhat:
    'Une série compte les jours d’affilée où tu as ouvert AceAiX. C’est tout : être là. Elle ne dépend pas de tes publications et ne change jamais ton Talent Score.',
  streakNoPressure:
    'Si tu sautes un jour, tu ne perds rien d’autre que la série en cours. Ta plus longue série reste, ton score reste, et le compte repart la prochaine fois que tu passes.',
  streakNoneTitle: 'Pas encore de série',
  streakNoneBody: 'Elle démarre le premier jour où tu ouvres l’appli. Il n’y a rien à activer.',

  calendarTitle: '7 derniers jours',
  calendarA11y: 'Les sept derniers jours. Tu étais là {{count}} d’entre eux.',
  streakCurrent: 'En cours',
  streakLongest: 'La plus longue',
  streakTotal: 'Jours ici',

  gotIt: 'Compris',

  nextTierTitle: 'Palier suivant',
  pointsToNext_one: '{{count}} point avant {{tier}}',
  pointsToNext_many: '{{count}} points avant {{tier}}',
  pointsToNext_other: '{{count}} points avant {{tier}}',
  tierStartsAt: '{{tier}} commence à {{score}}',
  tierTopTitle: 'Palier maximum',
  tierTopBody: 'Il n’y a rien au-dessus d’Élite. Garde ton profil à jour et il reste à toi.',
  tierTopA11y: 'Palier Élite, Talent Score {{score}}. C’est le palier le plus haut.',
  scoreNotReadyTitle: 'Pas encore de Talent Score',
  scoreNotReadyBody: 'Ajoute ton sport et ton poste, et ton score apparaît.',

  celebrateAchievementEyebrow: 'Trophée obtenu',
  celebrateTierEyebrow: 'Nouveau palier',
  celebrateStreakEyebrow: 'Série',
  celebrateTierBody: 'Ton Talent Score a atteint {{score}}.',
  celebrateStreakBody: 'Tu reviens, encore et encore. C’est franchement le plus dur.',
  streakMilestone_one: '{{count}} jour d’affilée',
  streakMilestone_many: '{{count}} jours d’affilée',
  streakMilestone_other: '{{count}} jours d’affilée',
  andMore_one: 'et {{count}} de plus sur ton mur',
  andMore_many: 'et {{count}} de plus sur ton mur',
  andMore_other: 'et {{count}} de plus sur ton mur',
  celebrateNice: 'Bien joué',
  celebrateNext: 'Suivant',
  celebrateShare: 'Partager',
  shareTierMessage: 'J’ai atteint le palier {{tier}} sur AceAiX — Talent Score {{score}}.',

  achievements: {
    first_post: {
      title: 'Première publication',
      hint: 'Tu as publié pour la première fois.',
    },
    first_clip: {
      title: 'Premier clip',
      hint: 'Tu as ajouté ta première vidéo à tes temps forts.',
    },
    three_clips: {
      title: 'Trois clips',
      hint: 'Trois vidéos dans tes temps forts. Ça fait un montage qu’un recruteur peut regarder.',
    },
    first_match: {
      title: 'Premier match',
      hint: 'Tu as enregistré ton premier match.',
    },
    ten_matches: {
      title: 'Dix matchs',
      hint: 'Dix matchs à ton actif.',
    },
    first_application: {
      title: 'Première candidature',
      hint: 'Tu as postulé à ton premier essai ou à ta première opportunité.',
    },
    first_follower: {
      title: 'Premier abonné',
      hint: 'Quelqu’un s’est abonné à toi.',
    },
    ten_followers: {
      title: 'Dix abonnés',
      hint: 'Dix personnes te suivent.',
    },
    fifty_followers: {
      title: 'Cinquante abonnés',
      hint: 'Cinquante personnes te suivent.',
    },
    first_endorsement: {
      title: 'Première recommandation',
      hint: 'Un coach ou un club s’est porté garant pour toi.',
    },
    verified: {
      title: 'Vérifié',
      hint: 'Ton compte est vérifié, donc on sait que c’est bien toi.',
    },
    profile_complete: {
      title: 'Profil complet',
      hint: 'Note maximale sur la partie profil de ton Talent Score.',
    },
    tier_bronze: {
      title: 'Bronze',
      hint: 'Ton Talent Score a atteint 40.',
    },
    tier_silver: {
      title: 'Argent',
      hint: 'Ton Talent Score a atteint 55.',
    },
    tier_gold: {
      title: 'Or',
      hint: 'Ton Talent Score a atteint 70.',
    },
    tier_elite: {
      title: 'Élite',
      hint: 'Ton Talent Score a atteint 85.',
    },
    streak_3: {
      title: 'Trois jours',
      hint: 'Tu as ouvert AceAiX trois jours d’affilée.',
    },
    streak_7: {
      title: 'Une semaine entière',
      hint: 'Tu as ouvert AceAiX sept jours d’affilée.',
    },
    streak_30: {
      title: 'Trente jours',
      hint: 'Tu as ouvert AceAiX trente jours d’affilée.',
    },
  },
};
