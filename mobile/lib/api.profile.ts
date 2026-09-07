import { Platform } from 'react-native';
import { File as FsFile } from 'expo-file-system';

import { supabase, Buckets, publicUrl } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { getUserPosts } from '@/lib/api';
import type { UserPost } from '@/types/models';

/**
 * Profile-screen data access.
 *
 * Everything here is either a query `lib/api.ts` does not have yet, or a piece
 * of media plumbing that only the profile screens need. Same rule as api.ts:
 * screens never touch `supabase` directly, and every failure arrives as an
 * AppError with a message worth showing.
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type AthleteMediaType = 'video' | 'image' | 'highlight_reel' | 'document';

export interface AthleteMediaItem {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  media_type: AthleteMediaType;
  storage_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_featured: boolean;
  is_public: boolean;
  views_count: number;
  created_at: string;
  /** Signed and ready to render. Null when the file could not be resolved. */
  display_url: string | null;
}

export interface MatchRecordRow {
  id: string;
  athlete_id: string;
  match_date: string;
  competition: string | null;
  opponent: string | null;
  result: string | null;
  minutes_played: number | null;
  goals: number;
  assists: number;
  source: 'self' | 'verified' | 'cv';
  notes: string | null;
  created_at: string;
}

export interface MatchRecordInput {
  match_date: string;
  competition?: string | null;
  opponent?: string | null;
  result?: string | null;
  minutes_played?: number | null;
  goals?: number;
  assists?: number;
  notes?: string | null;
}

export interface EndorsementRow {
  id: string;
  skill_or_trait: string;
  note: string | null;
  endorser_role: string | null;
  created_at: string;
  endorser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
}

/** Shapes shared with the web app's profile JSONB, so both read the same rows. */
export interface HonorEntry {
  title: string;
  org: string | null;
  year: string | null;
  type: 'team' | 'individual' | 'national';
}

export interface CertificationEntry {
  title: string;
  issuer: string | null;
  date: string | null;
  verified: boolean;
}

export interface PostTile extends UserPost {
  /** First media item, resolved to something an <Image> can load. */
  thumbnail: string | null;
}

// ── Media plumbing ───────────────────────────────────────────────────────────

/**
 * The `posts` bucket is private, so a stored path is not a URL. Sign what we
 * can in one round trip and pass through anything that is already absolute.
 */
export async function resolveMediaUrls(
  paths: string[],
  bucket: string = Buckets.posts,
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const toSign: string[] = [];

  for (const path of paths) {
    if (!path) continue;
    if (path.startsWith('http')) resolved[path] = path;
    else if (!toSign.includes(path)) toSign.push(path);
  }
  if (toSign.length === 0) return resolved;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(toSign, expiresInSeconds);

  // A signing failure must degrade to "no thumbnail", never to a broken screen.
  if (error || !data) return resolved;

  for (const row of data) {
    if (row.signedUrl && row.path) resolved[row.path] = row.signedUrl;
  }
  return resolved;
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.arrayBuffer();
  }
  return new FsFile(uri).arrayBuffer();
}

function extensionFor(uri: string, contentType: string): string {
  const guess = uri.split('?')[0].split('.').pop();
  if (guess && guess.length <= 5 && /^[a-z0-9]+$/i.test(guess)) return guess.toLowerCase();
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('quicktime')) return 'mov';
  if (contentType.startsWith('video')) return 'mp4';
  return 'jpg';
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AppError('Not signed in');
  return data.user.id;
}

async function upload(bucket: string, path: string, uri: string, contentType: string) {
  const bytes = await readBytes(uri);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new AppError(error);
  return path;
}

/** Uploads a picked avatar and returns the public URL to store on the profile. */
export async function uploadAvatar(uri: string, contentType = 'image/jpeg'): Promise<string> {
  const uid = await currentUserId();
  const path = `${uid}/avatar-${Date.now()}.${extensionFor(uri, contentType)}`;
  await upload(Buckets.avatars, path, uri, contentType);
  const url = publicUrl(Buckets.avatars, path);
  if (!url) throw new AppError('That image could not be saved. Try another one.');
  return url;
}

/**
 * Uploads a picked cover photo and returns the public URL.
 *
 * Same bucket as the avatar: both are the person's own public likeness, both
 * are readable by anyone who can open the profile, and giving the wallpaper its
 * own bucket would mean a second set of policies saying exactly the same thing.
 * The `cover-` prefix keeps the two apart in storage.
 */
export async function uploadCover(uri: string, contentType = 'image/jpeg'): Promise<string> {
  const uid = await currentUserId();
  const path = `${uid}/cover-${Date.now()}.${extensionFor(uri, contentType)}`;
  await upload(Buckets.avatars, path, uri, contentType);
  const url = publicUrl(Buckets.avatars, path);
  if (!url) throw new AppError('That image could not be saved. Try another one.');
  return url;
}

/**
 * `user_profiles.full_name` is a real column with no trigger behind it, and it
 * is what every list, feed row and search result renders. Editing the split
 * names without it leaves the rest of the app showing a stale name.
 */
export async function syncFullName(
  firstName: string,
  lastName: string,
): Promise<void> {
  const uid = await currentUserId();
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (!full) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: full })
    .eq('id', uid);
  if (error) throw new AppError(error);
}

// ── Highlights (athlete_media) ───────────────────────────────────────────────
export async function getAthleteMedia(athleteId: string): Promise<AthleteMediaItem[]> {
  const { data, error } = await supabase
    .from('athlete_media')
    .select(
      'id, athlete_id, title, description, media_type, storage_url, thumbnail_url, duration_seconds, is_featured, is_public, views_count, created_at',
    )
    .eq('athlete_id', athleteId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw new AppError(error);

  const rows = (data ?? []) as Omit<AthleteMediaItem, 'display_url'>[];
  const urls = await resolveMediaUrls(
    rows.map((row) => row.thumbnail_url ?? row.storage_url).filter(Boolean) as string[],
  );

  return rows.map((row) => {
    const key = row.thumbnail_url ?? row.storage_url;
    return { ...row, display_url: (key && urls[key]) ?? null };
  });
}

export interface NewHighlight {
  athleteId: string;
  uri: string;
  title: string;
  contentType: string;
  isVideo: boolean;
  durationSeconds?: number | null;
}

/** Uploads the file, then records it so the Talent Score trigger picks it up. */
export async function addAthleteMedia(input: NewHighlight): Promise<void> {
  const uid = await currentUserId();
  const path = `${uid}/highlights/${Date.now()}.${extensionFor(input.uri, input.contentType)}`;
  await upload(Buckets.posts, path, input.uri, input.contentType);

  const { error } = await supabase.from('athlete_media').insert({
    athlete_id: input.athleteId,
    title: input.title.trim() || 'Highlight',
    media_type: input.isVideo ? 'video' : 'image',
    storage_url: path,
    duration_seconds: input.durationSeconds ?? null,
    is_public: true,
  });
  if (error) throw new AppError(error);
}

export async function deleteAthleteMedia(mediaId: string): Promise<void> {
  const { error } = await supabase.from('athlete_media').delete().eq('id', mediaId);
  if (error) throw new AppError(error);
}

// ── Posts grid ───────────────────────────────────────────────────────────────
export async function getPostTiles(userId: string): Promise<PostTile[]> {
  const posts = await getUserPosts(userId);
  const firstMedia = posts
    .map((post) => post.media?.[0]?.thumbnail ?? post.media?.[0]?.url ?? null)
    .filter((value): value is string => !!value);

  const urls = await resolveMediaUrls(firstMedia);

  return posts.map((post) => {
    const key = post.media?.[0]?.thumbnail ?? post.media?.[0]?.url ?? null;
    return { ...post, thumbnail: (key && urls[key]) ?? null };
  });
}

// ── Career ───────────────────────────────────────────────────────────────────
export async function getMatchRecords(athleteId: string): Promise<MatchRecordRow[]> {
  const { data, error } = await supabase
    .from('match_records')
    .select(
      'id, athlete_id, match_date, competition, opponent, result, minutes_played, goals, assists, source, notes, created_at',
    )
    .eq('athlete_id', athleteId)
    .order('match_date', { ascending: false })
    .limit(50);
  if (error) throw new AppError(error);
  return (data ?? []) as MatchRecordRow[];
}

export async function addMatchRecord(
  athleteId: string,
  input: MatchRecordInput,
): Promise<void> {
  const { error } = await supabase.from('match_records').insert({
    athlete_id: athleteId,
    match_date: input.match_date,
    competition: input.competition ?? null,
    opponent: input.opponent ?? null,
    result: input.result ?? null,
    minutes_played: input.minutes_played ?? null,
    goals: input.goals ?? 0,
    assists: input.assists ?? 0,
    notes: input.notes ?? null,
    source: 'self',
  });
  if (error) throw new AppError(error);
}

export async function deleteMatchRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('match_records').delete().eq('id', recordId);
  if (error) throw new AppError(error);
}

export async function getEndorsements(athleteId: string): Promise<EndorsementRow[]> {
  const { data, error } = await supabase
    .from('endorsements')
    .select(
      'id, skill_or_trait, note, endorser_role, created_at, endorser:user_profiles!endorsements_endorser_id_fkey(id, full_name, avatar_url, is_verified)',
    )
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new AppError(error);

  return (data ?? []).map((row) => ({
    ...row,
    endorser: Array.isArray(row.endorser) ? row.endorser[0] ?? null : row.endorser ?? null,
  })) as EndorsementRow[];
}

// ── Portfolio JSONB (honours + certifications) ───────────────────────────────
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

/** Rows are hand-written JSON, so read them defensively and drop the unusable. */
export function normaliseHonors(raw: unknown[] | null | undefined): HonorEntry[] {
  return (raw ?? [])
    .map((item) => {
      const row = asRecord(item);
      const title = asText(row.title) ?? asText(row.name);
      if (!title) return null;
      const type = asText(row.type);
      return {
        title,
        org: asText(row.org) ?? asText(row.issuer) ?? asText(row.club),
        year: asText(row.year) ?? asText(row.date),
        type:
          type === 'team' || type === 'national' || type === 'individual' ? type : 'individual',
      } as HonorEntry;
    })
    .filter((entry): entry is HonorEntry => entry !== null);
}

export function normaliseCertifications(
  raw: unknown[] | null | undefined,
): CertificationEntry[] {
  return (raw ?? [])
    .map((item) => {
      const row = asRecord(item);
      const title = asText(row.title) ?? asText(row.name);
      if (!title) return null;
      return {
        title,
        issuer: asText(row.issuer) ?? asText(row.org),
        date: asText(row.date) ?? asText(row.year),
        verified: row.verified === true,
      } as CertificationEntry;
    })
    .filter((entry): entry is CertificationEntry => entry !== null);
}

export async function saveHonors(honors: HonorEntry[]): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('athlete_profiles')
    .update({ honors })
    .eq('user_id', uid);
  if (error) throw new AppError(error);
}

export async function saveCertifications(items: CertificationEntry[]): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('athlete_profiles')
    .update({ certifications: items })
    .eq('user_id', uid);
  if (error) throw new AppError(error);
}

// ── Blocking ─────────────────────────────────────────────────────────────────
/**
 * `get_profile_bundle` says a profile is blocked but not by whom, and RLS only
 * lets you read the blocks you made — so a row here means you are the blocker
 * and can undo it.
 */
export async function didIBlock(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocked_id', userId)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

// ── Score history ────────────────────────────────────────────────────────────
export interface ScoreHistoryPoint {
  overall: number;
  tier: string;
  recorded_on: string;
}

/** `getScoreHistory` returns untyped rows; this narrows and sorts them. */
export function toHistoryPoints(rows: unknown[]): ScoreHistoryPoint[] {
  return rows
    .map((item) => {
      const row = asRecord(item);
      const overall = typeof row.overall === 'number' ? row.overall : null;
      const recorded = asText(row.recorded_on);
      if (overall === null || !recorded) return null;
      return {
        overall,
        tier: asText(row.tier) ?? 'rising',
        recorded_on: recorded,
      } as ScoreHistoryPoint;
    })
    .filter((point): point is ScoreHistoryPoint => point !== null)
    .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
}
