import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard, ImagePlus, Play, Star } from 'lucide-react-native';

import { useCachedVideoSource } from '@/lib/videoCache';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  PointsChip,
  RemoteImage,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import {
  addAthleteMedia,
  AthleteMediaItem,
  deleteAthleteMedia,
  getAthleteMedia,
  MAX_HIGHLIGHT_VIDEO_SECONDS,
} from '@/lib/api.profile';
import { recordHighlightView } from '@/lib/api.explore';
import { knownViewCount, useViewCountUpdates } from '@/lib/viewCounts';
import { errorMessage } from '@/lib/errors';
import { fullDate, relativeTime } from '@/lib/format';
import { useT } from '@/i18n';
import type { ScoreTip } from '@/types/models';
import { MediaAuthor, MediaGrid, MediaTile } from './MediaGrid';
import { HighlightSpotlight } from './HighlightSpotlight';
import { useProfileLayout } from './LayoutToggle';

/**
 * The fallback title stored when someone uploads without naming the clip.
 * This is written to `athlete_media.title` and read back by anyone who opens
 * the profile, so it stays in one language rather than the uploader's.
 */
const DEFAULT_VIDEO_TITLE = 'Highlight clip';
const DEFAULT_IMAGE_TITLE = 'Photo';

interface Props {
  athleteId: string | null;
  isSelf: boolean;
  refreshKey?: number;
  /** Fired after an upload or delete, so the score can be re-read. */
  onChanged?: () => void;
  /** The score's tips, so the empty state can say what clips are worth. */
  tips?: ScoreTip[];
  /** Open the photo library to add a highlight as soon as this shows (the + menu). */
  autoAdd?: boolean;
  /** Called once that has happened, so it doesn't happen again. */
  onAutoAdded?: () => void;
  /** Whose profile this is, for the top row of each card in the scroll view. */
  author?: MediaAuthor | null;
}

interface Picked {
  uri: string;
  isVideo: boolean;
  contentType: string;
  title: string;
  durationSeconds: number | null;
}

export function HighlightsTab({
  athleteId,
  isSelf,
  refreshKey = 0,
  onChanged,
  tips = [],
  autoAdd = false,
  onAutoAdded,
  author = null,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const toast = useToast();
  const t = useT();
  const [layout] = useProfileLayout();

  const media = useAsync(
    () => (athleteId ? getAthleteMedia(athleteId) : Promise.resolve([])),
    [athleteId, refreshKey],
    { enabled: !!athleteId, refetchOnFocus: true },
  );

  useViewCountUpdates((subject, id, count) => {
    if (subject !== 'highlight') return;
    media.mutate((rows) =>
      rows?.map((row) => (row.id === id && count > row.views_count ? { ...row, views_count: count } : row)) ??
      rows,
    );
  });

  const [picked, setPicked] = useState<Picked | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<AthleteMediaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AthleteMediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = useMemo(
    () =>
      (media.data ?? []).map((row) => {
        const known = knownViewCount('highlight', row.id);
        if (known == null || known <= row.views_count) return row;
        return { ...row, views_count: known };
      }),
    [media.data],
  );

  const pick = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('profile.photoPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
        videoMaxDuration: 90,
      });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      const durationSeconds = asset.duration ? Math.round(asset.duration / 1000) : null;
      if (
        isVideo &&
        durationSeconds &&
        durationSeconds > MAX_HIGHLIGHT_VIDEO_SECONDS
      ) {
        toast.error('Best of clips need to be 90 seconds or shorter.');
        return;
      }
      setPicked({
        uri: asset.uri,
        isVideo,
        contentType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        title: '',
        durationSeconds,
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [t, toast]);

  /* The + menu's Highlight bubble lands here: go straight to picking a clip. */
  useEffect(() => {
    if (!autoAdd || !isSelf) return;
    onAutoAdded?.();
    void pick();
    // Only when the request arrives, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd, isSelf]);

  const confirmUpload = useCallback(async () => {
    if (!picked || !athleteId) return;
    setUploading(true);
    try {
      await addAthleteMedia({
        athleteId,
        uri: picked.uri,
        title:
          picked.title.trim() || (picked.isVideo ? DEFAULT_VIDEO_TITLE : DEFAULT_IMAGE_TITLE),
        contentType: picked.contentType,
        isVideo: picked.isVideo,
        durationSeconds: picked.durationSeconds,
      });
      setPicked(null);
      toast.success(t('profile.clipAddedToast'));
      media.reload();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }, [athleteId, media, onChanged, picked, t, toast]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAthleteMedia(pendingDelete.id);
      setPendingDelete(null);
      toast.success(t('profile.clipRemovedToast'));
      media.reload();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [media, onChanged, pendingDelete, t, toast]);

  /* What a clip adds to the score, from the score's tips. */
  const clipPoints = tips.find((tip) => tip.key === 'add_highlights')?.points ?? null;

  const uploadSheet = (
    <HighlightSpotlight
      clip={picked}
      uploading={uploading}
      points={clipPoints}
      onChangeTitle={(text) => setPicked((current) => (current ? { ...current, title: text } : current))}
      onAdd={confirmUpload}
      onCancel={() => setPicked(null)}
    />
  );

  if (!athleteId) {
    return (
      <EmptyState
        compact
        title={t('profile.noHighlightsTitle')}
        body={t('profile.noHighlightsBody')}
      />
    );
  }

  if (media.loading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Skeleton height={104} radius={radii.md} style={{ flex: 1 }} />
        <Skeleton height={104} radius={radii.md} style={{ flex: 1 }} />
        <Skeleton height={104} radius={radii.md} style={{ flex: 1 }} />
      </View>
    );
  }
  if (media.error) return <ErrorState message={media.error} onRetry={media.reload} compact />;

  if (items.length === 0) {
    const clipTip = tips.find((tip) => tip.key === 'add_highlights') ?? null;
    return (
      <>
        {isSelf ? (
          /* Your own empty reel: three slots to fill, the first one lit. */
          <View
            style={{
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ gap: spacing.xs }}>
              <Text variant="heading" align="center">
                {t('profile.clipsEmptyTitleSelf')}
              </Text>
              <Text variant="caption" tone="muted" align="center">
                {t('profile.clipsEmptyBodySelf')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[1, 2, 3].map((slot) => {
                const lit = slot === 1;
                return (
                  <Pressable
                    key={slot}
                    onPress={pick}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.clipsEmptyAction')}
                    testID={`clip-slot-${slot}`}
                    style={({ pressed }) => ({
                      flex: 1,
                      aspectRatio: 0.78,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: lit ? colors.primary : colors.border,
                      backgroundColor: lit ? colors.primarySoft : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.xs,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    {lit ? (
                      <ImagePlus size={20} color={colors.primary} />
                    ) : (
                      <Play size={18} color={colors.textMuted} />
                    )}
                    <Text variant="number" color={lit ? colors.primary : colors.textMuted}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label={t('profile.clipsEmptyAction')} fullWidth onPress={pick} />
          </View>
        ) : (
          <EmptyState
            compact
            icon={<Clapperboard size={26} color={colors.textMuted} />}
            title={t('profile.clipsEmptyTitleOther')}
            body={t('profile.clipsEmptyBodyOther')}
          />
        )}
        {isSelf && clipTip ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginTop: spacing.sm,
            }}
          >
            <Text variant="caption" tone="muted">
              {t('profile.clipsWorthLead')}
            </Text>
            <PointsChip points={clipTip.points} label={t('score.tipPoints', { points: clipTip.points })} />
            <Text variant="caption" tone="muted">
              {t('profile.clipsWorthTail')}
            </Text>
          </View>
        ) : null}
        {isSelf ? (
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
            {t('profile.holdToRemoveClip')}
          </Text>
        ) : null}
        {isSelf ? uploadSheet : null}
      </>
    );
  }

  const tiles: MediaTile[] = items.map((item) => ({
    id: item.id,
    /* A clip with no preview picture shows as a dark video tile, not its video file. */
    uri:
      (item.media_type === 'video' || item.media_type === 'highlight_reel') && !item.thumbnail_url
        ? null
        : item.display_url,
    isVideo: item.media_type === 'video' || item.media_type === 'highlight_reel',
    caption: item.title,
    when: relativeTime(item.created_at),
    durationSeconds: item.duration_seconds,
    views: item.views_count,
  }));

  return (
    <View style={{ gap: spacing.md }}>
      {author?.name ? (
        /* "Best of <name>": whose best moments these are, with the count. */
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} testID="best-of-title">
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.alpha(theme.play.flame, theme.scheme === 'dark' ? 0.2 : 0.14),
            }}
          >
            <Star size={15} color={theme.play.flame} fill={theme.play.flame} />
          </View>
          <Text variant="subheading" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">
            {t('profile.bestOfNamed', { name: author.name })}
          </Text>
          <Text variant="caption" tone="muted">
            {t('profile.clipCount', { count: items.length })}
          </Text>
        </View>
      ) : null}
      <MediaGrid
        layout={layout}
        author={author}
        tiles={tiles}
        onAdd={isSelf ? pick : undefined}
        adding={uploading}
        addLabel={author?.name ? t('profile.addClip') : t('profile.addHighlight')}
        onPressTile={(id) => setPreview(items.find((item) => item.id === id) ?? null)}
        onLongPressTile={
          isSelf
            ? (id) => setPendingDelete(items.find((item) => item.id === id) ?? null)
            : undefined
        }
      />
      {isSelf ? (
        <Text variant="caption" tone="muted">
          {t('profile.holdToRemoveClip')}
        </Text>
      ) : null}

      {uploadSheet}

      <Sheet
        visible={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        subtitle={preview ? fullDate(preview.created_at) : undefined}
        scrollable={false}
      >
        {preview ? <MediaPreview item={preview} /> : null}
      </Sheet>

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={t('profile.removeClipTitle')}
        message={t('profile.removeClipBody')}
        confirmLabel={t('common.remove')}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

/** Mounted only while the preview sheet is open, so the player is created once. */
function MediaPreview({ item }: { item: AthleteMediaItem }) {
  const theme = useTheme();
  const t = useT();
  const isVideo = item.media_type === 'video' || item.media_type === 'highlight_reel';

  if (isVideo) {
    if (!item.video_url) {
      return (
        <Text variant="caption" tone="muted">
          {t('profile.mediaLoadFailed')}
        </Text>
      );
    }
    return <VideoPreview uri={item.video_url} mediaId={item.id} />;
  }

  if (!item.display_url) {
    return (
      <Text variant="caption" tone="muted">
        {t('profile.mediaLoadFailed')}
      </Text>
    );
  }

  return (
    <RemoteImage
      uri={item.display_url}
      style={{ width: '100%', height: 260, borderRadius: theme.radii.md }}
      placeholderColor={theme.colors.surfaceAlt}
      contentFit="contain"
    />
  );
}

function VideoPreview({ uri, mediaId }: { uri: string; mediaId: string }) {
  const theme = useTheme();
  const source = useCachedVideoSource(uri);
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    setPlaying(player.playing);
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      setPlaying(isPlaying);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      void recordHighlightView(mediaId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [playing, mediaId]);

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      style={{
        width: '100%',
        height: 240,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    />
  );
}
