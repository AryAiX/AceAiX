import { AppError } from '@/lib/errors';
import { isAbsoluteMediaUrl, pathsToSign } from '@/lib/mediaUrl';
import { Buckets, supabase } from '@/lib/supabase';
import type { CardBackground, StoryKind } from '@/lib/stories';
import type { PostAudience } from '@/types/models';

/**
 * Stories — 24-hour posts shown as a rail of rings at the top of Home.
 *
 * Every read goes through the RPCs in `20260925000001_stories_and_reels.sql`,
 * which apply the audience, block, suspension and minor-discovery gates. The
 * `stories` table is never selected from directly: its policy is the same
 * predicate, but the RPCs are the contract and the only thing reviewed as one.
 */

export interface StoryRailEntry {
  author_id: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_verified: boolean;
  is_self: boolean;
  stories: number;
  unseen: number;
  latest_at: string;
}

export interface StoryCard {
  text: string;
  background: CardBackground;
  sticker?: string;
  stat?: string;
}

export interface Story {
  id: string;
  kind: StoryKind;
  /** Signed and ready to load; null for a card, or if signing failed. */
  media_url: string | null;
  caption: string | null;
  card: Partial<StoryCard>;
  audience: PostAudience;
  created_at: string;
  expires_at: string;
  seen: boolean;
  /** Only the author gets a number. */
  view_count: number | null;
}

export async function getStoryRail(limit = 30): Promise<StoryRailEntry[]> {
  const { data, error } = await supabase.rpc('story_rail', { p_limit: limit });
  if (error) throw new AppError(error);
  return (data ?? []) as StoryRailEntry[];
}

/** Sign photo and video stories from the private `stories` bucket. */
export async function signStoryMedia(rows: Story[]): Promise<Story[]> {
  const paths = pathsToSign(rows.map((row) => row.media_url));
  if (paths.length === 0) return rows;
  const { data, error } = await supabase.storage
    .from(Buckets.stories)
    .createSignedUrls(paths, 3600);
  const signed = new Map((!error && Array.isArray(data) ? data : []).map((item) => [item.path, item.signedUrl]));
  /* A media story that cannot be signed is dropped rather than shown blank. */
  return rows.flatMap((row) => {
    if (row.kind === 'card') return [row];
    if (!row.media_url) return [];
    if (isAbsoluteMediaUrl(row.media_url)) return [row];
    const url = signed.get(row.media_url);
    return url ? [{ ...row, media_url: url }] : [];
  });
}

export async function getUserStories(authorId: string): Promise<Story[]> {
  const { data, error } = await supabase.rpc('user_stories', { p_author: authorId });
  if (error) throw new AppError(error);
  const rows = ((data ?? []) as Story[]).map((row) => ({ ...row, card: row.card ?? {} }));
  return signStoryMedia(rows);
}

/** Fire-and-forget: a failed view mark must never interrupt the story. */
export async function markStoryViewed(storyId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_story_viewed', { p_story: storyId });
  if (error) throw new AppError(error);
}

export async function createStory(input: {
  kind: StoryKind;
  mediaUrl?: string | null;
  caption?: string | null;
  card?: StoryCard | null;
  audience: PostAudience;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_story', {
    p_kind: input.kind,
    p_media_url: input.mediaUrl ?? null,
    p_caption: input.caption?.trim() ? input.caption.trim() : null,
    p_card: input.card ?? {},
    p_audience: input.audience,
  });
  if (error) throw new AppError(error);
  return data as string;
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_story', { p_story: storyId });
  if (error) throw new AppError(error);
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export interface PendingStoryMedia {
  uri: string;
  type: 'photo' | 'video';
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

const STORY_MAX_BYTES = 50 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

/** Pick the extension and content type the bucket will accept. Pure. */
export function storyFileType(item: Pick<PendingStoryMedia, 'uri' | 'type' | 'mimeType' | 'fileName'>): {
  ext: string;
  contentType: string;
} {
  const declared = (item.mimeType ?? '').toLowerCase();
  if (MIME_EXT[declared]) return { ext: MIME_EXT[declared], contentType: declared };
  const source = item.fileName ?? (item.uri.startsWith('data:') ? '' : item.uri);
  const ext = source.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (EXT_MIME[ext]) return { ext: ext === 'jpeg' ? 'jpg' : ext, contentType: EXT_MIME[ext] };
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
 * Upload one picked photo or clip to `stories/<uid>/<id>.<ext>` and return the
 * storage path `create_story` expects — it checks the first segment is you.
 */
export async function uploadStoryMedia(item: PendingStoryMedia): Promise<string> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new AppError(authError);
  if (!auth.user) throw new AppError('Not signed in');

  if (item.fileSize && item.fileSize > STORY_MAX_BYTES) {
    throw new AppError('That file is too big for a story.');
  }

  const { ext, contentType } = storyFileType(item);
  const path = `${auth.user.id}/${randomId()}.${ext}`;

  let body: ArrayBuffer;
  try {
    const response = await fetch(item.uri);
    body = await response.arrayBuffer();
  } catch {
    throw new AppError('We could not read that file. Pick it again and retry.');
  }
  if (body.byteLength === 0) throw new AppError('That file looks empty. Pick it again and retry.');
  if (body.byteLength > STORY_MAX_BYTES) throw new AppError('That file is too big for a story.');

  const { error } = await supabase.storage
    .from(Buckets.stories)
    .upload(path, body, { contentType, cacheControl: '3600', upsert: false });
  if (error) throw new AppError(error);
  return path;
}

/** Remove an upload whose story could not be created. Best effort. */
export async function discardStoryUpload(path: string): Promise<void> {
  try {
    await supabase.storage.from(Buckets.stories).remove([path]);
  } catch {
    /* nothing more to do */
  }
}
