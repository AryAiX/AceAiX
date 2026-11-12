import { supabase } from './supabase';
import { AppError } from './errors';
import { signPostMedia } from './api';
import { hashtagPattern, normaliseHashtag } from './hashtags';
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
 * Posts whose captions match, newest first.
 *
 * A search that is exactly one hashtag is matched with a case-insensitive
 * regular expression (`imatch`), so "#u16" does not also find "#u160". Every
 * other search stays a case-insensitive "contains" match (`ilike`).
 *
 * This reads `posts` straight from the client on purpose: the row policy on
 * `posts` already hides anything the viewer may not see (followers-only,
 * hidden, moderated, blocked, a minor's posts without approval), so search can
 * never show more than the feed would. No server change is needed. When posts
 * number in the hundreds of thousands, a trigram index on `caption` keeps
 * this fast; that is a small migration for later, not a requirement now.
 */
export async function searchPosts(term: string, page = 0): Promise<PostHit[]> {
  const tag = normaliseHashtag(term);
  const from = page * POST_PAGE;
  const to = from + POST_PAGE - 1;
  let request = supabase.from('posts').select('id, caption, media, created_at');

  if (tag) {
    /* No quotes. PostgREST would keep them as part of the pattern on a plain
       column filter. Brackets and parentheses only need quoting inside or/and
       filters. */
    request = request.filter('caption', 'imatch', hashtagPattern(tag));
  } else {
    /* % and _ are wildcards to ILIKE, and , ( ) would break the filter string. */
    const clean = term.replace(/[%_,()\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    request = request.ilike('caption', `%${clean}%`);
  }

  const { data, error } = await request
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw new AppError(error);
  const rows = ((data ?? []) as PostHit[]).map((row) => ({
    ...row,
    media: Array.isArray(row.media) ? row.media : [],
  }));
  return signPostMedia(rows);
}

/**
 * A small picture for each post id (the first photo, or a video's still),
 * for rows that point at a post: notifications, for now. Read under the same
 * row rules as everything else, so a post the viewer may not see simply has
 * no picture.
 */
export async function postThumbnails(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.from('posts').select('id, media').in('id', unique.slice(0, 60));
  if (error) throw new AppError(error);
  const rows = ((data ?? []) as { id: string; media: PostMedia[] | null }[]).map((row) => ({
    id: row.id,
    media: Array.isArray(row.media) ? row.media : [],
  }));
  const signed = await signPostMedia(rows);
  const out: Record<string, string> = {};
  for (const row of signed) {
    const first = row.media[0];
    const uri = first?.thumbnail ?? (first?.type === 'video' ? null : first?.url);
    if (uri) out[row.id] = uri;
  }
  return out;
}
