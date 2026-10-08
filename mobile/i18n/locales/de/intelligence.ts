/**
 * Game Intelligence — sechs kurze Spiele auf Zeit, die zeigen, wie jemand das
 * Spiel liest.
 *
 * Regeln für den Ton, in jeder Sprache:
 *
 *   * Es sind **Spiele**, nie eine „Prüfung“, ein „Intelligenztest“ oder eine
 *     „Bewertung deiner Person“. Die Zielgruppe ist ab 13.
 *   * Nie klinisch: kein „Diagnose“, „Störung“, „Defizit“, „kognitive
 *     Fähigkeit“. Gemessen werden Tempo, Fokus und Entscheidungen in diesen
 *     Spielen, an diesem Tag — und genau das sagt der Text.
 *   * Eine niedrige Zahl ist nie ein Urteil. Die Fußnote auf dem
 *     Ergebnisbildschirm gibt dasselbe Versprechen wie der Talent Score.
 *
 * „Game Intelligence“ bleibt als Produktname auf Englisch, wie „Talent Score“.
 */
export const intelligence = {
  // ── Namen ──────────────────────────────────────────────────────────────────
  title: 'Game Intelligence',
  short: 'Game IQ',
  tagline: 'Wie schnell du das Spiel liest',

  // ── Die Profilkarte ────────────────────────────────────────────────────────
  cardCta: 'Spiel die sechs Spiele',
  cardCtaBody: 'Etwa 8 Minuten. Zeig Vereinen, wie du auf dem Platz denkst.',
  cardContinue: 'Spiele fertig machen',
  cardContinueBody: '{{done}} von 6 gespielt',
  cardTop: 'Top {{percent}} % deiner Altersgruppe',
  cardShared: 'Mit Vereinen geteilt',
  cardPrivate: 'Nur du siehst das',
  cardA11y: 'Game Intelligence {{score}} von 100',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'Sechs Spiele. Ein Bild davon, wie du spielst.',
  introBody:
    'Kurze Spiele, die zeigen, wie du den Platz siehst, unter Druck entscheidest und konzentriert bleibst. Trainern ist das genauso wichtig wie Tempo oder Technik.',
  introPoint1: 'Etwa 8 Minuten — du kannst zwischen den Spielen aufhören und später weitermachen',
  introPoint2: 'Deine Ergebnisse bleiben privat, bis du sie teilst',
  introPoint3: 'Zwei Versuche pro Spiel alle zwei Wochen. Dein bester zählt.',
  introStart: 'Los geht’s',
  introNotMedical: 'Das sind Spiele, keine medizinische oder psychologische Untersuchung.',

  // ── Zustimmung ─────────────────────────────────────────────────────────────
  consentTitle: 'Frag zuerst deine Eltern',
  consentBody:
    'Dort, wo du wohnst, braucht es für Spieler unter {{age}} die Zustimmung eines Elternteils oder Vormunds, bevor sie spielen. Wir schicken ihnen eine kurze E-Mail, die die Spiele erklärt.',
  consentPendingTitle: 'Warten auf deine Eltern',
  consentPendingBody:
    'Wir haben sie gefragt. In der E-Mail gibt es ein Kästchen „Game Intelligence“ – bitte sie, es anzuhaken, dann werden die Spiele hier freigeschaltet.',
  consentAction: 'Eltern fragen',
  consentAgeUnknownTitle: 'Trag dein Geburtsdatum ein',
  consentAgeUnknownBody: 'Wir brauchen es, um zu wissen, ob zuerst ein Elternteil zustimmen muss.',
  consentAgeUnknownAction: 'Profil bearbeiten',
  notAthleteTitle: 'Für Sportler',
  notAthleteBody: 'Game Intelligence gehört zum Sportlerprofil. Ergebnisse, die Sportler mit dir teilen, siehst du auf ihrem Profil.',
  suspendedBody: 'Das ist nicht verfügbar, solange dein Konto geprüft wird.',

  // ── Bereit machen ──────────────────────────────────────────────────────────
  readyTitle: 'Mach dich bereit',
  readyBody: 'Dein Ergebnis ist nur so gut wie der Moment, in dem du spielst.',
  readyQuiet: 'Irgendwo ruhig, im Sitzen oder ruhig im Stehen',
  readyNotifications: 'Mitteilungen aus, damit mitten im Spiel nichts aufpoppt',
  readyBattery: 'Genug Akku, und das Handy in der Hand halten',
  readyFatigue: 'Wie fit fühlst du dich gerade?',
  fatigue1: 'Topfit',
  fatigue2: 'Gut',
  fatigue3: 'Okay',
  fatigue4: 'Müde',
  fatigue5: 'Platt',
  readyTiredHint: 'Du kannst spielen, aber dein Ergebnis fällt vielleicht niedriger aus als sonst. Später wäre eventuell besser.',
  readyContinue: 'Bin bereit',

  // ── Aufwärmen ──────────────────────────────────────────────────────────────
  warmupTitle: 'Aufwärmen',
  warmupBody: 'Tipp auf den Kreis, sobald er grün wird. Fünfmal. So werden die Spiele auf dein Handy abgestimmt.',
  warmupWait: 'Warte auf Grün…',
  warmupTap: 'Tipp!',
  warmupEarly: 'Zu früh — warte auf Grün',
  warmupDone: 'Aufwärmen fertig',

  // ── Übersicht ──────────────────────────────────────────────────────────────
  hubTitle: 'Deine Spiele',
  hubBody: 'Spiel in beliebiger Reihenfolge. Die Fußballspiele zählen am meisten.',
  hubPlayed: 'Gespielt',
  hubRetry: 'Nochmal nötig',
  hubNoAttempts: 'Nächster Versuch in ein paar Tagen',
  hubCountsMost: 'Zählt am meisten',
  hubMinutes: '~{{n}} Min.',
  hubSeconds: '~{{n}} Sek.',
  hubFinish: 'Meine Ergebnisse',
  hubFinishNeeds: 'Spiele bis zu deinem Ergebnis: {{count}}',
  hubPause: 'Pause machen',
  hubPauseBody: 'Dein Fortschritt wird 24 Stunden lang gespeichert.',

  // ── Ein Spiel ──────────────────────────────────────────────────────────────
  practice: 'Probe',
  practiceBody: 'Ein paar Runden, die nicht zählen.',
  practiceDone: 'Stark. Jetzt geht’s richtig los.',
  startScored: 'Los geht’s',
  getReady: 'Mach dich bereit',
  round: 'Runde {{n}} von {{total}}',
  scoredLabel: 'Zählt',
  submitting: 'Wird gespeichert…',
  gameDone: 'Fertig!',
  gameScore: '{{score}} / 100',
  gameInvalid: 'Diese Runde hat nicht gezählt',
  gameInvalidBody: 'Irgendwas hat nicht gepasst — vielleicht warst du abgelenkt. Du kannst es später nochmal versuchen.',
  gameIncomplete: 'Zu wenige Tipps für eine Wertung',
  gameIncompleteBody: 'Kein Versuch wurde verbraucht. Probier es nochmal, wenn du bereit bist.',
  backToHub: 'Zurück zu den Spielen',
  tryAgain: 'Nochmal',
  interrupted: 'Spiel pausiert',
  interruptedBody: 'Du hast die App verlassen, deshalb wurde diese Runde abgebrochen. Kein Versuch wurde verbraucht.',
  timeUp: 'Zeit!',
  countdownGo: 'LOS!',
  howTitle: 'So geht’s',
  hubNext: 'Als Nächstes',
  medalKeepGoing: 'Weiter so',
  medalBronze: 'Bronze',
  medalSilver: 'Silber',
  medalGold: 'Gold',
  feedbackKeepGoing: 'Jede Runde trainiert deinen Blick — kurz durchatmen, dann liest du es beim nächsten Mal schneller.',
  feedbackBronze: 'Solide Runde. Ein bisschen mehr Fokus am Anfang, und Silber ist drin.',
  feedbackSilver: 'Stark! Du hast das schneller gelesen als die meisten — Gold ist nah.',
  feedbackGold: 'Überragend — so lesen die Besten das Spiel.',

  tests: {
    pitchDecision: {
      name: 'Spielzug-Entscheidung',
      what: 'Entscheidungen',
      how: 'Schau dir den Spielzug an. Wenn er stoppt, hast du 3 Sekunden: Tipp auf einen Mitspieler zum Passen oder wähl Schießen oder Dribbeln.',
      you: 'Du',
      shoot: 'Schießen',
      dribble: 'Dribbeln',
      pass: 'Tipp auf einen Mitspieler zum Passen',
      step1: 'Schau dir den Spielzug an',
      step2: 'Er stoppt — du hast 3 Sekunden',
      step3: 'Tipp auf einen Mitspieler, oder Schießen oder Dribbeln',
    },
    anticipation: {
      name: 'Lies den Ball',
      what: 'Antizipation',
      how: 'Der Ball fliegt aufs Tor und verschwindet dann. Tipp auf die Stelle der Torlinie, an der er sie überquert.',
      tapLine: 'Tipp, wo er drüber geht',
      step1: 'Folge der Flugkurve des Balls',
      step2: 'Vor dem Tor verschwindet er',
      step3: 'Tipp auf die Torlinie, wo er sie überquert',
      spotOn: 'Volltreffer!',
      close: 'Knapp',
      missed: 'Daneben',
      keyTrue: 'Wo er drüber ging',
      keyGuess: 'Dein Tipp',
    },
    tracking: {
      name: 'Behalt die Läufer',
      what: 'Übersicht',
      how: 'Ein paar Bälle blinken auf. Behalt sie im Blick, während sich alle Bälle bewegen. Dann tipp auf die, denen du gefolgt bist.',
      watch: 'Merk dir diese',
      follow: 'Folge ihnen…',
      pick: 'Tipp auf die, denen du gefolgt bist · {{found}}/{{count}}',
      level: 'Stufe {{n}}',
      step1: 'Merk dir die Trikots, die aufleuchten',
      step2: 'Folge ihnen, während alle laufen',
      step3: 'Tipp auf die, denen du gefolgt bist',
      found: '{{found}} von {{count}} gefunden',
    },
    goNoGo: {
      name: 'Los / Stopp',
      what: 'Selbstkontrolle',
      how: 'Tipp so schnell du kannst, wenn ein grüner Ball erscheint. Kommt ein rotes STOPP-Schild, tipp nicht.',
      go: 'Grün: tippen',
      stop: 'Rot: nicht',
      step1: 'Grüner Ball: tipp so schnell du kannst',
      step2: 'Rotes STOPP-Schild: nicht tippen',
      step3: 'Richtig schlägt schnell',
      stopSign: 'STOPP',
    },
    flanker: {
      name: 'Fokus-Pfeile',
      what: 'Fokus',
      how: 'In welche Richtung zeigt der mittlere Pfeil? Ignorier die anderen.',
      left: 'Links',
      right: 'Rechts',
      step1: 'Schau nur auf den mittleren Pfeil',
      step2: 'Tipp in die Richtung, in die er zeigt',
      step3: 'Ignorier die Pfeile drumherum',
    },
    reaction: {
      name: 'Schnelle Hände',
      what: 'Reaktionstempo',
      how: 'Eine Ecke des Tors leuchtet auf. Tipp so schnell du kannst drauf.',
      step1: 'Eine Ecke des Tors leuchtet auf',
      step2: 'Tipp so schnell du kannst auf diese Ecke',
      step3: 'Nicht raten — warte aufs Licht',
      tapCorner: 'Tipp auf die Ecke, die aufleuchtet',
    },
  },

  // ── Ergebnisse ─────────────────────────────────────────────────────────────
  resultsTitle: 'Deine Game Intelligence',
  analyzing: 'Deine Ergebnisse werden zusammengestellt…',
  resultsNotEnough: 'Spiel mindestens vier Spiele, um dein Gesamtergebnis zu bekommen.',
  confidence: 'Aussagekraft',
  confidenceLow: 'Niedrig',
  confidenceMedium: 'Mittel',
  confidenceHigh: 'Hoch',
  confidenceHint: 'Spiel alle sechs Spiele ausgeruht, dann ist die Aussagekraft hoch.',
  strengths: 'Deine Stärken',
  workOn: 'Daran kannst du arbeiten',
  tipsTitle: 'Probier das',
  tip: {
    pitch_decision: 'Bevor der Ball bei dir ist, schau kurz über beide Schultern. Kenn deinen Pass, bevor du ihn brauchst.',
    anticipation: 'Beobachte den Ball früh im Flug — der Anfang der Kurve verrät dir, wo er hingeht.',
    tracking: 'Lass den Blick weich werden und achte auf die Räume zwischen den Spielern, nicht auf einen Spieler nach dem anderen.',
    go_no_go: 'Bleib bereit, aber lass die Farbe entscheiden. Tempo zählt weniger als die richtige Wahl.',
    flanker: 'Halt die Augen auf die Mitte. Was drumherum passiert, ist nur Rauschen.',
    reaction: 'Lockere deine Hand vor jeder Runde — Anspannung macht dich langsamer.',
  },
  history: 'Dein Fortschritt',
  nextRetest: 'Nächste komplette Runde: {{date}}',
  footnote:
    'Diese Spiele zeigen, wie du sie heute gespielt hast — Tempo, Fokus und Entscheidungen — nicht, wer du bist oder wie gut du mal wirst. Mit Übung, Schlaf und Alter steigen die Werte. Kein Trainer entscheidet etwas allein wegen dieser Zahl.',
  notInTalentScore: 'Wird neben deinem Talent Score angezeigt, nicht dazugerechnet — vorerst.',

  // ── Teilen ─────────────────────────────────────────────────────────────────
  shareTitle: 'Wer das sehen kann',
  shareClubs: 'Mit Trainern und Vereinen teilen',
  shareClubsBody: 'Trainer, Scouts und Vereine, die dein Profil ansehen, sehen dein Gesamtergebnis und jedes einzelne Spiel.',
  shareBadge: 'Abzeichen auf meinem Profil zeigen',
  shareBadgeBody: 'Andere Spieler sehen nur dein Gesamtergebnis. Teilen muss dafür an sein.',
  shareMinorNote: 'Vereine sehen dein Profil erst, wenn deine Eltern zugestimmt haben.',
  shareSaved: 'Gespeichert',

  // ── Auf dem Profil von jemand anderem ──────────────────────────────────────
  theirTitle: 'Game Intelligence',
  theirTop: 'Top {{percent}} % der Altersgruppe',
  theirTests: '{{n}} von 6 Spielen',
  theirPlayed: 'Gespielt am {{date}}',
  theirConfidence: 'Aussagekraft: {{level}}',

  // ── Zustimmung der Eltern (Einstellungen → Elternteil) ─────────────────────
  scopeAssessments: 'Darf die Game-Intelligence-Spiele spielen',
  scopeAssessmentsOff: 'Game-Intelligence-Spiele nicht freigegeben',
  addAssessments: 'Game Intelligence anfragen',
  addAssessmentsHint:
    'Deine Eltern haben dein Profil freigegeben, aber nicht die Spiele. Wir schicken ihnen einen neuen Link — dort müssen sie „Game Intelligence“ ankreuzen.',
  addAssessmentsSent: 'Anfrage an {{email}} gesendet. Die Spiele werden freigeschaltet, sobald zugestimmt wurde.',
};
