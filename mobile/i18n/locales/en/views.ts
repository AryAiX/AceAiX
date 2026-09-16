/**
 * Who has been looking at a profile.
 *
 * The honesty rule that must survive translation: only verified coaches,
 * scouts and clubs are named. Everyone else is counted. Any wording that
 * implies the named list is complete — "here is everyone who looked" — is
 * wrong, because it is deliberately not.
 */
export const views = {
  title: 'Who looked at your profile',
  subtitle: 'Coaches, scouts and clubs from the last {{days}} days.',

  homeTitleNone: 'Nobody has looked yet this week',
  homeTitle_one: '{{count}} person looked at your profile',
  homeTitle_other: '{{count}} people looked at your profile',
  homeProfessional_one: '{{count}} was a coach, scout or club',
  homeProfessional_other: '{{count}} were coaches, scouts or clubs',
  homeClubs_one: 'from {{count}} club',
  homeClubs_other: 'from {{count}} clubs',
  homeEmptyBody: 'Add a clip or log a match — profiles with footage get opened first.',
  homeCta: 'See who',

  namedTitle: 'Named',
  namedBody: 'Verified coaches, scouts and clubs.',
  unnamedTitle_one: 'And {{count}} more view',
  unnamedTitle_other: 'And {{count}} more views',
  unnamedBody: 'From accounts we have not verified, and from other athletes. We do not name those.',

  viewedAgo: 'Looked {{when}}',
  viewsCount_one: '{{count}} time',
  viewsCount_other: '{{count}} times',
  newBadge_one: '{{count}} new',
  newBadge_other: '{{count}} new',

  emptyTitle: 'Nothing yet',
  emptyBody: 'When a coach opens your profile it shows up here.',

  rangeWeek: 'This week',
  rangeMonth: 'Last 30 days',

  whyTitle: 'Why some names are missing',
  whyBody:
    'We name verified coaches, scouts and clubs — people acting professionally on a profile you published to be found. Unverified accounts and other athletes are counted but never named. That rule does not change for anyone.',
};
