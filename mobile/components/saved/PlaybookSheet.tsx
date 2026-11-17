import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import {
  PLAYBOOK_EMOJIS,
  createPlaybook,
  hasItem,
  togglePlaybookItem,
  usePlaybooks,
  type PlaybookItem,
} from '@/lib/playbooks';
import { useAuth } from '@/providers/AuthProvider';

/**
 * An emoji at a given size with room above and below it. The app's text
 * styles set a line height for words, which clips the top of a larger emoji.
 */
export function PlaybookEmoji({ emoji, size }: { emoji: string; size: number }) {
  return (
    <Text
      style={{ fontSize: size, lineHeight: Math.round(size * 1.3), textAlign: 'center', includeFontPadding: false }}
    >
      {emoji}
    </Text>
  );
}

/** The row of emojis a playbook can wear. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {PLAYBOOK_EMOJIS.map((e) => (
        <Pressable
          key={e}
          onPress={() => onChange(e)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === e }}
          accessibilityLabel={e}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: value === e ? colors.primary : 'transparent',
            backgroundColor: value === e ? colors.primarySoft : colors.surfaceAlt,
          }}
        >
          <PlaybookEmoji emoji={e} size={22} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** The form for a new playbook: a name and an emoji. */
export function NewPlaybookForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel?: () => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(PLAYBOOK_EMOJIS[0]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const playbook = await createPlaybook(user.id, name, emoji);
    setName('');
    onCreated(playbook.id);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Input
        value={name}
        onChangeText={setName}
        placeholder={t('feed.playbooks.namePlaceholder')}
        accessibilityLabel={t('feed.playbooks.namePlaceholder')}
        maxLength={40}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void create()}
      />
      <EmojiPicker value={emoji} onChange={setEmoji} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {onCancel ? (
          <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
        ) : null}
        <Button
          label={t('feed.playbooks.create')}
          onPress={() => void create()}
          disabled={!name.trim()}
          style={{ flex: 1 }}
          testID="playbook-create"
        />
      </View>
    </View>
  );
}

/**
 * "Save to a playbook": the account's playbooks with a tick each, and a way
 * to make a new one. Ticking adds or removes at once; Done just closes.
 */
export function PlaybookSheet({
  item,
  onClose,
}: {
  item: Omit<PlaybookItem, 'addedAt'> | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const { user } = useAuth();
  const playbooks = usePlaybooks(user?.id);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (item) setCreating(playbooks.length === 0);
    // Only when the sheet opens for a new item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      title={t('feed.playbooks.saveTo')}
      subtitle={t('feed.playbooks.saveToBody')}
      /* While the new-playbook form is open, its Create is the one button. */
      footer={
        creating ? undefined : (
          <Button label={t('common.done')} onPress={onClose} fullWidth testID="playbook-done" />
        )
      }
    >
      {item && user ? (
        <View style={{ gap: spacing.xs }}>
          {playbooks.map((p) => {
            const inside = hasItem(p, item.kind, item.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => void togglePlaybookItem(user.id, p.id, item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: inside }}
                accessibilityLabel={p.name}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <PlaybookEmoji emoji={p.emoji} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {t('feed.playbooks.count', { count: p.items.length })}
                  </Text>
                </View>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: inside ? 0 : 2,
                    borderColor: colors.borderStrong,
                    backgroundColor: inside ? colors.primary : 'transparent',
                  }}
                >
                  {inside ? <Check size={15} color={colors.textOnBrand} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}

          {creating ? (
            <View style={{ marginTop: spacing.sm }}>
              <NewPlaybookForm
                onCreated={(id) => {
                  void togglePlaybookItem(user.id, id, item);
                  setCreating(false);
                }}
                onCancel={playbooks.length > 0 ? () => setCreating(false) : undefined}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setCreating(true)}
              accessibilityRole="button"
              testID="playbook-new"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: colors.borderStrong,
                }}
              >
                <Plus size={20} color={colors.primary} />
              </View>
              <Text variant="bodyStrong" color={colors.primary}>
                {t('feed.playbooks.new')}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
