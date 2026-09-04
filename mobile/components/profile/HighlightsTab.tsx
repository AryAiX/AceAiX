import React, { useCallback, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Input,
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
} from '@/lib/api.profile';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { useT } from '@/i18n';
import { MediaGrid, MediaTile } from './MediaGrid';

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
}

interface Picked {
  uri: string;
  isVideo: boolean;
  contentType: string;
  title: string;
  durationSeconds: number | null;
}

export function HighlightsTab({ athleteId, isSelf, refreshKey = 0, onChanged }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const toast = useToast();
  const t = useT();

  const media = useAsync(
    () => (athleteId ? getAthleteMedia(athleteId) : Promise.resolve([])),
    [athleteId, refreshKey],
    { enabled: !!athleteId },
  );

  const [picked, setPicked] = useState<Picked | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<AthleteMediaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AthleteMediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = useMemo(() => media.data ?? [], [media.data]);

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
      setPicked({
        uri: asset.uri,
        isVideo,
        contentType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        title: '',
        durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [t, toast]);

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

  const uploadSheet = (
    <Sheet
      visible={picked !== null}
      onClose={() => {
        if (!uploading) setPicked(null);
      }}
      title={t('profile.nameClipTitle')}
      subtitle={t('profile.nameClipSubtitle')}
      scrollable={false}
    >
      {picked && !picked.isVideo ? (
        <Image
          source={{ uri: picked.uri }}
          style={{
            width: '100%',
            height: 180,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            backgroundColor: colors.surfaceAlt,
          }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <Input
        label={t('profile.clipTitleLabel')}
        placeholder={t(
          picked?.isVideo
            ? 'profile.clipTitlePlaceholderVideo'
            : 'profile.clipTitlePlaceholderPhoto',
        )}
        value={picked?.title ?? ''}
        onChangeText={(text) =>
          setPicked((current) => (current ? { ...current, title: text } : current))
        }
        maxLength={80}
        returnKeyType="done"
      />

      <Button
        label={t('profile.addToProfile')}
        fullWidth
        loading={uploading}
        style={{ marginTop: spacing.xl }}
        onPress={confirmUpload}
      />
      <Button
        label={t('common.cancel')}
        variant="ghost"
        fullWidth
        disabled={uploading}
        style={{ marginTop: spacing.sm }}
        onPress={() => setPicked(null)}
      />
    </Sheet>
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
    return (
      <>
        <EmptyState
          compact
          icon={<Clapperboard size={26} color={colors.textMuted} />}
          title={t(isSelf ? 'profile.clipsEmptyTitleSelf' : 'profile.clipsEmptyTitleOther')}
          body={t(isSelf ? 'profile.clipsEmptyBodySelf' : 'profile.clipsEmptyBodyOther')}
          actionLabel={isSelf ? t('profile.clipsEmptyAction') : undefined}
          onAction={isSelf ? pick : undefined}
        />
        {isSelf ? uploadSheet : null}
      </>
    );
  }

  const tiles: MediaTile[] = items.map((item) => ({
    id: item.id,
    uri: item.display_url,
    isVideo: item.media_type === 'video' || item.media_type === 'highlight_reel',
    caption: item.title,
  }));

  return (
    <View style={{ gap: spacing.md }}>
      <MediaGrid
        tiles={tiles}
        onAdd={isSelf ? pick : undefined}
        adding={uploading}
        addLabel={t('profile.addHighlight')}
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

  if (!item.display_url) {
    return (
      <Text variant="caption" tone="muted">
        {t('profile.mediaLoadFailed')}
      </Text>
    );
  }

  return isVideo ? (
    <VideoPreview uri={item.display_url} />
  ) : (
    <Image
      source={{ uri: item.display_url }}
      style={{
        width: '100%',
        height: 260,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surfaceAlt,
      }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const theme = useTheme();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      allowsFullscreen
      style={{
        width: '100%',
        height: 240,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    />
  );
}
