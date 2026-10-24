import { parseMentions, type MentionSpan } from '@/lib/mentions';
import { supabase } from '@/lib/supabase';

/**
 * Mentions for posts that arrived from `get_feed` or `get_reels`.
 *
 * Those RPCs return a fixed column list and they are where minor visibility
 * is decided, so the column is read afterwards. One select covers the page.
 * Row-level security on `posts` already hides a post the viewer cannot see.
 * A post id is remembered so the next page does not ask for it again.
 */

const byPostId = new Map<string, MentionSpan[]>();

export function rememberPostMentions(postId: string, mentions: readonly MentionSpan[]): void {
  byPostId.set(postId, mentions.slice());
}

export async function attachPostMentions<T extends { id: string }>(
  posts: T[],
): Promise<(T & { mentions: MentionSpan[] })[]> {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.id) || byPostId.has(post.id)) continue;
    seen.add(post.id);
    missing.push(post.id);
  }

  if (missing.length > 0) {
    const { data, error } = await supabase.from('posts').select('id, mentions').in('id', missing);
    if (error || !Array.isArray(data)) {
      console.warn('Could not load post mentions', error);
    } else {
      const found = new Set<string>();
      for (const row of data) {
        const id = (row as { id?: unknown }).id;
        if (typeof id !== 'string') continue;
        byPostId.set(id, parseMentions((row as { mentions?: unknown }).mentions));
        found.add(id);
      }
      // A missing row is one RLS hid, or one that was deleted. Don't ask again.
      for (const id of missing) {
        if (!found.has(id)) byPostId.set(id, []);
      }
    }
  }

  return posts.map((post) => ({
    ...post,
    mentions: byPostId.get(post.id) ?? [],
  }));
}
