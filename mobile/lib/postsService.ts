import { supabase } from '@/lib/supabase';

export type PostType = 'post' | 'reel';
export type PostAudience = 'public' | 'followers' | 'connections';

export interface PostMedia {
  url: string;
  type: 'photo' | 'video';
  width?: number;
  height?: number;
  signed_url?: string;
}

export interface PostTag {
  type: 'sport' | 'attribute' | 'location' | 'open_to_trials' | 'match';
  value: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  type: PostType;
  caption: string | null;
  media: PostMedia[];
  tags: PostTag[];
  audience: PostAudience;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  created_at: string;
  // joined
  author_name: string | null;
  author_avatar: string | null;
  author_sport: string | null;
  author_position: string | null;
  // current user state
  liked: boolean;
  saved: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  like_count: number;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  liked: boolean;
  replies?: PostComment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function signMediaUrls(media: PostMedia[]): Promise<PostMedia[]> {
  return Promise.all(
    media.map(async (m) => {
      if (m.signed_url) return m;
      try {
        const { data } = await supabase.storage.from('posts').createSignedUrl(m.url, 3600);
        return { ...m, signed_url: data?.signedUrl };
      } catch (_) {
        return m;
      }
    })
  );
}

function mapRow(row: any, likedIds: Set<string>, savedIds: Set<string>): FeedPost {
  const rawMedia: PostMedia[] = Array.isArray(row.media) && row.media.length
    ? row.media
    : row.image_url
      ? [{ url: row.image_url, type: 'photo' }]
      : [];
  const athlete = row.athlete ?? row.athlete_profiles;
  const author = row.author ?? row.user_profiles;
  return {
    id: row.id,
    author_id: row.author_id,
    type: row.type === 'reel' ? 'reel' : 'post',
    caption: row.caption ?? row.text ?? null,
    media: rawMedia,
    tags: Array.isArray(row.tags) ? (row.tags as PostTag[]) : [],
    audience: (row.audience ?? 'public') as PostAudience,
    is_featured: row.is_featured ?? false,
    view_count: row.view_count ?? 0,
    like_count: row.like_count ?? row.reactions_count ?? 0,
    comment_count: row.comment_count ?? row.comments_count ?? 0,
    save_count: row.save_count ?? 0,
    created_at: row.created_at,
    author_name: author?.full_name ?? null,
    author_avatar: author?.avatar_url ?? null,
    author_sport: athlete?.sport ?? null,
    author_position: athlete?.position_primary ?? athlete?.position ?? null,
    liked: likedIds.has(row.id),
    saved: savedIds.has(row.id),
  };
}

// ── Feed queries ──────────────────────────────────────────────────────────────

export async function fetchFeedPosts(
  currentUserId: string,
  cursor?: string,
  limit = 20
): Promise<FeedPost[]> {
  let query = supabase
    .from('posts')
    .select('*, author:user_profiles(full_name, avatar_url), athlete:athlete_profiles(sport, position, position_primary)')
    .in('type', ['post', 'standard'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    ids.length ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('post_saves').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
  ]);

  const likedIds = new Set((likes ?? []).map((l: any) => l.post_id));
  const savedIds = new Set((saves ?? []).map((s: any) => s.post_id));

  const posts = data.map((r: any) => mapRow(r, likedIds, savedIds));

  // Sign media URLs
  return Promise.all(
    posts.map(async (p) => ({ ...p, media: await signMediaUrls(p.media) }))
  );
}

export async function fetchReels(
  currentUserId: string,
  cursor?: string,
  limit = 10
): Promise<FeedPost[]> {
  let query = supabase
    .from('posts')
    .select('*, author:user_profiles(full_name, avatar_url), athlete:athlete_profiles(sport, position, position_primary)')
    .eq('type', 'reel')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    ids.length ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('post_saves').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
  ]);

  const likedIds = new Set((likes ?? []).map((l: any) => l.post_id));
  const savedIds = new Set((saves ?? []).map((s: any) => s.post_id));

  const posts = data.map((r: any) => mapRow(r, likedIds, savedIds));
  return Promise.all(
    posts.map(async (p) => ({ ...p, media: await signMediaUrls(p.media) }))
  );
}

export async function fetchMyPosts(
  authorId: string,
  type?: PostType
): Promise<FeedPost[]> {
  let query = supabase
    .from('posts')
    .select('*, author:user_profiles(full_name, avatar_url), athlete:athlete_profiles(sport, position, position_primary)')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error || !data) return [];

  const likedIds = new Set<string>();
  const savedIds = new Set<string>();
  const posts = data.map((r: any) => mapRow(r, likedIds, savedIds));
  return Promise.all(
    posts.map(async (p) => ({ ...p, media: await signMediaUrls(p.media) }))
  );
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function uploadPostMedia(
  userId: string,
  uri: string,
  mediaType: 'photo' | 'video'
): Promise<{ path: string | null; error: string | null }> {
  try {
    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('posts').upload(path, blob, { contentType });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: null, error: String(e) };
  }
}

export async function createPost(params: {
  author_id: string;
  type: PostType;
  caption?: string | null;
  media: Array<{ path: string; type: 'photo' | 'video'; width?: number; height?: number }>;
  tags?: PostTag[];
  audience?: PostAudience;
}): Promise<{ id: string | null; error: string | null }> {
  const mediaPayload: PostMedia[] = params.media.map((m) => ({
    url: m.path,
    type: m.type,
    width: m.width,
    height: m.height,
  }));

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: params.author_id,
      type: params.type,
      caption: params.caption ?? null,
      text: params.caption ?? null,
      media: mediaPayload,
      image_url: mediaPayload.find((m) => m.type === 'photo')?.url ?? null,
      tags: params.tags ?? [],
      audience: params.audience ?? 'followers',
    })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error?.message ?? 'Unknown error' };
  return { id: data.id, error: null };
}

export async function deletePost(postId: string): Promise<void> {
  await supabase.from('posts').delete().eq('id', postId);
}

export async function toggleLike(
  postId: string,
  userId: string,
  currently_liked: boolean
): Promise<boolean> {
  if (currently_liked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    return false;
  } else {
    await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId });
    return true;
  }
}

export async function toggleSave(
  postId: string,
  userId: string,
  currently_saved: boolean
): Promise<boolean> {
  if (currently_saved) {
    await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId);
    return false;
  } else {
    await supabase.from('post_saves').upsert({ post_id: postId, user_id: userId });
    return true;
  }
}

export async function markPostViewed(postId: string, viewerId: string): Promise<void> {
  await supabase.from('post_views').upsert(
    { post_id: postId, viewer_id: viewerId, viewed_at: new Date().toISOString() },
    { onConflict: 'post_id,viewer_id' }
  );
  try { await supabase.rpc('increment_post_view', { p_id: postId }); } catch (_) {}
}

export async function toggleFeatureReel(postId: string, featured: boolean): Promise<void> {
  await supabase.from('posts').update({ is_featured: featured }).eq('id', postId);
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(postId: string, currentUserId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, author:user_profiles(full_name, avatar_url)')
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const commentIds = data.map((c: any) => c.id);
  const { data: replies } = commentIds.length
    ? await supabase
        .from('post_comments')
        .select('*, author:user_profiles(full_name, avatar_url)')
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  const { data: clikes } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', currentUserId)
    .in('comment_id', [...commentIds, ...((replies ?? []).map((r: any) => r.id))]);

  const likedCommentIds = new Set((clikes ?? []).map((c: any) => c.comment_id));

  const mapComment = (c: any): PostComment => ({
    id: c.id,
    post_id: c.post_id,
    author_id: c.author_id,
    body: c.body,
    parent_id: c.parent_id,
    like_count: c.like_count,
    created_at: c.created_at,
    author_name: (c.author as any)?.full_name ?? null,
    author_avatar: (c.author as any)?.avatar_url ?? null,
    liked: likedCommentIds.has(c.id),
  });

  return data.map((c: any) => ({
    ...mapComment(c),
    replies: (replies ?? [])
      .filter((r: any) => r.parent_id === c.id)
      .map(mapComment),
  }));
}

export async function addComment(
  postId: string,
  authorId: string,
  body: string,
  parentId?: string
): Promise<PostComment | null> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, body, parent_id: parentId ?? null })
    .select('*, author:user_profiles(full_name, avatar_url)')
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    post_id: data.post_id,
    author_id: data.author_id,
    body: data.body,
    parent_id: data.parent_id,
    like_count: data.like_count,
    created_at: data.created_at,
    author_name: (data.author as any)?.full_name ?? null,
    author_avatar: (data.author as any)?.avatar_url ?? null,
    liked: false,
    replies: [],
  };
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  liked: boolean
): Promise<void> {
  if (liked) {
    await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
  } else {
    await supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: userId });
  }
}

export function postTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
