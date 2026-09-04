import React, { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Heart, MoreHorizontal, Send, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { compactNumber, displayName, relativeTime } from '@/lib/format';
import type { PostComment } from '@/types/models';

/**
 * Comments, one level of replies deep.
 *
 * A reply to a reply is flattened up to the same indent rather than nesting
 * forever — three levels of indent on a phone leaves no room for words.
 */

export interface CommentRowData {
  comment: PostComment;
  depth: 0 | 1;
}

export function buildCommentRows(comments: PostComment[]): CommentRowData[] {
  const known = new Set(comments.map((c) => c.id));
  const children = new Map<string, PostComment[]>();
  const roots: PostComment[] = [];

  for (const comment of comments) {
    const parent = comment.parent_id;
    // A reply whose parent was deleted is still worth reading, so it becomes
    // a root rather than disappearing with its parent.
    if (parent && known.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(comment);
      children.set(parent, list);
    } else {
      roots.push(comment);
    }
  }

  const rows: CommentRowData[] = [];
  const emitReplies = (parentId: string, seen: Set<string>) => {
    for (const child of children.get(parentId) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      rows.push({ comment: child, depth: 1 });
      emitReplies(child.id, seen);
    }
  };

  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root.id)) continue;
    seen.add(root.id);
    rows.push({ comment: root, depth: 0 });
    emitReplies(root.id, seen);
  }
  return rows;
}

interface RowProps {
  row: CommentRowData;
  currentUserId: string | null;
  onOpenProfile: (userId: string) => void;
  onReply: (comment: PostComment) => void;
  onMore: (comment: PostComment) => void;
}

export function CommentRow({
  row,
  currentUserId,
  onOpenProfile,
  onReply,
  onMore,
}: RowProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const { comment, depth } = row;

  const name = displayName(comment.author?.full_name);
  const isOwn = currentUserId != null && comment.author_id === currentUserId;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingLeft: depth === 1 ? spacing.xxxl : 0,
      }}
    >
      <Pressable
        onPress={() => onOpenProfile(comment.author_id)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('feed.openProfileOf', { name })}
        hitSlop={6}
      >
        <Avatar
          uri={comment.author?.avatar_url}
          name={name}
          size={depth === 1 ? 'xs' : 'sm'}
          verified={comment.author?.is_verified}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => onOpenProfile(comment.author_id)}
          onLongPress={() => onMore(comment)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.openProfileOf', { name })}
          hitSlop={4}
          style={{ alignSelf: 'flex-start' }}
        >
          <Text variant="captionStrong" numberOfLines={1}>
            {name}
            <Text variant="caption" tone="muted">
              {`  ${relativeTime(comment.created_at)}`}
            </Text>
          </Text>
        </Pressable>

        <Text variant="caption" style={{ marginTop: 2 }}>
          {comment.body}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.lg,
            marginTop: spacing.xs,
          }}
        >
          <Pressable
            onPress={() => onReply(comment)}
            accessibilityRole="button"
            accessibilityLabel={t('feed.replyTo', { name })}
            hitSlop={10}
            style={{ minHeight: 28, justifyContent: 'center' }}
          >
            <Text variant="captionStrong" tone="muted">
              {t('feed.reply')}
            </Text>
          </Pressable>

          {comment.like_count > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Heart size={13} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {compactNumber(comment.like_count)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={() => onMore(comment)}
        accessibilityRole="button"
        accessibilityLabel={
          isOwn
            ? t('feed.ownCommentOptions')
            : t('feed.reportOrBlockPerson', { name })
        }
        hitSlop={12}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <MoreHorizontal size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function CommentList({
  rows,
  currentUserId,
  onOpenProfile,
  onReply,
  onMore,
}: {
  rows: CommentRowData[];
} & Omit<RowProps, 'row'>) {
  return (
    <View>
      {rows.map((row) => (
        <CommentRow
          key={row.comment.id}
          row={row}
          currentUserId={currentUserId}
          onOpenProfile={onOpenProfile}
          onReply={onReply}
          onMore={onMore}
        />
      ))}
    </View>
  );
}

interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  sending: boolean;
  replyingTo: PostComment | null;
  onCancelReply: () => void;
  autoFocus?: boolean;
  /** Bump this number to pull focus into the field from outside. */
  focusSignal?: number;
}

export function CommentComposer({
  value,
  onChangeText,
  onSubmit,
  sending,
  replyingTo,
  onCancelReply,
  autoFocus,
  focusSignal = 0,
}: ComposerProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const { profile } = useAuth();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  const canSend = value.trim().length > 0 && !sending;

  return (
    <View style={{ gap: spacing.sm }}>
      {replyingTo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            alignSelf: 'flex-start',
            paddingLeft: spacing.md,
            paddingRight: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radii.pill,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Text variant="caption" tone="secondary">
            {t('feed.replyingTo', {
              name: displayName(replyingTo.author?.full_name),
            })}
          </Text>
          <Pressable
            onPress={onCancelReply}
            accessibilityRole="button"
            accessibilityLabel={t('feed.stopReplying')}
            hitSlop={12}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="sm" />

        <View
          style={{
            flex: 1,
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          }}
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={t('feed.commentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            autoFocus={autoFocus}
            accessibilityLabel={t('feed.writeComment')}
            style={{
              color: colors.text,
              fontFamily: theme.font.regular,
              fontSize: theme.size.sm,
              maxHeight: 96,
              padding: 0,
              ...(({ outlineStyle: 'none' } as unknown) as object),
            }}
          />
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('feed.postComment')}
          accessibilityState={{ disabled: !canSend, busy: sending }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? colors.primary : colors.surfaceAlt,
            opacity: pressed && canSend ? 0.8 : 1,
          })}
        >
          <Send
            size={18}
            color={canSend ? colors.textOnBrand : colors.textMuted}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>
    </View>
  );
}
