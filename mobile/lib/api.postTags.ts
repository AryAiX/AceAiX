import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * People attached to a post. A tag is not an @mention: the mention is text
 * inside a caption or comment, and the tag is a person on the post itself.
 *
 * `get_feed` does not return tags, so they are read afterwards, one select
 * for the page. A post id is remembered so the next page does not ask again.
 * A failed read must not break the feed.
 */

export interface TaggedPerson {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  role: string | null;
}

const byPostId = new Map<string, TaggedPerson[]>();

export function rememberPostTags(postId: string, tagged: readonly TaggedPerson[]): void {
  byPostId.set(postId, tagged.slice());
}

function personOf(value: unknown): TaggedPerson | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const person = row as Record<string, unknown>;
  if (typeof person.id !== 'string' || person.id.length === 0) return null;
  return {
    id: person.id,
    full_name: typeof person.full_name === 'string' ? person.full_name : null,
    avatar_url: typeof person.avatar_url === 'string' ? person.avatar_url : null,
    is_verified: person.is_verified === true,
    role: typeof person.role === 'string' ? person.role : null,
  };
}

export async function attachPostTags<T extends { id: string }>(
  posts: T[],
): Promise<(T & { tagged: TaggedPerson[] })[]> {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.id) || byPostId.has(post.id)) continue;
    seen.add(post.id);
    missing.push(post.id);
  }

  if (missing.length > 0) {
    // user_id and tagged_by both point at user_profiles, so the embed has to
    // name the person who was tagged.
    const { data, error } = await supabase
      .from('post_tags')
      .select(
        'post_id, created_at, user:user_profiles!post_tags_user_id_fkey(id, full_name, avatar_url, is_verified, role)',
      )
      .in('post_id', missing)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      console.warn('Could not load post tags', error);
    } else {
      const grouped = new Map<string, TaggedPerson[]>();
      for (const raw of data) {
        const row = raw as { post_id?: unknown; user?: unknown };
        if (typeof row.post_id !== 'string') continue;
        const person = personOf(row.user);
        if (!person) continue;
        const list = grouped.get(row.post_id) ?? [];
        list.push(person);
        grouped.set(row.post_id, list);
      }
      for (const id of missing) byPostId.set(id, grouped.get(id) ?? []);
    }
  }

  return posts.map((post) => ({
    ...post,
    tagged: byPostId.get(post.id) ?? [],
  }));
}

/** The ids the server kept. Someone the mention rule rejects is left off. */
export async function setPostTags(postId: string, userIds: string[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('set_post_tags', {
    p_post: postId,
    p_users: userIds,
  });
  if (error) throw new AppError(error);
  if (!Array.isArray(data)) return [];
  return data.filter((id): id is string => typeof id === 'string');
}

export async function removeMyPostTag(postId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_post_tag', { p_post: postId });
  if (error) throw new AppError(error);
}
