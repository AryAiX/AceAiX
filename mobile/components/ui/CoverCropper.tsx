import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { Image, type ImageLoadEventData } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import {
  COVER_MAX_ZOOM,
  COVER_MIN_ZOOM,
  clampCoverOffset,
  clampCoverZoom,
  coverBaseScale,
  coverCropRect,
  coverFrameSize,
  resolvedCoverPixels,
  type CoverCropRect,
} from '@/lib/coverCrop';
import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Text } from './Text';

const THUMB = 28;

interface Props {
  visible: boolean;
  uri: string | null;
  /** Pixel size of the picture as it is shown. */
  width: number;
  height: number;
  onCancel: () => void;
  onConfirm: (crop: CoverCropRect) => void;
}

/**
 * Position a photo inside the profile cover's frame.
 *
 * The frame is COVER_ASPECT — the same shape the profile header draws — and
 * the picture always covers it. Drag moves it, pinch zooms from 1× (just
 * filled) to 3×. The crop surface is pinned to left-to-right: Arabic mirrors
 * the rest of the screen, and mirroring the pan would drag the photo the
 * opposite way from the finger.
 */
export function CoverCropper({ visible, uri, width, height, onCancel, onConfirm }: Props) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const insets = useSafeAreaInsets();

  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [pixels, setPixels] = useState({ width, height });
  const pixelsRef = useRef(pixels);
  const used = useRef(false);
  pixelsRef.current = pixels;
  const [zoomNow, setZoomNow] = useState(COVER_MIN_ZOOM);
  const [trackWidth, setTrackWidth] = useState(0);

  const zoom = useSharedValue(COVER_MIN_ZOOM);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const pinchStart = useSharedValue(COVER_MIN_ZOOM);
  const pinchOffsetX = useSharedValue(0);
  const pinchOffsetY = useSharedValue(0);
  const imageWidthSV = useSharedValue(width);
  const imageHeightSV = useSharedValue(height);
  const frameWidthSV = useSharedValue(0);
  const frameHeightSV = useSharedValue(0);
  const stageWidthSV = useSharedValue(0);
  const stageHeightSV = useSharedValue(0);
  const trackWidthSV = useSharedValue(0);

  const frame = coverFrameSize(stage.width, stage.height);
  imageWidthSV.value = pixels.width;
  imageHeightSV.value = pixels.height;
  frameWidthSV.value = frame.width;
  frameHeightSV.value = frame.height;
  stageWidthSV.value = stage.width;
  stageHeightSV.value = stage.height;
  trackWidthSV.value = trackWidth;

  useEffect(() => {
    if (!visible) return;
    used.current = false;
    setPixels({ width, height });
    setZoomNow(COVER_MIN_ZOOM);
    zoom.value = COVER_MIN_ZOOM;
    offsetX.value = 0;
    offsetY.value = 0;
  }, [visible, uri, width, height, zoom, offsetX, offsetY]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, visible]);

  const onLoad = useCallback(
    (event: ImageLoadEventData) => {
      const next = resolvedCoverPixels(
        { width, height },
        { width: event.source.width, height: event.source.height },
      );
      const current = pixelsRef.current;
      if (current.width === next.width && current.height === next.height) return;
      zoom.value = COVER_MIN_ZOOM;
      offsetX.value = 0;
      offsetY.value = 0;
      setZoomNow(COVER_MIN_ZOOM);
      setPixels(next);
    },
    [height, offsetX, offsetY, width, zoom],
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const z = clampCoverZoom(nextZoom);
      const clamped = clampCoverOffset(
        offsetX.value,
        offsetY.value,
        z,
        { width: imageWidthSV.value, height: imageHeightSV.value },
        { width: frameWidthSV.value, height: frameHeightSV.value },
      );
      zoom.value = z;
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
      setZoomNow(z);
    },
    [frameHeightSV, frameWidthSV, imageHeightSV, imageWidthSV, offsetX, offsetY, zoom],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(0)
        .onChange((e) => {
          const next = clampCoverOffset(
            offsetX.value + e.changeX,
            offsetY.value + e.changeY,
            zoom.value,
            { width: imageWidthSV.value, height: imageHeightSV.value },
            { width: frameWidthSV.value, height: frameHeightSV.value },
          );
          offsetX.value = next.x;
          offsetY.value = next.y;
        }),
    [frameHeightSV, frameWidthSV, imageHeightSV, imageWidthSV, offsetX, offsetY, zoom],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchStart.value = zoom.value;
          pinchOffsetX.value = offsetX.value;
          pinchOffsetY.value = offsetY.value;
        })
        .onUpdate((e) => {
          const nextZoom = clampCoverZoom(pinchStart.value * e.scale);
          const ratio = pinchStart.value === 0 ? 1 : nextZoom / pinchStart.value;
          const fx = e.focalX - stageWidthSV.value / 2;
          const fy = e.focalY - stageHeightSV.value / 2;
          const next = clampCoverOffset(
            fx - ratio * (fx - pinchOffsetX.value),
            fy - ratio * (fy - pinchOffsetY.value),
            nextZoom,
            { width: imageWidthSV.value, height: imageHeightSV.value },
            { width: frameWidthSV.value, height: frameHeightSV.value },
          );
          zoom.value = nextZoom;
          offsetX.value = next.x;
          offsetY.value = next.y;
        }),
    [
      frameHeightSV,
      frameWidthSV,
      imageHeightSV,
      imageWidthSV,
      offsetX,
      offsetY,
      pinchOffsetX,
      pinchOffsetY,
      pinchStart,
      stageHeightSV,
      stageWidthSV,
      zoom,
    ],
  );

  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const imageStyle = useAnimatedStyle(() => {
    const imageW = imageWidthSV.value;
    const imageH = imageHeightSV.value;
    const frameW = frameWidthSV.value;
    const frameH = frameHeightSV.value;
    const stageW = stageWidthSV.value;
    const stageH = stageHeightSV.value;
    const z = zoom.value;
    const base = coverBaseScale({ width: imageW, height: imageH }, { width: frameW, height: frameH });
    const dispW = imageW * base * z;
    const dispH = imageH * base * z;
    const frameLeft = (stageW - frameW) / 2;
    const frameTop = (stageH - frameH) / 2;
    return {
      position: 'absolute',
      width: dispW,
      height: dispH,
      left: frameLeft + (frameW - dispW) / 2 + offsetX.value,
      top: frameTop + (frameH - dispH) / 2 + offsetY.value,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const span = Math.max(0, trackWidthSV.value - THUMB);
    const t = (zoom.value - COVER_MIN_ZOOM) / (COVER_MAX_ZOOM - COVER_MIN_ZOOM);
    return { left: t * span };
  });

  const ready = pixels.width > 0 && pixels.height > 0 && frame.width > 1 && frame.height > 1;
  const frameLeft = (stage.width - frame.width) / 2;
  const frameTop = (stage.height - frame.height) / 2;

  const onUse = useCallback(() => {
    if (!ready || used.current) return;
    used.current = true;
    onConfirm(
      coverCropRect({
        imageWidth: pixels.width,
        imageHeight: pixels.height,
        frameWidth: frame.width,
        frameHeight: frame.height,
        scale: zoom.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      }),
    );
  }, [frame.height, frame.width, offsetX, offsetY, onConfirm, pixels.height, pixels.width, ready, zoom]);

  const setZoomFromX = useCallback(
    (x: number) => {
      const span = Math.max(1, trackWidth - THUMB);
      const t = Math.min(1, Math.max(0, (x - THUMB / 2) / span));
      applyZoom(COVER_MIN_ZOOM + t * (COVER_MAX_ZOOM - COVER_MIN_ZOOM));
    },
    [applyZoom, trackWidth],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <GestureHandlerRootView style={styles.root} testID="cover-cropper">
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            paddingTop: Math.max(insets.top, spacing.md),
            paddingBottom: Math.max(insets.bottom, spacing.md),
          }}
        >
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs }}>
            <Text variant="title" color="#FFFFFF" align="center" accessibilityRole="header">
              {t('profile.adjustCover')}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.78)" align="center">
              {t('profile.coverCropHint')}
            </Text>
          </View>

          <View style={{ flex: 1 }} onLayout={(e) => setStage(e.nativeEvent.layout)}>
            <GestureDetector gesture={gesture}>
              {/* direction ltr keeps the pan in finger-space when the app is Arabic. */}
              <View
                collapsable={false}
                style={[styles.stage, webDragStyle]}
              >
                {uri && pixels.width > 0 && pixels.height > 0 ? (
                  <Animated.View style={imageStyle}>
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="fill"
                      allowDownscaling={false}
                      pointerEvents="none"
                      accessibilityIgnoresInvertColors
                      onLoad={onLoad}
                    />
                  </Animated.View>
                ) : null}

                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, frameTop) }]} />
                  <View
                    style={[
                      styles.dim,
                      {
                        top: frameTop + frame.height,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.dim,
                      { top: frameTop, left: 0, width: Math.max(0, frameLeft), height: frame.height },
                    ]}
                  />
                  <View
                    style={[
                      styles.dim,
                      { top: frameTop, right: 0, width: Math.max(0, frameLeft), height: frame.height },
                    ]}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: frameTop,
                      left: frameLeft,
                      width: frame.width,
                      height: frame.height,
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  />
                </View>
              </View>
            </GestureDetector>
          </View>

          {Platform.OS === 'web' ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.xs }}>
              <Text variant="caption" color="rgba(255,255,255,0.78)">
                {t('profile.coverZoom')}
              </Text>
              {/* The track stays left-to-right so the low end of zoom does not swap in Arabic. */}
              <View
                accessibilityRole="adjustable"
                accessibilityLabel={t('profile.coverZoom')}
                accessibilityValue={{ min: COVER_MIN_ZOOM, max: COVER_MAX_ZOOM, now: zoomNow }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) => {
                  const step = event.nativeEvent.actionName === 'increment' ? 0.15 : -0.15;
                  applyZoom(zoom.value + step);
                }}
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => setZoomFromX(e.nativeEvent.locationX)}
                onResponderMove={(e) => setZoomFromX(e.nativeEvent.locationX)}
                style={{ height: 44, justifyContent: 'center', direction: 'ltr' }}
              >
                <View style={styles.track} />
                <Animated.View style={[styles.thumb, thumbStyle]} />
              </View>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
            }}
          >
            <Button
              label={t('common.cancel')}
              variant="secondary"
              fullWidth
              style={{ flex: 1 }}
              onPress={onCancel}
              testID="cover-crop-cancel"
            />
            <Button
              label={t('profile.useCoverPhoto')}
              fullWidth
              style={{ flex: 1 }}
              disabled={!ready}
              onPress={onUse}
              testID="cover-crop-use"
            />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** `touch-action: none` is what lets a mouse drag move the photo instead of the page. */
const webDragStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer', touchAction: 'none' } as unknown as ViewStyle)
    : {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06050E',
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    direction: 'ltr',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(6,5,14,0.62)',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    top: (44 - THUMB) / 2,
    left: 0,
  },
});
