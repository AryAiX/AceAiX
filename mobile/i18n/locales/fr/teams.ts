/**
 * Les équipes qu’on supporte.
 *
 * Une distinction doit survivre à la traduction : il s’agit de supporters,
 * jamais d’emploi. « Tes équipes », ce sont les maillots qu’on possède ; là où
 * un athlète joue, c’est le « club actuel » dans `onboarding` et `profile`, et
 * un traducteur qui confond les deux transforme un fait pour un recruteur en
 * simple préférence.
 */
export const teams = {
  // ── L’étape d’inscription ──────────────────────────────────────────────────
  stepTitle: 'Tu supportes qui ?',
  stepBody: 'Choisis-en jusqu’à cinq. Ça n’a rien à voir avec l’endroit où tu joues — c’est juste le maillot que tu as.',
  stepSkip: 'Passer pour l’instant',

  venueTitle: 'Stade préféré',
  venueBody: 'Un stade où tu irais demain si on te tendait un billet.',
  venuePlaceholder: 'Santiago Bernabéu, Azadi, Old Trafford…',

  // ── Sélecteur ──────────────────────────────────────────────────────────────
  searchPlaceholder: 'Rechercher un club ou une sélection nationale',
  popular: 'Populaires en ce moment',
  selected_one: '{{count}} sélectionnée',
  selected_many: '{{count}} sélectionnées',
  selected_other: '{{count}} sélectionnées',
  maxReached: 'Cinq, c’est la limite — retires-en une pour en ajouter une autre.',
  noResults: 'Rien ne correspond à « {{query}} ».',
  addCustom: 'Ajouter « {{name}} »',
  addCustomHint: 'Toi seul la verras tant qu’on ne l’a pas vérifiée.',
  addedCustom: 'Ajoutée. Elle est sur ton profil.',
  followersCount_one: '{{count}} supporter ici',
  followersCount_many: '{{count}} supporters ici',
  followersCount_other: '{{count}} supporters ici',

  // ── Sur un profil ──────────────────────────────────────────────────────────
  supportsTitle: 'Supporte',
  venueLabel: 'Stade préféré',
  emptySelf: 'Ajoute les équipes que tu supportes — c’est le plus rapide pour trouver des gens comme toi.',
  emptyOther: 'Aucune équipe pour l’instant.',
  editAction: 'Modifier les équipes',
  savedToast: 'Équipes mises à jour.',

  // ── La page d’une équipe ───────────────────────────────────────────────────
  fansTitle: 'Supporters sur AceAiX',
  fansEmpty: 'Personne ici ne les supporte encore. Tu serais le premier.',
  fansLoadMore: 'Afficher plus',
  alsoSupports: 'Supporte aussi {{team}}',
  sharedTeams_one: 'Vous supportez tous les deux {{teams}}',
  sharedTeams_many: 'Vous supportez tous les deux {{teams}}',
  sharedTeams_other: 'Vous supportez tous les deux {{teams}}',
};
