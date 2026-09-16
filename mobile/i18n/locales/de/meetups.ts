/**
 * Meetups — arranging to actually play with people. German.
 *
 * Two words carry weight through translation and are kept apart here:
 *
 *   * a **spot** is a place in the game: `Platz`, `Plätze`. Because `Platz` is
 *     also the ground you play on, the geography in this file never uses it —
 *     that is `Stadt`, `Gegend` and `Anlage`, and `Sportplatz`/`Bolzplatz` are
 *     avoided on purpose. Keep the two apart if you rewrite anything.
 *   * **host** is `Gastgeber`, or the verb `organisieren` where a verb reads
 *     better. Never `Trainer`, never `Kapitän`. This person put one game
 *     together and picks who plays, and that is the whole of it.
 *
 * Informal `du` throughout, like every other German file here.
 *
 * German runs long. The buttons and chips — `post`, `accept`, `decline`,
 * `clearFilters`, the `level*` set — are held to one short word so they survive
 * a narrow phone. If you swap one for a compound (`Wettkampfniveau`,
 * `Spielanfrage senden`), look at it on a small screen before shipping it.
 *
 * The feature is eighteen-plus, enforced in the database. Nothing here has to
 * explain that to a minor, because a minor never sees these strings.
 */
export const meetups = {
  // ── Der Tab ────────────────────────────────────────────────────────────────
  title: 'Spielen',
  subtitle: 'Finde Leute zum Spielen, egal wo du gerade bist',

  // ── Suche ──────────────────────────────────────────────────────────────────
  searchPlace: 'Wo? Stadt, Gegend oder Anlage',
  searchPlaceHint: 'Wo du gerade bist, oder wo du hinfährst',
  anySport: 'Jede Sportart',
  anyLevel: 'Jedes Niveau',
  anyDate: 'Jedes Datum',
  today: 'Heute',
  thisWeek: 'Diese Woche',
  thisMonth: 'Diesen Monat',
  filters: 'Filter',
  clearFilters: 'Leeren',

  emptyTitle: 'Hier ist noch nichts',
  emptyBody:
    'Für diese Gegend und diese Zeit hat noch niemand ein Spiel eingetragen. Mach den Anfang — jemand anders sucht bestimmt auch.',
  emptyAction: 'Spiel eintragen',
  emptySearchTitle: 'Nichts gefunden',
  emptySearchBody: 'Nimm mehr Tage dazu, oder eine Gegend nebenan.',

  // ── Eine Karte ─────────────────────────────────────────────────────────────
  spotsLeft_one: 'Noch {{count}} Platz frei',
  spotsLeft_other: 'Noch {{count}} Plätze frei',
  spotsOf: '{{taken}} von {{total}}',
  full: 'Voll',
  cancelled: 'Abgesagt',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'Gastgeber',
  hostedBy: 'Organisiert von {{name}}',
  costEach: '{{cost}} pro Person',

  levelAny: 'Jedes Niveau',
  levelBeginner: 'Anfänger',
  levelIntermediate: 'Mittel',
  levelAdvanced: 'Fortgeschritten',
  levelCompetitive: 'Wettkampf',

  // ── Eintragen ──────────────────────────────────────────────────────────────
  createTitle: 'Spiel eintragen',
  createSubtitle:
    'Sag, was du spielen willst, wo und wann. Leute fragen an, und du entscheidest.',
  fieldSport: 'Sportart',
  fieldTitle: 'Worum geht es?',
  fieldTitlePlaceholder: 'Samstagskick, 5 gegen 5',
  fieldCountry: 'Land',
  fieldCity: 'Stadt',
  fieldArea: 'Gegend',
  fieldAreaPlaceholder: 'Al Jadaf, Marina, Puerto Banús…',
  fieldVenue: 'Anlage',
  fieldVenuePlaceholder: 'Halle, Verein oder wo ihr sonst spielt',
  fieldWhen: 'Wann',
  fieldEnds: 'Bis',
  fieldSpots: 'Wie viele Spieler, dich mitgezählt?',
  fieldSpotsHint: 'Zwei zum Einspielen. Zehn für 5 gegen 5.',
  fieldLevel: 'Niveau',
  fieldNote: 'Sonst noch was?',
  fieldNotePlaceholder: 'Bringt Schuhe mit. Danach gehen wir meistens noch was trinken.',
  fieldCost: 'Kosten pro Person',
  fieldCostPlaceholder: '25 AED, oder gratis',
  post: 'Eintragen',
  posted: 'Eingetragen. Ab jetzt findet man es.',

  // ── Mitspielen ─────────────────────────────────────────────────────────────
  askToJoin: 'Mitspielen anfragen',
  askMessage: 'Schreib dem Gastgeber kurz was',
  askMessagePlaceholder: 'Ich spiele links hinten und kenne die Anlage.',
  requested: 'Angefragt — wartet auf den Gastgeber',
  joined: 'Du bist dabei',
  declined: 'Diesmal nicht',
  askSent: 'Abgeschickt. Der Gastgeber meldet sich.',
  youAreHosting: 'Das hier organisierst du',
  leave: 'Spiel verlassen',
  leaveConfirmTitle: 'Spiel verlassen?',
  leaveConfirmBody: 'Dein Platz wird wieder frei und der Gastgeber erfährt es.',
  left: 'Du bist raus. Dein Platz ist wieder frei.',

  // ── Organisieren ───────────────────────────────────────────────────────────
  requests: 'Anfragen',
  requests_one: '{{count}} Anfrage',
  requests_other: '{{count}} Anfragen',
  noRequests: 'Bisher hat niemand gefragt.',
  accept: 'Annehmen',
  decline: 'Ablehnen',
  accepted: '{{name}} ist dabei.',
  declinedToast: 'Abgelehnt.',
  going: 'Dabei',
  cancel: 'Spiel absagen',
  cancelConfirmTitle: 'Spiel absagen?',
  cancelConfirmBody:
    'Alle, die dabei sind, erfahren es. Das lässt sich nicht rückgängig machen.',
  cancelled_toast: 'Abgesagt. Alle, die dabei waren, wissen Bescheid.',

  // ── Meine ──────────────────────────────────────────────────────────────────
  mine: 'Meine',
  minePast: 'Vorbei',
  mineEmptyTitle: 'Nichts in Sicht',
  mineEmptyBody: 'Spiele, die du einträgst oder bei denen du mitspielst, stehen hier.',

  // ── Barrierefreiheit ───────────────────────────────────────────────────────
  a11yCard: '{{title}}, {{city}} — {{spots}}',
  a11yAccept: '{{name}} annehmen',
  a11yDecline: '{{name}} ablehnen',
};
