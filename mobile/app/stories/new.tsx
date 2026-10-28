import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Camera, Check, Globe, ImagePlus, UserCheck, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Brand } from '@/theme/tokens';
import {
  Button,
  Chip,
  Header,
  Input,
  Reveal,
  Screen,
  SegmentedControl,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { StickerIcon, StoryCardView } from '@/components/stories/StoryCardView';
import { useT } from '@/i18n';
import {
  createStory,
  discardStoryUpload,
  uploadStoryMedia,
  type PendingStoryMedia,
} from '@/lib/api.stories';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import {
  CARD_BACKGROUNDS,
  STICKERS,
  STORY_CAPTION_MAX,
  STORY_CARD_MAX,
  STORY_STAT_MAX,
  STORY_VIDEO_CAP_MS,
  type CardBackground,
  type StickerKey,
} from '@/lib/stories';
import type { PostAudience } from '@/types/models';

/**
 * Make a story.
 *
 * Two ways in. A card needs nothing but a sentence — pick a background, a
 * sticker and, if there is one, the number that matters — and is how most
 * results and PBs will be posted. A photo or a short video is a clip with a
 * caption. Both show exactly what will appear before it goes up.
 */

type Mode = 'card' | 'media';

const BACKGROUND_LABELS: Record<CardBackground, string> = {
  hero: 'stories.bgHero',
  action: 'stories.bgAction',
  cool: 'stories.bgCool',
  warm: 'stories.bgWarm',
  party: 'stories.bgParty',
  score: 'stories.bgScore',
};

const STICKER_LABELS: Record<StickerKey, string> = {
  goal: 'stories.stickerGoal',
  trial: 'stories.stickerTrial',
  pb: 'stories.stickerPb',
  gameiq: 'stories.stickerGameiq',
  star: 'stories.stickerStar',
};

const AUDIENCES: { value: PostAudience; labelKey: string }[] = [
  { value: 'public', labelKey: 'stories.audiencePublic' },
  { value: 'followers', labelKey: 'stories.audienceFollowers' },
  { value: 'connections', labelKey: 'stories.audienceConnections' },
];

export default function NewStoryScreen() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  const [mode, setMode] = useState<Mode>('card');
  const [text, setText] = useState('');
  const [background, setBackground] = useState<CardBackground>('action');
  const [sticker, setSticker] = useState<StickerKey | null>('goal');
  const [stat, setStat] = useState('');
  const [picked, setPicked] = useState<PendingStoryMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<PostAudience>('followers');
  const [posting, setPosting] = useState(false);

  const trimmed = text.trim();
  const canPost = !posting && (mode === 'card' ? trimmed.length > 0 : !!picked);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.home);
  }, [router]);

  const acceptAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset) => {
      if (
        asset.type === 'video' &&
        asset.duration != null &&
        Number.isFinite(asset.duration) &&
        asset.duration > STORY_VIDEO_CAP_MS
      ) {
        toast.error(t('stories.videoTooLong'));
        return;
      }
      setPicked({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'photo',
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
        width: asset.width,
        height: asset.height,
      });
    },
    [t, toast],
  );

  const pickFrom = useCallback(
    async (source: 'library' | 'camera') => {
      if (posting) return;
      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            toast.error(t('stories.cameraPermission'));
            return;
          }
        } else {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            toast.error(t('stories.photoPermission'));
            return;
          }
        }
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images', 'videos'],
          allowsMultipleSelection: false,
          quality: 0.85,
          videoMaxDuration: STORY_VIDEO_CAP_MS / 1000,
        };
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled || !result.assets?.[0]) return;
        acceptAsset(result.assets[0]);
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [acceptAsset, posting, t, toast],
  );

  const pickLibrary = useCallback(() => pickFrom('library'), [pickFrom]);
  const pickCamera = useCallback(() => pickFrom('camera'), [pickFrom]);

  const post = useCallback(async () => {
    if (mode === 'card' && !trimmed) {
      toast.error(t('stories.needText'));
      return;
    }
    if (mode === 'media' && !picked) {
      toast.error(t('stories.needPhoto'));
      return;
    }
    setPosting(true);
    let uploaded: string | null = null;
    try {
      if (mode === 'card') {
        await createStory({
          kind: 'card',
          card: { text: trimmed, background, sticker: sticker ?? '', stat: stat.trim() },
          audience,
        });
      } else if (picked) {
        uploaded = await uploadStoryMedia(picked);
        await createStory({
          kind: picked.type === 'video' ? 'video' : 'photo',
          mediaUrl: uploaded,
          caption,
          audience,
        });
      }
      toast.success(t('stories.posted'));
      close();
    } catch (err) {
      if (uploaded) await discardStoryUpload(uploaded);
      toast.error(errorMessage(err));
      setPosting(false);
    }
  }, [mode, trimmed, picked, background, sticker, stat, caption, audience, toast, t, close]);

  const modes: { value: Mode; label: string }[] = [
    { value: 'card', label: t('stories.modeCard') },
    { value: 'media', label: t('stories.modePhoto') },
  ];

  return (
    <Screen
      scroll={false}
      padded={false}
      edges={['top', 'bottom']}
      keyboardAvoiding
      header={<Header title={t('stories.composerTitle')} back onBack={close} bordered />}
      testID="story-composer"
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.giant }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl options={modes} value={mode} onChange={setMode} testID="story-mode" />

        {/* ── Live preview ── */}
        <Reveal from="scale" key={mode}>
          <View
            style={{
              alignSelf: 'center',
              width: 220,
              aspectRatio: 9 / 16,
              borderRadius: radii.xl,
              overflow: 'hidden',
              backgroundColor: colors.surfaceSunken,
              ...theme.elevation(3),
            }}
            accessibilityLabel={t('stories.preview')}
            testID="story-preview"
          >
            {mode === 'card' ? (
              <StoryCardView
                compact
                radius={radii.xl}
                playKey={`${background}-${sticker ?? ''}`}
                card={{
                  text: trimmed || t('stories.textPlaceholder'),
                  background,
                  sticker: sticker ?? '',
                  stat: stat.trim(),
                }}
              />
            ) : picked ? (
              <Pressable
                onPress={pickLibrary}
                accessibilityRole="button"
                accessibilityLabel={t('stories.changePhoto')}
                style={{ flex: 1, backgroundColor: Brand.ink }}
              >
                {picked.type === 'video' ? (
                  <StoryVideoPreview uri={picked.uri} />
                ) : (
                  <>
                    <Image
                      source={{ uri: picked.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      blurRadius={30}
                      accessible={false}
                    />
                    <View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
                    />
                    <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                  </>
                )}
                {caption.trim() ? (
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={{ padding: spacing.md, paddingTop: spacing.xl }}>
                      <Text variant="caption" color="#FFFFFF" align="center" numberOfLines={3}>
                        {caption.trim()}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LinearGradient
                    colors={theme.gradients.cool}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View>
                    <ImagePlus size={28} color={colors.textOnBrand} />
                  </View>
                </View>
                <Text variant="captionStrong" tone="secondary" align="center">
                  {t('stories.pickPhoto')}
                </Text>
              </View>
            )}
          </View>
        </Reveal>

        {mode === 'card' ? (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" tone="muted">
                {t('stories.background')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                {CARD_BACKGROUNDS.map((key) => (
                  <Swatch
                    key={key}
                    colors={theme.gradients[key]}
                    selected={background === key}
                    label={t(BACKGROUND_LABELS[key])}
                    onPress={() => setBackground(key)}
                    ringColor={colors.text}
                    gapColor={colors.bg}
                  />
                ))}
              </View>
            </View>

            <Input
              label={t('stories.textLabel')}
              value={text}
              onChangeText={setText}
              placeholder={t('stories.textPlaceholder')}
              multiline
              maxLength={STORY_CARD_MAX}
              hint={t('stories.charCount', { used: text.length, max: STORY_CARD_MAX })}
              testID="story-text"
            />

            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" tone="muted">
                {t('stories.sticker')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <Chip
                  label={t('stories.stickerNone')}
                  selected={sticker === null}
                  onPress={() => setSticker(null)}
                />
                {STICKERS.map((key) => (
                  <Chip
                    key={key}
                    label={t(STICKER_LABELS[key])}
                    selected={sticker === key}
                    onPress={() => setSticker(key)}
                    icon={
                      <StickerIcon
                        sticker={key}
                        size={15}
                        color={sticker === key ? colors.textOnBrand : colors.textSecondary}
                      />
                    }
                  />
                ))}
              </View>
            </View>

            <Input
              label={t('stories.statLabel')}
              value={stat}
              onChangeText={setStat}
              placeholder={t('stories.statPlaceholder')}
              maxLength={STORY_STAT_MAX}
              testID="story-stat"
            />
          </>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t('stories.chooseLibrary')}
                variant="secondary"
                icon={<ImagePlus size={18} color={colors.text} />}
                onPress={pickLibrary}
                disabled={posting}
                fullWidth
                testID="story-pick-library"
              />
              <Button
                label={t('stories.useCamera')}
                variant="secondary"
                icon={<Camera size={18} color={colors.text} />}
                onPress={pickCamera}
                disabled={posting}
                fullWidth
                testID="story-pick-camera"
              />
            </View>
            <Input
              label={t('stories.captionLabel')}
              value={caption}
              onChangeText={setCaption}
              placeholder={t('stories.captionPlaceholder')}
              maxLength={STORY_CAPTION_MAX}
              multiline
              testID="story-caption"
            />
          </>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="muted">
            {t('stories.audience')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {AUDIENCES.map((option) => (
              <Chip
                key={option.value}
                label={t(option.labelKey)}
                selected={audience === option.value}
                onPress={() => setAudience(option.value)}
                icon={
                  <AudienceIcon
                    value={option.value}
                    color={audience === option.value ? colors.textOnBrand : colors.textSecondary}
                  />
                }
                testID={`story-audience-${option.value}`}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {t('stories.expiresNote')}
          </Text>
        </View>

        <Button
          label={t('stories.share')}
          onPress={post}
          loading={posting}
          disabled={!canPost}
          fullWidth
          size="lg"
          testID="story-share"
        />
      </ScrollView>
    </Screen>
  );
}

/** Muted, looping, shown whole on the same dark ground the viewer uses. */
function StoryVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      /* released underneath us */
    }
    return () => {
      try {
        player.pause();
      } catch {
        /* already gone */
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
      pointerEvents="none"
    />
  );
}

function AudienceIcon({ value, color }: { value: PostAudience; color: string }) {
  if (value === 'public') return <Globe size={15} color={color} />;
  if (value === 'followers') return <Users size={15} color={color} />;
  return <UserCheck size={15} color={color} />;
}

function Swatch({
  colors,
  selected,
  label,
  onPress,
  ringColor,
  gapColor,
}: {
  colors: readonly [string, string, ...string[]];
  selected: boolean;
  label: string;
  onPress: () => void;
  ringColor: string;
  gapColor: string;
}) {
  return (
    <Tappable
      onPress={onPress}
      scaleTo={0.86}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: selected ? ringColor : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: gapColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {selected ? (
          <View>
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </Tappable>
  );
}
