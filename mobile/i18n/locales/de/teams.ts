/**
 * Die Teams, die jemand unterstützt.
 *
 * Eine Unterscheidung muss die Übersetzung überstehen: Hier geht es ums
 * Fansein, nie ums Spielen. „Deine Teams“ sind die Trikots, die jemand
 * besitzt; wo ein Sportler spielt, heißt in `onboarding` und `profile`
 * „aktueller Verein“. Wer beides zusammenwirft, macht aus einer Tatsache für
 * Scouts eine Vorliebe.
 */
export const teams = {
  // ── Der Schritt bei der Anmeldung ──────────────────────────────────────────
  stepTitle: 'Wen unterstützt du?',
  stepBody:
    'Wähl bis zu fünf. Das hat nichts damit zu tun, wo du spielst — hier geht es nur um das Trikot, das du besitzt.',
  stepSkip: 'Erst mal überspringen',

  venueTitle: 'Lieblingsstadion',
  venueBody:
    'Ein Stadion, in das du morgen fahren würdest, wenn dir jemand ein Ticket in die Hand drückt.',
  venuePlaceholder: 'Santiago Bernabéu, Azadi, Old Trafford…',

  // ── Auswahl ────────────────────────────────────────────────────────────────
  searchPlaceholder: 'Vereine und Nationalmannschaften suchen',
  popular: 'Gerade beliebt',
  selected_one: '{{count}} ausgewählt',
  selected_other: '{{count}} ausgewählt',
  maxReached: 'Fünf ist die Grenze — nimm eins weg, um ein anderes hinzuzufügen.',
  noResults: 'Nichts zu „{{query}}“ gefunden.',
  addCustom: '„{{name}}“ hinzufügen',
  addCustomHint: 'Nur du siehst es, bis wir es uns angesehen haben.',
  addedCustom: 'Hinzugefügt. Es steht jetzt in deinem Profil.',
  followersCount_one: '{{count}} Fan hier',
  followersCount_other: '{{count}} Fans hier',

  // ── Auf einem Profil ───────────────────────────────────────────────────────
  supportsTitle: 'Unterstützt',
  venueLabel: 'Lieblingsstadion',
  emptySelf:
    'Trag die Teams ein, die du unterstützt — das ist der schnellste Weg, Leute wie dich zu finden.',
  emptyOther: 'Noch keine Teams.',
  editAction: 'Teams bearbeiten',
  savedToast: 'Teams aktualisiert.',

  // ── Die Teamseite ──────────────────────────────────────────────────────────
  fansTitle: 'Fans auf AceAiX',
  fansEmpty: 'Hier unterstützt sie noch niemand. Du wärst der Erste.',
  fansLoadMore: 'Mehr anzeigen',
  alsoSupports: 'Unterstützt auch {{team}}',
  sharedTeams_one: 'Ihr unterstützt beide {{teams}}',
  sharedTeams_other: 'Ihr unterstützt beide {{teams}}',
};
