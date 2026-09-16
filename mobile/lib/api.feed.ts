import { AppError } from '@/lib/errors';
import { Buckets, publicUrl, supabase } from '@/lib/supabase';
import type { FeedPost, PostMedia, Tier, UserRole } from '@/types/models';

/**
 * Feed-only network calls.
 *
 * `lib/api.ts` owns everything the whole app shares. This file owns the two
 * things only the feed needs: reading one post on its own (the feed RPC is
 * list-shaped and cannot answer "give me post X"), and putting a picked photo
 * or clip into storage.
 */

// ── One post ─────────────────────────────────────────────────────────────────

interface AuthorRow {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_verified: boolean | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Read a single post, shaped exactly like a `get_feed` row so the same
 * `PostCard` renders it.
 *
 * Returns null when the post does not exist, was deleted, was removed by
 * moderation, or belongs to someone the viewer has blocked — the row-level
 * policy on `posts` collapses all of those into "no row", which is what the
 * screen shows as "no longer available".
 */
export async function getPostById(postId: string): Promise<FeedPost | null> {
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;

  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, author_id, type, caption, text, media, tags, like_count, comments_count, view_count, created_at, ' +
        'author:user_profiles!posts_author_id_fkey(full_name, avatar_url, role, is_verified)',
    )
    .eq('id', postId)
    .maybeSingle();

  if (error) throw new AppError(error);
  if (!data) return null;

  // PostgREST's embedded-select typing cannot describe this join, so the row
  // is read positionally against the columns asked for above.
  const row = data as unknown as Record<string, unknown>;
  const author = one<AuthorRow>(row.author as AuthorRow | AuthorRow[] | null);
  const authorId = row.author_id as string;

  const [athlete, liked, saved, follows] = await Promise.all([
    readAthlete(authorId),
    viewerHasRow('post_likes', postId, viewerId),
    viewerHasRow('post_saves', postId, viewerId),
    viewerFollows(authorId, viewerId),
  ]);

  return {
    id: row.id as string,
    author_id: authorId,
    author_name: author?.full_name ?? null,
    author_avatar: author?.avatar_url ?? null,
    author_role: (author?.role as UserRole) ?? 'athlete',
    author_verified: author?.is_verified ?? false,
    author_score: athlete.score,
    author_tier: athlete.tier,
    athlete_sport: athlete.sport,
    athlete_position: athlete.position,
    type: (row.type as string) ?? 'standard',
    caption: (row.caption as string | null) ?? (row.text as string | null) ?? null,
    media: Array.isArray(row.media) ? (row.media as PostMedia[]) : [],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    like_count: (row.like_count as number) ?? 0,
    comment_count: (row.comments_count as number) ?? 0,
    view_count: (row.view_count as number) ?? 0,
    viewer_liked: liked,
    viewer_saved: saved,
    viewer_follows: follows,
    created_at: row.created_at as string,
  };
}

interface AthleteFacts {
  sport: string | null;
  position: string | null;
  score: number;
  tier: Tier;
}

/** Sport, position and talent score for the tier ring. Never throws. */
async function readAthlete(userId: string): Promise<AthleteFacts> {
  const blank: AthleteFacts = { sport: null, position: null, score: 0, tier: 'rising' };

  const { data: profile, error } = await supabase
    .from('athlete_profiles')
    .select('id, sport, position_primary, position')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !profile) return blank;

  const row = profile as Record<string, unknown>;
  const facts: AthleteFacts = {
    ...blank,
    sport: (row.sport as string | null) ?? null,
    position:
      (row.position_primary as string | null) ?? (row.position as string | null) ?? null,
  };

  const { data: score } = await supabase
    .from('talent_scores')
    .select('overall, tier')
    .eq('athlete_id', row.id as string)
    .maybeSingle();

  if (score) {
    const s = score as Record<string, unknown>;
    facts.score = (s.overall as number) ?? 0;
    facts.tier = ((s.tier as Tier) ?? 'rising') as Tier;
  }
  return facts;
}

async function viewerHasRow(
  table: 'post_likes' | 'post_saves',
  postId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (!viewerId) return false;
  const { data } = await supabase
    .from(table)
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', viewerId)
    .maybeSingle();
  return !!data;
}

async function viewerFollows(authorId: string, viewerId: string | null): Promise<boolean> {
  if (!viewerId || viewerId === authorId) return false;
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', viewerId)
    .eq('following_id', authorId)
    .maybeSingle();
  return !!data;
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export interface PendingMedia {
  /** Local file URI from the image picker. */
  uri: string;
  type: 'photo' | 'video';
  width?: number;
  height?: number;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

/** The `posts` bucket rejects anything else, so we never try. */
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/** Matches the bucket's file_size_limit. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function resolveType(item: PendingMedia): { ext: string; contentType: string } {
  const declared = (item.mimeType ?? '').toLowerCase();
  if (ALLOWED_MIME[declared]) return { ext: ALLOWED_MIME[declared], contentType: declared };

  const ext = (item.fileName ?? item.uri).split('.').pop()?.toLowerCase() ?? '';
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  if (byExt[ext]) return { ext: ext === 'jpeg' ? 'jpg' : ext, contentType: byExt[ext] };

  // Last resort: the safest format for each kind.
  return item.type === 'video'
    ? { ext: 'mp4', contentType: 'video/mp4' }
    : { ext: 'jpg', contentType: 'image/jpeg' };
}

function randomId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') return g.crypto.randomUUID();
  const part = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${part()}-${part()}`;
}

/**
 * Upload picked media to `posts/<user id>/<id>.<ext>` and return the
 * `PostMedia[]` a post is created with.
 *
 * Files go up one at a time: storage gives no byte-level progress, so
 * "3 of 4 done" is the most honest thing we can show, and a failure part-way
 * through leaves the rest unattempted instead of half-uploaded in parallel.
 */
export async function uploadPostMedia(
  items: PendingMedia[],
  onProgress?: (done: number, total: number) => void,
): Promise<PostMedia[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const uid = auth.user.id;

  const uploaded: PostMedia[] = [];
  onProgress?.(0, items.length);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if (item.fileSize && item.fileSize > MAX_UPLOAD_BYTES) {
      throw new AppError('That file is too big. Videos need to be under 100 MB.');
    }

    const { ext, contentType } = resolveType(item);
    const path = `${uid}/${randomId()}.${ext}`;

    let body: ArrayBuffer;
    try {
      const response = await fetch(item.uri);
      body = await response.arrayBuffer();
    } catch {
      throw new AppError('We could not read that file. Pick it again and retry.');
    }

    if (body.byteLength === 0) {
      throw new AppError('That file looks empty. Pick it again and retry.');
    }
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      throw new AppError('That file is too big. Videos need to be under 100 MB.');
    }

    const { error } = await supabase.storage
      .from(Buckets.posts)
      .upload(path, body, { contentType, cacheControl: '3600', upsert: false });
    if (error) throw new AppError(error);

    const url = publicUrl(Buckets.posts, path);
    if (!url) throw new AppError('The upload finished but we could not link it. Try again.');

    uploaded.push({
      url,
      type: item.type,
      width: item.width && item.width > 0 ? item.width : undefined,
      height: item.height && item.height > 0 ? item.height : undefined,
    });
    onProgress?.(i + 1, items.length);
  }

  return uploaded;
}

/** The canonical shareable link for a post. */
export function postLink(postId: string): string {
  return `https://aceaix.com/app/post/${postId}`;
}
