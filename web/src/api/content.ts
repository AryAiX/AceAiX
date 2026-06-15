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
export async function listPosts(opts: { authorId?: string; athleteId?: string; limit?: number } = {}): Promise<Post[]> {
  let q = supabase.from('posts').select(`*, author:user_profiles(${USER_FIELDS})`).order('created_at', { ascending: false });
  if (opts.authorId) q = q.eq('author_id', opts.authorId);
  if (opts.athleteId) q = q.eq('athlete_id', opts.athleteId);
  if (opts.limit) q = q.limit(opts.limit);
  return unwrap(await q) as Post[];
}

export async function createPost(input: { author_id: string; athlete_id?: string; type?: string; text: string; image_url?: string }): Promise<Post> {
  return unwrap(await supabase.from('posts').insert(input).select('*').single()) as Post;
}

// ---- CMS ----
export async function getCms<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const row = unwrap(await supabase.from('cms_content').select('data').eq('key', key).maybeSingle()) as { data: T } | null;
  return row?.data ?? null;
}
