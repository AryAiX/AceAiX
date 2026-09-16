/**
 * L’assistant de profil, qui ne s’exécute qu’une fois après l’inscription.
 *
 * Trois parcours le partagent : un athlète qui construit son profil, un coach
 * ou un club qui dit qui il cherche, et un parent ou tuteur venu surveiller le
 * profil d’un enfant plutôt qu’en créer un.
 *
 * Les textes destinés au parent ou tuteur sont des textes de conformité. Un
 * jeune de 13 à 17 ans n’apparaît pas dans les recherches et ne peut pas
 * recevoir de messages tant qu’un parent ou tuteur n’a pas donné son accord :
 * il faut le dire clairement, jamais l’adoucir.
 */
export const onboarding = {
  // ── Cadre de l’assistant ──────────────────────────────────────────────────
  loading: 'Préparation de ton profil',
  signOut: 'Se déconnecter',
  skipForNow: 'Passer pour l’instant',
  finish: 'Commencer à explorer',

  // ── Sélecteur de pays, partagé par l’athlète et le recruteur ──────────────
  countryLabel: 'Pays',
  countrySearchPlaceholder: 'Rechercher un pays',
  countryNoMatch: 'Aucun pays ne correspond. Essaie une recherche plus courte.',
  countryShowAll: 'Voir tous les pays',

  // ── Athlète : sport, poste, niveau ────────────────────────────────────────
  sportTitle: 'Tu pratiques quoi ?',
  sportSubtitle: 'Choisis le sport dans lequel tu joues le plus.',

  positionTitle: 'Tu joues où ?',
  positionSubtitle: 'Choisis le poste que tu occupes le plus souvent. Tu pourras en ajouter.',
  positionNoneTitle: 'Pas de poste dans ce sport',
  positionNoneBody:
    'Ce sport ne se joue pas par poste, il n’y a donc rien à choisir. Appuie sur {{action}} et continue.',

  levelTitle: 'Tu joues à quel niveau ?',
  levelSubtitle: 'Sois honnête — les coachs cherchent par niveau, et le bon profil vaut mieux qu’une grosse annonce.',

  // ── Athlète : où tu joues ─────────────────────────────────────────────────
  placeTitle: 'Tu joues où en ce moment ?',
  placeSubtitle: 'Ton club et ta ville aident les coachs près de chez toi à te trouver.',
  clubLabel: 'Club ou académie',
  clubPlaceholder: 'Académie Al Wasl',
  clubHint: 'Laisse vide si tu n’es dans aucun club en ce moment.',
  cityLabel: 'Ville',
  cityPlaceholder: 'Dubaï',

  // ── Athlète : physique ────────────────────────────────────────────────────
  physicalTitle: 'Quelques chiffres',
  physicalSubtitle:
    'Tout est facultatif. Les recruteurs les regardent, mais tu peux passer et les ajouter plus tard.',
  heightLabel: 'Taille',
  heightPlaceholder: '172',
  heightHint: 'en cm',
  heightOutOfRange: 'Saisis une taille entre {{min}} et {{max}} cm.',
  weightLabel: 'Poids',
  weightPlaceholder: '64',
  weightHint: 'en kg',
  weightOutOfRange: 'Saisis un poids entre {{min}} et {{max}} kg.',
  strongSide: 'Côté fort',

  // ── Accord du tuteur, demandé au jeune athlète ────────────────────────────
  guardianTitle: 'Fais venir un adulte',
  guardianSubtitle:
    'Tu as moins de 18 ans, donc un parent ou tuteur valide ton profil avant que qui que ce soit puisse te trouver.',
  guardianApprovalTitle: 'Ce qu’on lui demande de valider',
  guardianApprovalBody:
    'On lui envoie un seul e-mail avec un lien. Il explique qui nous sommes et lui demande de dire oui ou non à deux choses distinctes. Il peut changer d’avis et désactiver l’une ou l’autre à tout moment, et on ne lui écrira pour rien d’autre.',
  guardianSearchTitle: 'Tu apparais dans les recherches',
  guardianSearchBody:
    'Les coachs et les clubs peuvent trouver ton profil quand ils cherchent des joueurs.',
  guardianMessageTitle: 'Les coachs vérifiés peuvent t’écrire',
  guardianMessageBody: 'Seulement des adultes que nous avons vérifiés. Personne d’autre ne peut engager une conversation avec toi.',
  guardianWhoTitle: 'C’est qui ?',
  guardianRelationshipParent: 'Un parent',
  guardianRelationshipGuardian: 'Un autre tuteur',
  guardianNameLabel: 'Son nom',
  guardianNamePlaceholder: 'Leila Karimi',
  guardianNameRequired: 'Saisis son nom.',
  guardianEmailLabel: 'Son e-mail',
  guardianEmailHint: 'Vérifie bien — c’est là que part le lien de validation.',
  guardianEmailRequired: 'Saisis son adresse e-mail.',
  guardianEmailInvalid: 'Cette adresse e-mail n’a pas l’air correcte.',
  guardianSkip: 'Le faire plus tard',
  guardianSkipHint: 'Ton profil reste invisible pour les coachs tant qu’un adulte ne l’a pas validé.',
  guardianSkipA11y:
    'Le faire plus tard. Ton profil reste caché tant qu’un parent ou tuteur ne l’a pas validé.',
  guardianSkipSheetTitle: 'Garder ça pour plus tard ?',
  guardianSkipSheetMessage:
    'Ton profil restera caché. Les coachs ne te trouveront pas dans les recherches et personne ne pourra t’écrire tant qu’un parent ou tuteur ne l’a pas validé. Tu peux envoyer l’e-mail à tout moment depuis les réglages.',
  guardianSkipSheetConfirm: 'Oui, plus tard',
  guardianSkipSheetCancel: 'Je l’ajoute maintenant',

  // ── Photo ─────────────────────────────────────────────────────────────────
  photoTitle: 'Mets un visage sur ton nom',
  photoSubtitle:
    'Une photo nette de toi, seul. Les profils avec photo sont regardés bien plus souvent.',
  photoSaved: 'Enregistré. Ça rend bien.',
  photoOptional: 'Passe si tu préfères le faire plus tard — rien n’est obligatoire ici.',
  photoChoose: 'Choisir dans mes photos',
  photoChooseAnother: 'Choisir une autre photo',
  photoTake: 'Prendre une photo',
  photoUnreadable: 'On n’a pas pu lire cette photo. Essaies-en une autre.',
  photoLibraryDenied:
    '{{app}} a besoin de ta permission pour ouvrir tes photos. Tu peux l’activer dans les réglages.',
  photoLibraryFailed: 'On n’a pas pu ouvrir tes photos. Réessaie.',
  photoCameraDenied: '{{app}} a besoin de ta permission pour utiliser l’appareil photo. Tu peux l’activer dans les réglages.',
  photoCameraFailed: 'On n’a pas pu ouvrir l’appareil photo. Réessaie.',

  // ── Recruteur : sports, rôle, lieu, cible ─────────────────────────────────
  recruiterSportsTitle: 'Dans quels sports travailles-tu ?',
  recruiterSportsSubtitle:
    'Choisis-en autant que tu veux. C’est ce qui nous sert à te montrer les bons athlètes.',

  recruiterRoleTitle: 'Dis-nous ton rôle',
  recruiterRoleSubtitle: 'Les athlètes et leurs parents le voient : reste simple et exact.',
  recruiterRoleLabel: 'Ton rôle',
  recruiterRolePlaceholderClub: 'Directeur d’académie',
  recruiterRolePlaceholderCoach: 'Entraîneur principal, U16',
  recruiterRoleRequired: 'Dis-nous ce que tu fais.',
  recruiterClubLabel: 'Nom du club ou de l’académie',
  recruiterClubHintClub: 'On l’utilisera pour créer la page de ton club.',
  recruiterClubHintCoach: 'Laisse vide si tu es indépendant.',

  recruiterPlaceTitle: 'Tu es basé où ?',
  recruiterPlaceSubtitle: 'On met les athlètes proches de toi en haut de tes résultats.',

  recruiterTargetTitle: 'Tu cherches qui ?',
  recruiterTargetSubtitle:
    'Une réponse approximative suffit. Tu pourras tout changer plus tard dans tes réglages.',
  recruiterPositionsTitle: 'Postes',
  recruiterPositionsEmpty: 'Reviens en arrière et choisis un sport pour voir ses postes.',
  recruiterAgeGroupTitle: 'Tranche d’âge',
  recruiterMinorsNote:
    'Les athlètes de moins de 18 ans n’apparaissent qu’une fois leur profil validé par un parent ou tuteur.',
  ageBandAny: 'Tout âge',
  ageBandUnder14: 'Moins de 14 ans',
  ageBand14To16: '14 à 16 ans',
  ageBand16To18: '16 à 18 ans',
  ageBand18To21: '18 à 21 ans',
  ageBand21Plus: '21 ans et plus',

  // ── Parent ou tuteur : comment ça marche ──────────────────────────────────
  guardianIntroTitle: 'Comment ça marche pour toi',
  guardianIntroSubtitle:
    'Tu es là pour garder un œil sur le profil de ton enfant, pas pour en créer un.',
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: 'Te relier à ton enfant',
  guardianIntroLinkBody:
    'Ouvre les réglages et choisis Parent et tuteur. S’il t’a déjà envoyé un e-mail de validation, le lien qu’il contient vous relie tout de suite.',
  guardianIntroDecideTitle: 'Décider ce qu’il peut faire',
  guardianIntroDecideBody:
    'Tu dis oui ou non à deux choses : si les coachs peuvent le trouver dans les recherches, et si des coachs vérifiés peuvent lui écrire.',
  guardianIntroChangeTitle: 'Changer d’avis quand tu veux',
  guardianIntroChangeBody:
    'Tu peux désactiver l’une ou l’autre à tout moment depuis les réglages, et son profil sort des recherches immédiatement.',
  guardianIntroFooter:
    'Tant que tu n’as pas validé, le profil de ton enfant reste caché. Personne ne peut le chercher et aucun adulte ne peut engager une conversation avec lui.',

  // ── Fin : athlète ─────────────────────────────────────────────────────────
  scoreLoading: 'Calcul de ton score',
  scoreErrorNote:
    'Ton profil est enregistré dans tous les cas — tu peux continuer et voir ton score plus tard.',
  athleteDoneTitle: 'Bien joué',
  athleteDoneTitleNamed: 'Bien joué, {{name}}',
  athleteDoneScored: 'Ton profil est en ligne. Voilà ton point de départ — {{tier}}.',
  athleteDoneNoScore:
    'Ton profil est en ligne. Ajoute encore un peu et ton Score Talent apparaîtra dessus.',
  tipsTitle: 'Comment le faire monter',
  tipPoints: '+{{points}}',
  tipsEmpty:
    'Poste un highlight, ajoute tes stats et fais-toi recommander par ton club. Chaque élément ajouté fait bouger le score.',
  guardianRequested:
    'On a écrit à {{name}}. Dès qu’il valide, les coachs peuvent te trouver. D’ici là, ton profil reste privé.',
  guardianPendingTitle: 'Il reste une chose',
  guardianPendingBody:
    'Ton profil est caché tant qu’un parent ou tuteur ne l’a pas validé. Tu peux lui envoyer l’e-mail à tout moment depuis les réglages.',

  // ── Fin : recruteur, tuteur et tous les autres ────────────────────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: 'Tout est prêt',
  recruiterDoneTitleNamed: 'Tout est prêt, {{name}}',
  recruiterDoneBody:
    'On commence à te proposer des athlètes qui correspondent à ce que tu cherches.',
  recruiterDonePointSearch: 'Chercher et filtrer des athlètes dans Découvrir',
  recruiterDonePointPost: 'Publier des essais et des places pour que les athlètes postulent',
  recruiterDonePointVerified: 'Te faire vérifier pour écrire aux athlètes de moins de 18 ans',
  doneTitle: 'C’est bon',
  guardianDoneBody: 'Ton compte est prêt. Te relier à ton enfant prend environ une minute.',
  basicDoneBody: 'Fais un tour et règle le reste quand tu veux.',
  guardianDoneNote:
    'Réglages, puis Parent et tuteur. Si ton enfant t’a déjà envoyé un e-mail de validation, ouvrir le lien qu’il contient relie vos comptes.',
};
