import { signPostMedia } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { FeedPost } from '@/types/models';

/**
 * Explore: every public clip in one grid — video posts and athlete highlights.
 *
 * `explore_videos` decides what is public and who may see whom; nothing here
 * may fetch clips any other way. The rows are in the feed's shape, so the
 * reels player takes them as they are. A highlight has `type === 'highlight'`
 * and no likes or comments — those belong to posts.
 */
export const EXPLORE_PAGE = 18;

export async function getExploreVideos(
  params: { limit?: number; offset?: number; sport?: string | null } = {},
): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('explore_videos', {
    p_limit: params.limit ?? EXPLORE_PAGE,
    p_offset: params.offset ?? 0,
    p_sport: params.sport ?? null,
  });
  if (error) throw new AppError(error);
  return signPostMedia((data ?? []) as FeedPost[]);
}

export interface ExploreSport {
  sport: string;
  clips: number;
}

/** The sports this viewer can actually watch a clip for — the filter chips. */
export async function getExploreSports(): Promise<ExploreSport[]> {
  const { data, error } = await supabase.rpc('explore_sports');
  if (error) throw new AppError(error);
  return (data ?? []) as ExploreSport[];
}

/** A highlight is a clip from a profile, not a post: it cannot be liked or commented on. */
export function isHighlight(post: Pick<FeedPost, 'type'>): boolean {
  return post.type === 'highlight';
}
