/**
 * Nachrichten und Mitteilungen.
 *
 * Sortiert in der Reihenfolge, in der man sie trifft: das Postfach und eine
 * seiner Zeilen, das Sicherheitsmenü hinter jedem „…“, dann das Gespräch —
 * Kopf, Tagestrenner, Blasen, der Hinweis zu unter 18-Jährigen, die Karte, die
 * das Eingabefeld ersetzt, wenn eine Nachricht nicht zugestellt werden kann,
 * und das Eingabefeld selbst — und zuletzt die Mitteilungen.
 *
 * Zwei Dinge stehen mit Absicht woanders. Meldegründe sind nur Beschriftungen:
 * an die Moderation gehen englische Konstanten aus der Komponente. Und die
 * Sperrgründe aus der Datenbank (`minor_requires_verified_sender` und Co.)
 * werden ebenfalls nie übersetzt — nur die Erklärung dazu.
 */
export const messaging = {
  // ── Postfach ───────────────────────────────────────────────────────────────
  inboxTitle: 'Nachrichten',
  inboxEmptyTitle: 'Noch keine Nachrichten',
  inboxEmptyBody: 'Wenn ein Trainer oder Verein sich meldet, landet es hier.',
  inboxEmptyAction: 'Entdecken öffnen',

  // ── Eine Gesprächszeile ────────────────────────────────────────────────────
  previewBlocked: 'Du hast dieses Konto blockiert',
  previewNone: 'Noch keine Nachrichten',
  unreadMessages_one: '{{count}} ungelesene Nachricht',
  unreadMessages_other: '{{count}} ungelesene Nachrichten',
  /* Steht im Abzeichen statt einer vierstelligen Zahl. */
  unreadOverflow: '99+',
  conversationHint: 'Öffnet das Gespräch. Lang drücken für mehr Optionen.',

  // ── Sicherheitsmenü (Postfachzeile und „…“ im Gespräch) ────────────────────
  thisPerson: 'diese Person',
  thisPersonSentence: 'Diese Person',
  muteConversation: 'Gespräch stummschalten',
  unmuteConversation: 'Stummschaltung aufheben',
  muteHint: 'Nur auf diesem Handy. Die andere Person erfährt es nie.',
  reportHint: 'Sag uns, was nicht stimmt. Meldungen bleiben vertraulich.',
  blockPerson: '{{name}} blockieren',
  blockHint: 'Die Person kann dir dann nicht schreiben und dein Profil nicht finden.',

  reportPerson: '{{name}} melden',
  reportReasonPrompt: 'Wähle den Grund, der am besten passt. Wir sagen nie, wer gemeldet hat.',
  reasonHarassment: 'Belästigung oder Mobbing',
  reasonChildSafety: 'Kinderschutz',
  reasonScam: 'Betrug oder falsches Angebot',
  reasonSpam: 'Spam',
  reasonNudity: 'Nacktheit oder sexuelle Inhalte',
  reasonHate: 'Hassrede',
  reasonImpersonation: 'Falsche Identität',
  reasonOther: 'Etwas anderes',
  reportDetailsLabel: 'Sollen wir noch etwas wissen?',
  reportEmergencyNote:
    'Wenn gerade jemand in Gefahr ist, ruf zusätzlich den Notruf vor Ort an.',
  reportThanks: 'Danke für den Hinweis. Unser Team sieht sich das an.',

  blockConfirmTitle: '{{name}} blockieren?',
  blockConfirmBody:
    'Die Person sieht dein Profil und deine Beiträge nicht mehr, kann dir nicht schreiben, und du siehst sie auch nicht. Du kannst das in den Einstellungen rückgängig machen.',
  blockedToast: '{{name}} ist blockiert. Rückgängig in den Einstellungen.',

  // ── Gespräch ───────────────────────────────────────────────────────────────
  conversationNotOpened: 'Wir konnten dieses Gespräch nicht öffnen.',
  loadingMessages: 'Nachrichten werden geladen',
  threadStart: 'Hier beginnt euer Gespräch. Sag Hallo.',
  threadStartWith: 'Hier beginnt dein Gespräch mit {{name}}. Sag Hallo.',

  closedTitle: 'Dieses Gespräch ist geschlossen',
  closedBody:
    'Du hast dieses Konto blockiert, deshalb seht ihr euch beide nicht mehr. Du kannst das in den Einstellungen rückgängig machen.',
  closedAction: 'Zurück zu den Nachrichten',
  blockedFromThread: 'Von diesem Konto hörst du nichts mehr.',

  // ── Kopf des Gesprächs ─────────────────────────────────────────────────────
  backToMessages: 'Zurück zu den Nachrichten',
  openProfileOf: 'Profil von {{name}} öffnen',
  loadingConversation: 'Gespräch wird geladen',
  moreOptions: 'Mehr Optionen',

  // ── Eine Nachricht ─────────────────────────────────────────────────────────
  messageFailedA11y: 'Nachricht nicht gesendet. Tipp an, um es noch einmal zu versuchen.',
  notSent: 'Nicht gesendet — antippen',
  sending: 'Wird gesendet',

  // ── Hinweis zu unter 18-Jährigen ───────────────────────────────────────────
  /* Rechtlicher Text. Der Sinn ist genau und muss in jeder Sprache genau
     bleiben: die angeschriebene Person ist unter 18, und ihr Elternteil oder
     Vormund kann sehen, dass dieses Gespräch besteht — nicht, was darin
     steht. */
  minorBanner:
    'Du schreibst einer Person unter 18. Ihr Elternteil oder Vormund kann sehen, dass dieses Gespräch besteht.',

  // ── Nachricht gesperrt ─────────────────────────────────────────────────────
  blockedVerifiedSenderTitle: 'Nachrichten sind hier begrenzt',
  blockedVerifiedSenderBody:
    '{{name}} ist unter 18. Nur Trainer und Vereine, die wir geprüft haben, können ein Gespräch beginnen.',
  blockedGuardianConsentTitle: 'Warten auf ein Elternteil oder Vormund',
  blockedGuardianConsentBody:
    '{{name}} ist unter 18, und das Elternteil oder der Vormund hat Nachrichten noch nicht freigegeben.',
  blockedMessagesOffTitle: 'Nachrichten sind abgeschaltet',
  blockedMessagesOffBody: '{{name}} möchte gerade keine Nachrichten bekommen.',
  blockedOnlyFollowedTitle: 'Nicht offen für neue Nachrichten',
  blockedOnlyFollowedBody: '{{name}} nimmt nur Nachrichten von Leuten an, denen sie folgt.',
  blockedOnlyVerifiedTitle: 'Nur geprüfte Konten',
  blockedOnlyVerifiedBody:
    '{{name}} nimmt nur Nachrichten von geprüften Trainern und Vereinen an.',
  blockedNotFoundTitle: 'Dieses Konto gibt es nicht mehr',
  blockedNotFoundBody: 'Die Person, der du geschrieben hast, ist nicht mehr bei AceAiX.',
  blockedDefaultTitle: 'Hier kannst du nicht schreiben',
  blockedDefaultBody: 'Wir können {{name}} gerade keine Nachrichten zustellen.',

  howTitle: 'So laufen Nachrichten',
  howSubtitle:
    'AceAiX ist für junge Sportlerinnen und Sportler gemacht, deshalb ist mit Absicht begrenzt, wer ein Gespräch beginnen darf.',
  howMinorsTitle: 'Unter 18 gilt zusätzlicher Schutz',
  howMinorsBody:
    'Ein Erwachsener kann ein Gespräch mit einer Person unter 18 nur beginnen, wenn wir ihn als Trainer oder Verein geprüft haben und ihr Elternteil oder Vormund Nachrichten freigegeben hat.',
  howInboxTitle: 'Jeder bestimmt sein eigenes Postfach',
  howInboxBody:
    'Alle können Nachrichten auf geprüfte Trainer und Vereine begrenzen, auf Leute, denen sie folgen, oder sie ganz abschalten. Das ist ihre Entscheidung, und wir setzen uns nicht darüber hinweg.',
  howTemporaryTitle: 'Nichts davon ist für immer',
  howTemporaryBody:
    'Sobald ein Elternteil oder Vormund Nachrichten freigibt oder die Person ihre Einstellung ändert, öffnet sich dieses Gespräch von selbst. Gegenseitig zu folgen hilft auch.',
  howWrongTitle: 'Wenn sich etwas falsch anfühlt',
  howWrongBody:
    'Melde oder blockiere über das „…“ oben in jedem Gespräch. Meldungen bleiben vertraulich — wir sagen der anderen Person nie, wer gemeldet hat.',
  gotIt: 'Verstanden',

  // ── Eingabefeld ────────────────────────────────────────────────────────────
  composerPlaceholder: 'Nachricht schreiben',
  composerPlaceholderNamed: 'An {{name}} schreiben',
  sendMessage: 'Nachricht senden',

  // ── Mitteilungen ───────────────────────────────────────────────────────────
  notificationsTitle: 'Mitteilungen',
  sectionNew: 'Neu',
  sectionEarlier: 'Früher',
  markAllRead: 'Alle als gelesen',
  markAllReadA11y_one: '{{count}} Mitteilung als gelesen markieren',
  markAllReadA11y_other: 'Alle {{count}} Mitteilungen als gelesen markieren',
  notificationsEmptyTitle: 'Nichts Neues',
  notificationsEmptyBody: 'Poste einen Clip oder folge ein paar Vereinen, dann füllt sich das hier.',
  notificationsEmptyAction: 'Leute zum Folgen finden',

  // ── Eine Mitteilung ────────────────────────────────────────────────────────
  /* Der Satz selbst kommt fertig vom Server — siehe die Notiz KNOWN GAP in
     NotificationRow. Uns gehört nur der Namensteil davor: der Server stellt
     den neuesten Namen nach vorn und zählt den Rest, und `groupedTitle` ist
     die Stelle, an der eine Sprache mit Leserichtung von rechts nach links
     die beiden Hälften tauschen kann. */
  actorAndOthers_one: '{{name}} und {{count}} weitere Person',
  actorAndOthers_other: '{{name}} und {{count}} weitere',
  groupedTitle: '{{actors}}{{rest}}',
  unread: 'Ungelesen',
};
