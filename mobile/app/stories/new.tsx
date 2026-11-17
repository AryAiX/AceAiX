import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Camera, Check, Clock, Globe, ImagePlus, UserCheck, Users, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Brand } from '@/theme/tokens';
import { ChevronForward, Reveal, Tappable, Text, isRTL, useToast } from '@/components/ui';
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
  const { spacing, colors } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [tool, setTool] = useState<Tool>('text');

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
      /* A camera stop at 15s can come back as 15.0x seconds. */
      if (
        asset.type === 'video' &&
        asset.duration != null &&
        Number.isFinite(asset.duration) &&
        asset.duration > STORY_VIDEO_CAP_MS + 500
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

  /* The preview takes about a third of the screen, so every control fits
     below it without scrolling. */
  const previewHeight = Math.min(Math.round(screenHeight * 0.36), 320);
  const previewWidth = Math.round((previewHeight * 9) / 16);

  const tabs: { value: Tool; label: string }[] =
    mode === 'card'
      ? [
          { value: 'text', label: t('stories.tabText') },
          { value: 'colour', label: t('stories.tabColour') },
          { value: 'sticker', label: t('stories.tabSticker') },
          { value: 'who', label: t('stories.tabWho') },
        ]
      : [
          { value: 'photo', label: t('stories.tabPhoto') },
          { value: 'who', label: t('stories.tabWho') },
        ];
  const activeTool: Tool = tabs.some((x) => x.value === tool) ? tool : tabs[0].value;

  const card = { backgroundColor: colors.surface, ...theme.elevation(2) };
  const chipOn = { bg: colors.surfaceInverse, fg: colors.textInverse };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="story-composer">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top: close, Card / Photo, and the 24-hour note. On iOS this screen
            is a sheet that already sits below the status bar. */}
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm,
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 13,
              ...card,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <X size={17} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View
              accessibilityRole="tablist"
              style={{ flexDirection: 'row', padding: 3, borderRadius: 12, ...card }}
              testID="story-mode"
            >
              {modes.map((m) => {
                const on = mode === m.value;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => setMode(m.value)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 7,
                      borderRadius: 9,
                      backgroundColor: on ? chipOn.bg : 'transparent',
                    }}
                  >
                    <Text variant="captionStrong" color={on ? chipOn.fg : colors.textMuted} numberOfLines={1}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View
            accessible
            accessibilityLabel={t('stories.expiresNote')}
            style={{
              height: 38,
              paddingHorizontal: 10,
              borderRadius: 13,
              ...card,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={14} color={colors.text} />
            <Text variant="captionStrong">24h</Text>
          </View>
        </View>

        {/* ── The story itself ── */}
        <Reveal from="scale" key={mode}>
          <View
            style={{
              alignSelf: 'center',
              marginTop: spacing.md,
              width: previewWidth,
              height: previewHeight,
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: '#1E1A36',
              ...theme.elevation(3),
            }}
            accessibilityLabel={t('stories.preview')}
            testID="story-preview"
          >
            {mode === 'card' ? (
              <StoryCardView
                compact
                radius={22}
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
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: spacing.sm,
                      right: spacing.sm,
                      bottom: spacing.md,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: 'rgba(10,6,30,0.55)',
                    }}
                  >
                    <Text variant="caption" color="#FFFFFF" numberOfLines={3}>
                      {caption.trim()}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <Pressable
                onPress={pickLibrary}
                accessibilityRole="button"
                accessibilityLabel={t('stories.chooseLibrary')}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: '#7A6CFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.6 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ImagePlus size={26} color="#FFFFFF" />
                </View>
                <Text variant="caption" tone="secondary" align="center">
                  {t('stories.pickPhoto')}
                </Text>
              </Pressable>
            )}
          </View>
        </Reveal>

        {/* ── The tools: one card, four tabs, one set showing at a time ── */}
        <View
          style={{
            flex: 1,
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            borderRadius: 20,
            padding: 6,
            ...card,
          }}
        >
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: colors.surfaceAlt }}
          >
            {tabs.map((tab) => {
              const on = activeTool === tab.value;
              return (
                <Pressable
                  key={tab.value}
                  onPress={() => setTool(tab.value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  testID={`story-tool-${tab.value}`}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: on ? colors.surface : 'transparent',
                    ...(on ? theme.elevation(1) : null),
                  }}
                >
                  <Text variant="captionStrong" color={on ? colors.text : colors.textMuted} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.sm, paddingTop: spacing.md, gap: spacing.md }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTool === 'text' ? (
              <>
                <Field
                  label={t('stories.textLabel')}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('stories.textPlaceholder')}
                  maxLength={STORY_CARD_MAX}
                  multiline
                  counter={t('stories.charCount', { used: text.length, max: STORY_CARD_MAX })}
                  testID="story-text"
                />
                <Field
                  label={t('stories.statLabel')}
                  value={stat}
                  onChangeText={setStat}
                  placeholder={t('stories.statPlaceholder')}
                  maxLength={STORY_STAT_MAX}
                  testID="story-stat"
                />
              </>
            ) : null}

            {activeTool === 'colour' ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="muted">
                  {t('stories.background')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {CARD_BACKGROUNDS.map((key) => (
                    <Swatch
                      key={key}
                      colors={theme.gradients[key]}
                      selected={background === key}
                      label={t(BACKGROUND_LABELS[key])}
                      onPress={() => setBackground(key)}
                      ringColor={colors.text}
                      gapColor={colors.surface}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {activeTool === 'sticker' ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="muted">
                  {t('stories.sticker')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Pill label={t('stories.stickerNone')} on={sticker === null} onPress={() => setSticker(null)} />
                  {STICKERS.map((key) => (
                    <Pill
                      key={key}
                      label={t(STICKER_LABELS[key])}
                      on={sticker === key}
                      onPress={() => setSticker(key)}
                      icon={(color) => <StickerIcon sticker={key} size={14} color={color} />}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {activeTool === 'photo' ? (
              <>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <PickButton
                    label={t('stories.chooseLibrary')}
                    icon={(color) => <ImagePlus size={18} color={color} />}
                    onPress={pickLibrary}
                    disabled={posting}
                    testID="story-pick-library"
                  />
                  <PickButton
                    label={t('stories.useCamera')}
                    icon={(color) => <Camera size={18} color={color} />}
                    onPress={pickCamera}
                    disabled={posting}
                    testID="story-pick-camera"
                  />
                </View>
                <Field
                  label={t('stories.captionLabel')}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder={t('stories.captionPlaceholder')}
                  maxLength={STORY_CAPTION_MAX}
                  multiline
                  testID="story-caption"
                />
              </>
            ) : null}

            {activeTool === 'who' ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="muted">
                  {t('stories.audience')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {AUDIENCES.map((option) => (
                    <Pill
                      key={option.value}
                      label={t(option.labelKey)}
                      on={audience === option.value}
                      onPress={() => setAudience(option.value)}
                      icon={(color) => <AudienceIcon value={option.value} color={color} />}
                      testID={`story-audience-${option.value}`}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {/* One blue Share button. */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md }}>
          <Pressable
            onPress={post}
            disabled={!canPost}
            accessibilityRole="button"
            accessibilityLabel={t('stories.share')}
            accessibilityState={{ disabled: !canPost }}
            testID="story-share"
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 16,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              opacity: !canPost ? 0.45 : pressed ? 0.85 : 1,
              ...(canPost
                ? {
                    shadowColor: colors.primary,
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 4,
                  }
                : null),
            })}
          >
            {posting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text variant="bodyStrong" color="#FFFFFF">
                  {t('stories.share')}
                </Text>
                <ChevronForward size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type Tool = 'text' | 'colour' | 'sticker' | 'photo' | 'who';

/** A chip: solid when picked, a raised card when not. Follows light and dark. */
function Pill({
  label,
  on,
  onPress,
  icon,
  testID,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: (color: string) => React.ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const fg = on ? colors.textInverse : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: on ? colors.surfaceInverse : colors.surfaceAlt,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon ? icon(fg) : null}
      <Text variant="captionStrong" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

function PickButton({
  label,
  icon,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 50,
        borderRadius: 14,
        backgroundColor: colors.surfaceAlt,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 10,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {icon(colors.primary)}
      <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
  counter,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  counter?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ gap: 6 }}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: colors.surfaceAlt }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          maxLength={maxLength}
          multiline={multiline}
          accessibilityLabel={label}
          testID={testID}
          style={{
            padding: 0,
            color: colors.text,
            fontFamily: theme.font.semibold,
            fontSize: 15,
            minHeight: multiline ? 40 : undefined,
            maxHeight: 88,
            textAlignVertical: multiline ? 'top' : 'center',
            textAlign: isRTL ? 'right' : undefined,
          }}
        />
      </View>
      {counter ? (
        <Text variant="caption" tone="muted" align="right">
          {counter}
        </Text>
      ) : null}
    </View>
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
