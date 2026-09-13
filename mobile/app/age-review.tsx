import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { requestUnderageAgeAppeal } from '@/lib/api.settings';
import { errorMessage } from '@/lib/errors';
import { COMPANY } from '@/lib/legal';

export default function AgeReviewScreen() {
  const { colors, spacing } = useTheme();
  const { signOut } = useAuth();
  const t = useT();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReview = async () => {
    setRequesting(true);
    setError(null);
    try {
      await requestUnderageAgeAppeal();
      setRequested(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Screen testID="age-review-screen">
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <ShieldAlert size={42} color={colors.primary} accessibilityElementsHidden />
        <Text variant="title" accessibilityRole="header">
          {t('safety.ageReviewTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('safety.ageReviewBody')}
        </Text>
        <Text variant="body" tone="secondary">
          {requested ? t('safety.ageReviewRequested') : t('safety.ageReviewCorrection')}
        </Text>
        {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
        <Button
          label={requested ? t('safety.ageReviewRequestedButton') : t('safety.ageReviewRequest')}
          onPress={requestReview}
          loading={requesting}
          disabled={requested}
          testID="age-review-appeal"
        />
        <Text
          variant="captionStrong"
          tone="primary"
          accessibilityRole="link"
          onPress={() => Linking.openURL(`mailto:${COMPANY.safetyEmail}`)}
        >
          {t('safety.ageReviewEmail', { email: COMPANY.safetyEmail })}
        </Text>
        <Button
          label={t('settings.signOut')}
          variant="secondary"
          onPress={signOut}
          testID="age-review-sign-out"
        />
      </View>
    </Screen>
  );
}
