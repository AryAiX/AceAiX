/**
 * Entdecken und Suche.
 *
 * Sortiert nach Bildschirmen: der Tab „Entdecken“ (zuerst die Recruiter-Sicht,
 * dann das Stöbern für Sportler), dann die Teile, die beide teilen — Gründe für
 * eine Übereinstimmung, Karten, Zeilen — und zuletzt die Suche.
 *
 * Zwei Dinge sollte man vorher wissen:
 *
 *  - `reason.*` spiegelt die Texte, die `private.match_reasons` in SQL erzeugt.
 *    Der englische Text gehört der Datenbank; diese Schlüssel sind nur, wie er
 *    vorgelesen wird.
 *  - `board.*` lesen Jugendliche, die schauen, wo sie stehen. Nichts hier sagt
 *    jemandem, dass er hinterherhinkt, und keine Übersetzung sollte das tun —
 *    die Rangliste nennt Plätze, die Leute schon haben, und zeigt nach vorn.
 */
export const discover = {
  // ── Tab „Entdecken“ ────────────────────────────────────────────────────────
  title: 'Talente entdecken',
  athleteSubtitle: 'Vereine, Trainer und wo du stehst',
  searchPeople: 'Leute und Vereine suchen',
  queryPlaceholder: 'Name, Verein, Position',
  queryLabel: 'Sportler suchen',
  filterResults: 'Treffer filtern',
  filterResultsActive: 'Treffer filtern, Filter aktiv',

  // Gemeinsame Namen für Tabs und Suchbereiche.
  tabAthletes: 'Sportler',
  tabCoaches: 'Trainer',
  tabClubs: 'Vereine',
  tabLeaderboard: 'Rangliste',

  // ── Für dich ausgewählt ────────────────────────────────────────────────────
  matchedForYou: 'Für dich ausgewählt',
  editBrief: 'Suchprofil ändern',
  noneFitBrief: 'Noch passt niemand zu deinem Suchprofil. Öffne es weiter, wir suchen weiter.',
  briefTitle: 'Sag uns, wen du suchst',
  briefBody:
    'Leg Sportart, Positionen und Altersspanne einmal fest. Danach zeigt jeder Sportler, wie gut er passt — und warum.',
  briefAction: 'Suchprofil festlegen',
  briefSaved: 'Gespeichert. Ab jetzt suchen wir danach.',

  // ── Trefferliste ───────────────────────────────────────────────────────────
  searching: 'Wird gesucht…',
  sortedByA11y: 'Sortiert nach {{sort}}. Sortierung ändern',
  rankedByFit: 'Nach Passung sortiert. Jede Karte zeigt die Gründe dafür.',
  rankedByScore: 'Nach Talent Score sortiert. Setz einen Filter, um zu sehen, wie gut jemand passt.',
  savedToShortlist: 'Auf deiner Merkliste',
  emptyTitle: 'Dazu passt niemand',
  emptyFilteredBody: 'Erweitere die Altersspanne, nimm ein Land dazu oder leere die Suche.',
  emptyOpenBody: 'Sportler erscheinen hier, sobald sie ihr Profil ausfüllen.',
  clearFilters: 'Filter leeren',

  // ── Sortierung ─────────────────────────────────────────────────────────────
  sortTitle: 'Treffer sortieren',
  sort: {
    match: 'Beste Passung',
    matchHint: 'Wie gut jeder Sportler zu deinen Filtern passt',
    score: 'Höchster Score',
    scoreHint: 'Talent Score, hoch nach niedrig',
    recent: 'Zuletzt aktiv',
    recentHint: 'Zuletzt aktualisierte Profile',
    name: 'Name',
    nameHint: 'A bis Z',
  },

  // ── Filter ─────────────────────────────────────────────────────────────────
  filters: {
    title: 'Treffer filtern',
    subtitle: 'Jeder Filter wird zu einem Grund hinter der Prozentzahl.',
    preferencesTitle: 'Wen suchst du?',
    preferencesSubtitle:
      'Danach wählen wir die Sportler unter „Für dich ausgewählt“ — und erklären jede Passung.',

    sport: 'Sportart',
    position: 'Position',
    positionHint: 'Wähle zuerst eine Sportart.',
    level: 'Niveau',
    country: 'Land',
    findCountry: 'Land finden',
    moreCountries_one: '{{count}} weiteres — tipp, um die Liste zu kürzen.',
    moreCountries_other: '{{count}} weitere — tipp, um die Liste zu kürzen.',
    noCountryMatch: 'Kein Land passt dazu.',

    age: 'Alter',
    anyAge: 'Jedes Alter',
    youngest: 'Jüngste',
    oldest: 'Älteste',
    any: 'Egal',

    minScore: 'Mindest-Talent-Score',
    anyScore: 'Jeder Score',
    tierAndAbove: '{{tier}} und höher',
    scoreFloor: 'Nur Sportler mit {{score}} oder mehr.',

    openOnly: 'Nur offen für Angebote',
    openOnlyA11y: 'Nur Sportler zeigen, die offen für Angebote sind',

    // Schrittregler. `name` ist einer der drei Werte darunter, damit eine
    // Vorlesehilfe „Jüngstes Alter erhöhen“ sagt.
    decrease: '{{name}} verringern',
    increase: '{{name}} erhöhen',
    youngestAgeName: 'jüngstes Alter',
    oldestAgeName: 'ältestes Alter',
    minScoreName: 'Mindest-Talent-Score',

    // Der Knopf verspricht eine echte Zahl, gezählt bevor man ihn antippt.
    showResults: 'Treffer anzeigen',
    noMatchesYet: 'Noch keine Treffer',
    showCount_one: '{{count}} Treffer anzeigen',
    showCount_other: '{{count}} Treffer anzeigen',
  },

  // ── Passungsabzeichen und die Gründe dahinter ──────────────────────────────
  matchPercentA11y: '{{percent}} Prozent Übereinstimmung',
  /** Spiegelt `private.match_reasons`. Siehe components/discover/MatchBadge.tsx. */
  reason: {
    sport: 'Spielt deine Sportart',
    position: 'Passt zur gesuchten Position',
    age: 'In deiner Altersspanne',
    level: 'Spielt auf dem Niveau, das du sichtest',
    country: 'In deiner Region',
    topTier: 'Talent Score der Spitzenstufe',
    strongScore: 'Starker Talent Score',
  },

  // ── Sportlerkarte ──────────────────────────────────────────────────────────
  card: {
    openProfile: 'Öffnet das Profil',
    scorePillA11y: 'Talent Score {{score}} von 100, Stufe {{tier}}',
    talentScoreA11y: 'Talent Score {{score}}',
    openToOffers: 'Offen für Angebote',
    save: '{{name}} auf die Merkliste setzen',
    unsave: '{{name}} von der Merkliste nehmen',
  },

  // ── Stöbern: die Sportlersicht von Entdecken ───────────────────────────────
  explore: {
    searchClubsPlaceholder: 'Vereine und Akademien suchen',
    searchClubsA11y: 'Vereine suchen',
    searchCoachesPlaceholder: 'Trainer suchen',
    searchCoachesA11y: 'Trainer suchen',
    anywhere: 'Überall',
    countryTitle: 'Land',
    countrySubtitle: 'Die Rangliste auf ein Land eingrenzen.',

    noClubsFound: 'Keine Vereine gefunden',
    noClubsFoundBody: 'Versuch einen kürzeren Namen oder such nach der Stadt.',
    noClubsYet: 'Noch keine Vereine',
    noClubsYetBody: 'Vereine erscheinen hier, sobald sie zu AceAiX kommen.',

    noCoachesFound: 'Keine Trainer gefunden',
    noCoachesFoundBody: 'Versuch einen Teil des Namens oder leere die Suche, um alle zu sehen.',
    noCoachesYet: 'Noch keine Trainer',
    noCoachesYetBody: 'Trainer erscheinen hier, sobald sie zu AceAiX kommen.',
  },

  // ── Rangliste ──────────────────────────────────────────────────────────────
  // In jeder Sprache aufbauend. Ein Platz ist etwas, das jemand hat, nie ein
  // Rückstand, und der Schluss richtet sich an alle, die noch klettern.
  board: {
    caption: 'Die höchsten Talent Scores — {{scope}}. Scores bewegen sich, wenn Profile wachsen.',
    everySport: 'alle Sportarten',
    scopeInCountry: '{{sport}}, {{country}}',
    keepBuilding: 'Jedes Highlight, jede Zahl und jede Prüfung bewegt deinen Score. Bau weiter.',
    emptyTitle: 'Auf dieser Rangliste steht noch nichts',
    emptyBody: 'Versuch eine andere Sportart oder ein anderes Land — oder sei die Erste hier.',
    you: 'Du',
    rankA11y: 'Nummer {{rank}}',
    youA11y: '{{name}}, das bist du',
    scoreA11y: 'Talent Score {{score}}, Stufe {{tier}}',
  },

  // ── Vereins- und Trainerzeilen ─────────────────────────────────────────────
  club: {
    /* `club` und `federation` kommen aus common; eine Akademie ist immer nur
       ein Organisationstyp und steht deshalb hier. */
    typeAcademy: 'Akademie',
    openClub: 'Öffnet die Vereinsseite',
  },
  followers_one: '{{value}} Follower',
  followers_other: '{{value}} Follower',
  followA11y: '{{name}} folgen',
  unfollowA11y: '{{name}} nicht mehr folgen',

  // ── Suchbildschirm ─────────────────────────────────────────────────────────
  search: {
    back: 'Zurück',
    fieldPlaceholder: 'Sportler, Trainer, Vereine',
    fieldA11y: 'AceAiX durchsuchen',
    recent: 'Zuletzt gesucht',
    clearRecentsA11y: 'Zuletzt gesuchtes leeren',
    trySport: 'Versuch eine Sportart',
    emptyTitle: 'Nichts zu „{{term}}“',
    emptyBody:
      'Nimm weniger Wörter oder such nach Verein, Stadt oder Position. Du kannst oben auch den Tab wechseln.',
    clearSearch: 'Suche leeren',
  },
};
