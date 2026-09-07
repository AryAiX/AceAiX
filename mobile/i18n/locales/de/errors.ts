/**
 * Was schiefgehen kann, klar gesagt.
 *
 * `lib/errors.ts` ordnet Datenbank-Codes und Supabase-Auth-Meldungen diesen
 * Schlüsseln zu, damit ein Fehler überall in der Sprache der Leserin
 * erscheint.
 */
export const errors = {
  generic: 'Da ist etwas schiefgegangen. Bitte versuch es noch einmal.',
  offline: 'Keine Verbindung. Prüf dein Internet und versuch es noch einmal.',
  sessionExpired: 'Deine Sitzung ist abgelaufen. Melde dich neu an.',
  notSignedIn: 'Dafür musst du angemeldet sein.',

  // Hinweise aus der Datenbank
  guardianConsentRequired:
    'Ein Elternteil oder Vormund muss dein Profil freigeben, bevor es in der Suche erscheint.',
  messagingNotPermitted:
    'Du kannst diesem Konto nicht schreiben. Vielleicht nimmt es nur Nachrichten von geprüften Trainern und Vereinen an.',
  rateLimited: 'Das geht gerade zu schnell. Warte kurz und versuch es noch einmal.',
  ageBelowMinimum: 'Du musst mindestens 13 Jahre alt sein, um AceAiX zu nutzen.',

  // Datenbank-Codes
  alreadyExists: 'Das gibt es schon.',
  missingReference: 'Etwas, das dazugehört, fehlt. Lade die Seite neu.',
  invalidDetails: 'Ein paar dieser Angaben stimmen nicht.',
  noPermission: 'Dafür fehlt dir die Berechtigung.',
  notFound: 'Das haben wir nicht gefunden.',

  // Anmeldung
  invalidCredentials: 'E-Mail oder Passwort stimmt nicht.',
  emailNotConfirmed: 'Sieh in dein Postfach und bestätige zuerst deine E-Mail-Adresse.',
  emailInUse: 'Diese E-Mail wird schon genutzt. Versuch, dich anzumelden.',
  passwordTooShort: 'Wähle ein Passwort mit mindestens 8 Zeichen.',
  tooManyAttempts: 'Zu viele Versuche. Warte ein paar Minuten und versuch es noch einmal.',

  // Challenges und Fansein
  challengeClosed: 'Diese Aufgabe ist beendet.',
  challengeNotAllowed: 'Nur geprüfte Trainer und Vereine können eine Aufgabe stellen.',
  clipRequired: 'Wähl zuerst einen deiner eigenen öffentlichen Clips.',
  ageOutOfRange: 'Diese Aufgabe ist für eine andere Altersgruppe.',
  favoriteTeamsMax: 'Fünf Teams sind die Grenze — nimm eins weg, um ein anderes hinzuzufügen.',
  profileIncomplete: 'Mach zuerst dein Sportlerprofil fertig.',
  notAnAthlete: 'Nur Sportler haben einen Talent Score.',
};
