import React from 'react';
import { View } from 'react-native';
import { Link2, ShieldCheck, SlidersHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { StepHeading } from './Shared';

function Step({
  index,
  icon,
  title,
  body,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text variant="captionStrong">
          {t('onboarding.guardianIntroStepLabel', { index, title })}
        </Text>
        <Text variant="caption" tone="secondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

/**
 * Parents and guardians do not build a profile of their own — they watch over
 * a child's. So the only thing this step does is explain, in plain words, how
 * to get connected and what they will be able to decide.
 */
export function GuardianIntroStep() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;

  return (
    <View>
      <StepHeading
        title={t('onboarding.guardianIntroTitle')}
        subtitle={t('onboarding.guardianIntroSubtitle')}
      />

      <View style={{ gap: spacing.xl }}>
        <Card tone="alt" style={{ gap: spacing.lg }}>
          <Step
            index={1}
            icon={<Link2 size={18} color={colors.primary} />}
            title={t('onboarding.guardianIntroLinkTitle')}
            body={t('onboarding.guardianIntroLinkBody')}
          />
          <Step
            index={2}
            icon={<ShieldCheck size={18} color={colors.primary} />}
            title={t('onboarding.guardianIntroDecideTitle')}
            body={t('onboarding.guardianIntroDecideBody')}
          />
          <Step
            index={3}
            icon={<SlidersHorizontal size={18} color={colors.primary} />}
            title={t('onboarding.guardianIntroChangeTitle')}
            body={t('onboarding.guardianIntroChangeBody')}
          />
        </Card>

        <Text variant="caption" tone="muted">
          {t('onboarding.guardianIntroFooter')}
        </Text>
      </View>
    </View>
  );
}
