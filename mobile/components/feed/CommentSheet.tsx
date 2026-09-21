import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  EmptyState,
  ErrorState,
  Sheet,
  SkeletonList,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { addComment, getComments } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import type { FeedPost, PostComment } from '@/types/models';
import { CommentComposer, CommentList, buildCommentRows } from './CommentList';
import { ContentActionsSheet, type ContentTarget } from './ContentActionsSheet';

interface Props {
  post: FeedPost;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  /** Keep the card's comment count in step with what was just added. */
  onCommentAdded: (postId: string) => void;
}

/**
 * Comments without leaving the feed.
 *
 * Mount this only while it is open, keyed on the post id: that way a second
 * post can never open on the first post's comments while its own load is in
 * flight.
 */
export function CommentSheet({ post, onClose, onOpenProfile, onCommentAdded }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const toast = useToast();
  const t = useT();
  const { user } = useAuth();

  const postId = post.id;

  const comments = useAsync<PostComment[]>(() => getComments(postId), [postId]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [actionTarget, setActionTarget] = useState<ContentTarget | null>(null);

  const rows = useMemo(() => buildCommentRows(comments.data ?? []), [comments.data]);

  const { refresh, reload } = comments;

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      await addComment(postId, body, replyTo?.id);
      setDraft('');
      setReplyTo(null);
      onCommentAdded(postId);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }, [draft, postId, replyTo, sending, refresh, onCommentAdded, toast]);

  const openProfile = useCallback(
    (userId: string) => {
      onClose();
      onOpenProfile(userId);
    },
    [onClose, onOpenProfile],
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

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('feed.commentsTitle')}
      height={0.88}
      footer={
        <CommentComposer
          value={draft}
          onChangeText={setDraft}
          onSubmit={submit}
          sending={sending}
          replyingTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      }
    >
      <View style={{ minHeight: 160 }}>
        {comments.loading && rows.length === 0 ? (
          <SkeletonList count={3} variant="row" />
        ) : comments.error && rows.length === 0 ? (
          <ErrorState message={comments.error} onRetry={reload} compact />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageCircle size={26} color={colors.textMuted} />}
            title={t('feed.noCommentsTitle')}
            body={t('feed.noCommentsBody')}
          />
        ) : (
          <CommentList
            rows={rows}
            currentUserId={user?.id ?? null}
            onOpenProfile={openProfile}
            onReply={setReplyTo}
            onMore={openCommentActions}
          />
        )}
      </View>

      <ContentActionsSheet
        target={actionTarget}
        onClose={() => setActionTarget(null)}
        onDeleted={() => refresh()}
        onBlocked={() => refresh()}
      />
    </Sheet>
  );
}
