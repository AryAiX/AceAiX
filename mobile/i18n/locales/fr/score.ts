/**
 * Le Score Talent — la carte sur un profil, et l’écran derrière.
 *
 * Deux choses doivent survivre intactes à la traduction :
 *
 * 1. Le poids des piliers. Ils valent profil 15, performance 30, médias 15,
 *    crédibilité 20, engagement 20, et correspondent à
 *    `private.compute_talent_score`. Un traducteur peut reformuler un pilier,
 *    jamais le rechiffrer.
 * 2. L’explication. Elle doit continuer à dire que le score est calculé à
 *    partir de ce qui figure sur le profil, que les données vérifiables comptent
 *    plus que les données saisies à la main, et que le nombre mesure un profil
 *    et non une personne. Aucune de ces trois phrases n’est décorative.
 *
 * Les noms de paliers vivent dans `common` (tierRising … tierElite) parce
 * qu’on les lit à plusieurs endroits.
 */
export const score = {
  // ── Carte de score (components/profile/ScoreCard.tsx) ──────────────────────
  cardEmptyBody: 'Ton score apparaît dès que ton sport et ton poste sont sur ton profil.',
  cardA11y: 'Score Talent {{score}} sur 100, palier {{tier}}. Ouvre le détail complet.',
  tierLine: 'Palier {{tier}}',
  topPercent: 'Top {{percent}} % des athlètes de ton sport',
  rankingBuilding: 'Ton classement se construit à mesure que tu remplis ton profil.',
  pointsUp_one: '+{{count}} point',
  pointsUp_many: '+{{count}} points',
  pointsUp_other: '+{{count}} points',
  pointsDown_one: '-{{count}} point',
  pointsDown_many: '-{{count}} points',
  pointsDown_other: '-{{count}} points',
  sinceLastTime: 'depuis la dernière fois',

  // ── Écran Score Talent (app/score.tsx) ─────────────────────────────────────
  howCalculated: 'Comment c’est calculé',

  notReadyTitle: 'Ton score n’est pas encore prêt',
  notReadyBody: 'Ajoute ton sport et ton poste et on calcule ton Score Talent.',
  notReadyAction: 'Compléter ton profil',

  deltaUpSince: '+{{count}} depuis la dernière fois',
  deltaDownSince: '-{{count}} depuis la dernière fois',

  curveTitle: 'Ta courbe',
  historyLoading: 'Chargement de ton historique…',
  historyEmpty:
    'Ton historique commence aujourd’hui. Reviens demain pour voir la courbe bouger.',
  sparklineA11y_one: 'Historique du score sur {{count}} jour, de {{min}} à {{max}}.',
  sparklineA11y_many: 'Historique du score sur {{count}} jours, de {{min}} à {{max}}.',
  sparklineA11y_other: 'Historique du score sur {{count}} jours, de {{min}} à {{max}}.',
  sparklineA11yPlain: 'Historique du score',
  sparklineLow: 'Mini {{value}}',
  sparklineHigh: 'Maxi {{value}}',

  pillarsTitle: 'Ce qui compose ton score',
  tipsTitle: 'Le faire monter',
  gotIt: 'Compris',

  // ── La fiche d’explication (app/score.tsx) ─────────────────────────────────
  howIntro:
    'Ton Score Talent est calculé à partir de ce qui figure sur ton profil — rien d’autre. Cinq choses comptent :',
  howBulletProfile: 'La part de ton profil que tu as remplie.',
  howBulletPerformance: 'Les matchs, les minutes et les stats que tu as notés.',
  howBulletMedia: 'Les clips qu’un coach peut regarder.',
  howBulletCredibility: 'La vérification, ton club et les recommandations de coachs.',
  howBulletEngagement: 'Ton activité, et qui a regardé ton profil.',
  howVerified:
    'Une information que nous pouvons vérifier compte plus qu’une information que tu saisis toi-même. Un compte vérifié, un club relié et un match confirmé par un club valent plus que la même chose entrée à la main.',
  howRecalculated:
    'Le nombre est recalculé par nos serveurs dès que l’un de ces éléments change. Tu ne peux pas le modifier, et personne d’autre non plus.',
  howNotYouTitle: 'C’est une mesure de ton profil, pas de toi.',
  howNotYouBody:
    'Un score bas veut dire qu’il reste des choses à ajouter, pas que tu es un moins bon joueur. Aucun coach ne décide à partir de ce seul chiffre.',

  // ── Les cinq piliers (components/profile/PillarList.tsx) ───────────────────
  /** Le poids est un nombre qui appartient à la base — traduis le libellé, pas le chiffre. */
  pillarWeight: '{{label}}  ·  {{weight}} %',
  pillarPerformance: 'Performance',
  pillarPerformanceExplain: 'Matchs, minutes et stats que tu as notés',
  pillarCredibility: 'Crédibilité',
  pillarCredibilityExplain: 'Vérification, ton club et recommandations',
  pillarEngagement: 'Engagement',
  pillarEngagementExplain: 'Ton activité, et qui te regarde',
  pillarProfile: 'Profil',
  pillarProfileExplain: 'À quel point ton profil est complet',
  pillarMedia: 'Médias',
  pillarMediaExplain: 'Des clips qu’un coach peut vraiment regarder',

  // ── Conseils (components/profile/TipList.tsx) ──────────────────────────────
  /**
   * Seul le libellé du bouton est à nous. Le titre et le détail du conseil sont
   * écrits par `private.build_score_tips` et arrivent en anglais — voir
   * TipList.tsx.
   */
  tipPoints: '+{{points}} pts',
  tipOpen: 'Ouvrir',
  tipAction: {
    addHighlights: 'Ajouter un clip',
    completeProfile: 'Compléter le profil',
    logMatches: 'Noter un match',
    getVerified: 'Se faire vérifier',
    askEndorsement: 'Trouver un coach',
    linkClub: 'Relier ton club',
    postUpdate: 'Publier une actu',
  },
  tipsEmptyTitle: 'Plus rien sur la liste',
  tipsEmptyBody:
    'Tu as fait tout ce qu’on pouvait te conseiller. Continue à jouer et à poster.',

  // ── Le simulateur (app/score.tsx) ──────────────────────────────────────────
  simTitle: 'Qu’est-ce que ça demanderait ?',
  simBody:
    'Bouge un curseur pour voir où le nombre atterrirait. La projection fait le même calcul que ton vrai score, sur le serveur, donc elle ne peut pas être discrètement en désaccord avec lui.',
  simProjected: 'Projeté',
  simNow: 'Maintenant',
  simNoChange: 'Bouge quelque chose pour voir la différence.',
  simReset: 'Réinitialiser',
  simUnlocksTier: 'Ça te mettrait dans le palier {{tier}}.',
  simGain_one: '+{{count}} point',
  simGain_many: '+{{count}} points',
  simGain_other: '+{{count}} points',
  simHonest: 'Une projection, pas une promesse — elle suppose que le travail est réel et que les résultats tiennent.',

  simVideos: 'Highlights',
  simMatches: 'Matchs notés cette année',
  simVerified: 'Dont vérifiés',
  simEndorsements: 'Recommandations',
  simExpert: 'Dont de coachs ou de clubs',
  simPosts: 'Publications ce mois-ci',
  simFollowers: 'Abonnés',
  simProfile: 'Champs du profil remplis',
  simAccountVerified: 'Compte vérifié',
  simClubLinked: 'Club relié',

  // ── La lecture écrite (supabase/functions/talent-insights) ─────────────────
  insightTitle: 'Lecture de ton profil',
  insightLoading: 'Analyse de tes chiffres…',
  insightUnavailable:
    'Le résumé écrit n’est pas disponible pour l’instant. Les piliers ci-dessous disent la même chose en chiffres.',
  insightRefresh: 'Le réécrire',
};
