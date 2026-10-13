import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  I18nManager,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BadgeCheck, Eye, Trash2, Volume2, VolumeX, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Brand } from '@/theme/tokens';
import { Avatar, Button, ConfirmSheet, Loader, Text, useToast } from '@/components/ui';
import { StoryCardView } from '@/components/stories/StoryCardView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import {
  deleteStory,
  getStoryRail,
  getUserStories,
  markStoryViewed,
  type Story,
  type StoryRailEntry,
} from '@/lib/api.stories';
import { errorMessage } from '@/lib/errors';
import { displayName, relativeTime } from '@/lib/format';
import { Routes } from '@/lib/routes';
import {
  nextStory,
  parseQueue,
  previousStory,
  segmentFill,
  storyDurationMs,
  tapDirection,
  type StoryCursor,
  type StoryStep,
} from '@/lib/stories';
import { useAuth } from '@/providers/AuthProvider';

/**
 * The full-screen story viewer.
 *
 * Two cursors — which author, which of their stories. The route names the
 * author you tapped and carries the rail's order as `queue`, so finishing one
 * person's stories rolls straight into the next person's, the way the rail
 * promised by putting them side by side.
 *
 * Tap the right of the screen for the next story and the left for the one
 * before; press and hold anywhere to pause; swipe down or tap × to leave.
 */

/* The viewer is always dark, whatever the scheme: photos and cards are the
   light here. White type on it is the docs/20 exception for saturated or
   black surfaces. */
const INK = Brand.ink;
const ON_DARK = '#FFFFFF';
const ON_DARK_SOFT = 'rgba(255,255,255,0.72)';
const TRACK = 'rgba(255,255,255,0.32)';

interface Loaded {
  author: string;
  stories: Story[];
  error: string | null;
}

export default function StoryViewerScreen() {
  const theme = useTheme();
  const { spacing, radii } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId: string; queue?: string }>();

  const startId = String(params.userId ?? '');
  const queue = useMemo(() => parseQueue(params.queue, startId), [params.queue, startId]);

  const [cursor, setCursor] = useState<StoryCursor>(() => ({
    author: Math.max(0, queue.indexOf(startId)),
    story: 0,
  }));
  const authorId = queue[cursor.author] ?? startId;
  const isOwn = !!user && user.id === authorId;

  /* Names and avatars come from the rail — the one read that has them. */
  const [rail, setRail] = useState<StoryRailEntry[]>([]);
  useEffect(() => {
    let alive = true;
    getStoryRail(60)
      .then((rows) => alive && setRail(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const author = rail.find((r) => r.author_id === authorId) ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const stories = loaded?.author === authorId ? loaded.stories : null;
  const loadError = loaded?.author === authorId ? loaded.error : null;
  const story: Story | null = stories?.[cursor.story] ?? null;

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.home);
  }, [router]);

  const apply = useCallback(
    (step: StoryStep) => {
      if (step.type === 'close') close();
      else setCursor(step.cursor);
    },
    [close],
  );

  useEffect(() => {
    let alive = true;
    getUserStories(authorId)
      .then((rows) => {
        if (!alive) return;
        setLoaded({ author: authorId, stories: rows, error: null });
      })
      .catch((err) => {
        if (alive) setLoaded({ author: authorId, stories: [], error: errorMessage(err) });
      });
    return () => {
      alive = false;
    };
  }, [authorId]);

  /* Someone with nothing left to show (expired since the rail loaded, or all
     deleted) is skipped rather than shown as an empty screen. */
  useEffect(() => {
    if (!stories || loadError) return;
    if (stories.length === 0) {
      apply(nextStory({ author: cursor.author, story: 0 }, 0, queue.length));
    } else if (cursor.story >= stories.length) {
      setCursor({ author: cursor.author, story: stories.length - 1 });
    }
  }, [stories, loadError, cursor, queue.length, apply]);

  // ── Timing ────────────────────────────────────────────────────────────────
  const progress = useRef(new Animated.Value(0)).current;
  const progressNow = useRef(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressNow.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const [held, setHeld] = useState(false);
  /** Only a real hold hides the chrome; a tap should not make it blink. */
  const [hidden, setHidden] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [restart, setRestart] = useState(0);
  /** Which story has something on screen, and a video's real length. */
  const [ready, setReady] = useState<{ id: string; seconds: number | null } | null>(null);

  const isReady = !!story && (story.kind === 'card' || ready?.id === story.id);
  const duration = story
    ? storyDurationMs(story.kind, ready?.id === story.id ? ready.seconds : null)
    : 0;
  const paused = held || confirming || deleting;

  const goNext = useCallback(() => {
    apply(nextStory(cursor, stories?.length ?? 0, queue.length));
  }, [apply, cursor, stories?.length, queue.length]);

  const goPrevious = useCallback(() => {
    const step = previousStory(cursor);
    if (step.type === 'story' && step.cursor.story === cursor.story && step.cursor.author === cursor.author) {
      setRestart((n) => n + 1);
      return;
    }
    apply(step);
  }, [apply, cursor]);

  /* Held in a ref so the running animation's completion always advances from
     wherever the viewer is now, not from where it was when it started. */
  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  const storyId = story?.id ?? null;
  const onReady = useCallback(
    (seconds: number | null) => {
      if (storyId) setReady({ id: storyId, seconds });
    },
    [storyId],
  );

  useEffect(() => {
    progress.setValue(0);
    progressNow.current = 0;
  }, [storyId, restart, progress]);

  useEffect(() => {
    if (!storyId || !isReady || paused || duration <= 0) return;
    const remaining = Math.max(0, (1 - progressNow.current) * duration);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goNextRef.current();
    });
    return () => animation.stop();
  }, [storyId, isReady, paused, duration, restart, progress]);

  /* Seen the moment it is on screen. Your own never count. */
  useEffect(() => {
    if (!storyId || isOwn || !isReady) return;
    markStoryViewed(storyId).catch(() => {});
  }, [storyId, isOwn, isReady]);

  // ── Gestures ──────────────────────────────────────────────────────────────
  const drag = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(window.width);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          g.dy > 18 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
        onPanResponderGrant: () => setHeld(true),
        onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 120 || g.vy > 0.9) {
            close();
            return;
          }
          setHeld(false);
          Animated.spring(drag, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 6 }).start();
        },
        onPanResponderTerminate: () => {
          setHeld(false);
          Animated.spring(drag, { toValue: 0, useNativeDriver: false }).start();
        },
      }),
    [close, drag],
  );

  const onTap = (e: GestureResponderEvent) => {
    const direction = tapDirection(e.nativeEvent.locationX, width, I18nManager.isRTL);
    if (direction === 'back') goPrevious();
    else goNext();
  };

  const confirmDelete = async () => {
    if (!story || !stories) return;
    setDeleting(true);
    try {
      await deleteStory(story.id);
      toast.success(t('stories.deleted'));
      const rest = stories.filter((s) => s.id !== story.id);
      setLoaded({ author: authorId, stories: rest, error: null });
      setRestart((n) => n + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const name = displayName(author?.name ?? null);
  const segments = stories?.length ?? 0;

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: INK,
        transform: [{ translateY: drag }],
        opacity: drag.interpolate({ inputRange: [0, 400], outputRange: [1, 0.4], extrapolate: 'clamp' }),
        borderRadius: drag.interpolate({ inputRange: [0, 60], outputRange: [0, radii.xl], extrapolate: 'clamp' }),
        overflow: 'hidden',
      }}
      onLayout={onLayout}
      accessibilityLabel={t('stories.viewer')}
      testID="story-viewer"
      {...pan.panHandlers}
    >
      <StatusBar style="light" />

      {/* ── The story itself ── */}
      <View style={StyleSheet.absoluteFill}>
        {story ? (
          <StoryBody
            key={story.id}
            story={story}
            paused={paused}
            muted={muted}
            reduced={reduced}
            onReady={onReady}
          />
        ) : loadError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg }}>
            <Text variant="body" color={ON_DARK} align="center">
              {loadError}
            </Text>
            <Button label={t('common.close')} variant="secondary" onPress={close} />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Loader />
          </View>
        )}
      </View>

      {/* ── Tap zones: press-in pauses at once, a tap moves, a hold stays paused ── */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={() => setHeld(true)}
        onPressOut={() => {
          setHeld(false);
          setHidden(false);
        }}
        onPress={onTap}
        onLongPress={() => setHidden(true)}
        delayLongPress={220}
        accessibilityRole="button"
        accessibilityLabel={t('stories.next')}
        accessibilityHint={t('stories.holdHint')}
        testID="story-tap"
      />

      {/* ── Chrome: fades away while held, so the photo can be looked at ── */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          opacity: hidden ? 0 : 1,
        }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 + insets.top }}
          pointerEvents="none"
        />
        <View
          pointerEvents="box-none"
          style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.sm, gap: spacing.md }}
        >
          <View style={{ flexDirection: 'row', gap: 4 }} pointerEvents="none">
            {Array.from({ length: Math.max(segments, 1) }).map((_, i) => (
              <ProgressSegment key={i} index={i} current={cursor.story} progress={progress} />
            ))}
          </View>

          <View
            pointerEvents="box-none"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs }}
          >
            <Avatar uri={author?.avatar_url ?? null} name={name} size="sm" />
            <View style={{ flexShrink: 1 }} pointerEvents="none">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodyStrong" color={ON_DARK} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {name}
                </Text>
                {author?.is_verified ? <BadgeCheck size={15} color={theme.colors.info} /> : null}
                {story ? (
                  <Text variant="caption" color={ON_DARK_SOFT}>
                    {' · '}
                    {relativeTime(story.created_at)}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ flex: 1 }} />
            {story?.kind === 'video' ? (
              <ChromeButton
                label={muted ? t('feed.soundOn') : t('feed.soundOff')}
                onPress={() => setMuted((m) => !m)}
              >
                {muted ? <VolumeX size={20} color={ON_DARK} /> : <Volume2 size={20} color={ON_DARK} />}
              </ChromeButton>
            ) : null}
            <ChromeButton label={t('stories.close')} onPress={close} testID="story-close">
              <X size={24} color={ON_DARK} strokeWidth={2.4} />
            </ChromeButton>
          </View>
        </View>
      </View>

      {/* ── Caption, and for your own story: who saw it, and delete ── */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, opacity: hidden ? 0 : 1 }}
      >
        {story?.caption || isOwn ? (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}
        <View
          pointerEvents="box-none"
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xxxl,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          }}
        >
          {story?.caption ? (
            <Text variant="body" color={ON_DARK} align="center" pointerEvents="none">
              {story.caption}
            </Text>
          ) : null}
          {isOwn && story ? (
            <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                pointerEvents="none"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Eye size={18} color={ON_DARK} />
                <Text variant="captionStrong" color={ON_DARK} testID="story-seen-by">
                  {t('stories.seenBy', { count: story.view_count ?? 0 })}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <ChromeButton
                label={t('stories.delete')}
                onPress={() => setConfirming(true)}
                testID="story-delete"
              >
                <Trash2 size={20} color={ON_DARK} />
              </ChromeButton>
            </View>
          ) : null}
        </View>
      </View>

      <ConfirmSheet
        visible={confirming}
        title={t('stories.deleteTitle')}
        message={t('stories.deleteBody')}
        confirmLabel={t('stories.delete')}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </Animated.View>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ProgressSegment({
  index,
  current,
  progress,
}: {
  index: number;
  current: number;
  progress: Animated.Value;
}) {
  const fill =
    index === current
      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' })
      : (`${segmentFill(index, current, 0) * 100}%` as const);

  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: TRACK, overflow: 'hidden' }}>
      <Animated.View style={{ height: 3, borderRadius: 2, backgroundColor: ON_DARK, width: fill }} />
    </View>
  );
}

function ChromeButton({
  label,
  onPress,
  children,
  testID,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}

function StoryBody({
  story,
  paused,
  muted,
  reduced,
  onReady,
}: {
  story: Story;
  paused: boolean;
  muted: boolean;
  reduced: boolean;
  onReady: (seconds: number | null) => void;
}) {
  const t = useT();

  if (story.kind === 'card') {
    return <StoryCardView card={story.card} playKey={story.id} />;
  }
  if (story.kind === 'video' && story.media_url) {
    return <VideoStory uri={story.media_url} paused={paused} muted={muted} onReady={onReady} />;
  }
  return <PhotoStory uri={story.media_url} reduced={reduced} onReady={onReady} label={t('stories.photoStory')} />;
}

function PhotoStory({
  uri,
  reduced,
  onReady,
  label,
}: {
  uri: string | null;
  reduced: boolean;
  onReady: (seconds: number | null) => void;
  label: string;
}) {
  const zoom = useRef(new Animated.Value(reduced ? 1 : 1.06)).current;
  const readyOnce = useRef(false);

  const markReady = useCallback(() => {
    if (readyOnce.current) return;
    readyOnce.current = true;
    onReady(null);
    if (!reduced) {
      /* A slow settle, so a still photo is not a still screen. */
      Animated.timing(zoom, {
        toValue: 1,
        duration: 5000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [onReady, reduced, zoom]);

  /* A photo that never reports loading must not hold the viewer forever. */
  useEffect(() => {
    const timer = setTimeout(markReady, 3000);
    return () => clearTimeout(timer);
  }, [markReady]);

  if (!uri) return null;

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: zoom }] }}>
      <Image
        source={{ uri }}
        onLoad={markReady}
        onError={markReady}
        style={{ flex: 1 }}
        resizeMode="cover"
        accessibilityLabel={label}
      />
    </Animated.View>
  );
}

function VideoStory({
  uri,
  paused,
  muted,
  onReady,
}: {
  uri: string;
  paused: boolean;
  muted: boolean;
  onReady: (seconds: number | null) => void;
}) {
  const t = useT();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });
  const readyOnce = useRef(false);

  const safely = useCallback((fn: () => void) => {
    try {
      fn();
    } catch {
      /* released underneath us */
    }
  }, []);

  useEffect(() => {
    const report = () => {
      if (readyOnce.current) return;
      readyOnce.current = true;
      const seconds = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : null;
      onReady(seconds);
    };
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' || status === 'error') report();
    });
    const timer = setTimeout(report, 4000);
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [player, onReady]);

  useEffect(() => {
    safely(() => {
      player.muted = muted;
    });
  }, [muted, player, safely]);

  useEffect(() => {
    safely(() => {
      if (paused) player.pause();
      else player.play();
    });
  }, [paused, player, safely]);

  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      contentFit="cover"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
      accessibilityLabel={t('stories.videoStory')}
    />
  );
}
