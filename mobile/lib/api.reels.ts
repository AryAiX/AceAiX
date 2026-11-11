import { signPostMedia } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { attachPostMentions } from '@/lib/postMentions';
import { supabase } from '@/lib/supabase';
import type { FeedPost } from '@/types/models';

/**
 * Reels are video posts and the clips an athlete uploads to their own page,
 * served full-screen. `get_reels` reads the posts through `get_feed` and the
 * profile clips through the same helper Explore uses, so every audience, block
 * and minor gate is decided in the database — nothing here may fetch clips any
 * other way. A profile clip has `type === 'highlight'` (see `isHighlight`).
 */

/** Sign the clips, attach mentions, and drop a row whose video did not sign. */
async function presentReels(rows: FeedPost[]): Promise<FeedPost[]> {
  const signed = await signPostMedia(rows);
  const withMentions = await attachPostMentions(signed);
  /* A reel whose clip could not be signed has nothing to show. */
  return withMentions.filter((post) => post.media.some((m) => m.type === 'video'));
}

export async function getReels(params: { limit?: number; before?: string | null } = {}): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_reels', {
    p_limit: params.limit ?? 12,
    p_before: params.before ?? null,
  });
  if (error) throw new AppError(error);
  return presentReels((data ?? []) as FeedPost[]);
}

/**
 * Your Rundown: clips from the people and club pages the viewer follows.
 * `get_following_reels` reads them through the same feed and highlight rules.
 */
export async function getFollowingReels(
  params: { limit?: number; before?: string | null } = {},
): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_following_reels', {
    p_limit: params.limit ?? 12,
    p_before: params.before ?? null,
  });
  if (error) throw new AppError(error);
  return presentReels((data ?? []) as FeedPost[]);
}

/** The first playable clip in a reel. */
export function reelVideo(post: FeedPost) {
  return post.media.find((m) => m.type === 'video') ?? null;
}
