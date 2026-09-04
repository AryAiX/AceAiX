/**
 * Chancen: die Übersicht der Probetrainings, eine Ausschreibung im Ganzen, die
 * Bewerbungsliste des Vereins, das Formular zum Ausschreiben und die
 * Vereinsseite, auf die eine Chance zeigt.
 *
 * Vier Dinge sollte man vorher wissen:
 *
 *  - `status.*` steht mit Absicht doppelt da. Derselbe gespeicherte Wert liest
 *    sich für zwei Menschen ganz anders: „abgelehnt“ ist auf der Liste eines
 *    Scouts eine Tatsache und auf dem Bildschirm einer Fünfzehnjährigen ein
 *    Satz. Übersetze beide Stimmen; wirf sie nie zusammen.
 *  - `match.reason.*` ist die Sportlersicht auf einen Grund, den die Datenbank
 *    auf Englisch liefert. Die englischen Ausgangstexte bleiben als Schlüssel
 *    im Code — siehe components/opportunities/MatchExplain.tsx.
 *  - `post.safetyBody` ist rechtlicher Text. Halte den Sinn genau — unter 18,
 *    ein Elternteil oder Vormund informiert, Ausschreibungen können entfernt
 *    werden — und lass `{{guidelines}}` dort, wo der Satz es braucht: dort
 *    hängt der Link zu den Community-Regeln.
 *  - Sportarten, Positionen, Klassen und Arten von Chancen liegen auf Englisch
 *    in der Datenbank und werden über `constants/sports.ts` übersetzt. Hier
 *    steht nichts davon noch einmal.
 */
export const opportunities = {
  // ── Tab „Chancen“ ───────────────────────────────────────────────────────────
  title: 'Chancen',
  athleteSubtitle: 'Probetrainings, Stipendien, Verträge, Camps',
  recruiterSubtitle: 'Deine Ausschreibungen und wer sich beworben hat',

  /** Jedes Lesezeichen hier sagt dasselbe: Übersicht, Ausschreibung, Verein. */
  savedToast: 'Gemerkt. Du findest es unter „Gemerkt“.',

  tabs: {
    open: 'Offen',
    saved: 'Gemerkt',
    applied: 'Beworben',
    postings: 'Meine Ausschreibungen',
    applicants: 'Bewerbungen',
  },

  /** Sportarten kommen aus `sports.allSports`; nur die Art gehört uns. */
  allTypes: 'Alles',

  athlete: {
    appliedOn: 'Beworben am {{date}}',

    openEmptyFilteredTitle: 'Zu diesen Filtern passt nichts',
    openEmptyFilteredBody: 'Leere sie, um alles zu sehen, was gerade offen ist.',
    clearFilters: 'Filter leeren',

    openEmptyTitle: 'In deiner Sportart ist noch nichts offen',
    openEmptyBody: 'Folge Vereinen, um es zuerst zu erfahren.',
    findClubs: 'Vereine finden',

    savedEmptyTitle: 'Noch nichts gemerkt',
    savedEmptyBody: 'Tipp auf das Lesezeichen bei allem, worauf du zurückkommen willst.',
    browseOpen: 'Ansehen, was offen ist',

    appliedEmptyTitle: 'Noch keine Bewerbungen',
    appliedEmptyBody: 'Wenn du dich bewirbst, verfolgst du hier jede Antwort.',
    seeWhatsOpen: 'Sieh, was offen ist',
  },

  recruiter: {
    active: 'Aktiv',
    closed: 'Beendet',
    /* Die beiden hier stehen mitten in einem Satz, deshalb klein. */
    activeA11y: 'aktiv',
    closedA11y: 'beendet',
    openPosting: 'Öffnet die Ausschreibung',
    reviewApplicants: 'Bewerbungen sichten',

    postingsEmptyTitle: 'Noch keine Ausschreibungen',
    postingsEmptyBody:
      'Schreib ein Probetraining, ein Stipendium oder ein Camp aus — passende Sportler sehen es zuerst.',

    allApplicants: 'Alle, die sich auf eine deiner Ausschreibungen beworben haben, beste Passung zuerst.',
    applicantsEmptyTitle: 'Noch keine Bewerbungen',
    applicantsEmptyBody: 'Sie erscheinen hier, sobald sich jemand bewirbt.',
  },

  // ── Chancenkarte ────────────────────────────────────────────────────────────
  card: {
    independent: 'Eigenständige Anzeige',
    open: 'Öffnet die Chance',
    /* Wird am Ende des Vorlesesatzes der Karte gesagt. */
    closedA11y: 'beendet',
    save: '{{title}} für später merken',
    unsave: '{{title}} nicht mehr merken',
  },

  // ── Wo eine Bewerbung steht ─────────────────────────────────────────────────
  status: {
    /** Was der Sportler liest, der sie geschickt hat. */
    athlete: {
      applied: 'Gesendet',
      in_review: 'Wird gelesen',
      shortlisted: 'Engere Wahl',
      invited: 'Einladung',
      rejected: 'Diesmal nicht',
      withdrawn: 'Zurückgezogen',
    },
    /** Was der Verein liest, der sie prüft. */
    recruiter: {
      applied: 'Neu',
      in_review: 'In Prüfung',
      shortlisted: 'Vorauswahl',
      invited: 'Eingeladen',
      rejected: 'Abgelehnt',
      withdrawn: 'Zurückgezogen',
    },
  },

  // ── Die Passung und die Gründe dahinter ─────────────────────────────────────
  match: {
    percentA11y: '{{percent}} Prozent Übereinstimmung',
    fitPercentA11y: '{{percent}} Prozent Passung',
    why: 'Warum das zu dir passt',
    /** Die Sportlersicht auf das, was `private.match_reasons` geliefert hat. */
    reason: {
      sport: 'Deine Sportart',
      position: 'Deine Position',
      region: 'In deiner Nähe',
      topTier: 'Dein Talent Score ist in der Spitzenstufe',
      strongScore: 'Starker Talent Score',
    },
  },

  // ── Bewerbungszeile ─────────────────────────────────────────────────────────
  applicant: {
    open: 'Öffnet die Bewerbung',
    talentScoreA11y: 'Talent Score {{score}}',
  },

  // ── Eine Chance im Ganzen ───────────────────────────────────────────────────
  detail: {
    title: 'Chance',
    more: 'Mehr Aktionen',
    /** Die Zeile über dem Link in einer geteilten Nachricht. */
    shareText: '{{title}} — {{club}}',
    shareClubFallback: 'auf AceAiX',

    missingTitle: 'Das finden wir nicht',
    missingBody: 'Der Link ist vielleicht kaputt oder veraltet.',
    goneTitle: 'Diese Chance ist weg',
    goneBody: 'Der Verein hat sie zurückgezogen, oder sie ist beendet. Es gibt reichlich mehr.',
    seeWhatsOpen: 'Sieh, was offen ist',

    save: 'Für später merken',
    unsave: 'Nicht mehr merken',

    reviewApplicants_one: '{{count}} Bewerbung sichten',
    reviewApplicants_other: '{{count}} Bewerbungen sichten',

    withdraw: 'Bewerbung zurückziehen',
    withdrawA11y: 'Diese Bewerbung zurückziehen',
    withdrawn: 'Zurückgezogen.',
    applicationsClosed: 'Bewerbung beendet',

    openClub: '{{club}} öffnen',
    viewClub: 'Verein ansehen',
    postedByMember: 'Von einem Mitglied eingestellt',
    closed: 'Beendet',

    about: 'Darum geht es',

    factType: 'Art',
    factSport: 'Sportart',
    factPosition: 'Position',
    factWhere: 'Wo',
    factDeadline: 'Frist',
    factPosted: 'Eingestellt',
    noDeadline: 'Keine Frist',

    /* Ein Probetraining ist ein echtes Treffen mit Fremden. Bleib klar. */
    safety:
      'Sag einem Elternteil, Vormund oder Trainer Bescheid, bevor du irgendwo persönlich hingehst. Niemand bei AceAiX darf dich um Geld bitten.',

    menuTitle: 'Diese Chance',
    reportHint: 'Sag uns, was nicht stimmt. Meldungen bleiben vertraulich.',
  },

  report: {
    title: 'Diese Ausschreibung melden',
    subtitle: 'Wähle den Grund, der am besten passt. Wir sagen nie, wer gemeldet hat.',
    thanks: 'Danke für den Hinweis. Unser Team sieht sich das an.',
    reason: {
      childSafety: 'Kinderschutz',
      childSafetyHint: 'Unsicher für unter 18-Jährige',
      scam: 'Betrug oder Bitte um Geld',
      impersonation: 'Gibt sich als echter Verein aus',
      misleading: 'Irreführend oder unwahr',
      spam: 'Spam',
      other: 'Etwas anderes',
    },
  },

  apply: {
    send: 'Bewerbung senden',
    sent: 'Gesendet. Dein Profil geht mit.',
    messageLabel: 'Deine Nachricht',
    messagePlaceholder: 'Sag, warum du gut passt — zwei, drei Zeilen reichen.',
    whatTheySee: 'Was sie sehen',
    seeProfile: 'Deinen Namen und dein Profil',
    seeScore: 'Deinen Talent Score',
    seeHighlights: 'Deine Highlights und Zahlen',
    seeMessage: 'Die Nachricht, die du oben schreibst',
    guardianNotice: 'Dein Elternteil oder Vormund kann sehen, wo du dich bewirbst.',
  },

  // ── Bewerbungen sichten ─────────────────────────────────────────────────────
  applicants: {
    title: 'Bewerbungen',
    /** Die Filterzeile nutzt die Recruiter-Namen; nur „alle“ gehört uns. */
    filterAll: 'Alle',
    /** Ein Filterchip: die Stufe, dann wie viele dort stehen. */
    filterChip: '{{label}} {{count}}',
    ranked: 'Sortiert danach, wie gut jeder Sportler zu dieser Ausschreibung passt.',

    missingTitle: 'Diese Ausschreibung finden wir nicht',
    missingBody: 'Der Link ist vielleicht kaputt oder veraltet.',
    backToOpportunities: 'Zurück zu den Chancen',

    lockedTitle: 'Du kannst diese Ausschreibung nicht sichten',
    lockedBody:
      'Nur der Verein oder Trainer, der sie eingestellt hat — und das Team dahinter — sehen die Bewerbungen.',

    emptyTitle: 'Noch hat sich niemand beworben',
    emptyBody: 'Passende Sportler sehen die Ausschreibung zuerst. Gib ihr ein, zwei Tage.',
    emptyStageTitle: 'Auf dieser Stufe steht niemand',
    emptyStageBody: 'Versuch einen anderen Filter.',
    showEveryone: 'Alle anzeigen',

    scoreLine: 'Talent Score {{score}}',
    noMessage: 'Es wurde keine Nachricht geschrieben.',
    viewProfile: 'Ganzes Profil ansehen',

    moveForward: 'Weiterbringen',
    shortlist: 'In die Vorauswahl',
    shortlistDone: 'In der Vorauswahl.',
    invite: 'Zum Probetraining einladen',
    inviteDone: 'Zum Probetraining eingeladen.',
    reject: 'Ablehnen',
    rejectDone: 'Als abgelehnt markiert.',

    notified: 'Wir sagen Bescheid — AceAiX übernimmt das für dich.',
  },

  // ── Eine Chance ausschreiben ────────────────────────────────────────────────
  post: {
    title: 'Chance ausschreiben',
    submit: 'Einstellen',
    posted: 'Eingestellt. Passende Sportler sehen es zuerst.',
    checkFields: 'Sieh dir die markierten Felder an.',

    titleLabel: 'Titel',
    titlePlaceholder: 'Probetraining Torwart U16',
    titleHint: 'Kurz und genau. Sportler lesen das zuerst.',
    titleError: 'Gib einen Titel, den Sportler wiedererkennen.',

    typeLabel: 'Worum geht es?',
    typeError: 'Wähle, worum es geht.',
    /** Wird als ein Satz vorgelesen: die Art, dann was sie bedeutet. */
    typeA11y: '{{label}}. {{hint}}',

    sportLabel: 'Sportart',
    sportError: 'Wähle die Sportart.',

    positionLabel: 'Position',
    positionHint: 'Lass es offen, wenn sich jede Position bewerben darf.',
    positionAny: 'Egal',

    whereLabel: 'Wo',
    wherePlaceholder: 'Dubai, VAE',
    whereError: 'Wo findet das statt?',

    deadlineLabel: 'Bewerbungsschluss',
    deadlineNone: 'Keine Frist',
    deadlineChoose: 'Datum für den Schluss wählen',
    deadlineChange: 'Bewerbungsschluss {{date}}. Datum ändern',
    deadlineClearA11y: 'Datum für den Schluss löschen',
    deadlineError: 'Wähle ein Datum in der Zukunft.',

    detailsLabel: 'Details',
    detailsPlaceholder: 'Was am Tag passiert, für wen es ist, was mitzubringen ist.',
    detailsError_one: 'Sag noch etwas mehr — mindestens {{count}} Zeichen.',
    detailsError_other: 'Sag noch etwas mehr — mindestens {{count}} Zeichen.',

    previewTitle: 'Was Sportler sehen',
    previewHint: 'Die Passung wird für jeden Sportler einzeln berechnet und steht deshalb nicht hier.',
    previewPlaceholder: 'Hier steht dein Titel',

    /* Rechtlicher Text. Jeder Teilsatz zählt — behalte alle drei. */
    safetyTitle: 'Bevor du einstellst',
    safetyBody:
      'Viele Sportlerinnen und Sportler bei AceAiX sind unter 18. Bei Probetrainings muss ein Elternteil oder Vormund informiert sein, und AceAiX kann Ausschreibungen entfernen, die unseren {{guidelines}} nicht folgen.',
    safetyLinkA11y: 'Die Community-Regeln lesen',
  },

  // ── Vereinsseite ────────────────────────────────────────────────────────────
  org: {
    missingTitle: 'Diesen Verein finden wir nicht',
    missingBody: 'Der Link ist vielleicht kaputt oder veraltet.',
    backToDiscover: 'Zurück zu Entdecken',
    goneTitle: 'Dieser Verein ist nicht bei AceAiX',
    goneBody: 'Vielleicht wurde er entfernt.',

    /* `club` und `federation` kommen aus common; eine Akademie ist immer nur
       ein Organisationstyp und steht deshalb hier. */
    typeAcademy: 'Akademie',

    /* `value` ist die für das Abzeichen gekürzte Zahl — „1,2 Tsd.“. */
    followers_one: '{{value}} Follower',
    followers_other: '{{value}} Follower',
    followA11y: '{{name}} folgen',
    unfollowA11y: '{{name}} nicht mehr folgen',

    tabAbout: 'Über uns',
    tabOpenings: 'Offene Plätze',
    tabOpeningsCount: 'Offene Plätze {{count}}',

    noIntro: 'Dieser Verein hat noch nichts über sich geschrieben.',
    factType: 'Art',
    factLeague: 'Liga',
    factBasedIn: 'Sitz in',

    unverified:
      'AceAiX hat diesen Verein noch nicht geprüft. Sieh nach, mit wem du sprichst, bevor du irgendwo hinfährst.',

    openingsEmptyTitle: 'Gerade ist nichts offen',
    openingsEmptyFollowing: 'Du folgst ihnen, also erfährst du es, sobald etwas offen ist.',
    openingsEmptyBody: 'Folge ihnen, um es zuerst zu erfahren, wenn etwas offen ist.',
  },
};
