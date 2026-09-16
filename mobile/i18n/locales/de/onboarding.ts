/**
 * Der Profil-Assistent, der einmal nach der Registrierung läuft.
 *
 * Drei Wege teilen ihn sich: ein Sportler, der ein Profil aufbaut, ein Trainer
 * oder Verein, der sagt, wen er sucht, und ein Elternteil oder Vormund, der
 * hier ist, um über ein Profil zu wachen statt eins zu bauen.
 *
 * Die Texte zur Freigabe sind rechtlich bindend. Wer 13 bis 17 ist, taucht
 * nicht in der Suche auf und kann nicht angeschrieben werden, solange kein
 * Elternteil oder Vormund zugestimmt hat — sag das klar, schwäch es nie ab.
 */
export const onboarding = {
  // ── Rahmen des Assistenten ────────────────────────────────────────────────
  loading: 'Dein Profil wird vorbereitet',
  signOut: 'Abmelden',
  skipForNow: 'Erst mal überspringen',
  finish: 'Losschauen',

  // ── Länderauswahl, für Sportler und Recruiter ─────────────────────────────
  countryLabel: 'Land',
  countrySearchPlaceholder: 'Länder suchen',
  countryNoMatch: 'Kein Land passt dazu. Versuch es mit weniger Buchstaben.',
  countryShowAll: 'Alle Länder anzeigen',

  // ── Sportler: Sportart, Position, Klasse ──────────────────────────────────
  sportTitle: 'Was spielst du?',
  sportSubtitle: 'Wähle die Sportart, in der du am meisten antrittst.',

  positionTitle: 'Wo spielst du?',
  positionSubtitle: 'Wähle die Position, die du am häufigsten spielst. Mehr geht später.',
  positionNoneTitle: 'Hier gibt es keine festen Positionen',
  positionNoneBody:
    'In dieser Sportart gibt es keine Positionen, also nichts zu wählen. Tipp auf {{action}} und mach weiter.',

  levelTitle: 'Auf welchem Niveau spielst du?',
  levelSubtitle: 'Sei ehrlich — Trainer suchen nach Niveau, und die richtige Passung bringt mehr als eine große Ansage.',

  // ── Sportler: wo du spielst ───────────────────────────────────────────────
  placeTitle: 'Wo spielst du gerade?',
  placeSubtitle: 'Verein und Stadt helfen Trainern in deiner Nähe, dich zu finden.',
  clubLabel: 'Verein oder Akademie',
  clubPlaceholder: 'Al Wasl Academy',
  clubHint: 'Lass das leer, wenn du gerade in keinem Verein bist.',
  cityLabel: 'Stadt',
  cityPlaceholder: 'Dubai',

  // ── Sportler: Körperdaten ─────────────────────────────────────────────────
  physicalTitle: 'Ein paar Zahlen',
  physicalSubtitle:
    'Alles freiwillig. Scouts achten darauf, aber du kannst das überspringen und jederzeit nachtragen.',
  heightLabel: 'Größe',
  heightPlaceholder: '172',
  heightHint: 'in cm',
  heightOutOfRange: 'Gib eine Größe zwischen {{min}} und {{max}} cm ein.',
  weightLabel: 'Gewicht',
  weightPlaceholder: '64',
  weightHint: 'in kg',
  weightOutOfRange: 'Gib ein Gewicht zwischen {{min}} und {{max}} kg ein.',
  strongSide: 'Starke Seite',

  // ── Freigabe, die der junge Sportler einholt ──────────────────────────────
  guardianTitle: 'Hol einen Erwachsenen dazu',
  guardianSubtitle:
    'Du bist unter 18, also gibt ein Elternteil oder Vormund dein Profil frei, bevor dich jemand finden kann.',
  guardianApprovalTitle: 'Worum wir sie bitten',
  guardianApprovalBody:
    'Wir schicken eine E-Mail mit einem Link. Darin steht, wer wir sind, und die Person sagt zu zwei Dingen getrennt ja oder nein. Sie kann es sich jederzeit anders überlegen und jedes davon wieder abschalten, und wir schreiben ihr sonst nichts.',
  guardianSearchTitle: 'Du tauchst in der Suche auf',
  guardianSearchBody:
    'Trainer und Vereine können dein Profil finden, wenn sie nach Spielern suchen.',
  guardianMessageTitle: 'Geprüfte Trainer dürfen dir schreiben',
  guardianMessageBody: 'Nur Erwachsene, die wir geprüft haben. Sonst kann niemand einen Chat mit dir anfangen.',
  guardianWhoTitle: 'Wer ist das?',
  guardianRelationshipParent: 'Ein Elternteil',
  guardianRelationshipGuardian: 'Ein anderer Vormund',
  guardianNameLabel: 'Ihr Name',
  guardianNamePlaceholder: 'Leila Karimi',
  guardianNameRequired: 'Gib ihren Namen ein.',
  guardianEmailLabel: 'Ihre E-Mail',
  guardianEmailHint: 'Achte darauf, dass sie stimmt — der Link zur Freigabe geht dorthin.',
  guardianEmailRequired: 'Gib ihre E-Mail-Adresse ein.',
  guardianEmailInvalid: 'Diese E-Mail-Adresse sieht nicht richtig aus.',
  guardianSkip: 'Später machen',
  guardianSkipHint: 'Dein Profil bleibt für Trainer verborgen, bis ein Erwachsener es freigibt.',
  guardianSkipA11y:
    'Später machen. Dein Profil bleibt verborgen, bis ein Elternteil oder Vormund es freigibt.',
  guardianSkipSheetTitle: 'Später erledigen?',
  guardianSkipSheetMessage:
    'Dein Profil bleibt verborgen. Trainer finden dich nicht in der Suche, und niemand kann dir schreiben, bis ein Elternteil oder Vormund es freigibt. Du kannst die E-Mail jederzeit aus den Einstellungen schicken.',
  guardianSkipSheetConfirm: 'Ja, später',
  guardianSkipSheetCancel: 'Ich mache es jetzt',

  // ── Foto ──────────────────────────────────────────────────────────────────
  photoTitle: 'Zeig dein Gesicht',
  photoSubtitle:
    'Ein klares Foto von dir, allein. Profile mit Foto werden viel öfter angesehen.',
  photoSaved: 'Gespeichert. Sieht gut aus.',
  photoOptional: 'Überspring das, wenn du es lieber später machst — nichts hier ist Pflicht.',
  photoChoose: 'Aus Fotos wählen',
  photoChooseAnother: 'Anderes Foto wählen',
  photoTake: 'Foto aufnehmen',
  photoUnreadable: 'Dieses Foto konnten wir nicht lesen. Nimm ein anderes.',
  photoLibraryDenied:
    '{{app}} braucht die Erlaubnis, deine Fotos zu öffnen. Du kannst sie in den Einstellungen geben.',
  photoLibraryFailed: 'Wir konnten deine Fotos nicht öffnen. Versuch es noch einmal.',
  photoCameraDenied: '{{app}} braucht die Erlaubnis, die Kamera zu nutzen. Du kannst sie in den Einstellungen geben.',
  photoCameraFailed: 'Wir konnten die Kamera nicht öffnen. Versuch es noch einmal.',

  // ── Recruiter: Sportarten, Rolle, Ort, Ziel ───────────────────────────────
  recruiterSportsTitle: 'In welchen Sportarten arbeitest du?',
  recruiterSportsSubtitle:
    'Wähle so viele du magst. Danach zeigen wir dir die passenden Sportlerinnen und Sportler.',

  recruiterRoleTitle: 'Sag uns deine Rolle',
  recruiterRoleSubtitle: 'Sportler und ihre Eltern sehen das, also halt es einfach und ehrlich.',
  recruiterRoleLabel: 'Deine Rolle',
  recruiterRolePlaceholderClub: 'Leitung der Akademie',
  recruiterRolePlaceholderCoach: 'Cheftrainer U16',
  recruiterRoleRequired: 'Sag uns, was du machst.',
  recruiterClubLabel: 'Name des Vereins oder der Akademie',
  recruiterClubHintClub: 'Damit legen wir deine Vereinsseite an.',
  recruiterClubHintCoach: 'Lass das leer, wenn du frei arbeitest.',

  recruiterPlaceTitle: 'Wo sitzt du?',
  recruiterPlaceSubtitle: 'Sportler in deiner Nähe stehen dann ganz oben in deinen Treffern.',

  recruiterTargetTitle: 'Wen suchst du?',
  recruiterTargetSubtitle:
    'Grob reicht. Du kannst das alles später in deinen Einstellungen ändern.',
  recruiterPositionsTitle: 'Positionen',
  recruiterPositionsEmpty: 'Geh einen Schritt zurück und wähle eine Sportart, um ihre Positionen zu sehen.',
  recruiterAgeGroupTitle: 'Altersgruppe',
  recruiterMinorsNote:
    'Sportler unter 18 erscheinen erst, wenn ein Elternteil oder Vormund ihr Profil freigegeben hat.',
  ageBandAny: 'Jedes Alter',
  ageBandUnder14: 'Unter 14',
  ageBand14To16: '14 bis 16',
  ageBand16To18: '16 bis 18',
  ageBand18To21: '18 bis 21',
  ageBand21Plus: 'Ab 21',

  // ── Elternteil oder Vormund: wie das läuft ────────────────────────────────
  guardianIntroTitle: 'So läuft das für dich',
  guardianIntroSubtitle:
    'Du bist hier, um das Profil deines Kindes im Blick zu behalten, nicht um ein eigenes zu bauen.',
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: 'Mit deinem Kind verbinden',
  guardianIntroLinkBody:
    'Öffne die Einstellungen und wähle „Eltern und Vormund“. Wenn dein Kind dir schon eine E-Mail zur Freigabe geschickt hat, verbindet euch der Link darin sofort.',
  guardianIntroDecideTitle: 'Entscheide, was erlaubt ist',
  guardianIntroDecideBody:
    'Du sagst zu zwei Dingen ja oder nein: ob Trainer dein Kind in der Suche finden, und ob geprüfte Trainer ihm schreiben dürfen.',
  guardianIntroChangeTitle: 'Meinung jederzeit ändern',
  guardianIntroChangeBody:
    'Du kannst beides jederzeit in den Einstellungen abschalten, und das Profil fällt sofort aus der Suche.',
  guardianIntroFooter:
    'Bis du zustimmst, bleibt das Profil deines Kindes verborgen. Niemand kann danach suchen, und kein Erwachsener kann ein Gespräch beginnen.',

  // ── Abschluss: Sportler ───────────────────────────────────────────────────
  scoreLoading: 'Dein Score wird berechnet',
  scoreErrorNote:
    'Dein Profil ist so oder so gespeichert — mach weiter und sieh dir den Score später an.',
  athleteDoneTitle: 'Stark',
  athleteDoneTitleNamed: 'Stark, {{name}}',
  athleteDoneScored: 'Dein Profil ist online. Hier startest du — {{tier}}.',
  athleteDoneNoScore:
    'Dein Profil ist online. Trag noch etwas nach, dann erscheint dein Talent Score darauf.',
  tipsTitle: 'So kommst du höher',
  tipPoints: '+{{points}}',
  tipsEmpty:
    'Poste ein Highlight, trag deine Statistik ein und lass dich von deinem Verein bestätigen. Jedes Stück bewegt den Score.',
  guardianRequested:
    'Wir haben {{name}} eine E-Mail geschickt. Sobald sie zustimmt, können Trainer dich finden. Bis dahin bleibt dein Profil privat.',
  guardianPendingTitle: 'Eins fehlt noch',
  guardianPendingBody:
    'Dein Profil bleibt verborgen, bis ein Elternteil oder Vormund es freigibt. Du kannst die E-Mail jederzeit aus den Einstellungen schicken.',

  // ── Abschluss: Recruiter, Eltern und alle anderen ─────────────────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: 'Alles bereit',
  recruiterDoneTitleNamed: 'Alles bereit, {{name}}',
  recruiterDoneBody:
    'Wir suchen ab jetzt Sportlerinnen und Sportler, die zu dir passen.',
  recruiterDonePointSearch: 'Unter Entdecken suchen und filtern',
  recruiterDonePointPost: 'Probetrainings ausschreiben, auf die man sich bewirbt',
  recruiterDonePointVerified: 'Prüfen lassen, um Sportlern unter 18 zu schreiben',
  doneTitle: 'Alles erledigt',
  guardianDoneBody: 'Dein Konto ist fertig. Die Verbindung zu deinem Kind dauert etwa eine Minute.',
  basicDoneBody: 'Schau dich um und richte den Rest ein, wann immer du magst.',
  guardianDoneNote:
    'Einstellungen, dann „Eltern und Vormund“. Wenn dein Kind dir schon eine E-Mail zur Freigabe geschickt hat, verbindet der Link darin eure Konten.',
};
