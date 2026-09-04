/**
 * Serien und Erfolge.
 *
 * `streakNoPressure` ist der wichtigste Satz dieser Datei: Er sagt ausdrücklich,
 * dass ein verpasster Tag nichts kostet außer der laufenden Serie. Bitte niemals
 * zu einer Warnung umformulieren.
 */
export const progress = {
  title: 'Erfolge',
  subtitle: 'Alles hier kommt von etwas, das du wirklich getan hast.',
  earnedOf: '{{earned}} von {{total}}',
  unlockedOn: 'Erhalten am {{date}}',
  tileEarnedA11y: '{{title}}. Erhalten am {{date}}. {{hint}}',
  tileLockedA11y: '{{title}}. Noch nicht erhalten. {{hint}}',

  groupStart: 'Erste Schritte',
  groupSeen: 'Gesehen werden',
  groupScore: 'Dein Score',
  groupStreak: 'Dabei sein',

  rarityCommon: 'Häufig',
  rarityRare: 'Selten',
  rarityEpic: 'Herausragend',

  days_one: '{{count}} Tag',
  days_other: '{{count}} Tage',

  streakChipA11y: 'Serie: {{days}}',
  streakChipHint: 'Zeigt, was eine Serie ist, und die letzten sieben Tage',
  streakSheetTitle: 'Deine Serie',
  streakWhat:
    'Eine Serie zählt die Tage in Folge, an denen du AceAiX geöffnet hast. Mehr ist es nicht — einfach da sein. Sie hängt nicht am Posten und ändert deinen Talent Score nie.',
  streakNoPressure:
    'Verpasst du einen Tag, geht nichts verloren außer der laufenden Serie. Deine längste Serie bleibt, dein Score bleibt, und gezählt wird wieder ab dem nächsten Mal, wenn du vorbeischaust.',
  streakNoneTitle: 'Noch keine Serie',
  streakNoneBody:
    'Sie beginnt an dem Tag, an dem du die App zum ersten Mal öffnest. Anmelden musst du dich für nichts.',

  calendarTitle: 'Letzte 7 Tage',
  calendarA11y: 'Die letzten sieben Tage. An {{count}} davon warst du hier.',
  streakCurrent: 'Aktuell',
  streakLongest: 'Längste',
  streakTotal: 'Tage hier',

  gotIt: 'Alles klar',

  nextTierTitle: 'Nächste Stufe',
  pointsToNext_one: 'Noch {{count}} Punkt bis {{tier}}',
  pointsToNext_other: 'Noch {{count}} Punkte bis {{tier}}',
  tierStartsAt: '{{tier}} beginnt bei {{score}}',
  tierTopTitle: 'Höchste Stufe',
  tierTopBody: 'Über Elite gibt es nichts mehr. Halte dein Profil aktuell, dann bleibt sie dir.',
  tierTopA11y: 'Stufe Elite, Talent Score {{score}}. Das ist die höchste Stufe.',
  scoreNotReadyTitle: 'Noch kein Talent Score',
  scoreNotReadyBody: 'Trag deine Sportart und Position ein, dann erscheint dein Score.',

  celebrateAchievementEyebrow: 'Erfolg erhalten',
  celebrateTierEyebrow: 'Neue Stufe',
  celebrateStreakEyebrow: 'Serie',
  celebrateTierBody: 'Dein Talent Score hat {{score}} erreicht.',
  celebrateStreakBody: 'Du bist immer wieder da. Das ist ehrlich gesagt der schwierige Teil.',
  streakMilestone_one: '{{count}} Tag in Folge',
  streakMilestone_other: '{{count}} Tage in Folge',
  andMore_one: 'und {{count}} weiterer auf deiner Wand',
  andMore_other: 'und {{count}} weitere auf deiner Wand',
  celebrateNice: 'Stark',
  celebrateNext: 'Weiter',
  celebrateShare: 'Teilen',
  shareTierMessage: 'Ich habe auf AceAiX die Stufe {{tier}} erreicht — Talent Score {{score}}.',

  achievements: {
    first_post: {
      title: 'Erster Beitrag',
      hint: 'Du hast zum ersten Mal etwas gepostet.',
    },
    first_clip: {
      title: 'Erster Clip',
      hint: 'Du hast dein erstes Video zu deinen Highlights hinzugefügt.',
    },
    three_clips: {
      title: 'Drei Clips',
      hint: 'Drei Videos in deinen Highlights. Das ist ein Reel, das ein Scout ansehen kann.',
    },
    first_match: {
      title: 'Erstes Spiel',
      hint: 'Du hast dein erstes Spiel eingetragen.',
    },
    ten_matches: {
      title: 'Zehn Spiele',
      hint: 'Zehn Spiele in deiner Bilanz.',
    },
    first_application: {
      title: 'Erste Bewerbung',
      hint: 'Du hast dich zum ersten Mal auf ein Probetraining oder eine Chance beworben.',
    },
    first_follower: {
      title: 'Erster Follower',
      hint: 'Jemand folgt dir.',
    },
    ten_followers: {
      title: 'Zehn Follower',
      hint: 'Zehn Menschen folgen dir.',
    },
    fifty_followers: {
      title: 'Fünfzig Follower',
      hint: 'Fünfzig Menschen folgen dir.',
    },
    first_endorsement: {
      title: 'Erste Empfehlung',
      hint: 'Ein Trainer oder Verein hat sich für dich verbürgt.',
    },
    verified: {
      title: 'Verifiziert',
      hint: 'Dein Konto ist verifiziert, damit klar ist, dass du du bist.',
    },
    profile_complete: {
      title: 'Profil vollständig',
      hint: 'Volle Punktzahl im Profilteil deines Talent Scores.',
    },
    tier_bronze: {
      title: 'Bronze',
      hint: 'Dein Talent Score hat 40 erreicht.',
    },
    tier_silver: {
      title: 'Silber',
      hint: 'Dein Talent Score hat 55 erreicht.',
    },
    tier_gold: {
      title: 'Gold',
      hint: 'Dein Talent Score hat 70 erreicht.',
    },
    tier_elite: {
      title: 'Elite',
      hint: 'Dein Talent Score hat 85 erreicht.',
    },
    streak_3: {
      title: 'Drei Tage',
      hint: 'Du hast AceAiX an drei Tagen in Folge geöffnet.',
    },
    streak_7: {
      title: 'Eine ganze Woche',
      hint: 'Du hast AceAiX an sieben Tagen in Folge geöffnet.',
    },
    streak_30: {
      title: 'Dreißig Tage',
      hint: 'Du hast AceAiX an dreißig Tagen in Folge geöffnet.',
    },
  },
};
