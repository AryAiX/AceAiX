/**
 * Le parcours hors connexion : accueil, connexion, inscription et les deux
 * écrans de mot de passe.
 *
 * Les textes sur l’âge et sur le parent ou tuteur sont des textes de
 * conformité. Treize ans est l’âge minimum pour avoir un compte, et un jeune de
 * 13 à 17 ans a besoin de l’accord d’un parent ou tuteur avant de pouvoir être
 * trouvé ou recevoir des messages. On traduit les mots, jamais la règle.
 */
export const auth = {
  // ── Cadre de l’assistant, partagé avec l’assistant de profil ──────────────
  stepCounter: '{{current}}/{{total}}',
  stepProgress: 'Étape {{current}} sur {{total}}',
  stepBack: 'Revenir à l’étape précédente',

  // ── Champs et messages utilisés sur plusieurs écrans ──────────────────────
  emailLabel: 'E-mail',
  passwordLabel: 'Mot de passe',
  emailRequired: 'Saisis ton adresse e-mail.',
  emailInvalid: 'Cette adresse e-mail n’a pas l’air correcte.',
  passwordRequired: 'Saisis ton mot de passe.',
  passwordMinLength_one: 'Utilise au moins {{count}} caractère.',
  passwordMinLength_many: 'Utilise au moins {{count}} caractères.',
  passwordMinLength_other: 'Utilise au moins {{count}} caractères.',
  passwordLengthPlaceholder_one: 'Au moins {{count}} caractère',
  passwordLengthPlaceholder_many: 'Au moins {{count}} caractères',
  passwordLengthPlaceholder_other: 'Au moins {{count}} caractères',
  createAccount: 'Créer un compte',
  checkYourEmail: 'Regarde tes e-mails',
  sentTo: 'Envoyé à',
  backToSignIn: 'Retour à la connexion',

  // ── Conditions et confidentialité ─────────────────────────────────────────
  /* Les deux libellés de lien sont placés dans la phrase, pour qu’un
     traducteur puisse les déplacer là où sa langue les attend. */
  legalContinue: 'En continuant, tu acceptes nos {{terms}} et notre {{privacy}}.',
  legalAgree: 'J’accepte les {{terms}} et la {{privacy}}.',
  legalTermsLink: 'Conditions',
  legalTermsA11y: 'Lire les conditions d’utilisation',
  legalPrivacyA11y: 'Lire la politique de confidentialité',
  legalAgreeA11y: 'J’accepte les conditions d’utilisation et la politique de confidentialité',

  // ── Indicateur de force du mot de passe ───────────────────────────────────
  password: {
    tooShortLabel: 'Trop court',
    weakLabel: 'Faible',
    weakHint: 'Ajoute une majuscule et un chiffre.',
    goodLabel: 'Correct',
    goodHint: 'Ajoute un chiffre ou un symbole pour le renforcer.',
    strongLabel: 'Solide',
    strongHint: 'Voilà un bon mot de passe.',
    meterSummary: '{{label}} · {{hint}}',
  },

  // ── Accueil ───────────────────────────────────────────────────────────────
  welcome: {
    headline: 'Fais-toi repérer.',
    subheadline: 'Ton talent, découvert.',
    body: 'Crée ton profil, obtiens ton Score Talent et laisse les coachs et les clubs te trouver.',
    highlightScore: 'Un Score Talent sur 100 qui montre où tu en es',
    highlightTrials: 'De vrais essais et de vraies places dans des clubs et des académies',
    highlightGuardian: 'Moins de 18 ans ? Un parent valide ton profil avant que qui que ce soit puisse te trouver',
    signIn: 'J’ai déjà un compte',
  },

  // ── Connexion ─────────────────────────────────────────────────────────────
  signIn: {
    title: 'Content de te revoir',
    subtitle: 'Connecte-toi pour reprendre où tu en étais.',
    passwordPlaceholder: 'Ton mot de passe',
    forgot: 'Mot de passe oublié ?',
    forgotA11y: 'Réinitialiser ton mot de passe',
    submit: 'Se connecter',
    newHere: 'Nouveau sur {{app}} ?',
    createAccount: 'Créer un compte',
  },

  // ── Inscription ───────────────────────────────────────────────────────────
  signUp: {
    roleTitle: 'Tu es qui ?',
    roleSubtitle:
      'Cela prépare le bon type de profil. Notre équipe support peut le changer plus tard.',
    roleAthleteTitle: 'Je suis athlète',
    roleAthleteSubtitle: 'Créer un profil et me faire repérer',
    roleCoachTitle: 'Je suis coach',
    roleCoachSubtitle: 'Trouver des joueurs et partager des places',
    roleClubTitle: 'Je suis un club ou une académie',
    roleClubSubtitle: 'Repérer des talents et publier des essais',
    roleGuardianTitle: 'Je suis parent ou tuteur',
    roleGuardianSubtitle: 'Accompagner et valider le profil de mon enfant',

    nameTitle: 'On t’appelle comment ?',
    nameSubtitle: 'Mets ton vrai nom — les coachs doivent savoir qui ils regardent.',
    firstNameLabel: 'Prénom',
    firstNamePlaceholder: 'Sara',
    firstNameRequired: 'Saisis ton prénom.',
    lastNameLabel: 'Nom',
    lastNamePlaceholder: 'Karimi',
    lastNameRequired: 'Saisis ton nom.',

    dobTitle: 'Tu es né quand ?',
    dobSubtitle:
      'On le demande pour protéger les plus jeunes. Ta date de naissance exacte n’est jamais montrée à personne — seulement une tranche d’âge.',
    dobChoose: 'Choisis ta date de naissance',
    dobChange: 'Modifier',
    dobSelectedA11y: 'Date de naissance, {{date}}. La modifier',
    dobDayLabel: 'Jour',
    dobDayPlaceholder: '04',
    dobMonthLabel: 'Mois',
    dobMonthPlaceholder: '09',
    dobYearLabel: 'Année',
    dobYearPlaceholder: '2010',
    dobTooYoung:
      'Il faut avoir au moins {{age}} ans pour avoir un compte {{app}}. Appuie sur {{action}} et on t’explique la suite.',
    dobMinorTitle: 'Un parent ou tuteur entre en jeu',
    dobMinorBody:
      'Comme tu as moins de 18 ans, un parent ou tuteur doit valider ton profil avant que les coachs puissent te trouver. On te demandera son e-mail dans un instant, et il recevra un court message qui explique tout.',

    blockedTitle: 'Reviens à tes {{age}} ans',
    blockedBody:
      '{{app}} est fait pour les athlètes de {{age}} ans et plus, donc on ne peut pas encore créer ton compte. Cette règle protège les plus jeunes en ligne, et on ne peut pas faire d’exception.',
    blockedEncouragement:
      'Continue à t’entraîner. À tes {{age}} ans, reviens : ton profil t’attend.',
    blockedBackToStart: 'Retour au début',
    blockedWrongDate: 'Je me suis trompé de date',

    accountTitle: 'Crée tes identifiants',
    accountSubtitle:
      'Un e-mail, un mot de passe. On envoie un lien pour confirmer que l’adresse est bien la tienne.',
    termsRequired: 'Accepte les conditions et la politique de confidentialité pour continuer.',
  },

  // ── Regarde tes e-mails ───────────────────────────────────────────────────
  checkEmail: {
    body: 'On t’a envoyé un lien pour confirmer ton adresse. Ouvre-le, puis reviens te connecter.',
    spamHint:
      'Toujours rien ? Ça peut prendre une minute, et ça atterrit parfois dans les spams ou les promotions.',
    resendCountdown_one: 'Renvoyer l’e-mail dans {{count}} s',
    resendCountdown_many: 'Renvoyer l’e-mail dans {{count}} s',
    resendCountdown_other: 'Renvoyer l’e-mail dans {{count}} s',
    resend: 'Renvoyer l’e-mail',
    resendSuccess: 'Envoyé. Regarde à nouveau ta boîte de réception.',
  },

  // ── Mot de passe oublié ───────────────────────────────────────────────────
  forgotPassword: {
    title: 'Mot de passe oublié ?',
    subtitle:
      'Donne-nous l’e-mail utilisé à l’inscription et on t’envoie un lien pour en choisir un nouveau.',
    submit: 'Envoyer le lien',
    sentBody:
      'Si un compte utilise cette adresse, un lien pour définir un nouveau mot de passe est en route. Il ne marche qu’une fois et expire au bout d’un moment.',
  },

  // ── Nouveau mot de passe ──────────────────────────────────────────────────
  resetPassword: {
    title: 'Choisis un nouveau mot de passe',
    subtitle:
      'Prends-en un que tu n’utilises nulle part ailleurs. Tu seras connecté juste après.',
    newPasswordLabel: 'Nouveau mot de passe',
    repeatLabel: 'Répète le nouveau mot de passe',
    repeatPlaceholder: 'Tape-le encore une fois',
    repeatRequired: 'Retape le nouveau mot de passe.',
    mismatch: 'Les deux mots de passe ne correspondent pas.',
    submit: 'Enregistrer le mot de passe',
    success: 'Mot de passe changé. Tu es connecté.',
    expiredHint: 'Si ce lien a expiré, demandes-en un nouveau depuis l’écran de connexion.',
  },
};
