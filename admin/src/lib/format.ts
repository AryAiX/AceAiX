import { supabase } from './supabase';

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const future = s < 0;
  const a = Math.abs(s);
  const v =
    a < 60 ? `${a}s` : a < 3600 ? `${Math.floor(a / 60)}m` : a < 86400 ? `${Math.floor(a / 3600)}h` : a < 2592000 ? `${Math.floor(a / 86400)}d` : `${Math.floor(a / 2592000)}mo`;
  return future ? `in ${v}` : `${v} ago`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function label(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  return `${currency ?? ''} ${amount.toLocaleString()}`.trim();
}

const isAbsolute = (p: string) => /^(https?:|data:|blob:)/.test(p);

/** Avatars live in a public bucket. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (isAbsolute(path)) return path;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

const signedCache = new Map<string, { url: string; at: number }>();

/**
 * Posts, reels and stories live in private buckets. The admin storage policy
 * (media_admin_read) lets a moderator sign any of them, including media that
 * is under review and hidden from everyone else.
 */
export async function signedMediaUrl(bucket: 'posts' | 'stories', path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (isAbsolute(path)) return path;
  const key = `${bucket}/${path}`;
  const hit = signedCache.get(key);
  if (hit && Date.now() - hit.at < 50 * 60 * 1000) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  signedCache.set(key, { url: data.signedUrl, at: Date.now() });
  return data.signedUrl;
}

export const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  nudity: 'Nudity / sexual',
  violence: 'Violence',
  hate: 'Hate speech',
  impersonation: 'Impersonation',
  child_safety: 'Child safety',
  scam: 'Scam',
  other: 'Other',
};
