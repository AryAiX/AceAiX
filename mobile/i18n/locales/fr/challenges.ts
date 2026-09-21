/**
 * Les défis de la semaine.
 *
 * Deux mots pèsent ici et ne doivent être fondus en un seul dans aucune
 * langue : un résultat **déclaré** est ce que l’athlète dit avoir fait, un
 * résultat **vérifié** est ce qu’un coach a regardé et confirmé. Le classement
 * ne se lit que parce que ces deux mots restent visiblement différents.
 *
 * Le ton est celui d’un coach, pas d’un jeu. Pas de compte à rebours qui crie,
 * pas de « tu prends du retard », pas de langage de récompense — un défi est
 * une chose à faire, et le clip que tu en tires est à toi, que tu gagnes ou
 * non.
 */
export const challenges = {
  // ── Liste ──────────────────────────────────────────────────────────────────
  title: 'Défis',
  subtitle: 'Proposés par des coachs et des clubs. Envoie un clip, fais-le vérifier.',
  tabOpen: 'Ouverts',
  tabEntered: 'Mes participations',
  tabMine: 'Les miens',

  emptyTitle: 'Aucun défi ouvert en ce moment',
  emptyBody: 'Les coachs en publient presque chaque semaine. On les affichera ici dès qu’un défi ouvre.',
  emptyEnteredTitle: 'Tu n’as encore participé à aucun défi',
  emptyEnteredBody: 'Choisis un défi ouvert et envoie un clip — un résultat vérifié est la preuve la plus rapide à obtenir.',
  emptyMineTitle: 'Tu n’as pas proposé de défi',
  emptyMineBody: 'Demande une seule chose précise en vidéo et toutes les réponses seront comparables.',

  setBy: 'Proposé par {{name}}',
  closed: 'Terminé',
  judging: 'En cours de jugement',
  entries_one: '{{count}} participation',
  entries_many: '{{count}} participations',
  entries_other: '{{count}} participations',
  ageRange: 'De {{min}} à {{max}} ans',
  ageMin: '{{min}} ans et plus',
  ageMax: 'Moins de {{max}} ans',

  // ── Détail ─────────────────────────────────────────────────────────────────
  briefTitle: 'Ce qu’il faut filmer',
  rulesTitle: 'Comment c’est jugé',
  judgedNote: 'Jugé par le coach qui l’a proposé — il n’y a pas de chiffre à battre, alors envoie ton meilleur essai.',
  measuredNote: 'Mesuré en {{unit}}. {{direction}}',
  directionHigher: 'Plus c’est haut, mieux c’est.',
  directionLower: 'Plus c’est bas, mieux c’est.',

  leaderboardTitle: 'Classement',
  leaderboardEmpty: 'Personne n’a encore participé. Le premier clip fixe la marque.',
  verifiedBadge: 'Vérifié',
  claimedBadge: 'Déclaré',
  verifiedTooltip: 'Un coach a regardé ce clip et confirmé le résultat.',
  claimedTooltip: 'Le chiffre déclaré par l’athlète lui-même. Aucun coach ne l’a encore vérifié.',
  yourEntry: 'Ta participation',
  rankLabel: '#{{rank}}',

  // ── Participer ─────────────────────────────────────────────────────────────
  enter: 'Participer',
  enterAgain: 'Envoyer un meilleur essai',
  withdraw: 'Retirer',
  withdrawConfirmTitle: 'Retirer ta participation ?',
  withdrawConfirmBody: 'Ton clip reste sur ton profil. Il sort simplement de ce classement.',
  withdrawConfirmAction: 'Retirer',

  chooseClipTitle: 'Quel clip ?',
  chooseClipBody: 'Choisis une de tes vidéos. Si le bon clip n’est pas là, envoie-le d’abord depuis ton profil.',
  noClipsTitle: 'Il te faut d’abord un clip',
  noClipsBody: 'Filme la tentative, ajoute-la à ton profil, puis reviens participer.',
  noClipsAction: 'Ajouter un clip',

  resultLabel: 'Ton résultat',
  resultPlaceholder: 'ex. 214',
  noteLabel: 'Quelque chose à ajouter ?',
  notePlaceholder: 'Meilleur des trois. Le pied gauche reste le point faible.',
  submit: 'Envoyer la participation',
  submitted: 'Participation envoyée. Le coach va la confirmer.',
  updated: 'Participation remplacée.',
  withdrawn: 'Participation retirée.',

  // ── Jugement, pour le coach qui a proposé le défi ───────────────────────────
  judgeTitle: 'Confirmer les résultats',
  judgeBody: 'Regarde le clip, puis confirme le chiffre ou renvoie-le.',
  judgeAccept: 'Confirmer',
  judgeReject: 'Renvoyer',
  judgeValueLabel: 'Résultat confirmé',
  judgeNoteLabel: 'Note pour l’athlète',
  judgeNotePlaceholder: 'Le ballon touche le sol à 0:18 — le décompte repart de là.',
  judged: 'Résultat confirmé.',
  sentBack: 'Renvoyé à l’athlète.',

  // ── Proposer un défi ───────────────────────────────────────────────────────
  newTitle: 'Proposer un défi',
  newBody: 'Demande une seule chose précise en vidéo. Plus la consigne est exacte, plus les réponses sont utiles.',
  fieldTitle: 'Titre',
  fieldTitlePlaceholder: 'Trente secondes de jonglages',
  fieldBrief: 'Ce qu’il faut filmer',
  fieldBriefPlaceholder: 'Une seule prise, pieds et cuisses uniquement, téléphone posé au sol pour qu’on voie tout le corps.',
  fieldRules: 'Comment c’est jugé',
  fieldRulesPlaceholder: 'Sans coupure. Meilleur des trois, pas un montage.',
  fieldMeasured: 'Y a-t-il un chiffre ?',
  measuredYes: 'Mesuré',
  measuredNo: 'Jugé',
  fieldMetricLabel: 'Ce qu’on compte',
  fieldMetricLabelPlaceholder: 'Touches',
  fieldMetricUnit: 'Unité',
  fieldMetricUnitPlaceholder: 'touches',
  fieldBetter: 'Le mieux, c’est',
  betterHigher: 'Plus haut',
  betterLower: 'Plus bas',
  fieldAges: 'Catégorie d’âge',
  fieldCloses: 'Fin',
  closesIn7: 'Dans une semaine',
  closesIn14: 'Dans deux semaines',
  closesIn30: 'Dans un mois',
  create: 'Publier le défi',
  created: 'Le défi est en ligne.',

  // ── Carte d’accueil ────────────────────────────────────────────────────────
  homeTitle: 'Le défi de la semaine',
  homeCta: 'Le voir',
  homeEnteredCta: 'Voir le classement',
};
