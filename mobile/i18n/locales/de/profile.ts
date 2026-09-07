/**
 * Profile — das eigene, das von anderen, die Tabs darunter, die Follower-
 * Listen und das Bearbeiten-Formular.
 *
 * Sortiert nach Bildschirmen. Alles, was auch anderswo vorkommt (Follower,
 * Beiträge, Clips, Spiele, Empfohlen, Folgen, Nachricht, Geprüft), kommt aus
 * `common` statt hier zu stehen.
 *
 * Zu gespeicherten Werten: Sportarten, Positionen, Klassen und starke Seite
 * liegen auf Englisch in der Datenbank und werden erst beim Anzeigen über
 * `constants/sports.ts` übersetzt. Ländernamen stehen so, wie sie getippt
 * wurden, und werden ebenfalls nicht übersetzt — siehe PRIORITY_COUNTRIES.
 */
export const profile = {
  // ── Fremdes Profil (app/u/[id].tsx) ────────────────────────────────────────
  title: 'Profil',
  thisPerson: 'Diese Person',

  notFoundTitle: 'Dieses Profil finden wir nicht',
  notFoundBody: 'Der Link, dem du gefolgt bist, zeigt auf niemanden bei AceAiX.',
  notFoundAction: 'Zurück',

  blockedTitle: 'Du kannst dieses Profil nicht sehen',
  blockedByYouBody: 'Du hast {{name}} blockiert. Heb die Blockierung auf, um das Profil zu sehen.',
  blockedBody: 'Dieses Profil ist für dich nicht sichtbar.',
  unblockedToast: 'Blockierung aufgehoben.',

  suspendedTitle: 'Dieses Konto ist nicht verfügbar',
  suspendedBody: 'Es ist gesperrt, während unser Team es prüft.',

  // ── Profilkopf (components/profile/ProfileHeader.tsx) ──────────────────────
  openToOffers: 'Offen für Angebote',
  followersA11y_one: '{{count}} Follower. Öffnet die Liste.',
  followersA11y_other: '{{count}} Follower. Öffnet die Liste.',
  followingA11y_one: 'Folgt {{count}} Person. Öffnet die Liste.',
  followingA11y_other: 'Folgt {{count}} Personen. Öffnet die Liste.',

  editProfile: 'Profil bearbeiten',
  settings: 'Einstellungen',
  moreOptions: 'Mehr Optionen',
  messageLimitedHint: 'Nachrichten sind bei diesem Konto begrenzt. Tipp an, um zu erfahren warum.',

  shareProfile: 'Profil teilen',
  /** Die URL wird nicht übersetzt, nur der Satz drumherum. */
  shareMessage: '{{name}} auf AceAiX — {{url}}',

  reportAccount: 'Dieses Konto melden',
  reportAccountSubtitle: 'Unser Team prüft jede Meldung',
  reportSheetSubtitle: 'Wähle den Grund, der am besten passt. Niemand erfährt, dass du gemeldet hast.',
  reportThanks: 'Danke. Unser Team sieht sich das an.',
  reportReason: {
    childSafety: 'Kinderschutz',
    childSafetyHint: 'Ein Kind ist in Gefahr oder wird gezielt angegangen',
    harassment: 'Mobbing oder Belästigung',
    harassmentHint: 'Beleidigungen gegen eine Person',
    hate: 'Hassrede',
    hateHint: 'Angriffe darauf, wer jemand ist',
    nudity: 'Nacktheit oder sexuelle Inhalte',
    nudityHint: 'Inhalte, die hier nichts zu suchen haben',
    violence: 'Gewalt oder Drohungen',
    violenceHint: 'Drohungen oder drastische Inhalte',
    impersonation: 'Gibt sich als jemand anderes aus',
    impersonationHint: 'Ein gefälschtes Konto',
    scam: 'Betrug',
    scamHint: 'Falsche Probetrainings, Gebühren oder Angebote',
    spam: 'Spam',
    spamHint: 'Ständige oder ungewollte Beiträge',
    other: 'Etwas anderes',
    otherHint: 'Sag es uns in eigenen Worten',
  },

  blockPerson: '{{name}} blockieren',
  blockPersonSubtitle: 'Die Person kann dich dann nicht finden und dir nicht schreiben',
  blockConfirmTitle: '{{name}} blockieren?',
  blockConfirmBody:
    '{{name}} kann dir dann nicht schreiben, dir nicht folgen und nicht sehen, was du postest. Du kannst das in den Einstellungen rückgängig machen.',
  blockedToast: '{{name}} sieht dich nicht mehr und kann dir nicht schreiben.',

  /** Klare Antworten auf „Warum kann ich dieser Person nicht schreiben?“. */
  messageBlockTitle: 'Du kannst diesem Konto nicht schreiben',
  messageBlockNote:
    'Diese Regeln schützen junge Sportlerinnen und Sportler. Sie kommen vom Sportler selbst, von seinen Eltern und von AceAiX.',
  messageBlock: {
    minorRequiresVerifiedSender:
      'Diese Person ist unter 18. Nur geprüfte Trainer und Vereine können ein Gespräch mit ihr beginnen.',
    minorRequiresGuardianConsent:
      'Die Eltern oder der Vormund dieser Person haben Nachrichten noch nicht freigegeben.',
    recipientMessagesOff: 'Diese Person hat Nachrichten abgeschaltet.',
    recipientOnlyAcceptsFollowed: 'Diese Person nimmt nur Nachrichten von Leuten an, denen sie folgt.',
    recipientOnlyAcceptsVerified: 'Diese Person nimmt nur Nachrichten von geprüften Konten an.',
    notPermitted: 'Du kannst mit diesem Konto gerade kein Gespräch beginnen.',
    notFound: 'Dieses Konto haben wir nicht gefunden.',
  },
  gotIt: 'Verstanden',

  // ── Statistikzeile (components/profile/StatRow.tsx) ────────────────────────
  statA11y: '{{value}} {{label}}',

  // ── Tabs (components/profile/ProfileTabs.tsx) ──────────────────────────────
  tabHighlights: 'Highlights',
  tabCareer: 'Laufbahn',

  // ── Beiträge (components/profile/PostsTab.tsx) ─────────────────────────────
  postsEmptyTitleSelf: 'Noch keine Beiträge',
  postsEmptyTitleOther: 'Noch nichts gepostet',
  postsEmptyBodySelf:
    'Teil ein Training, ein Ergebnis oder einen Clip. Aktive Profile werden öfter gesehen.',
  postsEmptyBodyOther: 'Sobald etwas gepostet wird, steht es hier.',
  postsEmptyAction: 'Beitrag schreiben',

  // ── Medienraster (components/profile/MediaGrid.tsx) ────────────────────────
  addHighlight: 'Highlight hinzufügen',
  videoClipA11y: 'Videoclip',
  photoA11y: 'Foto',

  // ── Highlights (components/profile/HighlightsTab.tsx) ──────────────────────
  photoPermission: 'AceAiX braucht die Erlaubnis, deine Fotos zu öffnen.',

  noHighlightsTitle: 'Hier gibt es keine Highlights',
  noHighlightsBody: 'Highlights gehören zu einem Sportlerprofil.',
  clipsEmptyTitleSelf: 'Trainer schauen, bevor sie lesen.',
  clipsEmptyTitleOther: 'Noch keine Clips',
  clipsEmptyBodySelf: 'Lade deinen ersten Clip hoch. Drei kurze sind genau richtig.',
  clipsEmptyBodyOther: 'Sobald ein Clip hochgeladen wird, steht er hier.',
  clipsEmptyAction: 'Ersten Clip hochladen',

  nameClipTitle: 'Gib dem Clip einen Namen',
  nameClipSubtitle: 'Ein kurzer Titel sagt einem Trainer, was er gleich sieht.',
  clipTitleLabel: 'Titel',
  clipTitlePlaceholderVideo: 'z. B. Abschluss links gegen Al Wasl',
  clipTitlePlaceholderPhoto: 'z. B. Pokalfinale',
  addToProfile: 'Zum Profil hinzufügen',
  clipAddedToast: 'Hinzugefügt. Trainer können das jetzt ansehen.',
  clipRemovedToast: 'Entfernt.',

  holdToRemoveClip: 'Halte einen Clip gedrückt, um ihn zu entfernen.',
  removeClipTitle: 'Diesen Clip entfernen?',
  removeClipBody: 'Er verschwindet von deinem Profil. Dein Talent Score kann dadurch sinken.',
  mediaLoadFailed: 'Diese Datei ließ sich nicht laden. Versuch es gleich noch einmal.',

  // ── Laufbahn (components/profile/CareerTab.tsx) ────────────────────────────
  noCareerTitle: 'Keine Laufbahn hinterlegt',
  noCareerBody: 'Dieser Bereich gehört zu Sportlerprofilen.',
  add: 'Hinzufügen',

  matchesEmptyTitleSelf: 'Keine Spiele eingetragen',
  matchesEmptyTitleOther: 'Noch keine Spiele',
  matchesEmptyBodySelf: 'Die letzten 12 Monate einzutragen zeigt einem Trainer deine Form.',
  matchesEmptyBodyOther: 'Hier wurde noch nichts eingetragen.',
  matchFallback: 'Spiel',
  matchVersus: 'gegen {{opponent}}',
  matchMinutes: '{{n}} Min.',
  matchGoals_one: '{{count}} Tor',
  matchGoals_other: '{{count}} Tore',
  matchAssists_one: '{{count}} Vorlage',
  matchAssists_other: '{{count}} Vorlagen',

  honoursTitle: 'Titel',
  honoursEmptyTitleSelf: 'Noch keine Titel',
  honoursEmptyTitleOther: 'Keine Titel eingetragen',
  honoursEmptyBodySelf: 'Meisterschaften, Pokale, Spieler der Saison — alles zählt, was du gewonnen hast.',

  certificatesTitle: 'Zertifikate',
  certificatesEmptyTitleSelf: 'Noch keine Zertifikate',
  certificatesEmptyTitleOther: 'Keine Zertifikate eingetragen',
  certificatesEmptyBodySelf: 'Trainerlizenzen, Erste Hilfe, Kinderschutz, Sprachzertifikate.',

  endorsementsTitle: 'Empfehlungen',
  endorsementsEmptyTitle: 'Noch keine Empfehlungen',
  endorsementsEmptyBodySelf:
    'Frag einen Trainer, der dein Spiel kennt. Eine von einem geprüften Trainer zählt viel.',

  logMatchTitle: 'Spiel eintragen',
  logMatchSubtitle: 'Nur das, woran du dich erinnerst — mehr geht später.',
  matchDate: 'Datum',
  matchDateHint: 'Jahr-Monat-Tag',
  matchCompetition: 'Wettbewerb',
  matchCompetitionPlaceholder: 'U16-Liga',
  matchOpponent: 'Gegner',
  matchOpponentPlaceholder: 'Al Nasr',
  matchResult: 'Ergebnis',
  matchResultPlaceholder: '3:1 gewonnen',
  matchMinutesLabel: 'Minuten',
  matchGoalsLabel: 'Tore',
  matchAssistsLabel: 'Vorlagen',
  saveMatch: 'Spiel speichern',
  matchDateInvalid: 'Nimm das Format JJJJ-MM-TT, zum Beispiel 2026-03-14.',
  matchAddedToast: 'Spiel eingetragen.',

  addHonourTitle: 'Titel hinzufügen',
  honourTitleLabel: 'Was hast du gewonnen?',
  honourTitlePlaceholder: 'Meister der U16-Liga',
  honourOrgLabel: 'Von wem',
  honourOrgPlaceholder: 'Dubai Youth League',
  honourYearLabel: 'Jahr',
  saveHonour: 'Titel speichern',
  honourTitleRequired: 'Gib dem Titel einen Namen.',
  honourAddedToast: 'Titel hinzugefügt.',

  addCertificateTitle: 'Zertifikat hinzufügen',
  certificateTitleLabel: 'Zertifikat',
  certificateTitlePlaceholder: 'Erste Hilfe',
  certificateIssuerLabel: 'Ausgestellt von',
  certificateIssuerPlaceholder: 'Roter Halbmond',
  certificateYearLabel: 'Jahr',
  saveCertificate: 'Zertifikat speichern',
  certificateTitleRequired: 'Gib dem Zertifikat einen Namen.',
  certificateAddedToast: 'Zertifikat hinzugefügt.',

  // ── Personenliste (components/profile/PeopleList.tsx) ──────────────────────
  searchThisList: 'In dieser Liste suchen',
  noMatchTitle: 'Dazu passt niemand',
  noMatchBody: 'Versuch einen anderen Namen.',
  openProfileA11y: 'Profil von {{name}} öffnen',

  // ── Follower und Folge ich (app/u/[id]/…) ──────────────────────────────────
  followersEmptyTitle: 'Noch keine Follower',
  followersEmptyBodySelf: 'Poste einen Clip oder ein Update. Leute folgen Sportlern, die sich zeigen.',
  followersEmptyBodyOther: 'Diesem Konto folgt noch niemand.',
  followingEmptyTitleSelf: 'Du folgst noch niemandem',
  followingEmptyTitleOther: 'Folgt noch niemandem',
  followingEmptyBodySelf: 'Folge Vereinen, Trainern und Sportlern, um deinen Feed zu füllen.',
  followingEmptyBodyOther: 'Dieses Konto folgt noch niemandem.',

  // ── Profil bearbeiten (app/edit-profile.tsx) ───────────────────────────────
  /* `editProfile` oben ist der Titel dieses Bildschirms und der Knopf dorthin. */
  firstNameRequired: 'Dein Vorname darf nicht leer sein.',
  savedScoreUp_one: 'Gespeichert — dein Talent Score ist um {{count}} Punkt gestiegen.',
  savedScoreUp_other: 'Gespeichert — dein Talent Score ist um {{count}} Punkte gestiegen.',
  savedScoreDown_one: 'Gespeichert — dein Talent Score ist um {{count}} Punkt gesunken.',
  savedScoreDown_other: 'Gespeichert — dein Talent Score ist um {{count}} Punkte gesunken.',

  sectionYou: 'Du',
  changePhotoA11y: 'Dein Profilfoto ändern',
  uploadingPhoto: 'Wird geladen…',
  tapToChangePhoto: 'Tipp an, um dein Foto zu ändern',
  addCover: 'Titelbild hinzufügen',
  changeCover: 'Titelbild ändern',
  uploadingCover: 'Titelbild wird hochgeladen…',
  removeCover: 'Titelbild entfernen',
  changeCoverA11y: 'Das Titelbild hinter deinem Profil ändern',
  viewPhotoA11y: 'Foto von {{name}} ansehen',
  firstName: 'Vorname',
  lastName: 'Nachname',
  bio: 'Über dich',
  bioPlaceholder: 'Auf welcher Position spielst du, und woran arbeitest du gerade?',
  bioCounter: '{{n}} / {{max}}',
  city: 'Stadt',
  cityPlaceholder: 'Dubai',
  country: 'Land',
  countryPlaceholder: 'Land wählen',
  countryA11y: 'Land. Aktuell {{value}}. Öffnet eine Auswahl.',
  notSet: 'nicht gesetzt',

  sectionSport: 'Deine Sportart',
  sport: 'Sportart',
  sportPlaceholder: 'Sportart wählen',
  sportA11y: 'Sportart. Aktuell {{value}}. Öffnet eine Auswahl.',
  position: 'Position',
  level: 'Niveau',
  levelHintDefault: 'Wähle das Niveau, auf dem du gerade spielst.',
  league: 'Liga oder Wettbewerb',
  leaguePlaceholder: 'Dubai Youth League',
  club: 'Aktueller Verein',
  clubPlaceholder: 'Al Nasr Academy',
  clubHint: 'Ein verknüpfter Verein hebt deine Glaubwürdigkeit.',

  sectionPhysical: 'Körperdaten',
  height: 'Größe',
  heightUnit: 'cm',
  weight: 'Gewicht',
  weightUnit: 'kg',
  dominantSide: 'Starke Seite',

  sectionAvailability: 'Verfügbarkeit',
  openToOffersHint: 'Trainer sehen das auf deinem Profil.',

  chooseSportTitle: 'Wähle deine Sportart',
  /** Das Emoji wird nicht übersetzt, nur die Reihenfolge von Zeichen und Name. */
  sportWithEmoji: '{{emoji}}  {{name}}',
  countrySheetTitle: 'Wo wohnst du?',
  searchCountries: 'Länder suchen',
  useTypedCountry: '„{{country}}“ nehmen',
  useTypedCountryHint: 'Nicht in der Liste? Trag es selbst ein.',
  countryTypeToAdd: 'Tipp los, um dein Land einzutragen.',

  // ── Die Spielerkarte ───────────────────────────────────────────────────────
  playerCard: 'Spielerkarte',
  playerCardHint: 'Eine Karte zum Speichern und Posten.',
  playerCardBody: 'Alles, worauf ein Scout zuerst schaut, in einem Bild.',
  playerCardSaved: 'Gespeichert.',
  playerCardShared: 'Karte ist bereit zum Teilen.',
  playerCardFailed: 'Die Karte ließ sich nicht erstellen. Versuch es gleich noch einmal.',
  playerCardShare: 'Teilen',
  playerCardSave: 'Bild speichern',
};
