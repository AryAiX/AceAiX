/**
 * Qui a regardé un profil.
 *
 * La règle d’honnêteté qui doit survivre à la traduction : seuls les coachs,
 * les recruteurs et les clubs vérifiés sont nommés. Tous les autres sont
 * comptés. Toute formulation qui laisse entendre que la liste des noms est
 * complète — « voici tous ceux qui ont regardé » — est fausse, parce qu’elle
 * ne l’est délibérément pas.
 */
export const views = {
  title: 'Qui a regardé ton profil',
  subtitle: 'Les coachs, recruteurs et clubs des {{days}} derniers jours.',

  homeTitleNone: 'Personne n’a encore regardé cette semaine',
  homeTitle_one: '{{count}} personne a regardé ton profil',
  homeTitle_many: '{{count}} personnes ont regardé ton profil',
  homeTitle_other: '{{count}} personnes ont regardé ton profil',
  homeProfessional_one: '{{count}} était un coach, un recruteur ou un club',
  homeProfessional_many: '{{count}} étaient des coachs, des recruteurs ou des clubs',
  homeProfessional_other: '{{count}} étaient des coachs, des recruteurs ou des clubs',
  homeClubs_one: 'de {{count}} club',
  homeClubs_many: 'de {{count}} clubs',
  homeClubs_other: 'de {{count}} clubs',
  homeEmptyBody: 'Ajoute un clip ou note un match — les profils avec des vidéos sont ouverts en premier.',
  homeCta: 'Voir qui',

  namedTitle: 'Nommés',
  namedBody: 'Les coachs, recruteurs et clubs vérifiés.',
  unnamedTitle_one: 'Et {{count}} vue de plus',
  unnamedTitle_many: 'Et {{count}} vues de plus',
  unnamedTitle_other: 'Et {{count}} vues de plus',
  unnamedBody: 'De comptes que nous n’avons pas vérifiés, et d’autres athlètes. Ceux-là, nous ne les nommons pas.',

  viewedAgo: 'Regardé {{when}}',
  viewsCount_one: '{{count}} fois',
  viewsCount_many: '{{count}} fois',
  viewsCount_other: '{{count}} fois',
  newBadge_one: '{{count}} nouvelle',
  newBadge_many: '{{count}} nouvelles',
  newBadge_other: '{{count}} nouvelles',

  emptyTitle: 'Rien pour l’instant',
  emptyBody: 'Quand un coach ouvre ton profil, ça apparaît ici.',

  rangeWeek: 'Cette semaine',
  rangeMonth: '30 derniers jours',

  whyTitle: 'Pourquoi certains noms manquent',
  whyBody:
    'Nous nommons les coachs, les recruteurs et les clubs vérifiés — des gens qui agissent à titre professionnel sur un profil que tu as publié pour être trouvé. Les comptes non vérifiés et les autres athlètes sont comptés, jamais nommés. Cette règle ne change pour personne.',
};
