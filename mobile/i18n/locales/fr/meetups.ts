/**
 * Meetups — arranging to actually play with people. French.
 *
 * Two words carry weight through translation and are kept apart here:
 *
 *   * a **spot** is a place in the game, a person: `place`, as in
 *     « il reste 3 places ». The geography is `lieu`, `quartier` and `ville`,
 *     and none of those is ever called a `place`.
 *   * **host** is `organisateur` — whoever organised this one game and says
 *     who comes. Never `coach` or `capitaine`, and never `hôte`, which in
 *     French reads as the guest as readily as the one receiving.
 *
 * `tu` throughout, like the rest of the French catalogue: one adult asking
 * another for a game, not a club writing to a member.
 *
 * Plurals here are `_one` / `_other` only, matching the English keys, even
 * though other French files also carry `_many`.
 *
 * The feature is eighteen-plus, enforced in the database. Nothing here has to
 * explain that to a minor, because a minor never sees these strings.
 */
export const meetups = {
  // ── L’onglet ───────────────────────────────────────────────────────────────
  title: 'Jouer',
  subtitle: 'Trouve des gens avec qui jouer, où que tu sois',

  // ── La recherche ───────────────────────────────────────────────────────────
  searchPlace: 'Où ça ? Ville, quartier ou lieu',
  searchPlaceHint: 'Là où tu es, ou là où tu vas',
  anySport: 'Tous les sports',
  anyLevel: 'Tous les niveaux',
  anyDate: 'Toutes les dates',
  today: 'Aujourd’hui',
  thisWeek: 'Cette semaine',
  thisMonth: 'Ce mois-ci',
  filters: 'Filtres',
  clearFilters: 'Effacer',

  emptyTitle: 'Rien ici pour l’instant',
  emptyBody: 'Personne n’a publié de match ici à cette date. Lance-toi — quelqu’un d’autre cherche sûrement aussi.',
  emptyAction: 'Publier un match',
  emptySearchTitle: 'Rien ne correspond',
  emptySearchBody: 'Élargis les dates, ou essaie un quartier à côté.',

  // ── Une carte ──────────────────────────────────────────────────────────────
  spotsLeft_one: '{{count}} place restante',
  spotsLeft_many: '{{count}} places restantes',
  spotsLeft_other: '{{count}} places restantes',
  spotsOf: '{{taken}} sur {{total}}',
  full: 'Complet',
  cancelled: 'Annulé',
  /* The person, as a label. `hostedBy` is the sentence. */
  host: 'Organisateur',
  hostedBy: 'Organisé par {{name}}',
  costEach: '{{cost}} par personne',

  levelAny: 'Tous les niveaux',
  levelBeginner: 'Débutant',
  levelIntermediate: 'Intermédiaire',
  levelAdvanced: 'Confirmé',
  levelCompetitive: 'Compétition',

  // ── Publier un match ───────────────────────────────────────────────────────
  createTitle: 'Publier un match',
  createSubtitle: 'Dis à quoi tu veux jouer, où et quand. Les gens demandent à venir, et c’est toi qui décides.',
  fieldSport: 'Sport',
  fieldTitle: 'C’est quoi ?',
  fieldTitlePlaceholder: 'Foot à cinq du samedi',
  fieldCountry: 'Pays',
  fieldCity: 'Ville',
  fieldArea: 'Quartier',
  fieldAreaPlaceholder: 'Al Jadaf, Marina, Puerto Banús…',
  fieldVenue: 'Lieu',
  fieldVenuePlaceholder: 'Le terrain, le court ou le club',
  fieldWhen: 'Quand',
  fieldEnds: 'Jusqu’à',
  fieldSpots: 'Combien de joueurs, toi compris ?',
  fieldSpotsHint: 'Deux pour taper la balle. Dix pour un foot à cinq.',
  fieldLevel: 'Niveau',
  fieldNote: 'Autre chose ?',
  fieldNotePlaceholder: 'Prends tes crampons. On boit souvent un verre après.',
  fieldCost: 'Prix par personne',
  fieldCostPlaceholder: '25 AED, ou gratuit',
  post: 'Publier',
  posted: 'Publié. Les gens peuvent le trouver.',

  // ── Rejoindre ──────────────────────────────────────────────────────────────
  askToJoin: 'Demander à venir',
  askMessage: 'Dis un mot à l’organisateur',
  askMessagePlaceholder: 'Je joue arrière gauche et je connais le terrain.',
  requested: 'Demandé — en attente de l’organisateur',
  joined: 'Tu en es',
  declined: 'Pas cette fois',
  askSent: 'Envoyé. L’organisateur te répondra.',
  youAreHosting: 'C’est toi qui organises',
  leave: 'Quitter ce match',
  leaveConfirmTitle: 'Quitter ce match ?',
  leaveConfirmBody: 'Ta place est remise en jeu et l’organisateur est prévenu.',
  left: 'Tu as quitté le match. Ta place est de nouveau libre.',

  // ── Organiser ──────────────────────────────────────────────────────────────
  requests: 'Demandes',
  requests_one: '{{count}} demande',
  requests_many: '{{count}} demandes',
  requests_other: '{{count}} demandes',
  noRequests: 'Personne n’a encore demandé.',
  accept: 'Accepter',
  decline: 'Refuser',
  accepted: '{{name}} en est.',
  declinedToast: 'Refusé.',
  going: 'Qui vient',
  cancel: 'Annuler ce match',
  cancelConfirmTitle: 'Annuler ce match ?',
  cancelConfirmBody: 'Tous ceux qui viennent seront prévenus. C’est définitif.',
  cancelled_toast: 'Annulé. Tous ceux qui venaient ont été prévenus.',

  // ── Les miens ──────────────────────────────────────────────────────────────
  mine: 'Les miens',
  minePast: 'Passés',
  mineEmptyTitle: 'Rien de prévu',
  mineEmptyBody: 'Les matchs que tu publies ou que tu rejoins apparaissent ici.',

  // ── Accessibilité ──────────────────────────────────────────────────────────
  a11yCard: '{{title}} à {{city}}, {{spots}}',
  a11yAccept: 'Accepter {{name}}',
  a11yDecline: 'Refuser {{name}}',
};
