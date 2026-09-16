import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileQuestion, MessageCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Divider,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { PostCard } from '@/components/feed/PostCard';
import {
  CommentComposer,
  CommentRow,
  buildCommentRows,
  type CommentRowData,
} from '@/components/feed/CommentList';
import {
  ContentActionsSheet,
  type ContentTarget,
} from '@/components/feed/ContentActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { addComment, getComments } from '@/lib/api';
import { getPostById, postLink } from '@/lib/api.feed';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { FeedPost, PostComment } from '@/types/models';

/** One post and its conversation. */
export default function PostScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { user } = useAuth();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;

  const post = useAsync<FeedPost | null>(
    () => getPostById(postId as string),
    [postId],
    { enabled: !!postId },
  );

  const comments = useAsync<PostComment[]>(
    () => getComments(postId as string),
    [postId],
    { enabled: !!postId },
  );

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const rows = useMemo(() => buildCommentRows(comments.data ?? []), [comments.data]);

  const { mutate: mutatePost } = post;

  const patchPost = useCallback(
    (_postId: string, changes: Partial<FeedPost>) => {
      mutatePost((current) => (current ? { ...current, ...changes } : current));
    },
    [mutatePost],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.home);
  }, [router]);

  const openProfile = useCallback(
    (userId: string) => router.push(Routes.profile(userId)),
    [router],
  );

  const openPostActions = useCallback(
    (target: FeedPost) => {
      setActionTarget({
        kind: 'post',
        id: target.id,
        authorId: target.author_id,
        authorName: target.author_name,
        isOwn: !!user && target.author_id === user.id,
        link: postLink(target.id),
      });
    },
    [user],
  );

  const openCommentActions = useCallback(
    (comment: PostComment) => {
      setActionTarget({
        kind: 'comment',
        id: comment.id,
        authorId: comment.author_id,
        authorName: comment.author?.full_name ?? null,
        isOwn: !!user && comment.author_id === user.id,
      });
    },
    [user],
  );

  const startReply = useCallback((comment: PostComment) => {
    setReplyTo(comment);
    setFocusSignal((n) => n + 1);
  }, []);

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!postId || !body || sending) return;

    setSending(true);
    try {
      await addComment(postId, body, replyTo?.id);
      setDraft('');
      setReplyTo(null);
      mutatePost((current) =>
        current ? { ...current, comment_count: current.comment_count + 1 } : current,
      );
      await comments.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }, [draft, postId, replyTo, sending, comments, mutatePost, toast]);

  const onActionDeleted = useCallback(
    (target: ContentTarget) => {
      if (target.kind === 'post') goBack();
      else {
        mutatePost((current) =>
          current
            ? { ...current, comment_count: Math.max(0, current.comment_count - 1) }
            : current,
        );
        comments.refresh();
      }
    },
    [goBack, mutatePost, comments],
  );

  const onActionBlocked = useCallback(
    (blockedId: string) => {
      if (post.data && post.data.author_id === blockedId) goBack();
      else comments.refresh();
    },
    [post.data, goBack, comments],
  );

  const renderComment = useCallback(
    ({ item }: { item: CommentRowData }) => (
      <CommentRow
        row={item}
        currentUserId={user?.id ?? null}
        onOpenProfile={openProfile}
        onReply={startReply}
        onMore={openCommentActions}
      />
    ),
    [user?.id, openProfile, startReply, openCommentActions],
  );

  const header = <Header title={t('feed.postTitle')} back onBack={goBack} bordered />;

  if (!postId) {
    return (
      <Screen scroll={false} header={header} testID="post-screen">
        <EmptyState
          icon={<FileQuestion size={26} color={colors.textMuted} />}
          title={t('feed.postUnavailableTitle')}
          body={t('feed.postUnavailableBody')}
          actionLabel={t('feed.goBack')}
          onAction={goBack}
        />
      </Screen>
    );
  }

  if (post.loading && !post.data) {
    return (
      <Screen scroll={false} header={header} testID="post-screen">
        <SkeletonList count={1} />
      </Screen>
    );
  }

  if (post.error && !post.data) {
    return (
      <Screen scroll={false} header={header} testID="post-screen">
        <ErrorState message={post.error} onRetry={post.reload} />
      </Screen>
    );
  }

  const item = post.data;

  if (!item) {
    return (
      <Screen scroll={false} header={header} testID="post-screen">
        <EmptyState
          icon={<FileQuestion size={26} color={colors.textMuted} />}
          title={t('feed.postUnavailableTitle')}
          body={t('feed.postUnavailableBodyRules')}
          actionLabel={t('feed.goBack')}
          onAction={goBack}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      keyboardAvoiding
      header={header}
      testID="post-screen"
      footer={
        <CommentComposer
          value={draft}
          onChangeText={setDraft}
          onSubmit={submit}
          sending={sending}
          replyingTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          focusSignal={focusSignal}
        />
      }
    >
      <FlatList
        data={rows}
        keyExtractor={(row) => row.comment.id}
        renderItem={renderComment}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
            <PostCard
              post={item}
              expanded
              isActive
              onPatch={patchPost}
              onOpenComments={() => setFocusSignal((n) => n + 1)}
              onOpenActions={openPostActions}
              onOpenProfile={openProfile}
            />

            <View>
              <Text variant="heading">
                {item.comment_count > 0
                  ? t('feed.commentsHeading', { count: item.comment_count })
                  : t('feed.commentsTitle')}
              </Text>
              <Divider style={{ marginTop: spacing.md }} />
            </View>
          </View>
        }
        ListEmptyComponent={
          comments.loading ? (
            <SkeletonList count={2} variant="row" />
          ) : comments.error ? (
            <ErrorState message={comments.error} onRetry={comments.reload} compact />
          ) : (
            <EmptyState
              compact
              icon={<MessageCircle size={26} color={colors.textMuted} />}
              title={t('feed.noCommentsTitle')}
              body={t('feed.noCommentsBody')}
            />
          )
        }
      />

      <ContentActionsSheet
        target={actionTarget}
        onClose={() => setActionTarget(null)}
        onDeleted={onActionDeleted}
        onBlocked={onActionBlocked}
      />
    </Screen>
  );
}
