import React, { useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Lock, Mail, ShieldAlert, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { SignupRole } from '@/types/models';
import {
  CheckboxRow,
  LegalLine,
  MIN_PASSWORD_LENGTH,
  OptionCard,
  PasswordMeter,
  StepHeading,
  calculateAge,
  formatDate,
  passwordStrength,
} from './Shared';

/** The four steps of sign-up. One question at a time, never a wall of fields. */

// ── 1. Role ──────────────────────────────────────────────────────────────────
/* The role is written to the database, so only the labels are translated. */
const ROLES: {
  value: SignupRole;
  titleKey: string;
  subtitleKey: string;
  emoji: string;
}[] = [
  {
    value: 'athlete',
    titleKey: 'auth.signUp.roleAthleteTitle',
    subtitleKey: 'auth.signUp.roleAthleteSubtitle',
    emoji: '🏃',
  },
  {
    value: 'coach',
    titleKey: 'auth.signUp.roleCoachTitle',
    subtitleKey: 'auth.signUp.roleCoachSubtitle',
    emoji: '📋',
  },
  {
    value: 'club',
    titleKey: 'auth.signUp.roleClubTitle',
    subtitleKey: 'auth.signUp.roleClubSubtitle',
    emoji: '🏟️',
  },
  {
    value: 'guardian',
    titleKey: 'auth.signUp.roleGuardianTitle',
    subtitleKey: 'auth.signUp.roleGuardianSubtitle',
    emoji: '🛡️',
  },
];

export function RoleStep({
  value,
  onChange,
}: {
  value: SignupRole | null;
  onChange: (role: SignupRole) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading
        title={t('auth.signUp.roleTitle')}
        subtitle={t('auth.signUp.roleSubtitle')}
      />
      <View style={{ gap: theme.spacing.md }}>
        {ROLES.map((role) => (
          <OptionCard
            key={role.value}
            title={t(role.titleKey)}
            subtitle={t(role.subtitleKey)}
            emoji={role.emoji}
            selected={value === role.value}
            onPress={() => onChange(role.value)}
            testID={`signup-role-${role.value}`}
          />
        ))}
      </View>
    </View>
  );
}

// ── 2. Name ──────────────────────────────────────────────────────────────────
export function NameStep({
  firstName,
  lastName,
  onChangeFirst,
  onChangeLast,
  firstError,
  lastError,
  onSubmit,
}: {
  firstName: string;
  lastName: string;
  onChangeFirst: (value: string) => void;
  onChangeLast: (value: string) => void;
  firstError: string | null;
  lastError: string | null;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const lastRef = useRef<TextInput>(null);

  return (
    <View>
      <StepHeading
        title={t('auth.signUp.nameTitle')}
        subtitle={t('auth.signUp.nameSubtitle')}
      />
      <View style={{ gap: theme.spacing.lg }}>
        <Input
          label={t('auth.signUp.firstNameLabel')}
          required
          value={firstName}
          onChangeText={onChangeFirst}
          error={firstError}
          placeholder={t('auth.signUp.firstNamePlaceholder')}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => lastRef.current?.focus()}
          testID="signup-first-name"
        />
        <Input
          ref={lastRef}
          label={t('auth.signUp.lastNameLabel')}
          required
          value={lastName}
          onChangeText={onChangeLast}
          error={lastError}
          placeholder={t('auth.signUp.lastNamePlaceholder')}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          testID="signup-last-name"
        />
      </View>
    </View>
  );
}

// ── 3. Date of birth ─────────────────────────────────────────────────────────
export const MINIMUM_AGE = 13;

function defaultDobStart(): Date {
  // Opens the picker in the middle of our audience rather than on today.
  const d = new Date();
  d.setFullYear(d.getFullYear() - 15);
  return d;
}

/** Day / month / year entry. The native picker has no web build. */
function WebDateFields({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [day, setDay] = useState(value ? String(value.getDate()) : '');
  const [month, setMonth] = useState(value ? String(value.getMonth() + 1) : '');
  const [year, setYear] = useState(value ? String(value.getFullYear()) : '');

  const push = (d: string, m: string, y: string) => {
    const dayNum = Number(d);
    const monthNum = Number(m);
    const yearNum = Number(y);
    const thisYear = new Date().getFullYear();

    const complete =
      d.length > 0 &&
      m.length > 0 &&
      y.length === 4 &&
      dayNum >= 1 &&
      dayNum <= 31 &&
      monthNum >= 1 &&
      monthNum <= 12 &&
      yearNum >= thisYear - 100 &&
      yearNum <= thisYear;

    if (!complete) {
      onChange(null);
      return;
    }

    const candidate = new Date(yearNum, monthNum - 1, dayNum);
    // Rejects the 31st of February and friends, which Date happily rolls over.
    const real =
      candidate.getDate() === dayNum &&
      candidate.getMonth() === monthNum - 1 &&
      candidate.getFullYear() === yearNum;
    onChange(real && candidate.getTime() <= Date.now() ? candidate : null);
  };

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <Input
        label={t('auth.signUp.dobDayLabel')}
        containerStyle={{ flex: 1 }}
        value={day}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, 2);
          setDay(next);
          push(next, month, year);
        }}
        placeholder={t('auth.signUp.dobDayPlaceholder')}
        keyboardType="number-pad"
        testID="signup-dob-day"
      />
      <Input
        label={t('auth.signUp.dobMonthLabel')}
        containerStyle={{ flex: 1 }}
        value={month}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, 2);
          setMonth(next);
          push(day, next, year);
        }}
        placeholder={t('auth.signUp.dobMonthPlaceholder')}
        keyboardType="number-pad"
        testID="signup-dob-month"
      />
      <Input
        label={t('auth.signUp.dobYearLabel')}
        containerStyle={{ flex: 1.4 }}
        value={year}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, 4);
          setYear(next);
          push(day, month, next);
        }}
        placeholder={t('auth.signUp.dobYearPlaceholder')}
        keyboardType="number-pad"
        testID="signup-dob-year"
      />
    </View>
  );
}

export function DateOfBirthStep({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const [picking, setPicking] = useState(false);

  const age = value ? calculateAge(value) : null;
  const tooYoung = age !== null && age < MINIMUM_AGE;
  const isMinor = age !== null && age >= MINIMUM_AGE && age < 18;

  const maximumDate = new Date();
  const minimumDate = new Date();
  minimumDate.setFullYear(minimumDate.getFullYear() - 100);

  return (
    <View>
      <StepHeading
        title={t('auth.signUp.dobTitle')}
        subtitle={t('auth.signUp.dobSubtitle')}
      />

      <View style={{ gap: spacing.lg }}>
        {Platform.OS === 'web' ? (
          <WebDateFields value={value} onChange={onChange} />
        ) : (
          <>
            <Pressable
              onPress={() => setPicking(true)}
              accessibilityRole="button"
              accessibilityLabel={
                value
                  ? t('auth.signUp.dobSelectedA11y', { date: formatDate(value) })
                  : t('auth.signUp.dobChoose')
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 60,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: value ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
              testID="signup-dob-field"
            >
              <CalendarDays size={20} color={value ? colors.primary : colors.textMuted} />
              <Text variant="bodyStrong" tone={value ? 'default' : 'muted'} style={{ flex: 1 }}>
                {value ? formatDate(value) : t('auth.signUp.dobChoose')}
              </Text>
              {value ? (
                <Text variant="captionStrong" tone="primary">
                  {t('auth.signUp.dobChange')}
                </Text>
              ) : null}
            </Pressable>

            {picking ? (
              <View
                style={
                  Platform.OS === 'ios'
                    ? {
                        borderRadius: radii.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        overflow: 'hidden',
                      }
                    : undefined
                }
              >
                <DateTimePicker
                  value={value ?? defaultDobStart()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                  themeVariant={theme.scheme}
                  onChange={(event, selected) => {
                    // Android shows a dialog and closes itself; iOS stays inline.
                    if (Platform.OS !== 'ios') setPicking(false);
                    // 'dismissed' still carries a date on Android — cancelling
                    // must not quietly pick one.
                    if (event.type === 'set' && selected) onChange(selected);
                  }}
                />
              </View>
            ) : null}
          </>
        )}

        {tooYoung ? (
          <Card tone="alt" style={{ borderColor: colors.danger }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <ShieldAlert size={20} color={colors.danger} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t('auth.signUp.dobTooYoung', {
                  age: MINIMUM_AGE,
                  app: t('common.appName'),
                  action: t('common.continue'),
                })}
              </Text>
            </View>
          </Card>
        ) : null}

        {isMinor ? (
          <Card tone="primarySoft">
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Users size={20} color={colors.primary} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text variant="bodyStrong">{t('auth.signUp.dobMinorTitle')}</Text>
                <Text variant="caption" tone="secondary">
                  {t('auth.signUp.dobMinorBody')}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Shown when the date of birth puts the person under 13.
 *
 * There is no compliant way to run a social product for under-13s, so the
 * account is never created — the database refuses it too. The tone matters:
 * this is a 12-year-old being told no, so say it kindly and give them a door.
 */
export function AgeGateBlocked({
  onChangeDate,
  onBackToWelcome,
}: {
  onChangeDate: () => void;
  onBackToWelcome: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  return (
    <View style={{ paddingTop: spacing.xxl, gap: spacing.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radii.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        }}
      >
        <ShieldAlert size={32} color={colors.primary} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="title" accessibilityRole="header">
          {t('auth.signUp.blockedTitle', { age: MINIMUM_AGE })}
        </Text>
        <Text variant="body" tone="secondary">
          {t('auth.signUp.blockedBody', { age: MINIMUM_AGE, app: t('common.appName') })}
        </Text>
        <Text variant="body" tone="secondary">
          {t('auth.signUp.blockedEncouragement', { age: MINIMUM_AGE })}
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          label={t('auth.signUp.blockedBackToStart')}
          size="lg"
          fullWidth
          onPress={onBackToWelcome}
        />
        <Button
          label={t('auth.signUp.blockedWrongDate')}
          variant="ghost"
          fullWidth
          onPress={onChangeDate}
        />
      </View>
    </View>
  );
}

// ── 4. Account ───────────────────────────────────────────────────────────────
export function AccountStep({
  email,
  password,
  agreed,
  emailError,
  passwordError,
  termsError,
  onChangeEmail,
  onChangePassword,
  onToggleAgreed,
  onOpenTerms,
  onOpenPrivacy,
  onSubmit,
}: {
  email: string;
  password: string;
  agreed: boolean;
  emailError: string | null;
  passwordError: string | null;
  termsError: string | null;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onToggleAgreed: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const passwordRef = useRef<TextInput>(null);
  const strength = passwordStrength(password);

  return (
    <View>
      <StepHeading
        title={t('auth.signUp.accountTitle')}
        subtitle={t('auth.signUp.accountSubtitle')}
      />

      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('auth.emailLabel')}
          required
          value={email}
          onChangeText={onChangeEmail}
          error={emailError}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          icon={<Mail size={18} color={colors.textMuted} />}
          testID="signup-email"
        />

        <View style={{ gap: spacing.sm }}>
          <Input
            ref={passwordRef}
            label={t('auth.passwordLabel')}
            required
            value={password}
            onChangeText={onChangePassword}
            error={passwordError}
            placeholder={t('auth.passwordLengthPlaceholder', { count: MIN_PASSWORD_LENGTH })}
            password
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            icon={<Lock size={18} color={colors.textMuted} />}
            testID="signup-password"
          />
          {password.length > 0 ? <PasswordMeter strength={strength} /> : null}
        </View>

        <View style={{ gap: spacing.xs }}>
          <CheckboxRow
            checked={agreed}
            onToggle={onToggleAgreed}
            label={t('auth.legalAgreeA11y')}
          >
            <LegalLine
              templateKey="auth.legalAgree"
              onOpenTerms={onOpenTerms}
              onOpenPrivacy={onOpenPrivacy}
            />
          </CheckboxRow>
          {termsError ? (
            <Text variant="caption" tone="danger">
              {termsError}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
