import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { BellOff, MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { displayName, relativeTime, truncate } from '@/lib/format';
import type { Conversation } from '@/types/models';

interface Props {
  conversation: Conversation;
  muted: boolean;
  onPress: () => void;
  /** Opened by a long-press or by swiping the row left. */
  onOpenActions: () => void;
}

/** How far left the row must travel before releasing opens the menu. */
const TRIGGER = 56;
const MAX_PULL = 84;

export function ConversationRow({ conversation, muted, onPress, onOpenActions }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const translate = useRef(new Animated.Value(0)).current;
  const pulled = useRef(0);

  /* A horizontal drag has to be claimed away from the FlatList's vertical
     scroll, so the responder only engages once the movement is clearly
     sideways — otherwise flicking through the inbox snags on every row. */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dx < -10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
      onPanResponderMove: (_evt, gesture) => {
        const next = Math.max(-MAX_PULL, Math.min(0, gesture.dx));
        pulled.current = next;
        translate.setValue(next);
      },
      onPanResponderRelease: () => {
        const shouldOpen = pulled.current <= -TRIGGER;
        pulled.current = 0;
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 6,
        }).start(() => {
          if (shouldOpen) onOpenActions();
        });
      },
      onPanResponderTerminate: () => {
        pulled.current = 0;
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 20 }).start();
      },
    }),
  ).current;

  const unread = conversation.unread_count > 0;
  const name = displayName(conversation.other_name);
  const preview = conversation.is_blocked
    ? t('messaging.previewBlocked')
    : conversation.last_message
      ? truncate(conversation.last_message, 90)
      : t('messaging.previewNone');

  const label = [
    name,
    unread
      ? t('messaging.unreadMessages', { count: conversation.unread_count })
      : null,
    preview,
    relativeTime(conversation.last_message_at),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View>
      {/* The action revealed behind the row while swiping. */}
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: MAX_PULL,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceSunken,
          borderRadius: radii.md,
        }}
      >
        <MoreHorizontal size={20} color={colors.textSecondary} />
      </View>

      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX: translate }] }}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onOpenActions}
          delayLongPress={320}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={t('messaging.conversationHint')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 76,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radii.md,
            // Unread threads sit on a slightly stronger ground so the eye
            // finds them before it reads a single word.
            backgroundColor: pressed
              ? colors.surfaceSunken
              : unread && !muted
                ? colors.surfaceAlt
                : colors.bg,
          })}
        >
          <Avatar
            uri={conversation.other_avatar}
            name={conversation.other_name}
            size="md"
            verified={conversation.other_verified}
          />

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text
                variant={unread && !muted ? 'subheading' : 'body'}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {name}
              </Text>
              {muted ? <BellOff size={13} color={colors.textMuted} /> : null}
              <Text variant="overline" tone="muted">
                {relativeTime(conversation.last_message_at)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text
                variant="caption"
                tone={unread && !muted ? 'secondary' : 'muted'}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {preview}
              </Text>

              {unread ? (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 6,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: muted ? colors.surfaceSunken : colors.primary,
                  }}
                >
                  <Text
                    variant="overline"
                    color={muted ? colors.textMuted : colors.textOnBrand}
                  >
                    {conversation.unread_count > 99
                      ? t('messaging.unreadOverflow')
                      : conversation.unread_count}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
