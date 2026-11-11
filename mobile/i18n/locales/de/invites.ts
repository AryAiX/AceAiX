/**
 * Einladungen — ein persönlicher Link, der Kreis, der daraus entsteht, und
 * Tokens.
 *
 * Regeln für den Ton, in jeder Sprache:
 *
 *   * Freundlich und wie im Team: „hol dein Team dazu“, nie „verdiene Geld“.
 *   * Tokens sind AceAiX-Punkte. Nie Geld, Münzen, Bargeld, Krypto oder
 *     Belohnungen mit Wert nennen; nie versprechen, was man dafür bekommt.
 *   * Freunde werden immer nur mit Vornamen genannt.
 *
 * „AceAiX“ bleibt unverändert; „Token“ bleibt als Produktbegriff.
 */
export const invites = {
  // ── Namen ──────────────────────────────────────────────────────────────────
  title: 'Freunde einladen',
  circleTitle: 'Mein Kreis',
  tagline: 'Hol dein Team dazu. Für alle 10 Freunde, die mitmachen, bekommst du einen Token.',

  // ── Die Profilkarte ────────────────────────────────────────────────────────
  cardCta: 'Lade deine Freunde ein',
  cardCtaBody: 'Für alle 10 Freunde, die mitmachen, bekommst du 1 Token.',
  cardProgress: '{{n}} von {{total}} bis zu deinem nächsten Token',
  cardTokens: 'Deine Tokens: {{n}}',

  // ── Der Kreis ──────────────────────────────────────────────────────────────
  linkTitle: 'Dein Einladungslink',
  codeLabel: 'Dein Code',
  share: 'Einladung teilen',
  copy: 'Link kopieren',
  copied: 'Link kopiert',
  shareMessage:
    'Komm zu mir auf AceAiX, wo Sportler von Trainern und Vereinen entdeckt werden. Melde dich über meinen Link an: {{link}}. Oder gib nach der Anmeldung meinen Code {{code}} ein.',
  shareTitle: 'Komm zu mir auf AceAiX',
  nextToken: 'Noch {{n}} bis zu deinem nächsten Token',
  tokensLabel: 'Tokens',
  countedLabel: 'Dabei',
  pendingLabel: 'Richten sich ein',
  howTitle: 'So funktioniert’s',
  how1: 'Teil deinen Link oder Code mit Freunden.',
  how2: 'Ein Freund zählt, sobald er sein Profil fertig eingerichtet hat. Wer unter 18 ist, zählt, sobald ein Elternteil zustimmt.',
  how3: 'Für alle 10 Freunde, die zählen, bekommst du 1 Token.',
  tokensNote: 'Tokens sind AceAiX-Punkte. Sie haben keinen Geldwert und können nicht gekauft, verkauft oder übertragen werden.',
  membersTitle: 'Freunde, die du eingeladen hast',
  membersEmpty: 'Noch niemand. Teil deinen Link und starte deinen Kreis.',
  statusQualified: 'Zählt',
  statusPending: 'Richtet Profil ein',
  invitedBy: 'Eingeladen von {{name}}',
  ledgerTitle: 'Token-Verlauf',
  ledgerGained: '+{{n}} Token',
  ledgerLost: '−{{n}} Token: Eine Einladung zählt nicht mehr',

  // ── Code selbst eingeben ───────────────────────────────────────────────────
  enterCodeTitle: 'Wurdest du eingeladen?',
  enterCodeBody:
    'Gib den Einladungscode deines Freundes in den ersten 14 Tagen ein. Nach der Einrichtung hast du einen Tag Zeit, ihn hinzuzufügen.',
  enterCodePlaceholder: 'Einladungscode',
  enterCodeAction: 'Code hinzufügen',
  enterCodeInvalid: 'Ein Einladungscode hat 8 Buchstaben und Zahlen.',
  claimed: 'Du bist über die Einladung von {{name}} dabei',

  notEligibleTitle: 'Einladungen sind für Sportler und Trainer',
  notEligibleBody: 'Wenn dich jemand eingeladen hat, siehst du es hier.',

  // ── Das Profil von jemand anderem ──────────────────────────────────────────
  badgeTier: 'Hat {{n}}+ Leute zu AceAiX gebracht',

  // ── Startseite eines Einladungslinks ───────────────────────────────────────
  landingTitle: '{{name}} hat dich zu AceAiX eingeladen',
  landingTitleNoName: 'Du bist zu AceAiX eingeladen',
  landingBody:
    'Auf AceAiX werden junge Sportler von Trainern und Vereinen entdeckt. Erstell dein kostenloses Konto und mach mit.',
  landingSignUp: 'Mein Konto erstellen',
  landingSignIn: 'Ich habe schon ein Konto',
  landingInvalidTitle: 'Dieser Einladungslink ist ungültig',
  landingInvalidBody: 'Bitte deinen Freund, ihn nochmal zu schicken. Du kannst trotzdem ein Konto erstellen.',
  landingSignedIn: 'Du hast schon ein Konto',
  landingSignedInBody: 'Wenn du dich in den letzten 14 Tagen angemeldet hast, kannst du diese Einladung noch hinzufügen.',
  landingAddInvite: 'Einladung hinzufügen',
  landingContinue: 'Weiter',
  landingCopy: 'Kopieren',
  landingCopied: 'Code kopiert',
  landingCopyFailed: 'Der Code ließ sich nicht kopieren. Markier ihn und kopier ihn selbst.',
  landingDownload:
    'Lade AceAiX herunter, erstelle ein Konto und gib diesen Code in den ersten 14 Tagen in der App ein.',
  landingAppStore: 'Im App Store laden',
  landingGooglePlay: 'Bei Google Play laden',
};
