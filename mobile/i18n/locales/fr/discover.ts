/**
 * Découverte et recherche.
 *
 * Regroupé dans l’ordre des écrans : l’onglet Découvrir (côté recruteur
 * d’abord, puis l’Explorer de l’athlète), les éléments partagés par les deux —
 * motifs d’affinité, cartes, lignes — et enfin l’écran de recherche.
 *
 * Deux choses à savoir avant de traduire :
 *
 *  - `reason.*` reprend les chaînes que `private.match_reasons` produit en SQL.
 *    Le texte anglais appartient à la base ; ces clés ne sont que la manière de
 *    le lire.
 *  - `board.*` est lu par des adolescents qui regardent où ils en sont. Rien ici
 *    ne dit à quiconque qu’il est en retard, et aucune traduction ne devrait le
 *    faire — le classement nomme des places que l’on occupe déjà et regarde vers
 *    l’avant.
 */
export const discover = {
  // ── Onglet Découvrir ───────────────────────────────────────────────────────
  title: 'Découvrir des talents',
  athleteSubtitle: 'Clubs, coachs et où tu en es',
  searchPeople: 'Rechercher des personnes et des clubs',
  queryPlaceholder: 'Nom, club, poste',
  queryLabel: 'Rechercher des athlètes',
  filterResults: 'Filtrer les résultats',
  filterResultsActive: 'Filtrer les résultats, filtres actifs',

  // Noms d’onglets et de portées partagés — les onglets Explorer et les portées de recherche.
  tabAthletes: 'Athlètes',
  tabCoaches: 'Coachs',
  tabClubs: 'Clubs',
  tabLeaderboard: 'Classement',

  // ── Sélectionnés pour toi ──────────────────────────────────────────────────
  matchedForYou: 'Sélectionnés pour toi',
  editBrief: 'Modifier le brief',
  noneFitBrief: 'Personne ne correspond encore à ton brief. Élargis-le et on continue à chercher.',
  briefTitle: 'Dis-nous qui tu cherches',
  briefBody:
    'Règle une fois ton sport, tes postes et la tranche d’âge. Chaque athlète montre ensuite à quel point il correspond — et les raisons derrière le chiffre.',
  briefAction: 'Définir mon brief',
  briefSaved: 'Enregistré. On s’appuiera là-dessus à partir de maintenant.',

  // ── Liste de résultats ─────────────────────────────────────────────────────
  searching: 'Recherche…',
  sortedByA11y: 'Trié par {{sort}}. Changer le tri',
  rankedByFit: 'Classé par correspondance. Chaque carte montre les raisons de son affinité.',
  rankedByScore: 'Classé par score talent. Ajoute un filtre pour voir à quel point chaque athlète te correspond.',
  savedToShortlist: 'Ajouté à ta liste',
  emptyTitle: 'Aucun athlète ne correspond',
  emptyFilteredBody: 'Essaie d’élargir la tranche d’âge, d’ajouter un pays ou d’effacer la recherche.',
  emptyOpenBody: 'Les athlètes apparaissent ici au fur et à mesure qu’ils complètent leur profil.',
  clearFilters: 'Effacer les filtres',

  // ── Fiche de tri ───────────────────────────────────────────────────────────
  sortTitle: 'Trier les résultats',
  sort: {
    match: 'Meilleure affinité',
    matchHint: 'À quel point chaque athlète correspond à tes filtres',
    score: 'Score le plus élevé',
    scoreHint: 'Score talent, du plus haut au plus bas',
    recent: 'Actifs récemment',
    recentHint: 'Profils mis à jour le plus récemment',
    name: 'Nom',
    nameHint: 'De A à Z',
  },

  // ── Fiche de filtres ───────────────────────────────────────────────────────
  filters: {
    title: 'Filtrer les résultats',
    subtitle: 'Chaque filtre que tu règles devient une raison derrière le pourcentage d’affinité.',
    preferencesTitle: 'Tu cherches qui ?',
    preferencesSubtitle:
      'On s’en sert pour choisir les athlètes de Sélectionnés pour toi — et pour expliquer chaque affinité.',

    sport: 'Sport',
    position: 'Poste',
    positionHint: 'Choisis d’abord un sport.',
    level: 'Niveau',
    country: 'Pays',
    findCountry: 'Trouver un pays',
    moreCountries_one: '{{count}} de plus — tape pour réduire la liste.',
    moreCountries_many: '{{count}} de plus — tape pour réduire la liste.',
    moreCountries_other: '{{count}} de plus — tape pour réduire la liste.',
    noCountryMatch: 'Aucun pays ne correspond.',

    age: 'Âge',
    anyAge: 'Tout âge',
    youngest: 'Âge min',
    oldest: 'Âge max',
    any: 'Peu importe',

    minScore: 'Score talent minimum',
    anyScore: 'Tout score',
    tierAndAbove: '{{tier}} et au-dessus',
    scoreFloor: 'Seulement les athlètes à {{score}} ou plus.',

    openOnly: 'Ouverts aux offres seulement',
    openOnlyA11y: 'N’afficher que les athlètes ouverts aux offres',

    // Contrôles pas à pas. `name` est l’un des trois ci-dessous, pour qu’un
    // lecteur d’écran dise « Augmenter l’âge minimum ».
    decrease: 'Diminuer {{name}}',
    increase: 'Augmenter {{name}}',
    youngestAgeName: 'l’âge minimum',
    oldestAgeName: 'l’âge maximum',
    minScoreName: 'le score talent minimum',

    // Le bouton promet un vrai chiffre, compté avant qu’on appuie dessus.
    showResults: 'Voir les résultats',
    noMatchesYet: 'Aucun résultat',
    showCount_one: 'Voir {{count}} résultat',
    showCount_many: 'Voir {{count}} résultats',
    showCount_other: 'Voir {{count}} résultats',
  },

  // ── Le badge d’affinité et les raisons derrière ────────────────────────────
  matchPercentA11y: '{{percent}} pour cent d’affinité',
  /** Reprend `private.match_reasons`. Voir components/discover/MatchBadge.tsx. */
  reason: {
    sport: 'Pratique ton sport',
    position: 'Correspond au poste recherché',
    age: 'Dans ta tranche d’âge',
    level: 'Joue au niveau que tu suis',
    country: 'Basé dans ta région',
    topTier: 'Score talent au plus haut palier',
    strongScore: 'Score talent solide',
  },

  // ── Carte d’athlète ────────────────────────────────────────────────────────
  card: {
    openProfile: 'Ouvre le profil',
    scorePillA11y: 'Score talent {{score}} sur 100, palier {{tier}}',
    talentScoreA11y: 'score talent {{score}}',
    openToOffers: 'Ouvert aux offres',
    save: 'Ajouter {{name}} à ta liste',
    unsave: 'Retirer {{name}} de ta liste',
  },

  // ── Explorer : le côté athlète de Découvrir ────────────────────────────────
  explore: {
    searchClubsPlaceholder: 'Rechercher des clubs et académies',
    searchClubsA11y: 'Rechercher des clubs',
    searchCoachesPlaceholder: 'Rechercher des coachs',
    searchCoachesA11y: 'Rechercher des coachs',
    anywhere: 'Partout',
    countryTitle: 'Pays',
    countrySubtitle: 'Limiter le classement à un pays.',

    noClubsFound: 'Aucun club trouvé',
    noClubsFoundBody: 'Essaie un nom plus court, ou cherche la ville à la place.',
    noClubsYet: 'Aucun club',
    noClubsYetBody: 'Les clubs apparaissent ici au fur et à mesure qu’ils rejoignent AceAiX.',

    noCoachesFound: 'Aucun coach trouvé',
    noCoachesFoundBody: 'Essaie une partie du nom, ou efface la recherche pour tout parcourir.',
    noCoachesYet: 'Aucun coach',
    noCoachesYetBody: 'Les coachs apparaissent ici au fur et à mesure qu’ils rejoignent AceAiX.',
  },

  // ── Classement ─────────────────────────────────────────────────────────────
  // Encourageant dans toutes les langues. Un rang est une place que l’on
  // occupe, jamais un retard, et le pied de page s’adresse à tous ceux qui
  // grimpent encore.
  board: {
    caption: 'Meilleurs scores talent en {{scope}}. Les scores bougent quand les profils grandissent.',
    everySport: 'tous sports',
    scopeInCountry: '{{sport}}, {{country}}',
    keepBuilding: 'Chaque highlight, stat et vérification que tu ajoutes fait bouger ton score. Continue.',
    emptyTitle: 'Rien dans ce classement',
    emptyBody: 'Essaie un autre sport ou un autre pays — ou sois le premier ici.',
    you: 'Toi',
    rankA11y: 'Numéro {{rank}}',
    youA11y: '{{name}}, c’est toi',
    scoreA11y: 'score talent {{score}}, palier {{tier}}',
  },

  // ── Lignes de clubs et de coachs ───────────────────────────────────────────
  club: {
    /* `club` et `federation` viennent de common ; une académie n’est jamais
       qu’un type d’organisation, donc elle vit ici. */
    typeAcademy: 'Académie',
    openClub: 'Ouvre la page du club',
  },
  followers_one: '{{value}} abonné',
  followers_many: '{{value}} abonnés',
  followers_other: '{{value}} abonnés',
  followA11y: 'Suivre {{name}}',
  unfollowA11y: 'Ne plus suivre {{name}}',

  // ── Écran de recherche ─────────────────────────────────────────────────────
  search: {
    back: 'Retour',
    fieldPlaceholder: 'Athlètes, coachs, clubs',
    fieldA11y: 'Rechercher dans AceAiX',
    recent: 'Récent',
    clearRecentsA11y: 'Effacer les recherches récentes',
    trySport: 'Essaie un sport',
    emptyTitle: 'Rien pour « {{term}} »',
    emptyBody:
      'Essaie moins de mots, ou plutôt un club, une ville ou un poste. Tu peux aussi changer d’onglet au-dessus.',
    clearSearch: 'Effacer la recherche',
  },
};
