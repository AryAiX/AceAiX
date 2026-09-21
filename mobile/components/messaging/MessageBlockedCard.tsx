import React, { useState } from 'react';
import { View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { displayName } from '@/lib/format';
import type { MessageBlockReason } from '@/types/models';

/**
 * Replaces the composer when the database will not accept a message.
 *
 * The rules live in `can_message_user`; this component's only job is to say
 * which rule applied, in words a 14-year-old or a busy coach can act on. It
 * never blames the person reading it, and it never implies the block is a
 * mistake they can retry their way out of.
 *
 * The reasons themselves are database values and stay in English; only the
 * explanation each one maps to is translated.
 */

interface CopyKeys {
  title: string;
  body: string;
}

function copyKeysFor(reason: MessageBlockReason | null): CopyKeys {
  switch (reason) {
    case 'minor_requires_verified_sender':
      return {
        title: 'messaging.blockedVerifiedSenderTitle',
        body: 'messaging.blockedVerifiedSenderBody',
      };
    case 'minor_requires_guardian_consent':
      return {
        title: 'messaging.blockedGuardianConsentTitle',
        body: 'messaging.blockedGuardianConsentBody',
      };
    case 'recipient_messages_off':
      return {
        title: 'messaging.blockedMessagesOffTitle',
        body: 'messaging.blockedMessagesOffBody',
      };
    case 'recipient_only_accepts_followed':
      return {
        title: 'messaging.blockedOnlyFollowedTitle',
        body: 'messaging.blockedOnlyFollowedBody',
      };
    case 'recipient_only_accepts_verified':
      return {
        title: 'messaging.blockedOnlyVerifiedTitle',
        body: 'messaging.blockedOnlyVerifiedBody',
      };
    case 'not_found':
      return {
        title: 'messaging.blockedNotFoundTitle',
        body: 'messaging.blockedNotFoundBody',
      };
    default:
      return {
        title: 'messaging.blockedDefaultTitle',
        body: 'messaging.blockedDefaultBody',
      };
  }
}

interface Props {
  reason: MessageBlockReason | null;
  peerName: string | null;
}

export function MessageBlockedCard({ reason, peerName }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const [learnMore, setLearnMore] = useState(false);

  const name = displayName(peerName, t('messaging.thisPersonSentence'));
  const copy = copyKeysFor(reason);

  return (
    <>
      <View
        accessibilityRole="summary"
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          <Lock size={18} color={colors.textSecondary} strokeWidth={2} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyStrong">{t(copy.title)}</Text>
            <Text variant="caption" tone="secondary">
              {t(copy.body, { name })}
            </Text>
            <Button
              label={t('common.learnMore')}
              variant="ghost"
              size="sm"
              onPress={() => setLearnMore(true)}
              style={{ marginTop: spacing.xs, marginLeft: -spacing.lg }}
            />
          </View>
        </View>
      </View>

      <Sheet
        visible={learnMore}
        onClose={() => setLearnMore(false)}
        title={t('messaging.howTitle')}
        subtitle={t('messaging.howSubtitle')}
        footer={
          <Button
            label={t('messaging.gotIt')}
            fullWidth
            onPress={() => setLearnMore(false)}
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <Point
            title={t('messaging.howMinorsTitle')}
            body={t('messaging.howMinorsBody')}
          />
          <Point
            title={t('messaging.howInboxTitle')}
            body={t('messaging.howInboxBody')}
          />
          <Point
            title={t('messaging.howTemporaryTitle')}
            body={t('messaging.howTemporaryBody')}
          />
          <Point
            title={t('messaging.howWrongTitle')}
            body={t('messaging.howWrongBody')}
          />
        </View>
      </Sheet>
    </>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text variant="captionStrong">{title}</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.xxs }}>
        {body}
      </Text>
    </View>
  );
}
