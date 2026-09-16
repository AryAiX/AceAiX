/**
 * Der Talent Score — die Karte auf dem Profil und der Bildschirm dahinter.
 *
 * Zwei Dinge müssen die Übersetzung unverändert überstehen:
 *
 * 1. Die Gewichte der fünf Säulen. Sie sind Profil 15, Leistung 30, Medien 15,
 *    Glaubwürdigkeit 20, Aktivität 20 und entsprechen
 *    `private.compute_talent_score`. Eine Säule darf umformuliert, nie
 *    umnummeriert werden.
 * 2. Die Erklärung. Sie muss weiter sagen, dass der Score aus dem berechnet
 *    wird, was im Profil steht, dass prüfbare Angaben mehr zählen als selbst
 *    eingetippte, und dass die Zahl ein Profil misst, keinen Menschen. Keiner
 *    dieser drei Sätze ist Deko.
 *
 * Die Namen der Stufen stehen in `common` (tierRising … tierElite), weil sie
 * an mehreren Stellen gelesen werden.
 */
export const score = {
  // ── Score-Karte (components/profile/ScoreCard.tsx) ─────────────────────────
  cardEmptyBody: 'Dein Score erscheint, sobald Sportart und Position in deinem Profil stehen.',
  cardA11y: 'Talent Score {{score}} von 100, Stufe {{tier}}. Öffnet die volle Aufschlüsselung.',
  tierLine: 'Stufe {{tier}}',
  topPercent: 'Top {{percent}} % der Sportler in deiner Sportart',
  rankingBuilding: 'Deine Platzierung wächst, während du dein Profil füllst.',
  pointsUp_one: '+{{count}} Punkt',
  pointsUp_other: '+{{count}} Punkte',
  pointsDown_one: '-{{count}} Punkt',
  pointsDown_other: '-{{count}} Punkte',
  sinceLastTime: 'seit dem letzten Mal',

  // ── Talent-Score-Bildschirm (app/score.tsx) ────────────────────────────────
  howCalculated: 'So wird das berechnet',

  notReadyTitle: 'Dein Score ist noch nicht so weit',
  notReadyBody: 'Trag Sportart und Position ein, dann können wir deinen Talent Score berechnen.',
  notReadyAction: 'Profil fertig machen',

  deltaUpSince: '+{{count}} seit dem letzten Mal',
  deltaDownSince: '-{{count}} seit dem letzten Mal',

  curveTitle: 'Deine Kurve',
  historyLoading: 'Dein Verlauf wird geladen…',
  historyEmpty:
    'Dein Verlauf beginnt heute. Komm morgen wieder und sieh, wie sich die Linie bewegt.',
  sparklineA11y_one: 'Score-Verlauf über {{count}} Tag, von {{min}} bis {{max}}.',
  sparklineA11y_other: 'Score-Verlauf über {{count}} Tage, von {{min}} bis {{max}}.',
  sparklineA11yPlain: 'Score-Verlauf',
  sparklineLow: 'Tief {{value}}',
  sparklineHigh: 'Hoch {{value}}',

  pillarsTitle: 'Woraus dein Score besteht',
  tipsTitle: 'So kommst du höher',
  gotIt: 'Verstanden',

  // ── Die Erklärung (app/score.tsx) ──────────────────────────────────────────
  howIntro:
    'Dein Talent Score wird aus dem berechnet, was in deinem Profil steht — sonst nichts. Fünf Dinge zählen dafür:',
  howBulletProfile: 'Wie viel von deinem Profil du ausgefüllt hast.',
  howBulletPerformance: 'Die Spiele, Minuten und Zahlen, die du eingetragen hast.',
  howBulletMedia: 'Die Clips, die ein Trainer ansehen kann.',
  howBulletCredibility: 'Prüfung, dein Verein und Empfehlungen von Trainern.',
  howBulletEngagement: 'Wie aktiv du bist und wer sich dein Profil angesehen hat.',
  howVerified:
    'Angaben, die wir prüfen können, zählen mehr als Angaben, die du selbst eintippst. Ein geprüftes Konto, ein verknüpfter Verein und ein vom Verein bestätigtes Spiel sind mehr wert als dasselbe von Hand eingetragen.',
  howRecalculated:
    'Die Zahl wird von unseren Servern neu berechnet, sobald sich daran etwas ändert. Du kannst sie nicht bearbeiten, und niemand sonst kann es.',
  howNotYouTitle: 'Sie misst dein Profil, nicht dich.',
  howNotYouBody:
    'Ein niedriger Score heißt, dass noch etwas fehlt, nicht dass du schlechter spielst. Kein Trainer entscheidet allein nach dieser Zahl.',

  // ── Die fünf Säulen (components/profile/PillarList.tsx) ────────────────────
  /** Das Gewicht gehört der Datenbank — übersetze die Beschriftung, nicht die Zahl. */
  pillarWeight: '{{label}}  ·  {{weight}} %',
  pillarPerformance: 'Leistung',
  pillarPerformanceExplain: 'Spiele, Minuten und Zahlen, die du eingetragen hast',
  pillarCredibility: 'Glaubwürdigkeit',
  pillarCredibilityExplain: 'Prüfung, dein Verein und Empfehlungen',
  pillarEngagement: 'Aktivität',
  pillarEngagementExplain: 'Wie aktiv du bist und wer hinsieht',
  pillarProfile: 'Profil',
  pillarProfileExplain: 'Wie vollständig dein Profil ist',
  pillarMedia: 'Medien',
  pillarMediaExplain: 'Clips, die ein Trainer wirklich ansehen kann',

  // ── Tipps (components/profile/TipList.tsx) ─────────────────────────────────
  /**
   * Nur die Beschriftung des Knopfs gehört uns. Titel und Text des Tipps
   * kommen aus `private.build_score_tips` und sind englisch — siehe
   * TipList.tsx.
   */
  tipPoints: '+{{points}} Pkt.',
  tipOpen: 'Öffnen',
  tipAction: {
    addHighlights: 'Clip hochladen',
    completeProfile: 'Profil fertig machen',
    logMatches: 'Spiel eintragen',
    getVerified: 'Prüfen lassen',
    askEndorsement: 'Trainer finden',
    linkClub: 'Verein verknüpfen',
    postUpdate: 'Update posten',
  },
  tipsEmptyTitle: 'Nichts mehr auf der Liste',
  tipsEmptyBody:
    'Du hast alles getan, was wir gerade vorschlagen würden. Spiel weiter und poste weiter.',

  // ── Die Hochrechnung (app/score.tsx) ───────────────────────────────────────
  simTitle: 'Was wäre nötig?',
  simBody:
    'Zieh an einem Regler und sieh, wo die Zahl landen würde. Die Hochrechnung rechnet auf dem Server genau so wie dein echter Score, sie kann ihm also nicht heimlich widersprechen.',
  simProjected: 'Hochgerechnet',
  simNow: 'Jetzt',
  simNoChange: 'Verschieb etwas, um den Unterschied zu sehen.',
  simReset: 'Zurücksetzen',
  simUnlocksTier: 'Damit wärst du in {{tier}}.',
  simGain_one: '+{{count}} Punkt',
  simGain_other: '+{{count}} Punkte',
  simHonest:
    'Eine Hochrechnung, kein Versprechen — sie setzt voraus, dass die Arbeit echt ist und die Ergebnisse halten.',

  simVideos: 'Highlight-Clips',
  simMatches: 'Dieses Jahr eingetragene Spiele',
  simVerified: 'Davon bestätigt',
  simEndorsements: 'Empfehlungen',
  simExpert: 'Davon von Trainern oder Vereinen',
  simPosts: 'Beiträge diesen Monat',
  simFollowers: 'Follower',
  simProfile: 'Ausgefüllte Profilfelder',
  simAccountVerified: 'Konto geprüft',
  simClubLinked: 'Verein verknüpft',

  // ── Der geschriebene Blick (supabase/functions/talent-insights) ────────────
  insightTitle: 'So lesen wir dein Profil',
  insightLoading: 'Deine Zahlen werden durchgegangen…',
  insightUnavailable:
    'Die geschriebene Zusammenfassung ist gerade nicht verfügbar. Die Säulen unten sagen dasselbe in Zahlen.',
  insightRefresh: 'Noch einmal schreiben',
};
