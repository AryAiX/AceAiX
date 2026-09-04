/**
 * Der Feed, der Editor und ein einzelner Beitrag.
 *
 * Sortiert in der Reihenfolge, in der man sie trifft: Start, dann eine Karte
 * und ihre Aktionen, dann Kommentare, dann das Sicherheitsmenü hinter jedem
 * „…“, dann der Editor, der Einzelbeitrag und der tote Link.
 *
 * Die Meldegründe stehen hier nur als Beschriftung — an die Moderation gehen
 * englische Konstanten aus der Komponente, die nie übersetzt werden.
 */
export const feed = {
  // ── Start ──────────────────────────────────────────────────────────────────
  scopeForYou: 'Für dich',
  scopeFollowing: 'Folge ich',

  messages: 'Nachrichten',
  messagesUnread_one: 'Nachrichten, {{count}} ungelesen',
  messagesUnread_other: 'Nachrichten, {{count}} ungelesen',
  notifications: 'Mitteilungen',
  notificationsNew_one: 'Mitteilungen, {{count}} neu',
  notificationsNew_other: 'Mitteilungen, {{count}} neu',

  emptyFollowingTitle: 'Von deinen Leuten kam noch nichts',
  emptyFollowingBody:
    'Folge Sportlern, Trainern und Vereinen, die dich interessieren — ihre Beiträge stehen dann genau hier.',
  emptyFollowingAction: 'Leute zum Folgen finden',
  emptyForYouTitle: 'Dein Feed kommt in Fahrt',
  emptyForYouBody:
    'Folge ein paar Sportlern, um ihn zu füllen, oder poste selbst etwas.',
  emptyForYouAction: 'Leute finden',

  // ── Beitragskarte ──────────────────────────────────────────────────────────
  openProfileOf: 'Profil von {{name}} öffnen',
  postMoreOptions: 'Mehr Optionen zum Beitrag von {{name}}, auch melden und blockieren',
  showFullCaption: 'Ganzen Text anzeigen',
  openPost: 'Beitrag öffnen',

  // ── Liken, kommentieren, teilen, sichern ───────────────────────────────────
  likePost: 'Diesen Beitrag liken',
  unlikePost: 'Like zurücknehmen',
  readAndAddComments: 'Kommentare lesen und schreiben',
  sharePost: 'Diesen Beitrag teilen',
  savePost: 'Diesen Beitrag sichern',
  removeFromSaved: 'Aus Gesichertem entfernen',

  // ── Medien ─────────────────────────────────────────────────────────────────
  mediaSwipe_one: '{{count}} Element, wische für mehr',
  mediaSwipe_other: '{{count}} Elemente, wische für mehr',
  mediaPosition: '{{current}}/{{total}}',
  videoClip: 'Videoclip',
  soundOn: 'Ton an',
  soundOff: 'Ton aus',

  // ── Kommentare ─────────────────────────────────────────────────────────────
  commentsTitle: 'Kommentare',
  commentsHeading_one: 'Kommentare ({{count}})',
  commentsHeading_other: 'Kommentare ({{count}})',
  noCommentsTitle: 'Noch keine Kommentare',
  noCommentsBody: 'Sag etwas Aufbauendes.',
  reply: 'Antworten',
  replyTo: '{{name}} antworten',
  replyingTo: 'Du antwortest {{name}}',
  stopReplying: 'Nicht mehr antworten',
  commentPlaceholder: 'Kommentar schreiben…',
  writeComment: 'Einen Kommentar schreiben',
  postComment: 'Kommentar senden',
  ownCommentOptions: 'Optionen für deinen Kommentar',
  reportOrBlockPerson: '{{name}} melden oder blockieren',

  // ── Sicherheitsmenü ────────────────────────────────────────────────────────
  thisPerson: 'diese Person',
  actionsOwnPost: 'Dein Beitrag',
  actionsOwnComment: 'Dein Kommentar',
  actionsPost: 'Dieser Beitrag',
  actionsComment: 'Dieser Kommentar',
  linkCopied: 'Link kopiert',
  linkCopyFailed: 'Wir konnten den Link nicht kopieren.',
  deletePost: 'Beitrag löschen',
  deleteComment: 'Kommentar löschen',
  reportPost: 'Beitrag melden',
  reportComment: 'Kommentar melden',
  reportHint: 'Sag uns, was nicht stimmt. Meldungen bleiben vertraulich.',
  blockPerson: '{{name}} blockieren',
  blockHint: 'Die Person kann dich dann nicht finden und dir nicht schreiben.',

  reportThisPost: 'Diesen Beitrag melden',
  reportThisComment: 'Diesen Kommentar melden',
  reportReasonPrompt: 'Wähle den Grund, der am besten passt. Wir sagen nie, wer gemeldet hat.',
  reasonSpam: 'Spam',
  reasonHarassment: 'Belästigung oder Mobbing',
  reasonNudity: 'Nacktheit oder sexuelle Inhalte',
  reasonViolence: 'Gewalt',
  reasonHate: 'Hassrede',
  reasonImpersonation: 'Falsche Identität',
  reasonChildSafety: 'Kinderschutz',
  reasonScam: 'Betrug',
  reasonOther: 'Etwas anderes',
  reportDetailsLabel: 'Sollen wir noch etwas wissen?',
  reportEmergencyNote:
    'Wenn gerade jemand in Gefahr ist, ruf zusätzlich den Notruf vor Ort an.',
  reportThanks: 'Danke für den Hinweis. Unser Team sieht sich das an.',

  blockConfirmTitle: '{{name}} blockieren?',
  blockConfirmBody:
    'Die Person sieht dein Profil und deine Beiträge nicht mehr, kann dir nicht schreiben, und du siehst sie auch nicht. Du kannst das in den Einstellungen rückgängig machen.',
  blockedToast: '{{name}} ist blockiert. Rückgängig in den Einstellungen.',

  deletePostConfirmTitle: 'Diesen Beitrag löschen?',
  deleteCommentConfirmTitle: 'Diesen Kommentar löschen?',
  deleteConfirmBody: 'Das lässt sich nicht rückgängig machen.',
  keepIt: 'Behalten',
  postDeleted: 'Beitrag gelöscht',
  commentDeleted: 'Kommentar gelöscht',

  // ── Editor ─────────────────────────────────────────────────────────────────
  composeTitle: 'Neuer Beitrag',
  cancelAndClose: 'Abbrechen und schließen',
  postButton: 'Posten',
  uploading: '{{done}} von {{total}} werden geladen…',
  audienceA11y: 'Wer das sieht: {{audience}}. Ändern.',
  composePlaceholder: 'Teil ein Update, ein Ergebnis oder einen Clip…',
  composeA11y: 'Was willst du teilen?',
  charCount: '{{used}}/{{max}}',
  clip: 'Clip',
  selectedPhoto: 'Ausgewähltes Foto {{index}}',
  selectedVideo: 'Ausgewähltes Video {{index}}',
  removePhoto: 'Foto {{index}} entfernen',
  removeVideo: 'Video {{index}} entfernen',
  addMedia: 'Foto oder Video hinzufügen',
  addMediaA11y: 'Ein Foto oder Video hinzufügen',
  mediaCount: '{{used}}/{{max}}',
  photoPermission:
    'AceAiX braucht die Erlaubnis, deine Fotos zu öffnen. Gib sie in den Einstellungen.',
  posted: 'Gepostet',
  /* Für Dreizehnjährige geschrieben: kurz, klar, alle drei Beispiele drin. */
  safetyNote: 'Bleib fair. Teil nicht deine Adresse, Handynummer oder Schule.',

  audienceSheetTitle: 'Wer sieht das?',
  audienceEveryone: 'Alle',
  audienceEveryoneDetail: 'Jeder bei AceAiX kann es sehen.',
  audienceFollowersDetail: 'Nur Leute, die dir folgen.',
  audienceConnections: 'Kontakte',
  audienceConnectionsDetail: 'Nur Leute, denen du folgst und die dir zurückfolgen.',

  discardTitle: 'Beitrag verwerfen?',
  discardBody: 'Dein Text und alles, was du ausgewählt hast, geht verloren.',
  discard: 'Verwerfen',
  keepWriting: 'Weiterschreiben',

  // ── Ein Beitrag ────────────────────────────────────────────────────────────
  postTitle: 'Beitrag',
  postUnavailableTitle: 'Diesen Beitrag gibt es nicht mehr',
  postUnavailableBody: 'Vielleicht wurde er gelöscht oder entfernt.',
  postUnavailableBodyRules:
    'Vielleicht wurde er gelöscht oder entfernt, weil er gegen unsere Regeln verstößt.',
  goBack: 'Zurück',

  // ── Toter Link ─────────────────────────────────────────────────────────────
  notFoundTitle: 'Diese Seite gibt es nicht mehr',
  notFoundBody: 'Der Link, dem du gefolgt bist, führt bei AceAiX nirgendwohin.',
  notFoundAction: 'Zurück zum Start',
};
