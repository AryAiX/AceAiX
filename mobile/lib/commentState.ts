import type { PostComment } from '@/lib/postsService';

export function commentReplyParentId(replyTo: PostComment | null): string | undefined {
  return replyTo ? (replyTo.parent_id ?? replyTo.id) : undefined;
}

export function appendCommentResult(
  comments: PostComment[],
  comment: PostComment,
  replyTo: PostComment | null,
): PostComment[] {
  const parentId = commentReplyParentId(replyTo);
  if (!parentId) return [...comments, { ...comment, replies: [] }];

  return comments.map((root) =>
    root.id === parentId
      ? { ...root, replies: [...(root.replies ?? []), comment] }
      : root
  );
}

export function attachCommentReplies(
  roots: PostComment[],
  replies: PostComment[],
): PostComment[] {
  return roots.map((root) => ({
    ...root,
    replies: replies.filter((reply) => reply.parent_id === root.id),
  }));
}

export interface CommentRequestIdentity {
  postId: string | undefined;
  userId: string | undefined;
}

export function isSameCommentRequestIdentity(
  left: CommentRequestIdentity,
  right: CommentRequestIdentity,
): boolean {
  return left.postId === right.postId && left.userId === right.userId;
}

export function isCurrentCommentRequest(
  activeIdentity: CommentRequestIdentity,
  activeGeneration: number,
  requestIdentity: CommentRequestIdentity,
  requestGeneration: number,
): boolean {
  return (
    isSameCommentRequestIdentity(activeIdentity, requestIdentity)
    && activeGeneration === requestGeneration
  );
}
