import { supabase } from '@/lib/supabase';

export type StoryAudience = 'connections' | 'followers' | 'public';
export type StoryMediaType = 'photo' | 'video';

export interface StoryOverlay {
  type: 'text' | 'sticker';
  value: string;
  color?: string;
  x?: number;
  y?: number;
}

export interface Story {
  id: string;
  author_id: string;
  media_url: string;
  media_type: StoryMediaType;
  caption: string | null;
  overlays: StoryOverlay[];
  audience: StoryAudience;
  created_at: string;
  expires_at: string;
  // joined from profiles
  author_name: string | null;
  author_avatar: string | null;
  author_sport: string | null;
  // computed
  signed_url?: string;
  view_count?: number;
  seen?: boolean;
}

export interface StoryAuthorGroup {
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  stories: Story[];
  has_unseen: boolean;
  is_own: boolean;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchActiveStories(currentUserId: string): Promise<StoryAuthorGroup[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      id, author_id, media_url, media_type, caption, overlays, audience, created_at, expires_at,
      author:user_profiles(full_name, avatar_url)
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  // Fetch seen state for current user
  const storyIds = (data as any[]).map((s) => s.id);
  let seenSet = new Set<string>();
  if (storyIds.length > 0) {
    const { data: views } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', currentUserId)
      .in('story_id', storyIds);
    seenSet = new Set((views ?? []).map((v: any) => v.story_id));
  }

  // Build stories with signed URLs
  const stories: Story[] = await Promise.all(
    (data as any[]).map(async (row) => {
      let signed_url: string | undefined;
      try {
        const { data: urlData } = await supabase.storage
          .from('stories')
          .createSignedUrl(row.media_url, 3600);
        signed_url = urlData?.signedUrl;
      } catch (_) {}
      return {
        id: row.id,
        author_id: row.author_id,
        media_url: row.media_url,
        media_type: row.media_type as StoryMediaType,
        caption: row.caption,
        overlays: (row.overlays ?? []) as StoryOverlay[],
        audience: row.audience as StoryAudience,
        created_at: row.created_at,
        expires_at: row.expires_at,
        author_name: (row.author as any)?.full_name ?? null,
        author_avatar: (row.author as any)?.avatar_url ?? null,
        author_sport: null,
        signed_url,
        seen: seenSet.has(row.id),
      };
    })
  );

  // Group by author
  const groupMap = new Map<string, StoryAuthorGroup>();
  for (const story of stories) {
    if (!groupMap.has(story.author_id)) {
      groupMap.set(story.author_id, {
        author_id: story.author_id,
        author_name: story.author_name,
        author_avatar: story.author_avatar,
        stories: [],
        has_unseen: false,
        is_own: story.author_id === currentUserId,
      });
    }
    const group = groupMap.get(story.author_id)!;
    group.stories.push(story);
    if (!story.seen) group.has_unseen = true;
  }

  // Sort: own first, then unseen, then seen
  const groups = Array.from(groupMap.values());
  groups.sort((a, b) => {
    if (a.is_own && !b.is_own) return -1;
    if (!a.is_own && b.is_own) return 1;
    if (a.has_unseen && !b.has_unseen) return -1;
    if (!a.has_unseen && b.has_unseen) return 1;
    return 0;
  });

  return groups;
}

export async function fetchMyStoryViewers(storyId: string): Promise<Array<{ viewer_id: string; viewer_name: string | null; viewer_avatar: string | null; viewed_at: string }>> {
  const { data, error } = await supabase
    .from('story_views')
    .select('viewer_id, viewed_at, viewer:user_profiles(full_name, avatar_url)')
    .eq('story_id', storyId)
    .order('viewed_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    viewer_id: row.viewer_id,
    viewer_name: (row.viewer as any)?.full_name ?? null,
    viewer_avatar: (row.viewer as any)?.avatar_url ?? null,
    viewed_at: row.viewed_at,
  }));
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function uploadStoryMedia(
  userId: string,
  uri: string,
  mediaType: StoryMediaType
): Promise<{ path: string | null; error: string | null }> {
  try {
    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage.from('stories').upload(path, blob, {
      contentType,
      upsert: false,
    });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: null, error: String(e) };
  }
}

export async function createStory(params: {
  author_id: string;
  media_path: string;
  media_type: StoryMediaType;
  caption?: string | null;
  overlays?: StoryOverlay[];
  audience?: StoryAudience;
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      author_id: params.author_id,
      media_url: params.media_path,
      media_type: params.media_type,
      caption: params.caption ?? null,
      overlays: params.overlays ?? [],
      audience: params.audience ?? 'connections',
    })
    .select('id')
    .single();
  if (error || !data) return { id: null, error: error?.message ?? 'Unknown error' };
  return { id: data.id, error: null };
}

export async function deleteStory(storyId: string, mediaPath: string): Promise<void> {
  await supabase.from('stories').delete().eq('id', storyId);
  await supabase.storage.from('stories').remove([mediaPath]);
}

export async function markStorySeen(storyId: string, viewerId: string): Promise<void> {
  await supabase.from('story_views').upsert(
    { story_id: storyId, viewer_id: viewerId, viewed_at: new Date().toISOString() },
    { onConflict: 'story_id,viewer_id' }
  );
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('stories').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function storyTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}
