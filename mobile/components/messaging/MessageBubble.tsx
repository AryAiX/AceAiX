import React from 'react';
import { Pressable, View } from 'react-native';
import { Check, Clock, RotateCw } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { TranslatableText } from '@/components/common/TranslatableText';
import { timeOfDay } from '@/lib/format';
import type { ChatMessage } from '@/lib/api.messaging';
import { DoubleCheck } from './DoubleCheck';
import { SharedCard } from './SharedCard';
import { parseSharedLink } from '@/lib/webLinks';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  /** Only the newest bubble in a run of same-sender messages shows a time. */
  showTime: boolean;
  /** Tighter corner joins this bubble to the one below it in the same run. */
  continues: boolean;
  onRetry?: (message: ChatMessage) => void;
  /** Your newest message: one grey tick until it is opened, then two blue ticks. */
  receipt?: 'sent' | 'seen' | null;
}

export function MessageBubble({ message, isOwn, showTime, continues, onRetry, receipt }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const failed = message.status === 'failed';
  const sending = message.status === 'sending';

  const bubbleBg = isOwn ? colors.primary : colors.surfaceAlt;
  const bubbleFg = isOwn ? colors.textOnBrand : colors.text;
  const tightCorner = continues ? radii.xs : radii.lg;

  const stamp = showTime ? timeOfDay(message.created_at) : '';

  /* A post or profile sent from Share arrives as its link alone and shows
     as a card. */
  const shared = parseSharedLink(message.content);

  const bubble = shared ? (
    <View style={{ opacity: sending ? 0.62 : 1 }}>
      <SharedCard link={shared} isOwn={isOwn} />
    </View>
  ) : (
    <View
      style={{
        maxWidth: '82%',
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        backgroundColor: bubbleBg,
        borderRadius: radii.lg,
        borderBottomRightRadius: isOwn ? tightCorner : radii.lg,
        borderBottomLeftRadius: isOwn ? radii.lg : tightCorner,
        paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.sm + 2,
        borderWidth: isOwn ? 0 : 1,
        borderColor: colors.border,
        // A message still in flight is dimmed rather than hidden, so the
        // thread never jumps when the server row replaces it.
        opacity: sending ? 0.62 : 1,
      }}
    >
      {/* Your own words never need translating, and offering it on them looks
          like the app does not know who is talking. */}
      {isOwn ? (
        <Text variant="body" color={bubbleFg}>
          {message.content}
        </Text>
      ) : (
        <TranslatableText
          text={message.content}
          sourceRef={{ type: 'message', id: message.id }}
          variant="body"
          color={bubbleFg}
        />
      )}
    </View>
  );

  return (
    <View style={{ marginBottom: continues ? spacing.xxs : spacing.sm }}>
      {failed && onRetry ? (
        <Pressable
          onPress={() => onRetry(message)}
          accessibilityRole="button"
          accessibilityLabel={t('messaging.messageFailedA11y')}
          hitSlop={6}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          {bubble}
        </Pressable>
      ) : (
        bubble
      )}

      {showTime || sending || failed || receipt ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            marginTop: 3,
            paddingHorizontal: spacing.xs,
          }}
        >
          {sending ? <Clock size={11} color={colors.textMuted} strokeWidth={2.2} /> : null}
          {failed ? <RotateCw size={11} color={colors.danger} strokeWidth={2.2} /> : null}
          <Text variant="overline" tone={failed ? 'danger' : 'muted'}>
            {failed
              ? t('messaging.notSent')
              : sending
                ? t('messaging.sending')
                : stamp}
          </Text>
          {receipt && !sending && !failed ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              accessibilityLabel={receipt === 'seen' ? t('messaging.receiptSeen') : t('messaging.receiptSent')}
            >
              {receipt === 'seen' ? (
                <DoubleCheck size={13} color={colors.primary} />
              ) : (
                <Check size={13} color={colors.textMuted} strokeWidth={2.4} />
              )}
              <Text variant="overline" color={receipt === 'seen' ? colors.primary : colors.textMuted}>
                {receipt === 'seen' ? t('messaging.receiptSeen') : t('messaging.receiptSent')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
