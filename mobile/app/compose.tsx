import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, ImagePlus, Plus, Play, ShieldCheck, UserCheck, UserPlus, Users, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  ConfirmSheet,
  Divider,
  Header,
  Screen,
  Text,
  useToast,
  isRTL,
} from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { MentionInput } from '@/components/feed/MentionInput';
import { TagPeoplePicker } from '@/components/feed/TagPeoplePicker';
import { createPost, getMyTalentScore } from '@/lib/api';
import { setPostTags, type TaggedPerson } from '@/lib/api.postTags';
import { saveScoreSnapshot } from '@/lib/scoreSnapshots';
import { useAsync } from '@/hooks/useAsync';
import {
  MAX_POST_VIDEO_SECONDS,
  uploadPostMedia,
  type PendingMedia,
} from '@/lib/api.feed';
import { errorMessage } from '@/lib/errors';
import { mentionsForSubmit, type MentionSpan } from '@/lib/mentions';
import { firstName } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useProgress } from '@/providers/ProgressProvider';
import type { PostAudience, PostMedia } from '@/types/models';

/**
 * The composer.
 *
 * Nothing is written until "Post" is pressed: media goes up first so a failed
 * upload never leaves a caption-only post behind, and the modal only closes
 * once the row exists.
 */

const MAX_CHARS = 1000;
/** 0:24, 2:05: a picked clip's length on its preview. */
function clipLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
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
  const { check: checkAchievements } = useProgress();
  const t = useT();

  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<MentionSpan[]>([]);
  const [tagged, setTagged] = useState<TaggedPerson[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [audience, setAudience] = useState<PostAudience>('public');
  /* Which picked photo or clip the big preview shows. */
  const [shown, setShown] = useState(0);
  const { profile } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
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

  const current = Math.min(shown, Math.max(0, media.length - 1));
  const heroHeight = Math.round(Math.min(screenWidth - 32, 420) * 0.72);
  const postLabel =
    audience === 'public' ? t('feed.postButton') : t('feed.postTo', { audience: t(selected.labelKey) });

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

    const tooLong = result.assets.find(
      (asset) =>
        asset.type === 'video' &&
        asset.duration &&
        asset.duration / 1000 > MAX_POST_VIDEO_SECONDS,
    );
    if (tooLong) {
      toast.error('Videos need to be 3 minutes or shorter.');
      return;
    }

    const picked: PendingMedia[] = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      type: asset.type === 'video' ? 'video' : 'photo',
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? null,
      fileSize: asset.fileSize ?? null,
      durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
    }));

    setMedia((current) => [...current, ...picked].slice(0, MAX_MEDIA));
  }, [media.length, posting, toast, t]);

  const removeMedia = useCallback((index: number) => {
    setMedia((current) => current.filter((_, i) => i !== index));
    setShown((current) => (current >= index && current > 0 ? current - 1 : current));
  }, []);

  /* Your score right now, before this post can change it. */
  const scoreAtOpen = useAsync(() => getMyTalentScore().catch(() => null), []);

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

      const saved = mentionsForSubmit(text, mentions);
      const newId = await createPost({
        caption: saved.text,
        mentions: saved.mentions,
        media: uploaded,
        audience,
      });
      /* Keep the score you posted at (read when this screen opened, before
         the post could raise it), for "your score when you posted it". */
      void saveScoreSnapshot(newId, scoreAtOpen.data?.overall ?? null);
      if (tagged.length > 0) {
        try {
          await setPostTags(
            newId,
            tagged.map((person) => person.id),
          );
        } catch {
          toast.show({ message: t('feed.tagsNotSaved'), tone: 'warning' });
          close();
          checkAchievements();
          return;
        }
      }
      toast.success(t('feed.posted'));
      close();
      checkAchievements();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
      setProgress(null);
    }
  }, [canPost, media, text, mentions, tagged, audience, toast, close, t, checkAchievements, scoreAtOpen.data]);

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
      contentStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }}
      footer={
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
          <Button
            label={postLabel}
            variant="gradient"
            fullWidth
            loading={posting}
            disabled={!canPost}
            onPress={submit}
            testID="compose-submit"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ShieldCheck size={13} color={colors.textMuted} />
            <Text variant="caption" tone="muted" numberOfLines={2} style={{ flexShrink: 1 }}>
              {t('feed.safetyNote')}
            </Text>
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ gestureEnabled: !hasContent }} />

      {/* The photo or clip comes first: a big glowing drop zone, or the
          picked media shown large with the rest as thumbnails below. */}
      {media.length === 0 ? (
        <Pressable
          onPress={pickMedia}
          disabled={posting}
          accessibilityRole="button"
          accessibilityLabel={t('feed.addMediaA11y')}
          testID="compose-add-media"
          style={({ pressed }) => ({
            height: heroHeight,
            borderRadius: radii.xl,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: theme.alpha(colors.primary, 0.35),
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[theme.alpha(colors.primary, 0.1), theme.alpha('#7A6CFF', 0.08)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              ...theme.elevation(2),
            }}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.6 }}
              style={StyleSheet.absoluteFill}
            />
            <ImagePlus size={30} color={colors.textOnBrand} strokeWidth={2.2} />
          </View>
          <Text variant="subheading" style={{ marginTop: spacing.xs }}>
            {t('feed.addMedia')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('feed.addMediaHint', { max: MAX_MEDIA, minutes: Math.round(MAX_POST_VIDEO_SECONDS / 60) })}
          </Text>
          <View
            style={{
              marginTop: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.button,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: theme.alpha(colors.primary, 0.2),
            }}
          >
            <Text variant="captionStrong" tone="primary">
              {t('feed.photoLibrary')}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View>
          <View
            style={{
              height: heroHeight,
              borderRadius: radii.xl,
              overflow: 'hidden',
              backgroundColor: '#1E1A36',
              ...theme.elevation(2),
            }}
          >
            {media[current].type === 'video' ? (
              /* A picked clip can't be drawn as a picture, so it gets a dark
                 tile with play and its length. */
              <View
                accessible
                accessibilityLabel={t('feed.selectedVideo', { index: current + 1 })}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <Text variant="captionStrong" color="#FFFFFF">
                  {media[current].durationSeconds
                    ? clipLength(media[current].durationSeconds as number)
                    : t('feed.clip')}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: media[current].uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
                accessibilityLabel={t('feed.selectedPhoto', { index: current + 1 })}
              />
            )}
            {media.length > 1 ? (
              <View
                style={{
                  position: 'absolute',
                  top: spacing.md,
                  left: spacing.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 3,
                  borderRadius: radii.sm,
                  backgroundColor: 'rgba(15,12,30,0.6)',
                }}
              >
                <Text variant="captionStrong" color="#FFFFFF">
                  {t('feed.mediaOf', { current: current + 1, total: media.length })}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => removeMedia(current)}
              disabled={posting}
              accessibilityRole="button"
              accessibilityLabel={
                media[current].type === 'video'
                  ? t('feed.removeVideo', { index: current + 1 })
                  : t('feed.removePhoto', { index: current + 1 })
              }
              hitSlop={10}
              style={({ pressed }) => ({
                position: 'absolute',
                top: spacing.md,
                right: spacing.md,
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(15,12,30,0.6)',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={16} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md, paddingHorizontal: 3, paddingBottom: 3 }}
          >
            {media.map((item, index) => {
              const on = index === current;
              return (
                <Pressable
                  key={`${item.uri}-${index}`}
                  onPress={() => setShown(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={
                    item.type === 'video'
                      ? t('feed.selectedVideo', { index: index + 1 })
                      : t('feed.selectedPhoto', { index: index + 1 })
                  }
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    borderWidth: on ? 2.5 : 0,
                    borderColor: colors.primary,
                    padding: on ? 2 : 0,
                  }}
                >
                  {item.type === 'video' ? (
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 11,
                        backgroundColor: '#1E1A36',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: item.uri }}
                      style={{ flex: 1, borderRadius: on ? 10 : 14 }}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                    />
                  )}
                </Pressable>
              );
            })}
            {media.length < MAX_MEDIA ? (
              <Pressable
                onPress={pickMedia}
                disabled={posting}
                accessibilityRole="button"
                accessibilityLabel={t('feed.addMediaA11y')}
                testID="compose-add-media"
                style={({ pressed }) => ({
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: theme.alpha(colors.primary, 0.35),
                  backgroundColor: theme.alpha(colors.primary, 0.06),
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Plus size={22} color={colors.primary} />
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      )}

      {/* The caption, in its own card with your picture. */}
      <View
        style={{
          marginTop: spacing.lg,
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...theme.elevation(1),
        }}
      >
        <Avatar uri={profile?.avatar_url ?? null} name={profile?.full_name ?? null} size="sm" />
        <View style={{ flex: 1 }}>
          <MentionInput
            value={text}
            onChangeText={setText}
            onMentionsChange={setMentions}
            placeholder={t('feed.captionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_CHARS}
            editable={!posting}
            accessibilityLabel={t('feed.composeA11y')}
            testID="compose-text"
            style={{
              minHeight: 72,
              color: colors.text,
              fontFamily: theme.font.regular,
              fontSize: theme.size.md,
              lineHeight: theme.size.md * theme.lineHeight.normal,
              textAlignVertical: 'top',
              textAlign: isRTL ? 'right' : undefined,
              padding: 0,
            }}
          />
          <Text
            variant="caption"
            tone={text.length >= MAX_CHARS ? 'danger' : 'muted'}
            align="right"
            style={{ marginTop: spacing.xs }}
          >
            {t('feed.charCount', { used: text.length, max: MAX_CHARS })}
          </Text>
        </View>
      </View>

      {/* People attached to the post. Separate from an @mention in the caption. */}
      <View
        style={{
          marginTop: spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        {tagged.map((person) => {
          const name = firstName(person.full_name);
          return (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingStart: 4,
                paddingEnd: spacing.xs,
                paddingVertical: 4,
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceAlt,
                opacity: posting ? 0.5 : 1,
              }}
            >
              <Avatar uri={person.avatar_url} name={person.full_name} size="xs" />
              <Text variant="captionStrong" numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                onPress={() => setTagged((current) => current.filter((item) => item.id !== person.id))}
                disabled={posting}
                accessibilityRole="button"
                accessibilityLabel={t('feed.removeTag', { name })}
                hitSlop={8}
                testID={`compose-tag-remove-${person.id}`}
              >
                <X size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
          );
        })}
        <Pressable
          onPress={() => setTagOpen(true)}
          disabled={posting}
          accessibilityRole="button"
          accessibilityLabel={tagged.length > 0 ? t('feed.tagPeopleAdd') : t('feed.tagPeople')}
          testID="compose-tag-people"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 36,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radii.pill,
            backgroundColor: theme.alpha(colors.primary, 0.08),
            opacity: pressed || posting ? 0.5 : 1,
          })}
        >
          <UserPlus size={16} color={colors.primary} />
          <Text variant="captionStrong" tone="primary">
            {tagged.length > 0 ? t('feed.tagPeopleAdd') : t('feed.tagPeople')}
          </Text>
        </Pressable>
      </View>
      <TagPeoplePicker
        visible={tagOpen}
        people={tagged}
        onChange={setTagged}
        onClose={() => setTagOpen(false)}
        disabled={posting}
      />

      {/* Who can see it: three choices on screen instead of a hidden menu. */}
      <Text variant="overline" tone="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        {t('feed.audienceSheetTitle')}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', padding: 4, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt }}
      >
        {AUDIENCES.map((option) => {
          const on = option.value === audience;
          return (
            <Pressable
              key={option.value}
              onPress={() => setAudience(option.value)}
              disabled={posting}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${t(option.labelKey)}. ${t(option.detailKey)}`}
              testID={`compose-audience-${option.value}`}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 3,
                paddingVertical: spacing.sm + 2,
                borderRadius: radii.md,
                backgroundColor: on ? colors.surface : 'transparent',
                ...(on ? theme.elevation(1) : null),
              }}
            >
              <option.Icon size={17} color={on ? colors.primary : colors.textSecondary} />
              <Text variant="captionStrong" color={on ? colors.primary : colors.textSecondary} numberOfLines={1}>
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
        {t(selected.detailKey)}
      </Text>

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
