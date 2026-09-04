/**
 * The signed-out journey: welcome, sign in, sign up, and the two password
 * screens.
 *
 * The age-gate and guardian lines are compliance copy. Thirteen is the minimum
 * age for an account, and a 13–17 year old needs a parent or guardian's
 * approval before they can be found or messaged. Translate the words, never the
 * rule.
 */
export const auth = {
  // ── Wizard chrome, shared with the onboarding wizard ──────────────────────
  stepCounter: '{{current}}/{{total}}',
  stepProgress: 'Step {{current}} of {{total}}',
  stepBack: 'Go back one step',

  // ── Fields and messages used on more than one screen ──────────────────────
  emailLabel: 'Email',
  passwordLabel: 'Password',
  emailRequired: 'Enter your email address.',
  emailInvalid: 'That email address does not look right.',
  passwordRequired: 'Enter your password.',
  passwordMinLength_one: 'Use at least {{count}} character.',
  passwordMinLength_other: 'Use at least {{count}} characters.',
  passwordLengthPlaceholder_one: 'At least {{count}} character',
  passwordLengthPlaceholder_other: 'At least {{count}} characters',
  createAccount: 'Create account',
  checkYourEmail: 'Check your email',
  sentTo: 'Sent to',
  backToSignIn: 'Back to sign in',

  // ── Terms and privacy ─────────────────────────────────────────────────────
  /* The two link labels are placed inside the sentence, so a translator can
     move them wherever their language wants them. */
  legalContinue: 'By continuing you agree to our {{terms}} and {{privacy}}.',
  legalAgree: 'I agree to the {{terms}} and {{privacy}}.',
  legalTermsLink: 'Terms',
  legalTermsA11y: 'Read the Terms of Service',
  legalPrivacyA11y: 'Read the Privacy Policy',
  legalAgreeA11y: 'I agree to the Terms of Service and the Privacy Policy',

  // ── Password strength meter ───────────────────────────────────────────────
  password: {
    tooShortLabel: 'Too short',
    weakLabel: 'Weak',
    weakHint: 'Mix in a capital letter and a number.',
    goodLabel: 'Good',
    goodHint: 'Add a number or symbol to make it stronger.',
    strongLabel: 'Strong',
    strongHint: 'That is a good password.',
    meterSummary: '{{label}} · {{hint}}',
  },

  // ── Welcome ───────────────────────────────────────────────────────────────
  welcome: {
    headline: 'Get seen.',
    subheadline: 'Your talent, discovered.',
    body: 'Build your profile, get your Talent Score, and let coaches and clubs find you.',
    highlightScore: 'A Talent Score out of 100 that shows where you stand',
    highlightTrials: 'Real trials and openings from clubs and academies',
    highlightGuardian: 'Under 18? A parent approves your profile before anyone can find you',
    signIn: 'I already have an account',
  },

  // ── Sign in ───────────────────────────────────────────────────────────────
  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in to pick up where you left off.',
    passwordPlaceholder: 'Your password',
    forgot: 'Forgot password?',
    forgotA11y: 'Reset your password',
    submit: 'Sign in',
    newHere: 'New to {{app}}?',
    createAccount: 'Create an account',
  },

  // ── Sign up ───────────────────────────────────────────────────────────────
  signUp: {
    roleTitle: 'Which one is you?',
    roleSubtitle:
      'This sets up the right kind of profile. You can change it later with our support team.',
    roleAthleteTitle: "I'm an athlete",
    roleAthleteSubtitle: 'Build a profile and get discovered',
    roleCoachTitle: "I'm a coach",
    roleCoachSubtitle: 'Find players and share openings',
    roleClubTitle: "I'm a club or academy",
    roleClubSubtitle: 'Scout talent and post trials',
    roleGuardianTitle: "I'm a parent or guardian",
    roleGuardianSubtitle: "Support and approve your child's profile",

    nameTitle: 'What should we call you?',
    nameSubtitle: 'Use your real name — coaches need to know who they are looking at.',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Sara',
    firstNameRequired: 'Enter your first name.',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Karimi',
    lastNameRequired: 'Enter your last name.',

    dobTitle: 'When were you born?',
    dobSubtitle:
      'We ask so we can keep younger athletes safe. Your exact birthday is never shown to anyone — only an age range.',
    dobChoose: 'Choose your date of birth',
    dobChange: 'Change',
    dobSelectedA11y: 'Date of birth, {{date}}. Change it',
    dobDayLabel: 'Day',
    dobDayPlaceholder: '04',
    dobMonthLabel: 'Month',
    dobMonthPlaceholder: '09',
    dobYearLabel: 'Year',
    dobYearPlaceholder: '2010',
    dobTooYoung:
      'You need to be at least {{age}} to have an {{app}} account. Tap {{action}} and we will explain what to do next.',
    dobMinorTitle: 'A parent or guardian joins in',
    dobMinorBody:
      'Because you are under 18, a parent or guardian has to approve your profile before coaches can find you. We will ask for their email in a moment, and they get a short message explaining everything.',

    blockedTitle: 'Come back when you turn {{age}}',
    blockedBody:
      '{{app}} is built for athletes aged {{age}} and up, so we cannot create an account for you yet. That rule is there to keep younger kids safe online, and we are not able to make an exception.',
    blockedEncouragement:
      'Keep training. When you turn {{age}}, come back and your profile is waiting.',
    blockedBackToStart: 'Back to start',
    blockedWrongDate: 'I picked the wrong date',

    accountTitle: 'Set up your login',
    accountSubtitle:
      'One email, one password. We will send a link to confirm the address is yours.',
    termsRequired: 'Please agree to the Terms and Privacy Policy to continue.',
  },

  // ── Check your email ──────────────────────────────────────────────────────
  checkEmail: {
    body: 'We sent you a link to confirm your address. Tap it, then come back and sign in.',
    spamHint:
      'Nothing yet? It can take a minute, and it sometimes lands in spam or promotions.',
    resendCountdown_one: 'Resend email in {{count}}s',
    resendCountdown_other: 'Resend email in {{count}}s',
    resend: 'Resend email',
    resendSuccess: 'Sent. Have another look in your inbox.',
  },

  // ── Forgot password ───────────────────────────────────────────────────────
  forgotPassword: {
    title: 'Forgot your password?',
    subtitle:
      'Tell us the email you signed up with and we will send you a link to set a new one.',
    submit: 'Send reset link',
    sentBody:
      'If an account uses that address, a link to set a new password is on its way. The link works once and expires after a while.',
  },

  // ── Reset password ────────────────────────────────────────────────────────
  resetPassword: {
    title: 'Set a new password',
    subtitle:
      'Pick something you have not used anywhere else. You will be signed in straight after.',
    newPasswordLabel: 'New password',
    repeatLabel: 'Repeat new password',
    repeatPlaceholder: 'Type it once more',
    repeatRequired: 'Type the new password again.',
    mismatch: 'The two passwords do not match.',
    submit: 'Save new password',
    success: 'Password changed. You are signed in.',
    expiredHint: 'If this link has expired, ask for a new one from the sign-in screen.',
  },
};
