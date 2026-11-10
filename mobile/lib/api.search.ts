import { supabase } from './supabase';
import { AppError } from './errors';
import { signPostMedia } from './api';
import type { PostMedia } from '@/types/models';

/** One post found by search: enough to draw a grid tile and open the post. */
export interface PostHit {
  id: string;
  caption: string | null;
  media: PostMedia[];
  created_at: string;
}

export const POST_PAGE = 24;

/**
 * Posts whose words match, newest first. A word starting with # finds that
 * hashtag in captions, so "#u16" works today, before tags have their own
 * feature.
 *
 * This reads `posts` straight from the client on purpose: the row policy on
 * `posts` already hides anything the viewer may not see (followers-only,
 * hidden, moderated, blocked, a minor's posts without approval), so search can
 * never show more than the feed would. No server change is needed. When posts
 * number in the hundreds of thousands, a trigram index on `caption` keeps
 * this fast; that is a small migration for later, not a requirement now.
 */
export async function searchPosts(term: string, page = 0): Promise<PostHit[]> {
  /* % and _ are wildcards to ILIKE, and , ( ) would break the filter string. */
  const clean = term.replace(/[%_,()\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('id, caption, media, created_at')
    .ilike('caption', `%${clean}%`)
    .order('created_at', { ascending: false })
    .range(page * POST_PAGE, page * POST_PAGE + POST_PAGE - 1);
  if (error) throw new AppError(error);
  const rows = ((data ?? []) as PostHit[]).map((row) => ({
    ...row,
    media: Array.isArray(row.media) ? row.media : [],
  }));
  return signPostMedia(rows);
}
