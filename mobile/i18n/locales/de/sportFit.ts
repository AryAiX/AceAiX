/**
 * Sport Fit — ein kurzer Fragebogen zur Einstellung und die Sportarten, zu
 * denen er passt.
 *
 * Regeln für den Ton, in jeder Sprache:
 *
 *   * Ein Vorschlag zum Ausprobieren, nie ein Urteil. Nie „du solltest
 *     aufhören“, „du bist nicht gemacht für“, „deine Persönlichkeit“. Wer
 *     spielt, spielt weiter, was er liebt; das hier öffnet nur Türen.
 *   * Nie klinisch: kein „psychologischer Test“, „Diagnose“,
 *     „Persönlichkeitstyp“, „Störung“. Es ist ein Fragebogen darüber, wie du
 *     trainierst und wie du dich im Spiel fühlst.
 *   * Die Aussagen stehen in der Ich-Form, sind einfach und für 13-Jährige
 *     verständlich. Umgekehrt formulierte Aussagen bleiben umgekehrt
 *     formuliert (die Auswertung hängt davon ab). Die Übersetzungen von
 *     `item.*` muss vor dem Start eine Sportpsychologin oder ein
 *     Sportpsychologe mit Deutsch als Muttersprache prüfen (docs/31 §6).
 *
 * „Sport Fit“ und „Game Intelligence“ bleiben als Produktnamen auf Englisch.
 */
export const sportFit = {
  // ── Namen ──────────────────────────────────────────────────────────────────
  title: 'Sport Fit',
  tagline: 'Welche Sportarten zu deiner Denkweise passen',

  // ── Die Profilkarte ────────────────────────────────────────────────────────
  cardCta: 'Finde die Sportarten, die zu dir passen',
  cardCtaBody: '22 kurze Aussagen, etwa 4 Minuten. Nur für dich.',
  cardResult: 'Passt am besten: {{sport}}',
  cardResultBody: 'Danach {{second}} und {{third}}',
  cardPrivate: 'Nur du siehst das',

  // ── Intro ──────────────────────────────────────────────────────────────────
  introTitle: 'Wie du denkst, zeigt, wo du glänzen kannst',
  introBody:
    'Erzähl uns, wie du trainierst und wie du dich im Spiel fühlst. Wir vergleichen deine Antworten damit, worauf es im Kopf bei zwölf Sportarten ankommt, und zeigen dir die drei, die am besten zu dir passen – und warum.',
  introPoint1: '22 Aussagen, etwa 4 Minuten. Es gibt keine richtigen oder falschen Antworten.',
  introPoint2: 'Privat: Vereine und Scouts sehen weder deine Antworten noch dein Ergebnis.',
  introPoint3: 'Wenn du Game Intelligence gespielt hast, zählt auch, wie du das Spiel liest.',
  introStart: 'Los geht’s',
  introNotMedical: 'Das ist ein Fragebogen, keine medizinische oder psychologische Untersuchung.',
  introGiHint: 'Spiel zuerst Game Intelligence, dann wird dein Ergebnis genauer.',
  introGiAction: 'Zu den Spielen',

  // ── Zustimmung ─────────────────────────────────────────────────────────────
  consentTitle: 'Frag zuerst deine Eltern',
  consentBody:
    'Dort, wo du wohnst, braucht es für Spieler unter {{age}} die Zustimmung eines Elternteils oder Vormunds, bevor sie antworten. Wir schicken ihnen eine kurze E-Mail, die Sport Fit erklärt.',
  consentPendingTitle: 'Warten auf deine Eltern',
  consentPendingBody:
    'Wir haben sie gefragt. In der E-Mail gibt es ein Kästchen „Sport Fit“ – bitte sie, es anzuhaken, dann wird der Fragebogen hier freigeschaltet.',
  consentAction: 'Eltern fragen',
  consentAgeUnknownTitle: 'Trag dein Geburtsdatum ein',
  consentAgeUnknownBody: 'Wir brauchen es, um zu wissen, ob zuerst ein Elternteil zustimmen muss.',
  consentAgeUnknownAction: 'Profil bearbeiten',
  notAthleteTitle: 'Für Sportler',
  notAthleteBody: 'Sport Fit gehört zum Sportlerprofil.',
  suspendedBody: 'Das ist nicht verfügbar, solange dein Konto geprüft wird.',

  // ── Fragen ─────────────────────────────────────────────────────────────────
  questionsTitle: 'Sport Fit',
  progress: '{{n}} von {{total}}',
  questionHint: 'Wie sehr trifft das auf dich zu?',
  answer1: 'Stimme gar nicht zu',
  answer2: 'Stimme nicht zu',
  answer3: 'Weiß nicht',
  answer4: 'Stimme zu',
  answer5: 'Stimme voll zu',
  back: 'Zurück',
  submitting: 'Deine Sportarten werden gesucht…',
  leaveTitle: 'Hier aufhören?',
  leaveBody: 'Deine bisherigen Antworten werden nicht gespeichert.',
  leaveConfirm: 'Aufhören',
  leaveCancel: 'Weitermachen',

  item: {
    drive1: 'Ich trainiere auch, wenn niemand kontrolliert, ob ich es mache.',
    drive2: 'Ich mache meinen Sport vor allem, weil ich es liebe, darin besser zu werden.',
    drive3: 'Nach ein paar Wochen verliere ich oft die Lust am Training.',
    composure1: 'In den wichtigen Momenten eines Spiels kann ich ruhig bleiben.',
    composure2: 'Wenn ich vor einem Wettkampf nervös bin, spiele ich oft schlechter.',
    composure3: 'Wenn es knapp steht, will ich den Ball oder den nächsten Punkt.',
    team1: 'Ein Sieg fühlt sich besser an, wenn ich ihn mit meinem Team teile.',
    team2: 'Ich bin lieber allein für mein Ergebnis verantwortlich.',
    team3: 'Ich mag es, wenn sich mein Team auf mich verlässt und ich mich auf mein Team.',
    focus1: 'Ich kann mich lange auf eine einzige Aufgabe konzentrieren.',
    focus2: 'Lärm von den Fans oder anderen Spielern lenkt mich leicht ab.',
    focus3: 'Ich kann ein ganzes Training lang an einem kleinen Detail arbeiten.',
    boldness1: 'Ich mag Zweikämpfe gegen einen Gegner.',
    boldness2: 'Körperkontakt im Spiel schreckt mich nicht ab.',
    boldness3: 'Ich mache lieber Sachen, bei denen ich mich kaum verletzen kann.',
    resilience1: 'Nach einem Fehler konzentriere ich mich schnell auf die nächste Aktion.',
    resilience2: 'Nach einer Niederlage will ich noch härter trainieren.',
    resilience3: 'Wenn mich ein Trainer kritisiert, denke ich noch tagelang darüber nach.',
    discipline1: 'Ich halte mich gern an einen festen Trainingsablauf.',
    discipline2: 'Ich kann dieselbe Übung oft wiederholen, bis sie richtig klappt.',
    discipline3: 'Mir wird schnell langweilig, wenn sich das Training ständig wiederholt.',
    check1: 'Damit wir sehen, dass du genau liest: Wähl hier „Stimme zu“.',
  },

  // ── Nicht auswertbar: nochmal ──────────────────────────────────────────────
  retryTitle: 'Lass es uns nochmal versuchen',
  retryTooFast: 'Das ging sehr schnell. Nimm dir für jede Aussage einen Moment Zeit, damit das Ergebnis etwas aussagt.',
  retryCheck: 'Bei einer Aussage solltest du „Stimme zu“ wählen. Lies jede Aussage genau und versuch es nochmal.',
  retryStraight: 'Du hast überall dasselbe geantwortet. Denk über jede Aussage einzeln nach und versuch es nochmal.',
  retryAction: 'Neu starten',

  // ── Ergebnis ───────────────────────────────────────────────────────────────
  resultsTitle: 'Dein Sport Fit',
  resultsSubtitle: 'Die Sportarten, die zu deiner Denkweise passen',
  fitLabel: '{{fit}} % passend',
  topPick: 'Passt am besten',
  whyTitle: 'Warum es passt',
  developTitle: 'Daran kannst du arbeiten',
  allSportsTitle: 'Alle Sportarten',
  mindsetTitle: 'Deine Denkweise',
  teamSpectrumSolo: 'Allein',
  teamSpectrumTeam: 'Team',
  fromGames: 'Aus Game Intelligence',
  takenOn: 'Beantwortet am {{date}}',
  nextRetake: 'Du kannst ab dem {{date}} wieder antworten',
  findCoaches: 'Trainer finden',
  footnote:
    'Ein Vorschlag zum Ausprobieren, kein Urteil. Sport Fit schaut nur auf deine Denkweise und wie du das Spiel liest – nicht auf deinen Körper, deine Fitness, dein Können oder deine Erfahrung. Spiel weiter, was du liebst.',
  privacyTitle: 'Deine Antworten sind privat',
  privacyBody:
    'Nur du kannst sie sehen. Vereine und Scouts sehen sie nicht, und sie zählen nicht zu deinem Talent Score.',
  deleteAction: 'Meine Antworten löschen',
  deleteTitle: 'Deine Sport-Fit-Antworten löschen?',
  deleteBody: 'Deine Antworten und dein Ergebnis werden endgültig gelöscht. Du kannst jederzeit neu antworten.',
  deleteConfirm: 'Löschen',
  deleted: 'Deine Sport-Fit-Antworten wurden gelöscht',

  dimension: {
    drive: 'Antrieb',
    composure: 'Ruhe',
    focus: 'Fokus',
    resilience: 'Wieder aufstehen',
    team: 'Team oder allein',
    boldness: 'Mut',
    discipline: 'Routine',
    reading: 'Spiel lesen',
    speed: 'Schnelle Reaktionen',
  },
  dimensionWhat: {
    drive: 'Trainieren und besser werden wollen, einfach um der Sache willen',
    composure: 'Ruhig bleiben, wenn es drauf ankommt',
    focus: 'Die Aufmerksamkeit da halten, wo sie hingehört',
    resilience: 'Fehler und Rückschläge wegstecken',
    team: 'Ob du lieber im Team spielst oder für dein eigenes Ergebnis',
    boldness: 'Spaß an Zweikämpfen, Körperkontakt und Risiko',
    discipline: 'Spaß an Wiederholung und festen Trainingsabläufen',
    reading: 'Wie schnell du das Spiel liest, aus deinen Spielen',
    speed: 'Wie schnell du reagierst, aus deinen Spielen',
  },
  strength: {
    drive: 'Du trainierst, weil du besser werden willst',
    composure: 'Du bleibst ruhig, wenn es knapp steht',
    focus: 'Du kannst dich lange konzentrieren',
    resilience: 'Du steckst Fehler schnell weg',
    boldness: 'Du magst Zweikämpfe und Körpereinsatz',
    discipline: 'Du magst Routine und das Wiederholen einer Technik',
    reading: 'Du liest das Spiel schnell',
    speed: 'Du reagierst schnell',
  },
  develop: {
    drive: 'Setz dir jede Woche ein kleines Ziel und hak es ab.',
    composure: 'Übe vor wichtigen Momenten eine kurze Atemroutine.',
    focus: 'Trainier mit einem Stichwort, das deine Aufmerksamkeit zurückholt.',
    resilience: 'Nach einem Fehler: eine kurze Reset-Geste (Klatschen, Durchatmen) und weiter.',
    boldness: 'Spiel öfter in kleinen Gruppen, wo du deinen Zweikampf gewinnen musst.',
    discipline: 'Mach aus Wiederholung ein Spiel: Zähl, stopp oder bewerte deine Übungen.',
    reading: 'Schau dir Spiele an und sag laut, was du als Nächstes machen würdest.',
    speed: 'Bau kurze Reaktionsübungen in dein Aufwärmen ein.',
  },
  teamMatch: {
    team: 'Du teilst die Arbeit gern mit einem Team',
    pairs: 'Du arbeitest gern mit einem Partner zusammen',
    solo: 'Du trägst gern dein eigenes Ergebnis',
  },
  sportWhy: {
    football: 'Schnelle Entscheidungen mit zehn Mitspielern, neunzig Minuten lang.',
    basketball: 'Ständig Entscheidungen bei hohem Tempo, in einem kleinen Team.',
    volleyball: 'Schnelle Reaktionen und Vertrauen in jeden Mitspieler, bei jedem Punkt.',
    handball: 'Tempo, Körperkontakt und Mut in einem schnellen Teamspiel.',
    cricket: 'Langer Fokus und starke Nerven, allein am Schlagmal, aber Teil eines Teams.',
    padel: 'Den Ball schnell lesen, mit einem Partner an deiner Seite.',
    esports: 'Fokus, schnelles Lesen des Spiels und Teamwork am Bildschirm.',
    tennis: 'Du allein gegen einen Gegner, Punkt für Punkt.',
    martialArts: 'Mut, Kontrolle und Ruhe im Kampf eins gegen eins.',
    chess: 'Tiefer Fokus und ruhige Entscheidungen, allein am Brett.',
    swimming: 'Dein eigenes Rennen, gebaut auf Routine und langem Training.',
    athletics: 'Dein eigenes Ergebnis, gebaut auf Disziplin und Antrieb.',
  },

  // ── Zustimmung der Eltern (Einstellungen → Elternteil) ─────────────────────
  scopeMindset: 'Darf den Sport-Fit-Fragebogen beantworten',
  scopeMindsetOff: 'Sport-Fit-Fragebogen nicht freigegeben',
  addMindset: 'Sport Fit anfragen',
  addMindsetHint:
    'Deine Eltern haben dein Profil freigegeben, aber nicht Sport Fit. Wir schicken ihnen einen neuen Link – dort müssen sie „Sport Fit“ ankreuzen.',
  addMindsetSent: 'Anfrage an {{email}} gesendet. Sport Fit wird freigeschaltet, sobald zugestimmt wurde.',
};
