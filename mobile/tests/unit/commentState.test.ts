import { describe, expect, it } from 'vitest';
import type { PostComment } from '@/lib/commentState';
import {
  appendCommentResult,
  attachCommentReplies,
  commentReplyParentId,
  isCurrentCommentRequest,
  isSameCommentRequestIdentity,
} from '@/lib/commentState';

/*
 * Trimmed to the three fields these helpers read, when the module stopped
 * importing its type from the retired `postsService`. Every assertion below is
 * unchanged — the author, body and like count were never part of what is being
 * tested here, only of the shape the old service happened to return.
 */
function comment(
  id: string,
  parentId: string | null = null,
): PostComment {
  return { id, parent_id: parentId, replies: [] };
}

describe('flattened comment replies', () => {
  it('targets the root when replying to an existing reply', () => {
    const root = comment('root');
    const firstReply = comment('reply-1', root.id);
    const nestedReply = comment('reply-2', commentReplyParentId(firstReply) ?? null);

    expect(nestedReply.parent_id).toBe(root.id);
    expect(appendCommentResult(
      [{ ...root, replies: [firstReply] }],
      nestedReply,
      firstReply,
    )[0].replies?.map((reply) => reply.id)).toEqual(['reply-1', 'reply-2']);
  });

  it('keeps flattened replies visible after a reload regroup', () => {
    const root = comment('root');
    const firstReply = comment('reply-1', root.id);
    const secondReply = comment('reply-2', root.id);

    expect(attachCommentReplies([root], [firstReply, secondReply])[0].replies)
      .toEqual([firstReply, secondReply]);
  });
});

describe('comment request isolation', () => {
  const identity = (postId?: string, userId?: string) => ({ postId, userId });

  it('treats either a post or authenticated-user change as a new identity', () => {
    expect(isSameCommentRequestIdentity(
      identity('post-1', 'user-1'),
      identity('post-1', 'user-1'),
    )).toBe(true);
    expect(isSameCommentRequestIdentity(
      identity('post-2', 'user-1'),
      identity('post-1', 'user-1'),
    )).toBe(false);
    expect(isSameCommentRequestIdentity(
      identity('post-1', 'user-2'),
      identity('post-1', 'user-1'),
    )).toBe(false);
  });

  it('rejects old-session results and generation writes', () => {
    expect(isCurrentCommentRequest(
      identity('post-1', 'user-1'), 4,
      identity('post-1', 'user-1'), 4,
    )).toBe(true);
    expect(isCurrentCommentRequest(
      identity('post-1', 'user-2'), 5,
      identity('post-1', 'user-1'), 4,
    )).toBe(false);
    expect(isCurrentCommentRequest(
      identity('post-1', 'user-1'), 5,
      identity('post-1', 'user-1'), 4,
    )).toBe(false);
    expect(isCurrentCommentRequest(
      identity(undefined, undefined), 5,
      identity('post-1', 'user-1'), 4,
    )).toBe(false);
  });
});
