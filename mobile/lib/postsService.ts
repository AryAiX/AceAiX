import { supabase } from '@/lib/supabase';
import { normalizeSportKey } from '@/constants/sportsConfig';
import { File } from 'expo-file-system';
export { formatCount, postTimeAgo } from './formatting';

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
  author_verified: boolean;
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
      if (/^https?:\/\//i.test(m.url)) return { ...m, signed_url: m.url };
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
    author_verified: author?.is_verified ?? false,
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
  limit = 20,
  mode: 'for_you' | 'following' | 'latest' = 'latest',
  viewerSport?: string | null,
): Promise<FeedPost[]> {
  let authorIds: string[] | null = null;
  if (mode === 'following') {
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);
    if (followsError) return [];
    authorIds = [currentUserId, ...(follows ?? []).map((follow) => follow.following_id)];
  }

  const sportKey = mode === 'for_you' ? normalizeSportKey(viewerSport) : null;
  const athleteSelect = sportKey
    ? 'athlete:athlete_profiles!inner(sport, position, position_primary)'
    : 'athlete:athlete_profiles(sport, position, position_primary)';

  let query = supabase
    .from('posts')
    .select(`*, author:user_profiles!posts_author_id_fkey(full_name, avatar_url, is_verified), ${athleteSelect}`)
    .in('type', ['post', 'standard'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);
  if (authorIds) query = query.in('author_id', authorIds);
  if (sportKey) query = query.ilike('athlete.sport', `%${sportKey}%`);

  const [{ data, error }, { data: blocks }] = await Promise.all([
    query,
    supabase.rpc('get_blocked_user_ids'),
  ]);
  if (error || !data) return [];

  const blockedIds = new Set(
    (blocks ?? []).map((block: { blocked_user_id: string }) => block.blocked_user_id),
  );
  const visibleData = data.filter((row: any) => !blockedIds.has(row.author_id));
  const ids = visibleData.map((r: any) => r.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    ids.length ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('post_saves').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
  ]);

  const likedIds = new Set((likes ?? []).map((l: any) => l.post_id));
  const savedIds = new Set((saves ?? []).map((s: any) => s.post_id));

  const posts = visibleData.map((r: any) => mapRow(r, likedIds, savedIds));

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
    .select('*, author:user_profiles!posts_author_id_fkey(full_name, avatar_url, is_verified), athlete:athlete_profiles(sport, position, position_primary)')
    .eq('type', 'reel')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const [{ data, error }, { data: blocks }] = await Promise.all([
    query,
    supabase.rpc('get_blocked_user_ids'),
  ]);
  if (error || !data) return [];

  const blockedIds = new Set(
    (blocks ?? []).map((block: { blocked_user_id: string }) => block.blocked_user_id),
  );
  const visibleData = data.filter((row: any) => !blockedIds.has(row.author_id));
  const ids = visibleData.map((r: any) => r.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    ids.length ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('post_saves').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [] }),
  ]);

  const likedIds = new Set((likes ?? []).map((l: any) => l.post_id));
  const savedIds = new Set((saves ?? []).map((s: any) => s.post_id));

  const posts = visibleData.map((r: any) => mapRow(r, likedIds, savedIds));
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
    .select('*, author:user_profiles!posts_author_id_fkey(full_name, avatar_url, is_verified), athlete:athlete_profiles(sport, position, position_primary)')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (type === 'post') query = query.in('type', ['post', 'standard']);
  else if (type) query = query.eq('type', type);

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

    const file = new File(uri);
    if (!file.exists || file.size === 0) {
      return { path: null, error: 'Captured file could not be read. Please try again.' };
    }
    if (mediaType === 'video' && file.size > 50 * 1024 * 1024) {
      return { path: null, error: 'Videos must be 50 MB or smaller.' };
    }
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage.from('posts').upload(path, arrayBuffer, { contentType });
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

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('media')
    .eq('id', postId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const mediaPaths = ((post?.media ?? []) as Array<{ path?: string; url?: string }>)
    .map((item) => item.path ?? item.url)
    .filter((path): path is string => Boolean(path && !path.startsWith('http')));

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) return { error: error.message };

  if (mediaPaths.length > 0) {
    const { error: mediaError } = await supabase.storage.from('posts').remove(mediaPaths);
    if (mediaError) {
      console.warn(`[postsService] post ${postId} deleted but media cleanup failed: ${mediaError.message}`);
    }
  }
  return { error: null };
}

export async function updatePostCaption(
  postId: string,
  authorId: string,
  caption: string,
): Promise<{ error: string | null }> {
  const normalized = caption.trim();
  const { error } = await supabase
    .from('posts')
    .update({
      caption: normalized || null,
      text: normalized || null,
    })
    .eq('id', postId)
    .eq('author_id', authorId);
  return { error: error?.message ?? null };
}

export async function toggleLike(
  postId: string,
  userId: string,
  currently_liked: boolean
): Promise<{ liked: boolean; error: string | null }> {
  if (currently_liked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    return { liked: error ? currently_liked : false, error: error?.message ?? null };
  } else {
    const { error } = await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId });
    return { liked: error ? currently_liked : true, error: error?.message ?? null };
  }
}

export async function toggleSave(
  postId: string,
  userId: string,
  currently_saved: boolean
): Promise<{ saved: boolean; error: string | null }> {
  if (currently_saved) {
    const { error } = await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId);
    return { saved: error ? currently_saved : false, error: error?.message ?? null };
  } else {
    const { error } = await supabase.from('post_saves').upsert({ post_id: postId, user_id: userId });
    return { saved: error ? currently_saved : true, error: error?.message ?? null };
  }
}

export async function markPostViewed(postId: string, viewerId: string): Promise<void> {
  await supabase.from('post_views').upsert(
    { post_id: postId, viewer_id: viewerId, viewed_at: new Date().toISOString() },
    { onConflict: 'post_id,viewer_id' }
  );
}

export async function toggleFeatureReel(postId: string, featured: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('posts').update({ is_featured: featured }).eq('id', postId);
  return { error: error?.message ?? null };
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(postId: string, currentUserId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, author:user_profiles!post_comments_author_id_fkey(full_name, avatar_url)')
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const commentIds = data.map((c: any) => c.id);
  const { data: replies } = commentIds.length
    ? await supabase
        .from('post_comments')
        .select('*, author:user_profiles!post_comments_author_id_fkey(full_name, avatar_url)')
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
): Promise<{ comment: PostComment | null; error: string | null }> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, body, parent_id: parentId ?? null })
    .select('*, author:user_profiles!post_comments_author_id_fkey(full_name, avatar_url)')
    .single();

  if (error || !data) return { comment: null, error: error?.message ?? 'Unknown error' };
  return {
    comment: {
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
    },
    error: null,
  };
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  liked: boolean
): Promise<{ error: string | null }> {
  if (liked) {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
    return { error: error?.message ?? null };
  } else {
    const { error } = await supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: userId });
    return { error: error?.message ?? null };
  }
}
