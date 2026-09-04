import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Check,
  ChevronDown,
  Globe,
  ImagePlus,
  Play,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  Divider,
  Header,
  ListItem,
  Screen,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { createPost } from '@/lib/api';
import { uploadPostMedia, type PendingMedia } from '@/lib/api.feed';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import type { PostAudience, PostMedia } from '@/types/models';

/**
 * The composer.
 *
 * Nothing is written until "Post" is pressed: media goes up first so a failed
 * upload never leaves a caption-only post behind, and the modal only closes
 * once the row exists.
 */

const MAX_CHARS = 1000;
const COUNTER_FROM = 400;
const MAX_MEDIA = 4;

const AUDIENCES: {
  value: PostAudience;
  labelKey: string;
  detailKey: string;
  Icon: typeof Globe;
}[] = [
  {
    value: 'public',
    labelKey: 'feed.audienceEveryone',
    detailKey: 'feed.audienceEveryoneDetail',
    Icon: Globe,
  },
  {
    value: 'followers',
    labelKey: 'common.followers',
    detailKey: 'feed.audienceFollowersDetail',
    Icon: Users,
  },
  {
    value: 'connections',
    labelKey: 'feed.audienceConnections',
    detailKey: 'feed.audienceConnectionsDetail',
    Icon: UserCheck,
  },
];

export default function ComposeScreen() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [audience, setAudience] = useState<PostAudience>('public');
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const trimmed = text.trim();
  const hasContent = trimmed.length > 0 || media.length > 0;
  const canPost = hasContent && !posting;

  const selected = useMemo(
    () => AUDIENCES.find((a) => a.value === audience) ?? AUDIENCES[0],
    [audience],
  );

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.home);
  }, [router]);

  const requestClose = useCallback(() => {
    if (posting) return;
    if (hasContent) setDiscardOpen(true);
    else close();
  }, [posting, hasContent, close]);

  // Android's back gesture must not throw away a written post either.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (posting) return true;
      if (hasContent) {
        setDiscardOpen(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasContent, posting]);

  const pickMedia = useCallback(async () => {
    const remaining = MAX_MEDIA - media.length;
    if (remaining <= 0 || posting) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('feed.photoPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      videoMaxDuration: 180,
    });
    if (result.canceled) return;

    const picked: PendingMedia[] = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      type: asset.type === 'video' ? 'video' : 'photo',
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? null,
      fileSize: asset.fileSize ?? null,
    }));

    setMedia((current) => [...current, ...picked].slice(0, MAX_MEDIA));
  }, [media.length, posting, toast, t]);

  const removeMedia = useCallback((index: number) => {
    setMedia((current) => current.filter((_, i) => i !== index));
  }, []);

  const submit = useCallback(async () => {
    if (!canPost) return;
    setPosting(true);

    try {
      let uploaded: PostMedia[] = [];
      if (media.length > 0) {
        setProgress({ done: 0, total: media.length });
        uploaded = await uploadPostMedia(media, (done, total) =>
          setProgress({ done, total }),
        );
      }

      await createPost({ caption: trimmed, media: uploaded, audience });
      toast.success(t('feed.posted'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
      setProgress(null);
    }
  }, [canPost, media, trimmed, audience, toast, close, t]);

  const percent = progress && progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <Screen
      scroll
      padded={false}
      keyboardAvoiding
      edges={['top']}
      testID="compose-screen"
      header={
        <>
          <Header
            title={t('feed.composeTitle')}
            left={
              <Pressable
                onPress={requestClose}
                disabled={posting}
                accessibilityRole="button"
                accessibilityLabel={t('feed.cancelAndClose')}
                hitSlop={12}
                style={({ pressed }) => ({
                  minHeight: theme.hit.min,
                  justifyContent: 'center',
                  opacity: pressed || posting ? 0.5 : 1,
                })}
              >
                <Text variant="body" tone="secondary">
                  {t('common.cancel')}
                </Text>
              </Pressable>
            }
            right={
              <Button
                label={t('feed.postButton')}
                size="sm"
                loading={posting}
                disabled={!canPost}
                onPress={submit}
                testID="compose-submit"
              />
            }
          />

          {posting && progress ? (
            <View
              style={{
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.md,
                gap: spacing.xs,
              }}
              accessibilityLiveRegion="polite"
            >
              <View
                style={{
                  height: 4,
                  borderRadius: radii.pill,
                  backgroundColor: colors.surfaceSunken,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.round(percent * 100)}%`,
                    height: '100%',
                    backgroundColor: colors.primary,
                  }}
                />
              </View>
              <Text variant="caption" tone="muted">
                {t('feed.uploading', {
                  done: Math.min(progress.done + 1, progress.total),
                  total: progress.total,
                })}
              </Text>
            </View>
          ) : null}
          <Divider />
        </>
      }
      contentStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
    >
      <Pressable
        onPress={() => setAudienceOpen(true)}
        disabled={posting}
        accessibilityRole="button"
        accessibilityLabel={t('feed.audienceA11y', { audience: t(selected.labelKey) })}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 36,
          paddingHorizontal: spacing.md,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        })}
      >
        <selected.Icon size={15} color={colors.textSecondary} />
        <Text variant="captionStrong" tone="secondary">
          {t(selected.labelKey)}
        </Text>
        <ChevronDown size={15} color={colors.textMuted} />
      </Pressable>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('feed.composePlaceholder')}
        placeholderTextColor={colors.textMuted}
        multiline
        autoFocus
        maxLength={MAX_CHARS}
        editable={!posting}
        accessibilityLabel={t('feed.composeA11y')}
        testID="compose-text"
        style={{
          marginTop: spacing.lg,
          minHeight: 140,
          color: colors.text,
          fontFamily: theme.font.regular,
          fontSize: theme.size.lg,
          lineHeight: theme.size.lg * theme.lineHeight.normal,
          textAlignVertical: 'top',
          padding: 0,
          ...(({ outlineStyle: 'none' } as unknown) as object),
        }}
      />

      {text.length > COUNTER_FROM ? (
        <Text
          variant="caption"
          tone={text.length >= MAX_CHARS ? 'danger' : 'muted'}
          align="right"
          style={{ marginTop: spacing.xs }}
        >
          {t('feed.charCount', { used: text.length, max: MAX_CHARS })}
        </Text>
      ) : null}

      {media.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.lg }}
        >
          {media.map((item, index) => (
            <View key={`${item.uri}-${index}`}>
              {/* A picked video URI is not something <Image> can decode, so a
                  clip gets a labelled placeholder rather than a broken box. */}
              {item.type === 'video' ? (
                <View
                  accessible
                  accessibilityLabel={t('feed.selectedVideo', { index: index + 1 })}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSunken,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                  }}
                >
                  <Play size={20} color={colors.textSecondary} fill={colors.textSecondary} />
                  <Text variant="overline" tone="muted">
                    {t('feed.clip')}
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSunken,
                  }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={t('feed.selectedPhoto', { index: index + 1 })}
                />
              )}

              <Pressable
                onPress={() => removeMedia(index)}
                disabled={posting}
                accessibilityRole="button"
                accessibilityLabel={
                  item.type === 'video'
                    ? t('feed.removeVideo', { index: index + 1 })
                    : t('feed.removePhoto', { index: index + 1 })
                }
                hitSlop={12}
                style={({ pressed }) => ({
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 28,
                  height: 28,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceInverse,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <X size={15} color={colors.textInverse} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Pressable
        onPress={pickMedia}
        disabled={posting || media.length >= MAX_MEDIA}
        accessibilityRole="button"
        accessibilityLabel={t('feed.addMediaA11y')}
        accessibilityState={{ disabled: posting || media.length >= MAX_MEDIA }}
        testID="compose-add-media"
        style={({ pressed }) => ({
          marginTop: media.length > 0 ? 0 : spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: theme.hit.comfortable,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          opacity: media.length >= MAX_MEDIA ? 0.5 : 1,
        })}
      >
        <ImagePlus size={20} color={colors.primary} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {t('feed.addMedia')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('feed.mediaCount', { used: media.length, max: MAX_MEDIA })}
        </Text>
      </Pressable>

      <Text variant="caption" tone="muted" style={{ marginTop: spacing.lg }}>
        {t('feed.safetyNote')}
      </Text>

      <Sheet
        visible={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        title={t('feed.audienceSheetTitle')}
        scrollable={false}
      >
        {AUDIENCES.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={t(option.labelKey)}
              subtitle={t(option.detailKey)}
              left={<option.Icon size={20} color={colors.textSecondary} />}
              right={
                option.value === audience ? (
                  <Check size={20} color={colors.primary} />
                ) : undefined
              }
              onPress={() => {
                setAudience(option.value);
                setAudienceOpen(false);
              }}
            />
          </View>
        ))}
      </Sheet>

      <ConfirmSheet
        visible={discardOpen}
        title={t('feed.discardTitle')}
        message={t('feed.discardBody')}
        confirmLabel={t('feed.discard')}
        cancelLabel={t('feed.keepWriting')}
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          close();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </Screen>
  );
}
