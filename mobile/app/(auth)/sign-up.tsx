import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Screen, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { stashPendingDateOfBirth } from '@/lib/api.auth';
import type { SignupRole } from '@/types/models';
import {
  MIN_PASSWORD_LENGTH,
  WizardTopBar,
  calculateAge,
  isValidEmail,
  toIsoDate,
} from '@/components/onboarding/Shared';
import {
  AccountStep,
  AgeGateBlocked,
  DateOfBirthStep,
  MINIMUM_AGE,
  NameStep,
  RoleStep,
} from '@/components/onboarding/SignupSteps';

/**
 * Sign-up in four short steps: who you are, your name, your date of birth,
 * then the login itself.
 *
 * The date of birth step is an age gate, not a form field. Under 13 the account
 * is never created — the database refuses it as well, but a person deserves an
 * explanation rather than an error.
 */

const STEPS = ['role', 'name', 'dob', 'account'] as const;
type StepKey = (typeof STEPS)[number];

export default function SignUpScreen() {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { signUp } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [blockedByAge, setBlockedByAge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [role, setRole] = useState<SignupRole | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [firstError, setFirstError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  const step: StepKey = STEPS[stepIndex];

  const goBack = () => {
    if (stepIndex === 0) {
      if (router.canGoBack()) router.back();
      else router.replace(Routes.auth.welcome);
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const validateName = (): boolean => {
    const nextFirst = firstName.trim().length < 2 ? t('auth.signUp.firstNameRequired') : null;
    const nextLast = lastName.trim().length < 2 ? t('auth.signUp.lastNameRequired') : null;
    setFirstError(nextFirst);
    setLastError(nextLast);
    return !nextFirst && !nextLast;
  };

  const validateAccount = (): boolean => {
    const nextEmail = !email.trim()
      ? t('auth.emailRequired')
      : isValidEmail(email)
        ? null
        : t('auth.emailInvalid');
    const nextPassword =
      password.length < MIN_PASSWORD_LENGTH
        ? t('auth.passwordMinLength', { count: MIN_PASSWORD_LENGTH })
        : null;
    const nextTerms = agreed ? null : t('auth.signUp.termsRequired');

    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setTermsError(nextTerms);
    return !nextEmail && !nextPassword && !nextTerms;
  };

  const submit = async () => {
    if (submitting) return;
    if (!role || !dob) return;
    if (!validateAccount()) return;

    // Belt and braces: the age gate already blocked this, but never let a
    // stale state slip an under-13 account past.
    if (calculateAge(dob) < MINIMUM_AGE) {
      setBlockedByAge(true);
      return;
    }

    setSubmitting(true);
    try {
      // Park the date of birth before the account exists: `user_private` is
      // behind RLS, and with e-mail confirmation on there is no session to
      // write with until the link is clicked. Onboarding applies it.
      await stashPendingDateOfBirth(email, toIsoDate(dob));

      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (needsEmailConfirmation) {
        router.replace({
          pathname: Routes.auth.checkEmail,
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }
      // Otherwise the gate in app/_layout.tsx sends them into onboarding.
    } catch (err) {
      const message = errorMessage(err);
      setEmailError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    switch (step) {
      case 'role':
        if (role) setStepIndex(1);
        return;
      case 'name':
        if (validateName()) setStepIndex(2);
        return;
      case 'dob':
        if (!dob) return;
        if (calculateAge(dob) < MINIMUM_AGE) {
          setBlockedByAge(true);
          return;
        }
        setStepIndex(3);
        return;
      case 'account':
        void submit();
    }
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 'role':
        return role !== null;
      case 'name':
        return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 'dob':
        return dob !== null;
      case 'account':
        return email.trim().length > 0 && password.length > 0 && agreed;
    }
  };

  if (blockedByAge) {
    return (
      <Screen keyboardAvoiding testID="sign-up-age-blocked">
        <AgeGateBlocked
          onChangeDate={() => {
            setBlockedByAge(false);
            setDob(null);
            setStepIndex(2);
          }}
          onBackToWelcome={() => router.replace(Routes.auth.welcome)}
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAvoiding
      header={<WizardTopBar step={stepIndex} total={STEPS.length} onBack={goBack} />}
      footer={
        <Button
          label={step === 'account' ? t('auth.createAccount') : t('common.continue')}
          size="lg"
          fullWidth
          disabled={!canContinue()}
          loading={submitting}
          onPress={advance}
          testID="signup-continue"
        />
      }
      testID="sign-up-screen"
    >
      <View style={{ paddingTop: spacing.md }}>
        {step === 'role' ? <RoleStep value={role} onChange={setRole} /> : null}

        {step === 'name' ? (
          <NameStep
            firstName={firstName}
            lastName={lastName}
            onChangeFirst={(value) => {
              setFirstName(value);
              if (firstError) setFirstError(null);
            }}
            onChangeLast={(value) => {
              setLastName(value);
              if (lastError) setLastError(null);
            }}
            firstError={firstError}
            lastError={lastError}
            onSubmit={advance}
          />
        ) : null}

        {step === 'dob' ? <DateOfBirthStep value={dob} onChange={setDob} /> : null}

        {step === 'account' ? (
          <AccountStep
            email={email}
            password={password}
            agreed={agreed}
            emailError={emailError}
            passwordError={passwordError}
            termsError={termsError}
            onChangeEmail={(value) => {
              setEmail(value);
              if (emailError) setEmailError(null);
            }}
            onChangePassword={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError(null);
            }}
            onToggleAgreed={() => {
              setAgreed((v) => !v);
              if (termsError) setTermsError(null);
            }}
            onOpenTerms={() => router.push(Routes.terms)}
            onOpenPrivacy={() => router.push(Routes.privacy)}
            onSubmit={advance}
          />
        ) : null}
      </View>
    </Screen>
  );
}
