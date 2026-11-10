import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Header,
  IconButton,
  Input,
  Screen,
  Sheet,
} from '@/components/ui';
import { SavedRow } from '@/components/saved/SavedRow';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { useT } from '@/i18n';
import { EmojiPicker } from '@/components/saved/PlaybookSheet';
import {
  deletePlaybook,
  togglePlaybookItem,
  updatePlaybook,
  usePlaybooks,
} from '@/lib/playbooks';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';

/**
 * One playbook: what the athlete put in it, newest first. Tap to open a post
 * or trial; × takes it out of this playbook (it stays saved). The ⋯ menu
 * renames the playbook or deletes it.
 */
export default function PlaybookScreen() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playbooks = usePlaybooks(user?.id);
  const playbook = playbooks.find((p) => p.id === id);

  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  if (!user) return null;

  if (!playbook) {
    return (
      <Screen header={<Header back title={t('feed.playbooks.title')} />}>
        <EmptyState title={t('feed.playbooks.goneTitle')} body={t('feed.playbooks.goneBody')} />
      </Screen>
    );
  }

  const header = (
    <Header
      back
      title={`${playbook.emoji} ${playbook.name}`}
      subtitle={`${t('feed.playbooks.count', { count: playbook.items.length })} · ${t('feed.playbooks.onlyYou')}`}
      right={
        <IconButton
          icon={<MoreHorizontal size={20} color={colors.text} />}
          label={t('feed.playbooks.options')}
          onPress={() => setMenu(true)}
        />
      }
    />
  );

  return (
    <Screen header={header} scroll={false} padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.giant }}>
        {playbook.items.length === 0 ? (
          <EmptyState title={t('feed.playbooks.emptyOneTitle')} body={t('feed.playbooks.emptyOneBody')} />
        ) : (
          <View>
            {playbook.items.map((item, i) => (
              <SavedRow
                key={`${item.kind}-${item.id}`}
                kind={item.kind}
                seed={item.id}
                title={item.title}
                line={item.subtitle}
                thumb={item.thumb}
                meta={
                  item.kind === 'post'
                    ? t('feed.playbooks.kindPost')
                    : item.kind === 'call'
                      ? t('feed.playbooks.kindCall')
                      : t('feed.playbooks.kindTrial')
                }
                action="remove"
                onPress={() =>
                  router.push(
                    item.kind === 'post'
                      ? Routes.post(item.id)
                      : item.kind === 'call'
                        ? Routes.discoverSection('sponsors')
                        : Routes.opportunity(item.id),
                  )
                }
                onAction={() => void togglePlaybookItem(user.id, playbook.id, item)}
                style={groupedRowStyle(i, playbook.items.length, colors, radii.xl)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={playbook.name}>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('feed.playbooks.rename')}
            variant="secondary"
            fullWidth
            onPress={() => {
              setName(playbook.name);
              setEmoji(playbook.emoji);
              setMenu(false);
              setRenaming(true);
            }}
          />
          <Button
            label={t('feed.playbooks.delete')}
            variant="danger"
            fullWidth
            onPress={() => {
              setMenu(false);
              setConfirmDelete(true);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('feed.playbooks.rename')}>
        <View style={{ gap: spacing.md }}>
          <Input
            value={name}
            onChangeText={setName}
            maxLength={40}
            accessibilityLabel={t('feed.playbooks.namePlaceholder')}
          />
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <Button
            label={t('common.save')}
            fullWidth
            disabled={!name.trim()}
            onPress={() => {
              void updatePlaybook(user.id, playbook.id, { name, emoji });
              setRenaming(false);
            }}
          />
        </View>
      </Sheet>

      <ConfirmSheet
        visible={confirmDelete}
        title={t('feed.playbooks.deleteTitle')}
        message={t('feed.playbooks.deleteBody')}
        confirmLabel={t('feed.playbooks.delete')}
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          void deletePlaybook(user.id, playbook.id);
          if (router.canGoBack()) router.back();
          else router.replace(Routes.savedPosts);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
