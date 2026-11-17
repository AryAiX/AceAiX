import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Sheet, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getConversations, sendMessage } from '@/lib/api';
import { displayName } from '@/lib/format';
import type { Conversation } from '@/types/models';

export interface ShareOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

const CIRCLE = 60;
const ITEM_W = 74;

/**
 * Share: your existing chats along the top (tick one or more, then Send),
 * and the other ways to share underneath. Only chats you already have, so
 * who may message whom is already settled. The chat gets the link alone,
 * which it shows as a card.
 */
export function ShareSheet({
  visible,
  onClose,
  link,
  options,
}: {
  visible: boolean;
  onClose: () => void;
  /** The app link being shared (a post or a profile). */
  link: string;
  options: ShareOption[];
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();
  const [chats, setChats] = useState<Conversation[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPicked([]);
    let cancelled = false;
    getConversations()
      .then((list) => !cancelled && setChats(list.filter((c) => !c.is_blocked)))
      .catch(() => !cancelled && setChats([]));
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const send = async () => {
    if (picked.length === 0 || sending) return;
    setSending(true);
    const results = await Promise.allSettled(picked.map((id) => sendMessage(id, link)));
    setSending(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(t('messaging.sharedToChats'));
      onClose();
    } else {
      toast.error(t('messaging.shareSomeFailed'));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('common.share')}>
      {chats && chats.length > 0 ? (
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          <Text variant="overline" tone="muted">
            {t('messaging.sendTo')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: spacing.md }}
            style={{ marginHorizontal: -spacing.xs }}
          >
            {chats.map((chat) => {
              const on = picked.includes(chat.id);
              const name = displayName(chat.other_name);
              return (
                <Pressable
                  key={chat.id}
                  onPress={() => toggle(chat.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={name}
                  style={{ width: ITEM_W, alignItems: 'center', gap: 7 }}
                >
                  <View
                    style={{
                      width: CIRCLE + 8,
                      height: CIRCLE + 8,
                      borderRadius: (CIRCLE + 8) / 2,
                      borderWidth: 2.5,
                      borderColor: on ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ width: CIRCLE, height: CIRCLE }}>
                      <Avatar uri={chat.other_avatar} name={chat.other_name} size="lg" />
                    </View>
                    {on ? (
                      <View
                        style={{
                          position: 'absolute',
                          right: -3,
                          bottom: -3,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2.5,
                          borderColor: colors.surface,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={11} color={colors.textOnBrand} strokeWidth={3.4} />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    variant="captionStrong"
                    color={on ? colors.primary : colors.text}
                    numberOfLines={1}
                    style={{ width: ITEM_W, textAlign: 'center' }}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            label={
              picked.length === 0
                ? t('messaging.pickChats')
                : t('messaging.sendToChats', { count: picked.length })
            }
            onPress={send}
            loading={sending}
            disabled={picked.length === 0}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      ) : null}

      <View style={{ borderTopWidth: chats && chats.length > 0 ? 1 : 0, borderTopColor: colors.divider }}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={option.onPress}
            accessibilityRole="button"
            testID={`share-${option.key}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 54,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {option.icon}
            </View>
            <Text variant="bodyStrong">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
