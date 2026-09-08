import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Send, CornerDownRight } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  FeedPost,
  PostComment,
  addComment,
  fetchComments,
  postTimeAgo,
  toggleCommentLike,
} from '@/lib/postsService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  appendCommentResult,
  commentReplyParentId,
  isCurrentCommentRequest,
  isSameCommentRequestIdentity,
} from '@/lib/commentState';

interface Props {
  post: FeedPost | null;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
}

export function CommentsSheet({ post, onClose, onCommentAdded }: Props) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const loadRequestRef = useRef(0);
  const postId = post?.id;
  const userId = user?.id;
  const requestIdentity = { postId, userId };
  const activeRequestIdentityRef = useRef(requestIdentity);
  const requestGenerationRef = useRef(0);
  const submitGenerationRef = useRef<number | null>(null);

  if (!isSameCommentRequestIdentity(activeRequestIdentityRef.current, requestIdentity)) {
    activeRequestIdentityRef.current = requestIdentity;
    requestGenerationRef.current += 1;
    loadRequestRef.current += 1;
    submitGenerationRef.current = null;
  }

  const load = useCallback(async (silent = false) => {
    if (!postId || !userId) return;
    const requestId = ++loadRequestRef.current;
    const requestGeneration = requestGenerationRef.current;
    const submittedIdentity = { postId, userId };
    if (!silent) setLoading(true);
    try {
      const data = await fetchComments(postId, userId);
      if (
        requestId !== loadRequestRef.current
        || !isCurrentCommentRequest(
          activeRequestIdentityRef.current,
          requestGenerationRef.current,
          submittedIdentity,
          requestGeneration,
        )
      ) return;
      setComments(data);
      setLoadError(null);
    } catch (err) {
      if (
        requestId !== loadRequestRef.current
        || !isCurrentCommentRequest(
          activeRequestIdentityRef.current,
          requestGenerationRef.current,
          submittedIdentity,
          requestGeneration,
        )
      ) return;
      if (!silent) setComments([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load comments.');
    } finally {
      if (
        requestId === loadRequestRef.current
        && isCurrentCommentRequest(
          activeRequestIdentityRef.current,
          requestGenerationRef.current,
          submittedIdentity,
          requestGeneration,
        )
      ) setLoading(false);
    }
  }, [postId, userId]);

  useEffect(() => {
    if (postId) {
      setComments([]);
      setText('');
      setReplyTo(null);
      setLoadError(null);
      setSubmitting(false);
      void load();
    } else {
      setComments([]);
      setText('');
      setReplyTo(null);
      setLoadError(null);
      setLoading(false);
      setSubmitting(false);
    }
  }, [load, postId]);

  // Realtime new comments
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      }, () => { load(true); })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [postId, load]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !post || !user) return;
    const requestGeneration = requestGenerationRef.current;
    if (submitGenerationRef.current === requestGeneration) return;
    const submittedPostId = post.id;
    const submittedUserId = user.id;
    const submittedIdentity = { postId: submittedPostId, userId: submittedUserId };
    const submittedReplyTo = replyTo;
    const submittedText = text.trim();
    submitGenerationRef.current = requestGeneration;
    setSubmitting(true);

    const isCurrent = () => isCurrentCommentRequest(
      activeRequestIdentityRef.current,
      requestGenerationRef.current,
      submittedIdentity,
      requestGeneration,
    );
    let result: Awaited<ReturnType<typeof addComment>>;
    try {
      result = await addComment(
        submittedPostId,
        submittedUserId,
        submittedText,
        commentReplyParentId(submittedReplyTo),
      );
    } catch (error) {
      if (!isCurrent()) return;
      submitGenerationRef.current = null;
      setSubmitting(false);
      Alert.alert(
        'Comment not sent',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
      return;
    }
    if (!isCurrent()) return;

    if (submitGenerationRef.current === requestGeneration) {
      submitGenerationRef.current = null;
    }
    setSubmitting(false);
    const { comment, error } = result;
    if (!comment) {
      Alert.alert('Comment not sent', error ?? 'Something went wrong. Please try again.');
      return;
    }
    setComments((prev) => appendCommentResult(prev, comment, submittedReplyTo));
    onCommentAdded(submittedPostId);
    setText('');
    setReplyTo(null);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, post, user, replyTo, onCommentAdded]);

  const handleLikeComment = useCallback(async (comment: PostComment) => {
    if (!user) return;
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, liked: !c.liked, like_count: c.like_count + (c.liked ? -1 : 1) }
          : c
      )
    );
    const { error } = await toggleCommentLike(comment.id, user.id, comment.liked);
    if (error) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, liked: comment.liked, like_count: comment.like_count } : c
        )
      );
      Alert.alert('Could not update like', error);
    }
  }, [user]);

  const handleLikeReply = useCallback(async (parentId: string, reply: PostComment) => {
    if (!user) return;
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? {
              ...c,
              replies: (c.replies ?? []).map((r) =>
                r.id === reply.id ? { ...r, liked: !r.liked, like_count: r.like_count + (r.liked ? -1 : 1) } : r
              ),
            }
          : c
      )
    );
    const { error } = await toggleCommentLike(reply.id, user.id, reply.liked);
    if (error) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: (c.replies ?? []).map((r) =>
                  r.id === reply.id ? { ...r, liked: reply.liked, like_count: reply.like_count } : r
                ),
              }
            : c
        )
      );
      Alert.alert('Could not update like', error);
    }
  }, [user]);

  if (!post) return null;

  return (
    <Modal
      visible={!!post}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.sheet, { paddingBottom: insets.bottom }]}
        >
          {/* Handle + header */}
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              Comments
              {comments.length > 0 && (
                <Text style={s.commentCount}> · {comments.length}</Text>
              )}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close comments"
              onPress={onClose}
              hitSlop={8}
            >
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          {/* Comment list */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ paddingVertical: Spacing.xl }} />
          ) : loadError && comments.length === 0 ? (
            <View style={{ alignItems: 'center', padding: Spacing.xl, gap: Spacing.md }}>
              <Text style={s.emptyTxt}>{loadError}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry loading comments"
                onPress={() => void load()}
              >
                <Text style={{ color: Colors.primary, fontFamily: Typography.family.bold }}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {loadError ? (
                <Text style={[s.emptyTxt, { paddingVertical: Spacing.sm }]}>{loadError}</Text>
              ) : null}
              <FlatList
                ref={listRef}
                data={comments}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <CommentRow
                    comment={item}
                    onLike={() => handleLikeComment(item)}
                    onReply={() => setReplyTo(item)}
                    onLikeReply={(reply) => handleLikeReply(item.id, reply)}
                    onReplyToReply={(reply) => setReplyTo(reply)}
                  />
                )}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={s.emptyTxt}>No comments yet. Be the first!</Text>
                }
              />
            </>
          )}

          {/* Reply hint */}
          {replyTo && (
            <View style={s.replyHint}>
              <CornerDownRight color={Colors.primary} size={14} />
              <Text style={s.replyHintTxt}>
                Replying to <Text style={{ color: Colors.primary }}>{replyTo.author_name ?? 'Athlete'}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <X color={Colors.textMuted} size={14} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={s.inputRow}>
            <View style={s.inputAvatar}>
              <Text style={s.inputAvatarTxt}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
            </View>
            <TextInput
              accessibilityLabel="Comment text"
              style={s.input}
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textDisabled}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              multiline
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              onPress={handleSubmit}
              disabled={!text.trim() || submitting}
              style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Send color={Colors.primary} size={20} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CommentRow({
  comment,
  onLike,
  onReply,
  onLikeReply,
  onReplyToReply,
}: {
  comment: PostComment;
  onLike: () => void;
  onReply: () => void;
  onLikeReply: (reply: PostComment) => void;
  onReplyToReply: (reply: PostComment) => void;
}) {
  return (
    <View style={cr.wrap}>
      <View style={cr.avatar}>
        <Text style={cr.avatarTxt}>{comment.author_name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={cr.body}>
        <View style={cr.row}>
          <Text style={cr.author}>{comment.author_name ?? 'Athlete'}</Text>
          <Text style={cr.time}>{postTimeAgo(comment.created_at)}</Text>
        </View>
        <Text style={cr.text}>{comment.body}</Text>
        <View style={cr.actions}>
          <TouchableOpacity onPress={onReply} style={cr.actionBtn}>
            <Text style={cr.actionTxt}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={comment.liked ? 'Unlike comment' : 'Like comment'}
            accessibilityState={{ selected: comment.liked }}
            onPress={onLike}
            style={cr.likeBtn}
          >
            <Heart
              color={comment.liked ? Colors.error : Colors.textDisabled}
              fill={comment.liked ? Colors.error : 'transparent'}
              size={12}
            />
            {comment.like_count > 0 && (
              <Text style={[cr.likeCount, comment.liked && { color: Colors.error }]}>
                {comment.like_count}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Replies */}
        {(comment.replies ?? []).map((reply) => (
          <View key={reply.id} style={cr.replyWrap}>
            <View style={[cr.avatar, cr.replyAvatar]}>
              <Text style={cr.avatarTxt}>{reply.author_name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={cr.body}>
              <View style={cr.row}>
                <Text style={cr.author}>{reply.author_name ?? 'Athlete'}</Text>
                <Text style={cr.time}>{postTimeAgo(reply.created_at)}</Text>
              </View>
              <Text style={cr.text}>{reply.body}</Text>
              <View style={cr.actions}>
                <TouchableOpacity onPress={() => onReplyToReply(reply)} style={cr.actionBtn}>
                  <Text style={cr.actionTxt}>Reply</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onLikeReply(reply)} style={cr.likeBtn}>
                  <Heart
                    color={reply.liked ? Colors.error : Colors.textDisabled}
                    fill={reply.liked ? Colors.error : 'transparent'}
                    size={12}
                  />
                  {reply.like_count > 0 && (
                    <Text style={[cr.likeCount, reply.liked && { color: Colors.error }]}>
                      {reply.like_count}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '75%',
    paddingTop: Spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  commentCount: { fontFamily: Typography.family.regular, color: Colors.textMuted },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.lg },
  emptyTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', paddingVertical: Spacing.xl },

  replyHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.elevated, borderTopWidth: 1, borderTopColor: Colors.border },
  replyHintTxt: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  inputAvatarTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  input: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, backgroundColor: Colors.elevated, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 80, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { padding: Spacing.sm },
});

const cr = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: Spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  avatarTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 3 },
  author: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  time: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  text: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.xs },
  actionBtn: { paddingVertical: 2 },
  actionTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textDisabled },
  replyWrap: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, paddingLeft: Spacing.sm },
});
