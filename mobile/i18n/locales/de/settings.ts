/**
 * Der Einstellungsbaum — jeder Bildschirm unter `app/settings/`, die Teile,
 * aus denen sie gebaut sind, und der Rahmen um die vier Rechtsdokumente.
 *
 * Alles zu Melden, Blockieren, Eltern und dem Schutz unter 18-Jähriger steht
 * stattdessen in `safety.ts`, damit dieser Text für sich geprüft werden kann.
 * Gemeinsamer Wortschatz (Speichern, Abbrechen, Geprüft, Entblocken, Talent
 * Score, die vier Dokumentnamen) kommt aus `common.ts` und steht hier nicht
 * noch einmal.
 *
 * Zu gespeicherten Werten: Sportarten, Positionen, Klassen und Länder, die ein
 * Scout wählt, liegen auf Englisch in der Datenbank und werden erst beim
 * Anzeigen über `constants/sports.ts` übersetzt. In dieser Datei stehen nur
 * die Beschriftungen drumherum.
 */
export const settings = {
  // ── Einstellungen, Startseite (app/settings/index.tsx) ─────────────────────
  title: 'Einstellungen',

  sectionAccount: 'Konto',
  accountTitle: 'Konto',
  accountSubtitle: 'E-Mail, Passwort, Prüfung',
  appearanceTitle: 'Darstellung',
  appearanceSubtitle: 'Hell, dunkel oder wie dein Handy',
  notificationsTitle: 'Mitteilungen',
  notificationsSubtitle: 'Wähle, was dich erreicht',

  sectionPrivacySafety: 'Privatsphäre und Sicherheit',
  privacyTitle: 'Privatsphäre',
  privacySubtitle: 'Wer dir schreiben und dich finden kann',

  sectionScouting: 'Sichtung',
  scoutingFooter: 'Danach sortieren wir, wer dir unter Entdecken zuerst erscheint.',
  scoutingTitle: 'Wen du suchst',
  scoutingSubtitle: 'Sportarten, Positionen, Niveau und Alter',

  sectionAbout: 'Über',
  supportTitle: 'Support kontaktieren',
  supportFallback: 'Schreib uns an {{email}}',
  versionTitle: 'Version',

  signOut: 'Abmelden',
  signOutConfirmTitle: 'Abmelden?',
  signOutConfirmBody: 'Zum Zurückkommen brauchst du deine E-Mail und dein Passwort.',

  /** „AceAiX by AryAiX“ — beides sind Marken und werden unverändert eingesetzt. */
  productBy: '{{product}} von {{company}}',

  // ── Konto (app/settings/account.tsx) ───────────────────────────────────────
  sectionSignIn: 'Anmeldung',
  signInFooter:
    'Mit deiner E-Mail meldest du dich an, und über sie erreichen wir dich zu deinem Konto. Zum Ändern schreib an {{email}}.',
  emailLabel: 'E-Mail',
  notSignedIn: 'Nicht angemeldet',

  sectionVerification: 'Prüfung',
  verificationTitle: 'Prüfung',
  requestVerification: 'Prüfung anfragen',
  verificationCheckedSubtitle: 'Dein Konto ist geprüft',
  verificationAskSubtitle: 'Bitte uns, dein Konto zu prüfen',
  verificationInReview: 'In Prüfung',
  verificationSentOn: 'Gesendet am {{date}}',
  verificationApproved: 'Bestätigt',
  verificationApprovedSubtitle: 'Dein Abzeichen kommt gleich',
  verificationRejected: 'Nicht bestätigt',
  verificationRejectedSubtitle: 'Du kannst neu anfragen',
  verificationRequestSent: 'Anfrage gesendet. Wir sehen sie uns bald an.',

  sectionYourData: 'Deine Daten',
  dataFooter:
    'Die Datei ist JSON: dein Profil, Beiträge, Kommentare, wem du folgst, Bewerbungen und Medien, genau so, wie wir sie haben.',
  downloadMyData: 'Meine Daten laden',
  downloadSubtitle: 'Eine Kopie von allem in deinem Konto',
  preparingFile: 'Deine Datei wird vorbereitet…',
  preparingShort: 'Wird vorbereitet…',
  exportSaved: '{{name}} gespeichert',

  // Passwort ändern
  changePassword: 'Passwort ändern',
  changePasswordSubtitle: 'Auf diesem Gerät bleibst du angemeldet.',
  currentPassword: 'Aktuelles Passwort',
  currentPasswordPlaceholder: 'Dein Passwort jetzt',
  newPassword: 'Neues Passwort',
  newPasswordHint_one: 'Mindestens {{count}} Zeichen.',
  newPasswordHint_other: 'Mindestens {{count}} Zeichen.',
  newPasswordPlaceholder: 'Etwas, das nur du kennst',
  confirmNewPassword: 'Neues Passwort bestätigen',
  confirmNewPasswordPlaceholder: 'Noch einmal tippen',
  passwordTooShort_one: 'Wähle ein Passwort mit mindestens {{count}} Zeichen.',
  passwordTooShort_other: 'Wähle ein Passwort mit mindestens {{count}} Zeichen.',
  passwordsDoNotMatch: 'Die beiden Passwörter sind nicht gleich.',
  passwordUnchanged: 'Das ist das Passwort, das du schon hast.',
  passwordCurrentWrong: 'Das aktuelle Passwort stimmt nicht.',
  passwordChanged: 'Passwort geändert.',
  passwordPhishingNote:
    'Wir fragen dich nie per E-Mail oder Nachricht nach deinem Passwort. Wenn das jemand tut, sind wir das nicht.',

  // ── Privatsphäre (app/settings/privacy.tsx) ────────────────────────────────
  messagePrivacyHeading: 'Wer dir schreiben kann',
  messagePrivacyHint:
    'Das gilt nur für neue Gespräche. Chats, die du schon hast, bleiben offen.',

  privacyEveryone: 'Alle',
  privacyEveryoneHint: 'Jeder bei AceAiX kann ein Gespräch mit dir beginnen.',
  privacyVerified: 'Geprüfte Trainer und Vereine',
  privacyVerifiedHint: 'Nur Konten, die wir geprüft haben, und Leute, die dir folgen.',
  privacyFollowing: 'Leute, denen du folgst',
  privacyFollowingHint: 'Nur Konten, denen du schon folgst, können zuerst schreiben.',
  privacyNobody: 'Niemand',
  privacyNobodyHint: 'Niemand kann ein neues Gespräch beginnen. Bestehende Chats laufen weiter.',

  discoveryHeading: 'In der Scout-Suche erscheinen',
  discoveryHint: 'Wenn das an ist, können Trainer und Vereine dich unter Entdecken finden.',
  discoverable: 'Auffindbar',
  discoverableOn: 'Dein Profil kann in der Suche erscheinen',
  discoverableOff: 'Du bist aus der Suche ausgeblendet',

  publicWebHeading: 'Mein Profil auch ohne Anmeldung zeigen',
  publicWebAdult:
    'Profile Erwachsener, die in der Suche erscheinen, sind im Web auch für Leute ohne Anmeldung sichtbar. Wenn du „{{setting}}“ oben ausschaltest, fällst du aus beidem heraus.',
  readPrivacyPolicy: 'Die ganze Datenschutzerklärung lesen',

  // ── Mitteilungen (app/settings/notifications.tsx) ──────────────────────────
  pushOffTitle: 'Push-Mitteilungen sind aus',
  pushOffBody:
    'Dein Handy lässt AceAiX keine Mitteilungen senden, deshalb erreicht dich nichts davon, solange die App zu ist.',
  turnOnPush: 'Push einschalten',
  pushStillOff: 'Push ist weiterhin aus. Du kannst es in den Einstellungen deines Handys anschalten.',
  autoSaveNote: 'Änderungen speichern sich von selbst.',

  sectionHowWeReach: 'Wie wir dich erreichen',
  pushTitle: 'Push-Mitteilungen',
  pushSubtitle: 'Auf deinem Handy, auch wenn die App zu ist',
  emailTitle: 'E-Mail',
  emailSubtitle: 'Ab und zu eine Zusammenfassung in dein Postfach',

  sectionActivity: 'Aktivität',
  activityFooter: 'Das steuert auch, was in der App bei den Mitteilungen auftaucht.',
  notifyFollows: 'Neue Follower',
  notifyMessages: 'Nachrichten',
  notifyComments: 'Kommentare',
  notifyLikes: 'Likes',

  sectionOpportunities: 'Chancen und dein Score',
  notifyOpportunities: 'Neue Chancen',
  notifyApplications: 'Neues zu Bewerbungen',
  notifyScoutInterest: 'Interesse von Scouts',
  notifyScoreUpdates: 'Neues zum Talent Score',

  noMarketingNote:
    'Wir senden nie Werbe-Mitteilungen, und wir verkaufen deine Daten an niemanden, der das tut.',

  // ── Sichtung (app/settings/scouting.tsx) ───────────────────────────────────
  scoutingIntro:
    'Das bestimmt, wen Entdecken dir zuerst zeigt und über welche Sportler wir dich informieren. Lass etwas leer, wenn es dir egal ist.',
  scoutingSports: 'Sportarten',
  scoutingSportsHint: 'Wähle jede Sportart, für die du sichtest.',
  scoutingPositions: 'Positionen',
  scoutingPositionsHint: 'Nur die Positionen der gewählten Sportarten.',
  scoutingPositionsEmpty: 'Wähle zuerst eine Sportart, dann erscheinen hier ihre Positionen.',
  scoutingLevels: 'Niveau',
  scoutingCountries: 'Länder',
  scoutingCountriesHint: 'Wo der Sportler zu Hause ist.',

  ageRange: 'Altersspanne',
  youngest: 'Jüngste',
  oldest: 'Älteste',
  yearsSuffix: 'J.',

  minimumTalentScore: 'Mindest-Talent-Score',
  atLeast: 'Mindestens',
  anyScoreHint: 'Jeder Score, auch Sportler ohne Score',
  minScoreHint: 'Nur Sportler mit {{score}} oder mehr',

  filters: 'Filter',
  openToOffersOnly: 'Nur offen für Angebote',
  openToOffersHint: 'Sportler ausblenden, die nicht auf der Suche sind',
  notifyNewMatches: 'Über neue Treffer informieren',
  notifyNewMatchesHint: 'Wenn ein passender Sportler dazukommt oder besser wird',

  savePreferences: 'Einstellungen speichern',
  preferencesSaved: 'Gespeichert. Entdecken nutzt das ab jetzt.',

  // ── Darstellung (app/settings/appearance.tsx) ──────────────────────────────
  themeHeading: 'Erscheinungsbild',
  themeBody:
    '„System“ folgt deinem Handy, auch seinem Nachtplan.',
  themeSystem: 'System',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  preview: 'Vorschau',
  themeSystemNoteLight: 'Dein Handy steht gerade auf hell.',
  themeSystemNoteDark: 'Dein Handy steht gerade auf dunkel.',
  themeAlwaysLight: 'Immer hell, egal wie dein Handy steht.',
  themeAlwaysDark: 'Immer dunkel, egal wie dein Handy steht.',

  /* Die Vorschau ist ein erfundener Beitrag, nur damit man das Bild beurteilen kann. */
  previewName: 'Layla Haddad',
  previewCity: 'Dubai',
  previewBadge: '{{tier}} {{score}}',
  previewPost: 'Zwei Tore und eine Vorlage im Derby. Ganzer Clip auf meinem Profil.',

  // ── Konto löschen (app/settings/delete-account.tsx) ────────────────────────
  deleteAccountTitle: 'Konto löschen',
  deleteAccountSubtitle: 'Dein Profil und alles darauf dauerhaft entfernen',
  deleteCannotUndoTitle: 'Das lässt sich nicht rückgängig machen',
  deleteCannotUndoBody:
    'Wenn du dein Konto löschst, ist es dauerhaft weg. Wir können es nicht zurückholen, und wer sich neu anmeldet, fängt bei null an — neues Profil, Talent Score bei null.',

  beforeYouGo: 'Bevor du gehst',
  takeABreakTitle: 'Mach lieber eine Pause',
  takeABreakBody:
    'Schalte „Auffindbar“ aus, dann verschwindest du aus der Scout-Suche. Dein Profil, deine Beiträge und dein Score bleiben genau so, und du kannst es jederzeit wieder anschalten.',
  turnOffDiscovery: 'Auffindbar ausschalten',
  discoveryAlreadyOff: 'Auffindbar ist schon aus',
  hiddenFromSearchToast: 'Du bist aus der Scout-Suche ausgeblendet. Gelöscht wurde nichts.',
  deleteExportBody:
    'Sichere eine Kopie deines Profils, deiner Beiträge, Kommentare, Follows und Bewerbungen, bevor etwas entfernt wird. Nach dem Löschen können wir sie dir nicht mehr schicken.',

  whatGetsDeleted: 'Was gelöscht wird',
  removedProfile: 'Dein Profil, dein Foto und alles, was du daraufgeschrieben hast',
  removedPosts: 'Jeder Beitrag, Kommentar und jedes Like von dir',
  removedMessages: 'Deine Nachrichten in allen Gesprächen',
  removedApplications: 'Deine Bewerbungen und jede gemerkte Chance',
  removedScore: 'Dein Talent Score und sein ganzer Verlauf',
  removedFollows: 'Deine Follower und alle, denen du folgst',
  retentionNote:
    'Ein paar wenige Daten behalten wir eine begrenzte Zeit, wo das Gesetz es verlangt — Unterlagen zu Sicherheit und Moderation und alles, was für rechtliche Ansprüche nötig ist. Aus deinem Profil wird niemandem wieder etwas gezeigt.',

  /**
   * Das Wort, das zum Bestätigen getippt wird. Übersetze es in das Wort, das
   * Leute in dieser Sprache wirklich tippen würden; Groß- und Kleinschreibung
   * spielt keine Rolle.
   */
  deleteConfirmWord: 'LÖSCHEN',
  typeToContinue: 'Tipp {{word}}, um weiterzumachen',
  deleteMyAccount: 'Mein Konto löschen',
  changedYourMind: 'Anders überlegt? Geh einfach zurück — noch ist nichts passiert.',
  deleteConfirmTitle: 'Dein Konto löschen?',
  deleteConfirmBody:
    'Das ist der letzte Schritt. Dein Profil, deine Beiträge, Nachrichten, Bewerbungen und dein Talent Score werden dauerhaft entfernt und lassen sich nicht zurückholen.',
  deletePermanently: 'Dauerhaft löschen',
  keepMyAccount: 'Konto behalten',

  // ── Gemeinsame Bedienelemente (components/settings/) ───────────────────────
  nothingToChoose: 'Hier gibt es noch nichts zu wählen.',
  stepperDecrease: '{{label}} verringern',
  stepperIncrease: '{{label}} erhöhen',
  stepperValue: '{{label}} {{value}}',
  /** Eine Auswahlzeile, vorgelesen: erst die Beschriftung, dann die Erklärung. */
  radioA11y: '{{label}}. {{hint}}',

  // ── Rahmen der Rechtsdokumente (app/legal/) ────────────────────────────────
  /* Die Dokumente selbst erscheinen auf Englisch und werden nie übersetzt —
     nur der Rahmen drumherum. */
  legalUpdated: 'Aktualisiert am {{date}}',
  legalLinkExternal: '{{label}}, öffnet außerhalb der App',

  // ── Fehlende Konfiguration (components/common/ConfigMissing.tsx) ───────────
  configMissingTitle: 'Konfiguration fehlt',
  configMissingBody:
    'AceAiX erreicht sein Backend nicht, weil die Supabase-Umgebungsvariablen für diesen Build nicht gesetzt sind.',
  configMissingHint:
    'Trag sie für die lokale Entwicklung in `mobile/.env` ein oder als EAS-Secrets für einen Build und starte dann den Bundler neu.',
};
