import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { Bell, BellOff, Check, Mail } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { displayName, relativeTime, truncate } from '@/lib/format';
import { NATIVE_DRIVER } from '@/lib/motion';
import type { Receipt } from '@/lib/api.messaging';
import { DoubleCheck } from './DoubleCheck';
import { parseSharedLink } from '@/lib/webLinks';
import type { Conversation } from '@/types/models';

interface Props {
  conversation: Conversation;
  muted: boolean;
  /** Set when the newest message is yours: one grey tick, or two blue once seen. */
  receipt?: Receipt | null;
  onPress: () => void;
  /** Opened by a long-press: the full menu (mute, report, block, profile). */
  onOpenActions: () => void;
  /** The Read / Unread button behind the row. */
  onMarkRead: () => void;
  /** Tapping Unread on a chat that has already been read. */
  onAlreadyRead: () => void;
  onToggleMute: () => void;
  /** Select mode: a round tick on the left, taps pick the chat, no swiping. */
  selecting?: boolean;
  selected?: boolean;
}

/** Each button behind the row, and how far the row slides to show both. */
const BUTTON_W = 76;
const OPEN_X = -BUTTON_W * 2;
/** How far left the row must travel before letting go keeps it open. */
const TRIGGER = 56;

/**
 * One chat in the inbox, as a card. Swipe it left to show Read (or Unread)
 * and Mute; tap one to use it, or tap the card to close it again. A long
 * press opens the full menu.
 */
export function ConversationRow({
  conversation,
  muted,
  receipt,
  onPress,
  onOpenActions,
  onMarkRead,
  onAlreadyRead,
  onToggleMute,
  selecting = false,
  selected = false,
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const translate = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);
  const open = useRef(false);
  /* While open, the card's right corners go square so card and buttons read
     as one rounded shape. */
  const [isOpen, setIsOpen] = useState(false);

  const settle = (to: number) => {
    offset.current = to;
    open.current = to !== 0;
    setIsOpen(to !== 0);
    Animated.spring(translate, {
      toValue: to,
      useNativeDriver: NATIVE_DRIVER,
      speed: 20,
      bounciness: 4,
    }).start();
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;
  /* While picking chats, a sideways drag does nothing. */
  const selectingRef = useRef(selecting);
  selectingRef.current = selecting;
  useEffect(() => {
    if (selecting && open.current) settleRef.current(0);
  }, [selecting]);

  /* A horizontal drag has to be claimed away from the FlatList's vertical
     scroll, so the responder only engages once the movement is clearly
     sideways — otherwise flicking through the inbox snags on every row. */
  const pan = useRef(
    PanResponder.create({
      /* Claimed in the capture phase too, so the card's own press handling
         cannot keep the first swipe; and once claimed it is not handed to
         the list's scroll mid-swipe. */
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        !selectingRef.current && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        !selectingRef.current && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, gesture) => {
        const next = Math.max(OPEN_X - 20, Math.min(0, offset.current + gesture.dx));
        translate.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const end = offset.current + gesture.dx;
        settleRef.current(end <= -TRIGGER ? OPEN_X : 0);
      },
      onPanResponderTerminate: () => settleRef.current(offset.current),
    }),
  ).current;

  const close = () => settle(0);

  /* A shared post or profile reads as words, not as a long link. */
  const sharedPreview = (text: string): string | null => {
    const link = parseSharedLink(text);
    if (!link) return null;
    if (link.kind === 'post') return t('messaging.previewSharedPost');
    if (link.kind === 'clip') return t('messaging.previewSharedClip');
    return t('messaging.previewSharedProfile');
  };

  const unread = conversation.unread_count > 0;
  const loud = unread && !muted;
  const name = displayName(conversation.other_name);
  const text = conversation.is_blocked
    ? t('messaging.previewBlocked')
    : conversation.last_message
      ? sharedPreview(conversation.last_message) ?? truncate(conversation.last_message, 90)
      : t('messaging.previewNone');
  const preview = receipt && !conversation.is_blocked ? t('messaging.previewYou', { text }) : text;

  const label = [
    name,
    unread ? t('messaging.unreadMessages', { count: conversation.unread_count }) : null,
    preview,
    receipt ? t(receipt === 'seen' ? 'messaging.receiptSeen' : 'messaging.receiptSent') : null,
    relativeTime(conversation.last_message_at),
  ]
    .filter(Boolean)
    .join('. ');

  const button = (
    key: string,
    caption: string,
    icon: React.ReactNode,
    bg: string,
    onTap: () => void,
    dim = false,
    last = false,
  ) => (
    <Pressable
      key={key}
      onPress={() => {
        onTap();
        close();
      }}
      accessibilityRole="button"
      accessibilityLabel={caption}
      style={({ pressed }) => ({
        /* The first button also fills the strip under the card's corner. */
        width: last ? BUTTON_W : BUTTON_W + radii.xl,
        paddingLeft: last ? 0 : radii.xl,
        borderTopRightRadius: last ? radii.xl : 0,
        borderBottomRightRadius: last ? radii.xl : 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: bg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ alignItems: 'center', gap: 4, opacity: dim ? 0.55 : 1 }}>
        {icon}
        <Text variant="captionStrong" color={colors.textOnBrand} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
      {/* Read / Unread and Mute: one strip that carries on from the card's
          edge with a rounded end, faded in as the card slides. */}
      <Animated.View
        style={{
          opacity: translate.interpolate({ inputRange: [-40, 0], outputRange: [1, 0], extrapolate: 'clamp' }),
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: BUTTON_W * 2 + radii.xl,
          flexDirection: 'row',
        }}
      >
        {unread
          ? button(
              'read',
              t('messaging.markRead'),
              <Check size={20} color={colors.textOnBrand} strokeWidth={2.4} />,
              colors.primary,
              onMarkRead,
            )
          : button(
              'unread',
              t('messaging.markUnread'),
              <Mail size={20} color={colors.textOnBrand} strokeWidth={2.2} />,
              colors.primary,
              onAlreadyRead,
              true,
            )}
        {button(
          'mute',
          muted ? t('messaging.unmute') : t('messaging.mute'),
          muted ? (
            <Bell size={20} color={colors.textOnBrand} strokeWidth={2.2} />
          ) : (
            <BellOff size={20} color={colors.textOnBrand} strokeWidth={2.2} />
          ),
          colors.textMuted,
          onToggleMute,
          false,
          true,
        )}
      </Animated.View>

      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: translate }] }}>
        <Pressable
          onPress={() => (selecting ? onPress() : open.current ? close() : onPress())}
          onLongPress={selecting ? undefined : onOpenActions}
          delayLongPress={320}
          accessibilityRole={selecting ? 'checkbox' : 'button'}
          accessibilityState={selecting ? { checked: selected } : undefined}
          accessibilityLabel={label}
          accessibilityHint={selecting ? undefined : t('messaging.conversationHint')}
          accessibilityActions={selecting ? undefined : [
            { name: 'markRead', label: unread ? t('messaging.markRead') : t('messaging.markUnread') },
            { name: 'mute', label: muted ? t('messaging.unmute') : t('messaging.mute') },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'markRead') (unread ? onMarkRead : onAlreadyRead)();
            if (e.nativeEvent.actionName === 'mute') onToggleMute();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 76,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radii.xl,
            borderTopRightRadius: isOpen ? 0 : radii.xl,
            borderBottomRightRadius: isOpen ? 0 : radii.xl,
            borderWidth: selected ? 1.5 : 1,
            borderRightWidth: isOpen ? 0 : selected ? 1.5 : 1,
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected
              ? theme.alpha(colors.primary, theme.scheme === 'dark' ? 0.14 : 0.06)
              : pressed
                ? colors.surfaceAlt
                : colors.surface,
            shadowColor: '#14143C',
            shadowOpacity: theme.scheme === 'dark' ? 0 : 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          })}
        >
          {selecting ? (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: selected ? 0 : 2,
                borderColor: colors.borderStrong,
                backgroundColor: selected ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? <Check size={14} color={colors.textOnBrand} strokeWidth={3} /> : null}
            </View>
          ) : null}
          <Avatar
            uri={conversation.other_avatar}
            name={conversation.other_name}
            size="md"
            verified={conversation.other_verified}
          />

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text
                variant={loud ? 'subheading' : 'body'}
                numberOfLines={1}
                style={{ flex: 1, fontFamily: loud ? theme.font.nameBold : theme.font.name }}
              >
                {name}
              </Text>
              {muted ? <BellOff size={13} color={colors.textMuted} /> : null}
              <Text variant="overline" color={loud ? colors.primary : colors.textMuted}>
                {relativeTime(conversation.last_message_at)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {receipt ? (
                receipt === 'seen' ? (
                  <DoubleCheck size={15} color={colors.primary} />
                ) : (
                  <Check size={15} color={colors.textMuted} strokeWidth={2.4} />
                )
              ) : null}
              <Text
                variant={loud ? 'captionStrong' : 'caption'}
                tone={loud ? undefined : 'muted'}
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
                  <Text variant="overline" color={muted ? colors.textMuted : colors.textOnBrand}>
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
