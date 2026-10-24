import { signPostMedia } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { publishViewCount } from '@/lib/viewCounts';
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

/** Clips this session has already sent. A repeat watch does not call again. */
const recordedHighlightViews = new Set<string>();

/**
 * Count one watch of a highlight, after the caller has played it.
 * The server ignores the owner, a duplicate, and a clip this person
 * cannot see. A failure stays quiet.
 */
async function readHighlightViewCount(mediaId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('athlete_media')
    .select('views_count')
    .eq('id', mediaId)
    .maybeSingle();
  if (error || !data) return null;
  const count = (data as { views_count?: number | null }).views_count;
  return typeof count === 'number' ? count : null;
}

export async function recordHighlightView(mediaId: string): Promise<void> {
  if (!mediaId || recordedHighlightViews.has(mediaId)) return;
  recordedHighlightViews.add(mediaId);
  try {
    await supabase.rpc('record_highlight_view', { p_media: mediaId });
    const count = await readHighlightViewCount(mediaId);
    if (count != null) publishViewCount('highlight', mediaId, count);
  } catch {
    /* A missed view is not worth an error on screen. */
  }
}
