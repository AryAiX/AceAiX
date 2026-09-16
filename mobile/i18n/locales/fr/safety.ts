/**
 * Sécurité — blocage, accord du parent ou tuteur, et tout ce qui protège un
 * mineur.
 *
 * Volontairement séparé de `settings.ts` : ce sont des textes de conformité, et
 * un relecteur doit pouvoir les lire tous d’un bloc, dans n’importe quelle
 * langue, sans traverser des sélecteurs de thème et des interrupteurs de
 * notifications.
 *
 * Chaque sens compte ici. 13 ans est l’âge minimum. Un jeune de 13 à 17 ans est
 * masqué des recherches et ne peut pas recevoir de messages tant qu’un parent ou
 * tuteur n’a pas donné son accord. « Tout le monde » n’est jamais proposé à un
 * mineur comme réglage de boîte de réception. Traduis les mots ; n’adoucis pas,
 * ne généralise pas, ne supprime aucune condition.
 *
 * Les motifs de signalement sont stockés en anglais dans la base — seul le
 * libellé que lit la personne qui signale est traduit.
 */
export const safety = {
  // ── Blocage (app/settings/blocked.tsx) ─────────────────────────────────────
  blockedTitle: 'Comptes bloqués',
  blockedEmptyTitle: 'Tu n’as bloqué personne.',
  blockedEmptyBody:
    'Bloquer quelqu’un l’empêche de t’écrire, de te suivre ou de voir tes posts. La personne n’en est jamais informée.',
  blockedCount_one:
    '{{count}} compte est bloqué. Il ne peut pas t’écrire, te suivre ni voir tes posts.',
  blockedCount_many:
    '{{count}} comptes sont bloqués. Ils ne peuvent pas t’écrire, te suivre ni voir tes posts.',
  blockedCount_other:
    '{{count}} comptes sont bloqués. Ils ne peuvent pas t’écrire, te suivre ni voir tes posts.',
  unblockConfirmTitle: 'Débloquer {{name}} ?',
  unblockConfirmBody:
    'Cette personne pourra de nouveau te trouver, te suivre et t’écrire, selon tes réglages de confidentialité. Elle n’est prévenue dans aucun des deux cas.',
  unblockedToast: '{{name}} débloqué',

  /** Affiché sur l’écran de confidentialité, où le blocage est expliqué sans être fait. */
  blockingExplainer:
    'Bloquer quelqu’un l’empêche de te contacter, de te suivre ou de voir tes posts, et la personne n’en est pas informée. Tu peux annuler depuis {{settings}}, puis {{blocked}}.',

  // ── Mineurs (app/settings/privacy.tsx) ─────────────────────────────────────
  minorMessagingNote:
    'Comme tu as moins de 18 ans, « Tout le monde » n’est pas une option. Seuls les coachs et les clubs vérifiés peuvent t’écrire en premier, et seulement une fois qu’un parent ou tuteur a autorisé les messages.',
  minorNeverPublic:
    'Tu as moins de 18 ans, donc ton profil n’est jamais montré à une personne non connectée. Il n’y a aucun réglage pour ça et aucun moyen de le désactiver — c’est notre base de données qui l’impose, pas l’app.',
  minorsNeverPublicNote:
    'Les profils des personnes de moins de 18 ans ne sont jamais montrés aux visiteurs non connectés, quels que soient leurs réglages.',
  discoveryWaitingGuardian: 'En attente d’un parent ou tuteur',
  guardianApprovalNeeded: 'Un parent ou tuteur doit d’abord donner son accord.',
  askGuardian: 'Demander à un parent ou tuteur',

  /** Écran Compte : pourquoi la vérification existe et ce qu’elle débloque. */
  verificationFooter:
    'Un badge vérifié indique aux athlètes et aux clubs que nous avons contrôlé qui tu es. Les adultes vérifiés sont aussi les seuls à pouvoir engager une conversation avec un athlète de moins de 18 ans.',

  /** Préférences de recrutement : ce qu’un recruteur peut et ne peut pas faire avec un mineur. */
  scoutingMinorNote:
    'Les athlètes de moins de 18 ans n’apparaissent ici qu’une fois qu’un parent ou tuteur a donné son accord, et tu ne peux leur écrire que si ton compte est vérifié.',

  // ── Accord du tuteur (app/settings/guardian.tsx) ───────────────────────────
  guardianTitle: 'Parent ou tuteur',
  guardianAthletesTitle: 'Les athlètes dont tu t’occupes',
  guardianSubtitleMinor: 'Autorisation pour ton profil',

  // Ce qu’un tuteur valide, une autorisation à la fois
  scopeDiscovery: 'Apparaître dans les recherches des recruteurs',
  scopeDiscoveryOff: 'Masqué des recherches',
  scopeMessaging: 'Recevoir des messages de coachs et de clubs vérifiés',
  scopeMessagingOff: 'Personne ne peut écrire en premier',
  scopeMedia: 'Afficher les photos et vidéos sur le profil',
  scopeMediaOff: 'Aucune photo ni vidéo',

  // Le point de vue du jeune athlète
  minorHeading: 'Ton parent ou tuteur',
  minorIntro:
    'Tu as moins de 18 ans, donc un adulte doit valider ton profil avant que les coachs et les clubs puissent te trouver. Tant qu’il ne l’a pas fait, tu es masqué des recherches et personne ne peut t’écrire en premier.',

  consentApproved: 'Validé',
  consentActive: 'Actif',
  consentGrantedMeta: '{{name}} · {{date}}',
  whatTheyApproved: 'Ce qu’il a validé',
  changeConsentNote:
    'Pour changer quoi que ce soit, demande à {{name}} d’ouvrir le lien qu’on lui a envoyé à {{email}}, ou d’écrire à {{contact}}.',
  withdrawPermission: 'Retirer l’autorisation',

  consentWaitingTitle: 'En attente de validation',
  consentPending: 'En attente',
  consentSentOn: 'Envoyé le {{date}}',
  consentEmailNote_one:
    'On lui a envoyé un lien sécurisé par e-mail. Il est valable {{count}} jour. S’il n’est pas arrivé, demande-lui de regarder ses spams, puis renvoie-le.',
  consentEmailNote_many:
    'On lui a envoyé un lien sécurisé par e-mail. Il est valable {{count}} jours. S’il n’est pas arrivé, demande-lui de regarder ses spams, puis renvoie-le.',
  consentEmailNote_other:
    'On lui a envoyé un lien sécurisé par e-mail. Il est valable {{count}} jours. S’il n’est pas arrivé, demande-lui de regarder ses spams, puis renvoie-le.',
  resendEmail: 'Renvoyer l’e-mail',
  resentToast: 'On a renvoyé l’e-mail.',

  consentRevokedNote:
    'L’autorisation a été retirée le {{date}}. Ton profil est masqué des recherches jusqu’à ce qu’un adulte le valide de nouveau.',

  // Demander l’autorisation
  askForPermission: 'Demander l’autorisation',
  askSomeoneElse: 'Demander à quelqu’un d’autre',
  requestFormHint:
    'On lui enverra un lien par e-mail. Il choisit ce qu’il autorise, et peut changer d’avis à tout moment.',
  guardianNameLabel: 'Son nom complet',
  guardianNamePlaceholder: 'ex. Amina Haddad',
  guardianEmailLabel: 'Son adresse e-mail',
  relationshipQuestion: 'C’est qui pour toi ?',
  relationshipParent: 'Parent',
  relationshipGuardian: 'Tuteur',
  relationshipOther: 'Autre',
  guardianEmailUseNote:
    'Mets une vraie adresse qu’il consulte. On s’en sert uniquement pour demander l’autorisation et pour l’informer des changements sur ton compte.',
  sendRequest: 'Envoyer la demande',
  sendNewRequest: 'Envoyer une nouvelle demande',
  replacesPending: 'Une nouvelle demande remplace celle qui est en attente.',
  requestSentToast: 'Envoyé. Demande-lui de regarder sa boîte de réception.',
  nameRequired: 'Écris son nom complet.',
  emailInvalid: 'Cette adresse e-mail n’a pas l’air correcte.',

  whatChangesHeading: 'Ce qui change quand il valide',
  whatChangesBody:
    'Ton profil peut apparaître dans les recherches des recruteurs, et les coachs et clubs vérifiés peuvent t’envoyer un premier message. Rien d’autre ne change, et ton âge exact et ta date de naissance restent privés.',
  readChildSafety: 'Lire nos standards de protection des mineurs',

  withdrawConfirmTitle: 'Retirer l’autorisation ?',
  withdrawConfirmBody:
    'Ton profil sera de nouveau masqué des recherches des recruteurs, et les coachs ne pourront plus lancer de nouvelles conversations avec toi. Tu peux redemander l’autorisation à tout moment.',
  withdraw: 'Retirer',
  consentWithdrawnToast: 'Autorisation retirée. Ton profil est de nouveau masqué des recherches.',

  // Le point de vue du tuteur
  approvingHeading: 'Valider un jeune athlète',
  approvingBody1:
    'Quand un jeune de 13 à 17 ans te désigne comme parent ou tuteur, on t’envoie un lien sécurisé par e-mail. En l’ouvrant, tu peux accepter ou refuser trois choses séparément : apparaître dans les recherches des recruteurs, recevoir des messages de coachs et de clubs vérifiés, et afficher des photos et des vidéos.',
  approvingBody2_one:
    'Le lien est valable {{count}} jour. Tant que tu ne l’utilises pas, son profil reste masqué des recherches et aucun adulte ne peut lui écrire. Tu peux modifier ou retirer ta décision à tout moment depuis ce même lien, ou en écrivant à {{email}}.',
  approvingBody2_many:
    'Le lien est valable {{count}} jours. Tant que tu ne l’utilises pas, son profil reste masqué des recherches et aucun adulte ne peut lui écrire. Tu peux modifier ou retirer ta décision à tout moment depuis ce même lien, ou en écrivant à {{email}}.',
  approvingBody2_other:
    'Le lien est valable {{count}} jours. Tant que tu ne l’utilises pas, son profil reste masqué des recherches et aucun adulte ne peut lui écrire. Tu peux modifier ou retirer ta décision à tout moment depuis ce même lien, ou en écrivant à {{email}}.',
  guardianPhishingNote:
    'On ne te demandera jamais de paiement, de coordonnées bancaires ni de copie d’une pièce d’identité par e-mail. Si un message prétend venir d’AceAiX et demande l’une de ces choses, il ne vient pas de nous.',

  linkedAthletes: 'Athlètes reliés à toi',
  noLinkedAthletes:
    'Personne ne t’a encore désigné. Quand ce sera le cas, la demande arrivera par e-mail et apparaîtra ici.',
  linkApprovedOn: 'Validé le {{date}}',
  linkRequestedOn: 'Demandé le {{date}}',
  linkWithdrawn: 'Autorisation retirée',
  linkExpired: 'Demande expirée',
  badgeWithdrawn: 'Retirée',
  badgeExpired: 'Expirée',

  // Ce qu’un tuteur peut voir d’une conversation : qu’elle existe, jamais son contenu
  whoTheyTalkTo: 'À qui il parle',
  noConversations: 'Aucune conversation.',
  messageContentsNote:
    'AceAiX ne te montre pas le contenu de ses messages. Si quelque chose t’inquiète, écris à {{email}}.',

  guardianContactNote:
    'Questions sur le compte d’un jeune : {{privacyEmail}}. Tout ce qui touche à sa sécurité : {{safetyEmail}}.',

  // Un adulte arrivé sur l’écran du tuteur
  adultNothingTitle: 'Rien à valider',
  adultNothingBody:
    'L’autorisation d’un tuteur concerne les comptes des jeunes de 13 à 17 ans. Le tien est un compte adulte : ton profil et tes messages dépendent donc de tes propres réglages de confidentialité.',
};
