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
  searchChats: 'Chats durchsuchen',
  filterAll: 'Alle',
  filterUnread: 'Ungelesen',
  markRead: 'Gelesen',
  markUnread: 'Ungelesen',
  mute: 'Stumm',
  unmute: 'Laut',
  alreadyRead: 'Dieser Chat wurde bereits gelesen und kann nicht als ungelesen markiert werden.',
  select: 'Auswählen',
  selectAll: 'Alle auswählen',
  selectedCount_one: '{{count}} ausgewählt',
  selectedCount_other: '{{count}} ausgewählt',
  selectHint: 'Tippe auf Chats, um sie auszuwählen',
  receiptSent: 'Gesendet',
  receiptSeen: 'Gesehen',
  previewYou: 'Du: {{text}}',
  startTitle: 'Starte ein Gespräch',
  startBody: 'Schreib Athleten, Trainern und Vereinen über ihr Profil.',
  startAction: 'Leute finden',
  noMatches: 'Keine Chats passen zu deiner Suche.',
  allCaughtUp: 'Du bist auf dem neuesten Stand.',
  swipeHint: 'Wische einen Chat nach links für Gelesen und Stumm',
  sendTo: 'Senden an',
  pickChats: 'Chat auswählen',
  sendToChats: 'Senden · {{count}}',
  sharedToChats: 'Gesendet',
  shareSomeFailed: 'Nicht an alle Chats gesendet. Versuch es noch mal.',
  copyLink: 'Link kopieren',
  tapToOpen: 'Zum Öffnen tippen',
  viewProfile: 'Profil ansehen',
  postUnavailable: 'Beitrag nicht verfügbar',
  profileUnavailable: 'Profil nicht verfügbar',
  previewSharedPost: 'Hat einen Beitrag geteilt',
  previewSharedProfile: 'Hat ein Profil geteilt',
  tapToWatch: 'Zum Ansehen tippen',
  clipUnavailable: 'Clip nicht verfügbar',
  previewSharedClip: 'Hat einen Clip geteilt',

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
  sectionThisWeek: 'Diese Woche',
  likedYourPosts_one: '{{name}} gefällt {{count}} deiner Beiträge',
  likedYourPosts_other: '{{name}} gefallen {{count}} deiner Beiträge',
  moreNotifications_one: '+{{count}} weitere Mitteilung',
  moreNotifications_other: '+{{count}} weitere Mitteilungen',
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
  meetupNearbyTitle: 'Neues {{sport}}-Spiel in {{city}}',
  mentionedInPost: '{{name}} hat dich in einem Beitrag erwähnt',
  mentionedInComment: '{{name}} hat dich in einem Kommentar erwähnt',
  taggedInPost: '{{name}} hat dich in einem Beitrag markiert',
  referralJoined: '{{name}} ist über deine Einladung dabei',
  referralJoinedNoName: 'Ein Freund ist über deine Einladung dabei',
  referralTokenTitle: 'Du hast einen Token erhalten',
  referralTokenBody_one: '{{n}} Freund ist über deine Einladung bei AceAiX.',
  referralTokenBody_other: '{{n}} Freunde sind über deine Einladung bei AceAiX.',
  sportApproved: 'Deine Sportart wurde freigegeben: {{sport}}',
  sportMatched: 'Deine Sportart wurde auf {{sport}} gesetzt',
  sportRejected: 'Deine Sportanfrage wurde nicht freigegeben',
  followedYou: '{{actors}} folgt dir jetzt',
  likedYourPost: '{{actors}} hat deinen Beitrag geliked',
  commentedOnPost: '{{actors}} hat deinen Beitrag kommentiert',
  repliedToYou: '{{actors}} hat dir geantwortet',
  sentYouMessage: '{{actors}} hat dir eine Nachricht geschickt',
  viewedYourProfile: '{{actors}} hat dein Profil angesehen',
  challengeConfirmed: 'Deine Einsendung zu {{challenge}} ist bestätigt',
  challengeConfirmedPlain: 'Deine Einsendung ist bestätigt',
  challengeAnotherGo: 'Deine Einsendung zu {{challenge}} braucht einen neuen Versuch',
  challengeAnotherGoPlain: 'Deine Einsendung braucht einen neuen Versuch',
  challengeCoachConfirmed: 'Ein Trainer hat es angesehen und das Ergebnis bestätigt.',
  challengeCoachRetry: 'Lies die Aufgabe noch einmal und schick einen neuen Clip.',
  clubPageVerified: 'Deine Vereinsseite ist verifiziert',
  clubVerificationRejected: 'Die Verifizierung deines Vereins wurde nicht freigegeben',
  clubVerificationMoreInfo: 'Wir brauchen mehr Angaben, um deinen Verein zu verifizieren',
  clubInviteAccepted: 'Deine Einladung wurde angenommen',
  guardianApproved: 'Ein Elternteil hat dein Konto freigegeben',
  guardianChanged: 'Ein Elternteil hat geändert, was du tun darfst',
  guardianNotApproved: 'Ein Elternteil hat deine Anfrage nicht freigegeben',
  guardianWithdrawn: 'Die Freigabe eines Elternteils wurde zurückgezogen',
  giCompleted: '{{name}} hat die Game-Intelligence-Spiele abgeschlossen',
  giCompletedPrivate: 'Die Ergebnisse bleiben privat, außer die Person teilt sie.',
  sportFitCompleted: '{{name}} hat Sport Fit abgeschlossen',
  sportFitPrivate: 'Antworten und Ergebnis sieht nur die Person selbst.',
  scoreTierReached: 'Du hast die Stufe {{tier}} erreicht',
  scoreTierNow: 'Dein Talent Score ist jetzt {{score}}.',
  clubInviteRun: 'Du wurdest eingeladen, {{club}} mitzuleiten',
  clubEventCancelled: '{{event}} wurde abgesagt',
  clubEventRegistered: '{{name}} hat sich für {{event}} angemeldet',
  clubEventChildRegistered: 'Dein Kind hat sich für {{event}} angemeldet',
  clubSquadAdded: '{{club}} hat dich in sein {{squad}}-Team aufgenommen',
  clubMatchLive: '{{club}} gegen {{opponent}} ist live',
  meetupWantsToJoin: '{{name}} möchte bei {{meetup}} mitmachen',
  meetupYouAreIn: 'Du bist dabei: {{meetup}}',
  meetupNotThisTime: 'Diesmal nicht: {{meetup}}',
  meetupCalledOff: '{{meetup}} wurde abgesagt',
  challengeEntered: '{{name}} ist bei {{challenge}} angetreten',
  challengeNewClip: 'Ein neuer Clip wartet auf dich.',
  appliedTo: '{{name}} hat sich auf {{what}} beworben',
  applicationNow: 'Deine Bewerbung für {{opportunity}} ist jetzt {{status}}',
  endorsedYouFor: '{{name}} hat dich für {{skill}} empfohlen',
  bookedService: '{{name}} hat {{service}} gebucht',
  bookingCancelledByGuardian: 'Eine Buchung wurde von einem Elternteil abgesagt',
  coachingCancelledByAce: 'AceAiX hat eine Trainingseinheit abgesagt: {{reason}}',
  cancelledSessionOn: '{{name}} hat die Einheit am {{date}} abgesagt',
  parentCancelled: 'Dein Elternteil hat {{session}} abgesagt',
  childParentCancelled: 'Das Elternteil von {{child}} hat {{session}} abgesagt',
  cancelledSession: '{{name}} hat {{session}} abgesagt',
  aSession: 'eine Einheit',
  sponsorshipOfferFor: '{{sponsor}} hat ein Sponsoring-Angebot für {{request}} gemacht',
  sponsorshipOfferToChild: '{{sponsor}} hat deinem Kind ein Sponsoring-Angebot gemacht',
  anAthlete: 'Ein Sportler',
  childAppliedToCall: 'Dein Kind hat sich auf einen Sponsoring-Aufruf beworben: {{call}}',
  acceptedYourOffer: '{{name}} hat dein Sponsoring-Angebot angenommen',
  declinedYourOffer: '{{name}} hat dein Sponsoring-Angebot abgelehnt',
  acceptedYourApplication: '{{name}} hat deine Sponsoring-Bewerbung angenommen',
  declinedYourApplication: '{{name}} hat deine Sponsoring-Bewerbung abgelehnt',
  childParentAcceptedOffer: 'Das Elternteil von {{child}} hat dein Sponsoring-Angebot angenommen',
  childParentDeclinedOffer: 'Das Elternteil von {{child}} hat dein Sponsoring-Angebot abgelehnt',
  childParentWithdrewCall: 'Das Elternteil von {{child}} hat die Bewerbung auf deinen Aufruf zurückgezogen',
  parentAcceptedOfferFrom: 'Dein Elternteil hat das Sponsoring-Angebot von {{brand}} angenommen',
  parentDeclinedOfferFrom: 'Dein Elternteil hat das Sponsoring-Angebot von {{brand}} abgelehnt',
  parentWithdrewApplication: 'Dein Elternteil hat deine Bewerbung bei {{brand}} zurückgezogen',
  childOfferAccepted: 'Ein Sponsoring-Angebot für dein Kind wurde angenommen',
  childOfferDeclined: 'Ein Sponsoring-Angebot für dein Kind wurde abgelehnt',
  childApplicationAccepted: 'Eine Sponsoring-Bewerbung für dein Kind wurde angenommen',
  childApplicationDeclined: 'Eine Sponsoring-Bewerbung für dein Kind wurde abgelehnt',
};
