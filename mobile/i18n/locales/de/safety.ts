/**
 * Sicherheit — Blockieren, Zustimmung der Eltern und alles, was Minderjährige
 * schützt.
 *
 * Mit Absicht getrennt von `settings.ts`: das hier ist rechtlicher Text, und
 * wer ihn prüft, soll ihn in jeder Sprache an einem Ort lesen können, ohne
 * sich durch Farbschemata und Mitteilungsschalter zu arbeiten.
 *
 * Jede Aussage hier trägt Gewicht. 13 ist das Mindestalter. Wer 13 bis 17 ist,
 * bleibt aus der Suche ausgeblendet und kann nicht angeschrieben werden, bis
 * ein Elternteil oder Vormund zustimmt. „Alle“ wird Minderjährigen nie als
 * Postfach-Einstellung angeboten. Übersetze die Worte; schwäch nichts ab,
 * verallgemeinere nicht und lass keine Bedingung weg.
 *
 * Meldegründe stehen auf Englisch in der Datenbank — übersetzt ist nur die
 * Beschriftung, die eine meldende Person liest.
 */
export const safety = {
  // ── Blockieren (app/settings/blocked.tsx) ──────────────────────────────────
  blockedTitle: 'Blockierte Konten',
  blockedEmptyTitle: 'Du hast niemanden blockiert.',
  blockedEmptyBody:
    'Wer blockiert ist, kann dir nicht schreiben, dir nicht folgen und deine Beiträge nicht sehen. Die Person erfährt es nie.',
  blockedCount_one:
    '{{count}} Konto ist blockiert. Es kann dir nicht schreiben, dir nicht folgen und deine Beiträge nicht sehen.',
  blockedCount_other:
    '{{count}} Konten sind blockiert. Sie können dir nicht schreiben, dir nicht folgen und deine Beiträge nicht sehen.',
  unblockConfirmTitle: 'Blockierung von {{name}} aufheben?',
  unblockConfirmBody:
    'Je nach deinen Einstellungen kann die Person dich wieder finden, dir folgen und dir schreiben. Sie erfährt so oder so nichts davon.',
  unblockedToast: 'Blockierung von {{name}} aufgehoben',

  /** Steht auf dem Privatsphäre-Bildschirm, wo Blockieren erklärt wird. */
  blockingExplainer:
    'Wer blockiert ist, kann dich nicht kontaktieren, dir nicht folgen und deine Beiträge nicht sehen, und erfährt nichts davon. Du kannst es unter {{settings}} und dann {{blocked}} rückgängig machen.',

  // ── Minderjährige (app/settings/privacy.tsx) ───────────────────────────────
  minorMessagingNote:
    'Weil du unter 18 bist, gibt es „Alle“ hier nicht. Nur geprüfte Trainer und Vereine können dir zuerst schreiben, und auch nur, wenn ein Elternteil oder Vormund Nachrichten freigegeben hat.',
  minorNeverPublic:
    'Du bist unter 18, deshalb wird dein Profil nie jemandem gezeigt, der nicht angemeldet ist. Dafür gibt es keine Einstellung und keine Möglichkeit, es abzuschalten — das setzt unsere Datenbank durch, nicht die App.',
  minorsNeverPublicNote:
    'Profile von Personen unter 18 werden nicht angemeldeten Besuchern nie gezeigt, egal was in ihren Einstellungen steht.',
  discoveryWaitingGuardian: 'Warten auf ein Elternteil oder Vormund',
  guardianApprovalNeeded: 'Ein Elternteil oder Vormund muss das erst freigeben.',
  askGuardian: 'Ein Elternteil oder Vormund fragen',

  /** Kontobildschirm: warum es die Prüfung gibt und was sie freischaltet. */
  verificationFooter:
    'Ein Prüfabzeichen sagt Sportlern und Vereinen, dass wir nachgesehen haben, wer du bist. Nur geprüfte Erwachsene können außerdem ein Gespräch mit einer Person unter 18 beginnen.',

  /** Sichtungseinstellungen: was ein Recruiter bei Minderjährigen darf. */
  scoutingMinorNote:
    'Sportler unter 18 erscheinen hier erst, wenn ein Elternteil oder Vormund zugestimmt hat, und du kannst ihnen nur schreiben, wenn dein Konto geprüft ist.',

  // ── Zustimmung der Eltern (app/settings/guardian.tsx) ──────────────────────
  guardianTitle: 'Eltern und Vormund',
  guardianAthletesTitle: 'Sportler, um die du dich kümmerst',
  guardianSubtitleMinor: 'Freigabe für dein Profil',

  // Was ein Elternteil freigibt, eine Erlaubnis nach der anderen
  scopeDiscovery: 'In der Scout-Suche erscheinen',
  scopeDiscoveryOff: 'Aus der Suche ausgeblendet',
  scopeMessaging: 'Nachrichten von geprüften Trainern und Vereinen erhalten',
  scopeMessagingOff: 'Niemand kann zuerst schreiben',
  scopeMedia: 'Fotos und Videos im Profil zeigen',
  scopeMediaOff: 'Keine Fotos oder Videos',

  // Die Sicht des jungen Sportlers
  minorHeading: 'Dein Elternteil oder Vormund',
  minorIntro:
    'Du bist unter 18, deshalb muss ein Erwachsener dein Profil freigeben, bevor Trainer und Vereine dich finden können. Bis dahin bist du aus der Suche ausgeblendet und niemand kann dir zuerst schreiben.',

  consentApproved: 'Freigegeben',
  consentActive: 'Aktiv',
  consentGrantedMeta: '{{name}} · {{date}}',
  whatTheyApproved: 'Was freigegeben wurde',
  changeConsentNote:
    'Um daran etwas zu ändern, bitte {{name}}, den Link zu öffnen, den wir an {{email}} geschickt haben, oder an {{contact}} zu schreiben.',
  withdrawPermission: 'Freigabe zurückziehen',

  consentWaitingTitle: 'Warten auf Freigabe',
  consentPending: 'Offen',
  consentSentOn: 'Gesendet am {{date}}',
  consentEmailNote_one:
    'Wir haben einen sicheren Link geschickt. Er gilt {{count}} Tag. Wenn nichts angekommen ist, bitte im Spam nachsehen und ihn dann erneut senden.',
  consentEmailNote_other:
    'Wir haben einen sicheren Link geschickt. Er gilt {{count}} Tage. Wenn nichts angekommen ist, bitte im Spam nachsehen und ihn dann erneut senden.',
  resendEmail: 'E-Mail erneut senden',
  resentToast: 'Wir haben die E-Mail noch einmal geschickt.',

  consentRevokedNote:
    'Die Freigabe wurde am {{date}} zurückgezogen. Dein Profil ist aus der Suche ausgeblendet, bis ein Erwachsener es wieder freigibt.',

  // Um Erlaubnis bitten
  askForPermission: 'Um Erlaubnis bitten',
  askSomeoneElse: 'Jemand anderen fragen',
  requestFormHint:
    'Wir schicken einen Link per E-Mail. Die Person wählt, was erlaubt ist, und kann es sich jederzeit anders überlegen.',
  guardianNameLabel: 'Ihr vollständiger Name',
  guardianNamePlaceholder: 'z. B. Amina Haddad',
  guardianEmailLabel: 'Ihre E-Mail-Adresse',
  relationshipQuestion: 'Wer ist das für dich?',
  relationshipParent: 'Elternteil',
  relationshipGuardian: 'Vormund',
  relationshipOther: 'Andere',
  guardianEmailUseNote:
    'Nimm eine echte Adresse, die sie auch liest. Wir nutzen sie nur, um um Erlaubnis zu bitten und über Änderungen an deinem Konto zu informieren.',
  sendRequest: 'Anfrage senden',
  sendNewRequest: 'Neue Anfrage senden',
  replacesPending: 'Eine neue Anfrage ersetzt die, die noch offen ist.',
  requestSentToast: 'Gesendet. Bitte sie, ins Postfach zu sehen.',
  nameRequired: 'Schreib bitte ihren vollständigen Namen.',
  emailInvalid: 'Diese E-Mail-Adresse sieht nicht richtig aus.',

  whatChangesHeading: 'Was sich mit der Freigabe ändert',
  whatChangesBody:
    'Dein Profil kann in der Scout-Suche erscheinen, und geprüfte Trainer und Vereine können dir eine erste Nachricht schicken. Sonst ändert sich nichts, und dein genaues Alter und Geburtsdatum bleiben privat.',
  readChildSafety: 'Unsere Standards zum Kinderschutz lesen',

  withdrawConfirmTitle: 'Freigabe zurückziehen?',
  withdrawConfirmBody:
    'Dein Profil wird wieder aus der Scout-Suche ausgeblendet, und Trainer können keine neuen Gespräche mit dir beginnen. Du kannst jederzeit wieder um Erlaubnis bitten.',
  withdraw: 'Zurückziehen',
  consentWithdrawnToast: 'Freigabe zurückgezogen. Dein Profil ist wieder aus der Suche ausgeblendet.',

  // Die Sicht des Elternteils
  approvingHeading: 'Einen jungen Sportler freigeben',
  approvingBody1:
    'Wenn eine 13- bis 17-jährige Person dich als Elternteil oder Vormund nennt, schicken wir dir einen sicheren Link per E-Mail. Öffne ihn, und du kannst drei Dinge einzeln erlauben oder ablehnen: in der Scout-Suche erscheinen, Nachrichten von geprüften Trainern und Vereinen erhalten und Fotos und Videos zeigen.',
  approvingBody2_one:
    'Der Link gilt {{count}} Tag. Bis du ihn nutzt, bleibt das Profil aus der Suche ausgeblendet und kein Erwachsener kann schreiben. Du kannst deine Entscheidung jederzeit über denselben Link ändern oder zurückziehen oder an {{email}} schreiben.',
  approvingBody2_other:
    'Der Link gilt {{count}} Tage. Bis du ihn nutzt, bleibt das Profil aus der Suche ausgeblendet und kein Erwachsener kann schreiben. Du kannst deine Entscheidung jederzeit über denselben Link ändern oder zurückziehen oder an {{email}} schreiben.',
  guardianPhishingNote:
    'Wir bitten dich nie per E-Mail um eine Zahlung, Bankdaten oder die Kopie eines Ausweises. Wenn eine Nachricht behauptet, von AceAiX zu sein, und danach fragt, ist sie nicht von uns.',

  linkedAthletes: 'Mit dir verbundene Sportler',
  noLinkedAthletes:
    'Bisher hat dich niemand genannt. Sobald das passiert, kommt die Anfrage per E-Mail und erscheint hier.',
  linkApprovedOn: 'Freigegeben am {{date}}',
  linkRequestedOn: 'Angefragt am {{date}}',
  linkWithdrawn: 'Freigabe zurückgezogen',
  linkExpired: 'Anfrage abgelaufen',
  badgeWithdrawn: 'Zurückgezogen',
  badgeExpired: 'Abgelaufen',

  // Was ein Elternteil sieht: dass es ein Gespräch gibt, nie seinen Inhalt
  whoTheyTalkTo: 'Mit wem gesprochen wird',
  noConversations: 'Noch keine Gespräche.',
  messageContentsNote:
    'AceAiX zeigt dir nicht, was in den Nachrichten steht. Wenn dich etwas beunruhigt, schreib an {{email}}.',

  guardianContactNote:
    'Fragen zum Konto einer jungen Person: {{privacyEmail}}. Alles zu ihrer Sicherheit: {{safetyEmail}}.',

  // Ein Erwachsener, der auf diesem Bildschirm gelandet ist
  adultNothingTitle: 'Nichts freizugeben',
  adultNothingBody:
    'Die Freigabe durch Eltern gilt für Konten von 13- bis 17-Jährigen. Deins ist ein Erwachsenenkonto, für Profil und Nachrichten gelten also deine eigenen Privatsphäre-Einstellungen.',
};
