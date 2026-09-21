/**
 * Wöchentliche Aufgaben aus dem Training.
 *
 * Zwei Wörter wiegen hier schwer und dürfen in keiner Sprache zu einem
 * einzigen verschmelzen: **angegeben** ist das Ergebnis, das der Sportler
 * selbst nennt, **bestätigt** ist das, was ein Trainer gesehen und für richtig
 * erklärt hat. Die Rangliste ist nur deshalb lesbar, weil man den Unterschied
 * zwischen beiden sieht.
 *
 * Der Ton ist der eines Trainers, nicht der eines Spiels. Kein lauter
 * Countdown, kein „du fällst zurück“, keine Belohnungssprache — eine Aufgabe
 * ist etwas, das man tut, und der Clip, der dabei herauskommt, gehört dir, ob
 * du gewinnst oder nicht.
 */
export const challenges = {
  // ── Liste ──────────────────────────────────────────────────────────────────
  title: 'Aufgaben',
  subtitle: 'Von Trainern und Vereinen gestellt. Schick einen Clip, lass ihn prüfen.',
  tabOpen: 'Offen',
  tabEntered: 'Mitgemacht',
  tabMine: 'Meine',

  emptyTitle: 'Gerade ist keine Aufgabe offen',
  emptyBody:
    'Trainer stellen fast jede Woche eine. Sobald eine aufgeht, steht sie hier.',
  emptyEnteredTitle: 'Du hast noch bei keiner mitgemacht',
  emptyEnteredBody:
    'Nimm dir eine offene Aufgabe und schick einen Clip — ein bestätigtes Ergebnis ist der schnellste Beleg, den du bekommen kannst.',
  emptyMineTitle: 'Du hast noch keine Aufgabe gestellt',
  emptyMineBody:
    'Frag nach einer bestimmten Sache auf Video, dann sind alle Antworten vergleichbar.',

  setBy: 'Gestellt von {{name}}',
  closed: 'Beendet',
  judging: 'Wird bewertet',
  entries_one: '{{count}} Einsendung',
  entries_other: '{{count}} Einsendungen',
  ageRange: '{{min}}–{{max}} Jahre',
  ageMin: 'Ab {{min}}',
  ageMax: 'Unter {{max}}',

  // ── Detailansicht ──────────────────────────────────────────────────────────
  briefTitle: 'Was zu filmen ist',
  rulesTitle: 'Wie bewertet wird',
  judgedNote:
    'Der Trainer, der sie gestellt hat, bewertet sie — es gibt keine Zahl zu schlagen, also schick deinen besten Versuch.',
  measuredNote: 'Gemessen in {{unit}}. {{direction}}',
  directionHigher: 'Höher ist besser.',
  directionLower: 'Niedriger ist besser.',

  leaderboardTitle: 'Rangliste',
  leaderboardEmpty: 'Noch hat niemand mitgemacht. Der erste Clip setzt die Marke.',
  verifiedBadge: 'Bestätigt',
  claimedBadge: 'Angegeben',
  verifiedTooltip: 'Ein Trainer hat diesen Clip gesehen und das Ergebnis bestätigt.',
  claimedTooltip: 'Selbst angegeben. Ein Trainer hat die Zahl noch nicht bestätigt.',
  yourEntry: 'Deine Einsendung',
  rankLabel: 'Platz {{rank}}',

  // ── Mitmachen ──────────────────────────────────────────────────────────────
  enter: 'Mitmachen',
  enterAgain: 'Besseren Versuch schicken',
  withdraw: 'Zurückziehen',
  withdrawConfirmTitle: 'Einsendung zurückziehen?',
  withdrawConfirmBody:
    'Dein Clip bleibt auf deinem Profil. Er verschwindet nur aus dieser Rangliste.',
  withdrawConfirmAction: 'Zurückziehen',

  chooseClipTitle: 'Welcher Clip?',
  chooseClipBody:
    'Wähl eins deiner Videos. Ist der richtige Clip nicht dabei, lad ihn zuerst in deinem Profil hoch.',
  noClipsTitle: 'Du brauchst zuerst einen Clip',
  noClipsBody:
    'Film den Versuch, leg ihn in dein Profil und komm dann zurück zum Mitmachen.',
  noClipsAction: 'Clip hinzufügen',

  resultLabel: 'Dein Ergebnis',
  resultPlaceholder: 'z. B. 214',
  noteLabel: 'Willst du etwas dazusagen?',
  notePlaceholder: 'Bester von drei Versuchen. Der linke Fuß ist noch der schwächere.',
  submit: 'Einsendung abschicken',
  submitted: 'Einsendung ist raus. Der Trainer bestätigt sie.',
  updated: 'Einsendung ersetzt.',
  withdrawn: 'Einsendung zurückgezogen.',

  // ── Bewerten, für den Trainer, der sie gestellt hat ────────────────────────
  judgeTitle: 'Ergebnisse bestätigen',
  judgeBody: 'Sieh dir den Clip an und bestätige dann die Zahl oder schick sie zurück.',
  judgeAccept: 'Bestätigen',
  judgeReject: 'Zurückschicken',
  judgeValueLabel: 'Bestätigtes Ergebnis',
  judgeNoteLabel: 'Notiz für den Sportler',
  judgeNotePlaceholder: 'Bei 0:18 hat der Ball den Boden berührt — ab da zählt es neu.',
  judged: 'Ergebnis bestätigt.',
  sentBack: 'Zurück an den Sportler geschickt.',

  // ── Eine stellen ───────────────────────────────────────────────────────────
  newTitle: 'Aufgabe stellen',
  newBody:
    'Frag nach einer bestimmten Sache auf Video. Je genauer die Vorgabe, desto brauchbarer die Antworten.',
  fieldTitle: 'Titel',
  fieldTitlePlaceholder: 'Dreißig Sekunden Jonglieren',
  fieldBrief: 'Was zu filmen ist',
  fieldBriefPlaceholder:
    'Ein Versuch, nur Füße und Oberschenkel, Handy auf den Boden, damit der ganze Körper zu sehen ist.',
  fieldRules: 'Wie bewertet wird',
  fieldRulesPlaceholder: 'Keine Schnitte. Bester von drei Versuchen, kein Zusammenschnitt.',
  fieldMeasured: 'Gibt es eine Zahl?',
  measuredYes: 'Gemessen',
  measuredNo: 'Bewertet',
  fieldMetricLabel: 'Was gezählt wird',
  fieldMetricLabelPlaceholder: 'Ballkontakte',
  fieldMetricUnit: 'Einheit',
  fieldMetricUnitPlaceholder: 'Kontakte',
  fieldBetter: 'Besser ist',
  betterHigher: 'Höher',
  betterLower: 'Niedriger',
  fieldAges: 'Altersgruppe',
  fieldCloses: 'Endet',
  closesIn7: 'In einer Woche',
  closesIn14: 'In zwei Wochen',
  closesIn30: 'In einem Monat',
  create: 'Aufgabe veröffentlichen',
  created: 'Die Aufgabe läuft.',

  // ── Karte auf der Startseite ───────────────────────────────────────────────
  homeTitle: 'Aufgabe dieser Woche',
  homeCta: 'Ansehen',
  homeEnteredCta: 'Zur Rangliste',
};
