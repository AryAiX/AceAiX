/*
 * These helpers arrived on `main` in "Fix cross-platform flows and performance
 * sync" (#9), written against `lib/postsService` — part of the service layer
 * this rebuild replaces with `lib/api.*`. The logic is sound and tested, so it
 * survives the merge; only the type it borrowed had to go.
 *
 * The shape is declared structurally rather than imported from
 * `@/types/models`, for two reasons: nothing in the rebuild threads replies
 * yet, so `PostComment` there has no `replies` field and adding one to a shared
 * model to satisfy an unused module would be the tail wagging the dog; and
 * declared this way the helpers accept the rebuild's `PostComment` unchanged
 * the day someone does wire threading into `CommentSheet`.
 */
export interface PostComment {
  id: string;
  parent_id?: string | null;
  replies?: PostComment[];
}

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
