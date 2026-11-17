import React from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { SportRequest } from '@/lib/api.profile';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Waiting or rejected, for the athlete only.
 *
 * The typed name is shown here and nowhere else. Everyone else sees
 * "Other sport" from the stored value.
 */
export function SportRequestNote({
  request,
  onChoose,
}: {
  request: SportRequest | null;
  onChoose: () => void;
}) {
  const t = useT();
  const { spacing } = useTheme();
  if (!request) return null;

  if (request.status === 'pending') {
    return (
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }} testID="sport-request-note">
        <Text variant="caption" tone="secondary">
          {t('sports.requestWaiting', { name: request.requested_name })}
        </Text>
        <Button
          label={t('sports.pickListed')}
          variant="secondary"
          size="sm"
          onPress={onChoose}
          testID="sport-request-pick-listed"
        />
      </View>
    );
  }

  if (request.status === 'rejected') {
    return (
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }} testID="sport-request-note">
        <Text variant="caption" tone="secondary">
          {t('sports.requestRejected')}
        </Text>
        {request.admin_note ? (
          <Text variant="caption" tone="muted">
            {request.admin_note}
          </Text>
        ) : null}
        <Button
          label={t('sports.chooseSport')}
          variant="secondary"
          size="sm"
          onPress={onChoose}
          testID="sport-request-choose"
        />
      </View>
    );
  }

  return null;
}
