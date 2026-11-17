import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Star, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme/tokens';
import { PointsChip, Text } from '@/components/ui';
import { useT } from '@/i18n';

/* The logo's fire: the frame's edge, the tag and the button. */
const FLAME = '#FF7A2C';
const FLAME_EDGE = '#FF9A4A';

export interface SpotlightClip {
  uri: string;
  isVideo: boolean;
  title: string;
  durationSeconds: number | null;
}

interface Props {
  clip: SpotlightClip | null;
  uploading: boolean;
  /** What a clip is worth, from the score's tips; null hides the chip. */
  points: number | null;
  onChangeTitle: (title: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

const QUICK_NAMES = [
  'profile.clipQuickTechnique',
  'profile.clipQuickMatch',
  'profile.clipQuickTraining',
  'profile.clipQuickBest',
] as const;

function clipLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Naming a new highlight: the clip on a raised card with a thin orange edge,
 * the title, quick name ideas, what it's worth to the score, and one orange
 * "Add to profile" button. Follows light and dark mode. Same upload as
 * before; only the look is new.
 */
export function HighlightSpotlight({ clip, uploading, points, onChangeTitle, onAdd, onCancel }: Props) {
  const theme = useTheme();
  const { spacing, radii, colors } = theme;
  const dark = theme.scheme === 'dark';
  const card = { backgroundColor: colors.surface, ...theme.elevation(2) };
  const t = useT();
  const insets = useSafeAreaInsets();
  const cancel = () => {
    if (!uploading) onCancel();
  };

  return (
    <Modal visible={clip !== null} animationType="slide" onRequestClose={cancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + spacing.md,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={cancel}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={10}
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
              <Text variant="bodyStrong" align="center" style={{ flex: 1 }} numberOfLines={1}>
                {t('profile.nameClipTitle')}
              </Text>
              <View style={{ width: 38 }} />
            </View>
            <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
              {t('profile.nameClipSubtitle')}
            </Text>

            {/* The clip on a raised card with a thin orange edge. */}
            <View
              style={{
                alignSelf: 'center',
                marginTop: spacing.lg,
                width: 196,
                height: 260,
                borderRadius: 22,
                padding: 5,
                borderWidth: 1.5,
                borderColor: FLAME_EDGE,
                ...card,
              }}
            >
              <View style={{ flex: 1, borderRadius: 17, overflow: 'hidden', backgroundColor: '#1E1A36' }}>
              {clip && !clip.isVideo ? (
                <Image source={{ uri: clip.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                </View>
              )}
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: FLAME,
                }}
              >
                <Text variant="overline" color="#FFFFFF" style={{ fontSize: 10 }}>
                  {t('profile.highlightTag')}
                </Text>
              </View>
              {clip?.isVideo && clip.durationSeconds ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: 'rgba(10,6,30,0.6)',
                  }}
                >
                  <Text variant="captionStrong" color="#FFFFFF">
                    {clipLength(clip.durationSeconds)}
                  </Text>
                </View>
              ) : null}
              </View>
            </View>

            {/* The name. */}
            <View
              style={{
                marginTop: spacing.xl,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                borderColor: FLAME_EDGE,
                ...card,
              }}
            >
              <Text variant="overline" tone="muted">
                {t('profile.clipTitleLabel')}
              </Text>
              <TextInput
                value={clip?.title ?? ''}
                onChangeText={onChangeTitle}
                placeholder={t(
                  clip?.isVideo ? 'profile.clipTitlePlaceholderVideo' : 'profile.clipTitlePlaceholderPhoto',
                )}
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                returnKeyType="done"
                editable={!uploading}
                accessibilityLabel={t('profile.clipTitleLabel')}
                style={{
                  marginTop: 2,
                  padding: 0,
                  color: colors.text,
                  fontFamily: theme.font.semibold,
                  fontSize: 17,
                }}
                testID="highlight-title"
              />
            </View>

            {/* Quick name ideas. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {QUICK_NAMES.map((key) => {
                const label = t(key);
                const on = clip?.title === label;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onChangeTitle(label)}
                    disabled={uploading}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => ({
                      paddingHorizontal: spacing.md,
                      paddingVertical: 7,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: on ? FLAME_EDGE : 'transparent',
                      ...(on ? { backgroundColor: alpha(FLAME, 0.12) } : card),
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text variant="captionStrong" color={on ? (dark ? '#FFB37A' : '#D9560F') : colors.textSecondary}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {points != null && points > 0 ? (
              <View
                style={{
                  marginTop: spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  backgroundColor: alpha(colors.success, 0.1),
                }}
              >
                <PointsChip points={points} label={t('score.tipPoints', { points })} />
                <Text variant="caption" color={colors.success} style={{ flex: 1 }}>
                  {t('profile.clipPointsHint')}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* One warm button, and a quiet Cancel. */}
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
            <Pressable
              onPress={onAdd}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={t('profile.addToProfile')}
              testID="highlight-add"
              style={({ pressed }) => ({
                height: 54,
                borderRadius: 16,
                backgroundColor: FLAME,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                opacity: pressed || uploading ? 0.85 : 1,
                shadowColor: FLAME,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 4,
              })}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Star size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text variant="bodyStrong" color="#FFFFFF">
                    {t('profile.addToProfile')}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={cancel}
              disabled={uploading}
              accessibilityRole="button"
              style={({ pressed }) => ({ alignItems: 'center', paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 })}
            >
              <Text variant="bodyStrong" tone="muted">
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
