import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { SuccessStory, Post } from '../types';

// ---- Success stories ----
export async function listSuccessStories(opts: { featured?: boolean; limit?: number } = {}): Promise<SuccessStory[]> {
  let q = supabase.from('success_stories').select('*').eq('is_published', true).order('published_at', { ascending: false });
  if (opts.featured) q = q.eq('is_featured', true);
  if (opts.limit) q = q.limit(opts.limit);
  return unwrap(await q) as SuccessStory[];
}

export async function getSuccessStory(slug: string): Promise<SuccessStory | null> {
  return unwrap(await supabase.from('success_stories').select('*').eq('slug', slug).maybeSingle()) as SuccessStory | null;
}

// ---- Posts (feed + activity) ----
export interface PostCursor {
  createdAt: string;
  id: string;
}

export interface PostPage {
  items: Post[];
  nextCursor?: PostCursor;
}

export function postCursorFilter(cursor: PostCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

export function buildPostPage<T extends { id: string; created_at: string }>(
  rows: T[],
  pageSize: number,
): { items: T[]; nextCursor?: PostCursor } {
  const items = rows.slice(0, pageSize);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: rows.length > pageSize && last
      ? { createdAt: last.created_at, id: last.id }
      : undefined,
  };
}

export function mergePostPages(pages: PostPage[]): Post[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  }));
}

async function addViewerPostState(posts: Post[], viewerId?: string): Promise<Post[]> {
  if (!viewerId || posts.length === 0) return posts;

  const postIds = posts.map((post) => post.id);
  const [likes, saves] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
    supabase.from('post_saves').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
  ]);
  const likedIds = new Set((unwrap(likes) as { post_id: string }[]).map((row) => row.post_id));
  const savedIds = new Set((unwrap(saves) as { post_id: string }[]).map((row) => row.post_id));

  return posts.map((post) => ({
    ...post,
    liked: likedIds.has(post.id),
    saved: savedIds.has(post.id),
  }));
}

export async function listPosts(opts: {
  authorId?: string;
  athleteId?: string;
  viewerId?: string;
  limit?: number;
} = {}): Promise<Post[]> {
  let q = supabase
    .from('posts')
    .select(`*, author:user_profiles!posts_author_id_fkey(${USER_FIELDS})`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (opts.authorId) q = q.eq('author_id', opts.authorId);
  if (opts.athleteId) q = q.eq('athlete_id', opts.athleteId);
  if (opts.limit != null) q = q.limit(opts.limit);

  const posts = unwrap(await q) as Post[];
  return addViewerPostState(posts, opts.viewerId);
}

export async function listPostPage(opts: {
  viewerId?: string;
  pageSize: number;
  cursor?: PostCursor;
}): Promise<PostPage> {
  let q = supabase
    .from('posts')
    .select(`*, author:user_profiles!posts_author_id_fkey(${USER_FIELDS})`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(opts.pageSize + 1);
  if (opts.cursor) q = q.or(postCursorFilter(opts.cursor));

  const rawPage = buildPostPage(unwrap(await q) as Post[], opts.pageSize);
  return {
    items: await addViewerPostState(rawPage.items, opts.viewerId),
    nextCursor: rawPage.nextCursor,
  };
}

export async function togglePostLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    unwrap(await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId).select('post_id'));
    return;
  }
  unwrap(await supabase.from('post_likes').insert({ post_id: postId, user_id: userId }).select('post_id'));
}

export async function togglePostSave(postId: string, userId: string, saved: boolean): Promise<void> {
  if (saved) {
    unwrap(await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId).select('post_id'));
    return;
  }
  unwrap(await supabase.from('post_saves').insert({ post_id: postId, user_id: userId }).select('post_id'));
}

export async function createPost(input: { author_id: string; athlete_id?: string; type?: string; text: string; image_url?: string }): Promise<Post> {
  return unwrap(await supabase.from('posts').insert(input).select('*').single()) as Post;
}

// ---- CMS ----
export async function getCms<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const row = unwrap(await supabase.from('cms_content').select('data').eq('key', key).maybeSingle()) as { data: T } | null;
  return row?.data ?? null;
}
