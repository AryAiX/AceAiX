/**
 * Der Weg vor der Anmeldung: Willkommen, Anmelden, Registrieren und die
 * beiden Passwort-Bildschirme.
 *
 * Die Texte zur Altersprüfung und zur Zustimmung der Eltern sind rechtlich
 * bindend. 13 Jahre ist das Mindestalter für ein Konto, und wer 13 bis 17 ist,
 * braucht die Freigabe eines Elternteils oder Vormunds, bevor andere ihn
 * finden oder anschreiben können. Übersetze die Worte, nie die Regel.
 */
export const auth = {
  // ── Rahmen des Assistenten, geteilt mit dem Onboarding ────────────────────
  stepCounter: '{{current}}/{{total}}',
  stepProgress: 'Schritt {{current}} von {{total}}',
  stepBack: 'Einen Schritt zurück',

  // ── Felder und Meldungen für mehr als einen Bildschirm ────────────────────
  emailLabel: 'E-Mail',
  passwordLabel: 'Passwort',
  emailRequired: 'Gib deine E-Mail-Adresse ein.',
  emailInvalid: 'Diese E-Mail-Adresse sieht nicht richtig aus.',
  passwordRequired: 'Gib dein Passwort ein.',
  passwordMinLength_one: 'Nimm mindestens {{count}} Zeichen.',
  passwordMinLength_other: 'Nimm mindestens {{count}} Zeichen.',
  passwordLengthPlaceholder_one: 'Mindestens {{count}} Zeichen',
  passwordLengthPlaceholder_other: 'Mindestens {{count}} Zeichen',
  createAccount: 'Konto erstellen',
  checkYourEmail: 'Sieh in dein Postfach',
  sentTo: 'Gesendet an',
  backToSignIn: 'Zurück zur Anmeldung',

  // ── Bedingungen und Datenschutz ───────────────────────────────────────────
  /* Die beiden Linktexte stehen mitten im Satz, damit sie beim Übersetzen
     dorthin rutschen können, wo die Sprache sie braucht. */
  legalContinue: 'Wenn du weitermachst, stimmst du unseren {{terms}} und der {{privacy}} zu.',
  legalAgree: 'Ich stimme den {{terms}} und der {{privacy}} zu.',
  legalTermsLink: 'Bedingungen',
  legalTermsA11y: 'Die Nutzungsbedingungen lesen',
  legalPrivacyA11y: 'Die Datenschutzerklärung lesen',
  legalAgreeA11y: 'Ich stimme den Nutzungsbedingungen und der Datenschutzerklärung zu',

  // ── Passwortstärke ────────────────────────────────────────────────────────
  password: {
    tooShortLabel: 'Zu kurz',
    weakLabel: 'Schwach',
    weakHint: 'Nimm noch einen Großbuchstaben und eine Zahl dazu.',
    goodLabel: 'Gut',
    goodHint: 'Eine Zahl oder ein Zeichen macht es stärker.',
    strongLabel: 'Stark',
    strongHint: 'Das ist ein gutes Passwort.',
    meterSummary: '{{label}} · {{hint}}',
  },

  // ── Willkommen ────────────────────────────────────────────────────────────
  welcome: {
    headline: 'Werde gesehen.',
    subheadline: 'Dein Talent, entdeckt.',
    body: 'Bau dein Profil auf, hol dir deinen Talent Score und lass dich von Trainern und Vereinen finden.',
    highlightScore: 'Ein Talent Score von 100, der zeigt, wo du stehst',
    highlightTrials: 'Echte Probetrainings und Plätze von Vereinen und Akademien',
    highlightGuardian: 'Unter 18? Ein Elternteil gibt dein Profil frei, bevor dich jemand findet',
    signIn: 'Ich habe schon ein Konto',
  },

  // ── Anmelden ──────────────────────────────────────────────────────────────
  signIn: {
    title: 'Schön, dass du da bist',
    subtitle: 'Melde dich an und mach dort weiter, wo du aufgehört hast.',
    passwordPlaceholder: 'Dein Passwort',
    forgot: 'Passwort vergessen?',
    forgotA11y: 'Passwort zurücksetzen',
    submit: 'Anmelden',
    newHere: 'Neu bei {{app}}?',
    createAccount: 'Konto erstellen',
  },

  // ── Registrieren ──────────────────────────────────────────────────────────
  signUp: {
    roleTitle: 'Wer bist du?',
    roleSubtitle:
      'Danach richtet sich dein Profil. Später kann unser Support das noch ändern.',
    roleAthleteTitle: 'Ich bin Sportlerin oder Sportler',
    roleAthleteSubtitle: 'Profil aufbauen und entdeckt werden',
    roleCoachTitle: 'Ich bin Trainerin oder Trainer',
    roleCoachSubtitle: 'Spieler finden und Plätze ausschreiben',
    roleClubTitle: 'Wir sind ein Verein oder eine Akademie',
    roleClubSubtitle: 'Talente sichten und Probetrainings ausschreiben',
    roleGuardianTitle: 'Ich bin Elternteil oder Vormund',
    roleGuardianSubtitle: 'Das Profil deines Kindes begleiten und freigeben',

    nameTitle: 'Wie sollen wir dich nennen?',
    nameSubtitle: 'Nimm deinen echten Namen — Trainer müssen wissen, wen sie vor sich haben.',
    firstNameLabel: 'Vorname',
    firstNamePlaceholder: 'Sara',
    firstNameRequired: 'Gib deinen Vornamen ein.',
    lastNameLabel: 'Nachname',
    lastNamePlaceholder: 'Karimi',
    lastNameRequired: 'Gib deinen Nachnamen ein.',

    dobTitle: 'Wann bist du geboren?',
    dobSubtitle:
      'Wir fragen, um jüngere Sportler zu schützen. Dein genauer Geburtstag wird niemandem gezeigt — nur eine Altersgruppe.',
    dobChoose: 'Wähle dein Geburtsdatum',
    dobChange: 'Ändern',
    dobSelectedA11y: 'Geburtsdatum, {{date}}. Ändern',
    dobDayLabel: 'Tag',
    dobDayPlaceholder: '04',
    dobMonthLabel: 'Monat',
    dobMonthPlaceholder: '09',
    dobYearLabel: 'Jahr',
    dobYearPlaceholder: '2010',
    dobTooYoung:
      'Für ein Konto bei {{app}} musst du mindestens {{age}} sein. Tipp auf {{action}}, dann erklären wir, wie es weitergeht.',
    dobMinorTitle: 'Ein Erwachsener kommt dazu',
    dobMinorBody:
      'Weil du unter 18 bist, muss ein Elternteil oder Vormund dein Profil freigeben, bevor Trainer dich finden können. Gleich fragen wir nach der E-Mail-Adresse, und die Person bekommt eine kurze Nachricht, die alles erklärt.',

    blockedTitle: 'Komm wieder, wenn du {{age}} wirst',
    blockedBody:
      '{{app}} ist für Sportlerinnen und Sportler ab {{age}} gemacht, deshalb können wir dir noch kein Konto anlegen. Die Regel schützt jüngere Kinder im Netz, und wir können keine Ausnahme machen.',
    blockedEncouragement:
      'Trainier weiter. Wenn du {{age}} wirst, komm zurück — dein Profil wartet dann auf dich.',
    blockedBackToStart: 'Zurück zum Anfang',
    blockedWrongDate: 'Ich habe das falsche Datum gewählt',

    accountTitle: 'Richte deine Anmeldung ein',
    accountSubtitle:
      'Eine E-Mail, ein Passwort. Wir schicken dir einen Link, damit du die Adresse bestätigst.',
    termsRequired: 'Stimme bitte den Bedingungen und der Datenschutzerklärung zu.',
  },

  // ── Sieh in dein Postfach ─────────────────────────────────────────────────
  checkEmail: {
    body: 'Wir haben dir einen Link geschickt, mit dem du deine Adresse bestätigst. Tipp ihn an, komm zurück und melde dich an.',
    spamHint:
      'Noch nichts da? Das kann eine Minute dauern, und manchmal landet es im Spam oder bei den Werbemails.',
    resendCountdown_one: 'Neue E-Mail in {{count}} s',
    resendCountdown_other: 'Neue E-Mail in {{count}} s',
    resend: 'E-Mail erneut senden',
    resendSuccess: 'Gesendet. Sieh noch einmal in dein Postfach.',
  },

  // ── Passwort vergessen ────────────────────────────────────────────────────
  forgotPassword: {
    title: 'Passwort vergessen?',
    subtitle:
      'Sag uns die E-Mail, mit der du dich angemeldet hast, dann schicken wir dir einen Link für ein neues.',
    submit: 'Link senden',
    sentBody:
      'Wenn ein Konto zu dieser Adresse gehört, ist ein Link für ein neues Passwort unterwegs. Er gilt einmal und läuft nach einer Weile ab.',
  },

  // ── Passwort zurücksetzen ─────────────────────────────────────────────────
  resetPassword: {
    title: 'Neues Passwort festlegen',
    subtitle:
      'Nimm etwas, das du nirgends sonst benutzt. Danach bist du direkt angemeldet.',
    newPasswordLabel: 'Neues Passwort',
    repeatLabel: 'Neues Passwort wiederholen',
    repeatPlaceholder: 'Tipp es noch einmal',
    repeatRequired: 'Tipp das neue Passwort noch einmal.',
    mismatch: 'Die beiden Passwörter stimmen nicht überein.',
    submit: 'Neues Passwort speichern',
    success: 'Passwort geändert. Du bist angemeldet.',
    expiredHint: 'Falls dieser Link abgelaufen ist, fordere auf dem Anmeldebildschirm einen neuen an.',
  },
};
