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

/**
 * One Best of clip by its id, in the same shape Explore gives the player.
 * Read straight from the clip and its athlete, which the reader may only see
 * when the clip is public and the athlete can be seen (the database decides).
 * Null when it cannot be seen. Nothing on the server changes.
 */
export async function getHighlightClip(mediaId: string): Promise<FeedPost | null> {
  const { data: clip } = await supabase
    .from('athlete_media')
    .select('id, athlete_id, title, storage_url, thumbnail_url, views_count, created_at, media_type')
    .eq('id', mediaId)
    .maybeSingle();
  if (!clip) return null;
  const c = clip as {
    id: string;
    athlete_id: string;
    title: string | null;
    storage_url: string;
    thumbnail_url: string | null;
    views_count: number | null;
    created_at: string;
  };

  const { data: athlete } = await supabase
    .from('athlete_profiles')
    .select('user_id, sport, position, position_primary')
    .eq('id', c.athlete_id)
    .maybeSingle();
  if (!athlete) return null;
  const a = athlete as { user_id: string; sport: string | null; position: string | null; position_primary: string | null };

  const { data: person } = await supabase
    .from('user_profiles')
    .select('full_name, avatar_url, role, is_verified')
    .eq('id', a.user_id)
    .maybeSingle();
  if (!person) return null;
  const p = person as { full_name: string | null; avatar_url: string | null; role: FeedPost['author_role']; is_verified: boolean };

  const post: FeedPost = {
    id: c.id,
    author_id: a.user_id,
    author_name: p.full_name,
    author_avatar: p.avatar_url,
    author_role: p.role,
    author_verified: p.is_verified,
    author_score: 0,
    author_tier: 'rising' as FeedPost['author_tier'],
    athlete_sport: a.sport,
    athlete_position: a.position_primary ?? a.position,
    type: 'highlight',
    caption: c.title,
    media: [{ url: c.storage_url, type: 'video', thumbnail: c.thumbnail_url ?? undefined }],
    tags: [],
    like_count: 0,
    comment_count: 0,
    view_count: c.views_count ?? 0,
    viewer_liked: false,
    viewer_saved: false,
    viewer_follows: false,
    created_at: c.created_at,
  };
  const [signed] = await signPostMedia([post]);
  return signed ?? null;
}
