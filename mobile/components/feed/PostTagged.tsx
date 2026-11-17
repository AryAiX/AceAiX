import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Tag } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Sheet, Tappable, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { rememberPostTags, removeMyPostTag, setPostTags, type TaggedPerson } from '@/lib/api.postTags';
import { errorMessage } from '@/lib/errors';
import { displayName, roleLabel } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { FeedPost } from '@/types/models';
import { TagPeoplePicker } from './TagPeoplePicker';

/**
 * "with Sara Karimi and 2 others", under the caption.
 *
 * The row follows the writing direction, so in Arabic the tag icon sits on
 * the right and the words read toward the left. The sheet lists everyone.
 * A tagged person can take themselves off. The author can edit the list.
 */

export function PostTagged({
  post,
  onPatch,
}: {
  post: FeedPost;
  onPatch: (postId: string, changes: Partial<FeedPost>) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const people = post.tagged ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaggedPerson[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (people.length === 0 && !editing) return null;

  const first = people[0] ? displayName(people[0].full_name) : '';
  const others = Math.max(0, people.length - 1);
  const label =
    others > 0
      ? t('feed.taggedWithOthers', { name: first, count: others })
      : t('feed.taggedWith', { name: first });

  const isAuthor = user?.id != null && user.id === post.author_id;
  const isMe = user?.id != null && people.some((person) => person.id === user.id);

  const apply = (next: TaggedPerson[]) => {
    rememberPostTags(post.id, next);
    onPatch(post.id, { tagged: next });
  };

  const openProfile = (id: string) => {
    setOpen(false);
    setTimeout(() => router.push(Routes.profile(id)), 240);
  };

  const openEdit = () => {
    setDraft(people);
    setOpen(false);
    setTimeout(() => setEditing(true), 240);
  };

  const save = async (chosen: TaggedPerson[]) => {
    setSaving(true);
    try {
      const kept = await setPostTags(
        post.id,
        chosen.map((person) => person.id),
      );
      const byId = new Map(chosen.map((person) => [person.id, person]));
      const next = kept.flatMap((id) => {
        const person = byId.get(id);
        return person ? [person] : [];
      });
      setEditing(false);
      apply(next);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeMe = async () => {
    if (!user?.id || removing) return;
    setRemoving(true);
    try {
      await removeMyPostTag(post.id);
      setOpen(false);
      apply(people.filter((person) => person.id !== user.id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      {people.length > 0 ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID="post-tagged"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Tag size={14} color={colors.textSecondary} />
          <Text variant="captionStrong" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </Text>
        </Pressable>
      ) : null}

      {open ? (
        <Sheet visible onClose={() => setOpen(false)} title={t('feed.taggedTitle')} testID="post-tagged-sheet">
          <View style={{ paddingBottom: spacing.lg }}>
            {people.map((person) => {
              const name = displayName(person.full_name);
              return (
                <View
                  key={person.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Tappable
                    onPress={() => openProfile(person.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('feed.openProfileOf', { name })}
                    containerStyle={{ flex: 1 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                  >
                    <Avatar uri={person.avatar_url} name={person.full_name} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {name}
                        </Text>
                        {person.is_verified ? (
                          <BadgeCheck size={14} color={colors.info} fill={theme.alpha(colors.info, 0.16)} />
                        ) : null}
                      </View>
                      {person.role ? (
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {roleLabel(person.role)}
                        </Text>
                      ) : null}
                    </View>
                  </Tappable>
                </View>
              );
            })}
            {isAuthor || isMe ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {isAuthor ? (
                  <Button
                    label={t('feed.editTags')}
                    variant="outline"
                    fullWidth
                    onPress={openEdit}
                    testID="post-tags-edit"
                  />
                ) : null}
                {isMe ? (
                  <Button
                    label={t('feed.removeMe')}
                    variant="danger"
                    fullWidth
                    loading={removing}
                    onPress={() => void removeMe()}
                    testID="post-tags-remove-me"
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        </Sheet>
      ) : null}

      <TagPeoplePicker
        visible={editing}
        people={draft}
        onChange={setDraft}
        onClose={() => {
          if (!saving) setEditing(false);
        }}
        onDone={save}
        disabled={saving}
      />
    </>
  );
}
