import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Eye, MessageCircle, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, Chip, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { StepHeading } from './Shared';

export type GuardianRelationship = 'parent' | 'guardian';

/* The relationship is stored as written here; only the chip label is translated. */
const RELATIONSHIPS: { value: GuardianRelationship; labelKey: string }[] = [
  { value: 'parent', labelKey: 'onboarding.guardianRelationshipParent' },
  { value: 'guardian', labelKey: 'onboarding.guardianRelationshipGuardian' },
];

function ApprovalLine({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text variant="captionStrong">{title}</Text>
        <Text variant="caption" tone="secondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

/**
 * The guardian consent step, shown only to accounts the database has marked as
 * a minor.
 *
 * Two things matter here for App Store and Play review, and for the parent
 * reading over a 14-year-old's shoulder: the child is told exactly what is
 * being asked of the adult, and skipping is possible but never silent — the
 * profile stays out of search until an adult says yes.
 */
export function GuardianConsentStep({
  name,
  email,
  relationship,
  nameError,
  emailError,
  onChangeName,
  onChangeEmail,
  onChangeRelationship,
  onSkip,
}: {
  name: string;
  email: string;
  relationship: GuardianRelationship;
  nameError: string | null;
  emailError: string | null;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeRelationship: (value: GuardianRelationship) => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const emailRef = useRef<TextInput>(null);

  return (
    <View>
      <StepHeading
        title={t('onboarding.guardianTitle')}
        subtitle={t('onboarding.guardianSubtitle')}
      />

      <View style={{ gap: spacing.xl }}>
        <Card tone="primarySoft" style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <ShieldCheck size={18} color={colors.primary} />
            <Text variant="bodyStrong">{t('onboarding.guardianApprovalTitle')}</Text>
          </View>

          <Text variant="caption" tone="secondary">
            {t('onboarding.guardianApprovalBody')}
          </Text>

          <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
            <ApprovalLine
              icon={<Eye size={16} color={colors.primary} />}
              title={t('onboarding.guardianSearchTitle')}
              body={t('onboarding.guardianSearchBody')}
            />
            <ApprovalLine
              icon={<MessageCircle size={16} color={colors.primary} />}
              title={t('onboarding.guardianMessageTitle')}
              body={t('onboarding.guardianMessageBody')}
            />
          </View>
        </Card>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('onboarding.guardianWhoTitle')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {RELATIONSHIPS.map((option) => (
              <Chip
                key={option.value}
                label={t(option.labelKey)}
                selected={relationship === option.value}
                onPress={() => onChangeRelationship(option.value)}
                style={{ minHeight: theme.hit.min }}
              />
            ))}
          </View>
        </View>

        <Input
          label={t('onboarding.guardianNameLabel')}
          required
          value={name}
          onChangeText={onChangeName}
          error={nameError}
          placeholder={t('onboarding.guardianNamePlaceholder')}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          testID="guardian-name"
        />

        <Input
          ref={emailRef}
          label={t('onboarding.guardianEmailLabel')}
          required
          value={email}
          onChangeText={onChangeEmail}
          error={emailError}
          placeholder="parent@example.com"
          hint={t('onboarding.guardianEmailHint')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          testID="guardian-email"
        />

        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.guardianSkipA11y')}
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: theme.hit.min,
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
          testID="guardian-skip"
        >
          <Text variant="captionStrong" tone="primary">
            {t('onboarding.guardianSkip')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('onboarding.guardianSkipHint')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
