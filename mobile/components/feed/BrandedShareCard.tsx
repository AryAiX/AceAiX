import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useT } from '@/i18n';
import {
  setBrandedRenderer,
  type BrandedCardSpec,
  type BrandedKind,
} from '@/lib/brandedShare';

/**
 * The share image, drawn the same way as the player card: react-native-svg
 * text with fontWeight, then `toDataURL` into a PNG. No custom fontFamily —
 * the player card does not set one either.
 *
 * Mounted off-screen only while an export is in flight.
 */

export const STORY_W = 1080;
export const STORY_H = 1920;
export const POST_W = 1080;
export const POST_H = 1350;

const INK = '#14161A';
const ORANGE = '#FF5A1F';

interface CardProps extends BrandedCardSpec {
  svgRef: React.Ref<Svg>;
}

export function BrandedShareCard({
  kind,
  photoBase64,
  logoBase64,
  isVideo,
  name,
  sport,
  svgRef,
}: CardProps) {
  const t = useT();
  const width = kind === 'story' ? STORY_W : POST_W;
  const height = kind === 'story' ? STORY_H : POST_H;
  const photo = `data:image/jpeg;base64,${photoBase64}`;
  const logo = `data:image/png;base64,${logoBase64}`;
  const shownName = clip(name, 28);
  const shownSport = clip(sport, 32);

  return (
    <Svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {kind === 'story' ? (
        <StoryCard
          photo={photo}
          logo={logo}
          isVideo={isVideo}
          name={shownName}
          sport={shownSport}
          findMe={t('feed.findMeOnAceAiX')}
          watch={t('feed.watchFullClip')}
        />
      ) : (
        <PostCard
          photo={photo}
          logo={logo}
          isVideo={isVideo}
          name={shownName}
          sport={shownSport}
          watch={t('feed.watchFullClip')}
        />
      )}
    </Svg>
  );
}

function StoryCard({
  photo,
  logo,
  isVideo,
  name,
  sport,
  findMe,
  watch,
}: {
  photo: string;
  logo: string;
  isVideo: boolean;
  name: string;
  sport: string;
  findMe: string;
  watch: string;
}) {
  const frame = { x: 64, y: 120, w: 952, h: 1280 };
  return (
    <>
      <Defs>
        <SvgGradient id="storyGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ORANGE} stopOpacity="0.55" />
          <Stop offset="1" stopColor={ORANGE} stopOpacity="0" />
        </SvgGradient>
        <ClipPath id="storyFrame">
          <Rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx="56" ry="56" />
        </ClipPath>
      </Defs>
      <Rect x="0" y="0" width={STORY_W} height={STORY_H} fill={INK} />
      <Rect x="0" y="0" width={STORY_W} height="780" fill="url(#storyGlow)" />
      <Circle cx="860" cy="180" r="280" fill={ORANGE} opacity="0.16" />
      <G clipPath="url(#storyFrame)">
        <SvgImage
          x={frame.x}
          y={frame.y}
          width={frame.w}
          height={frame.h}
          href={photo}
          preserveAspectRatio="xMidYMid slice"
        />
      </G>
      {isVideo ? (
        <PlayMark cx={frame.x + frame.w / 2} cy={frame.y + frame.h / 2} label={watch} />
      ) : null}
      <Rect x="64" y="1480" width="952" height="340" rx="40" ry="40" fill="#FFFFFF" />
      <SvgImage x="104" y="1524" width="96" height="96" href={logo} preserveAspectRatio="xMidYMid meet" />
      <SvgText x="224" y="1572" fill={INK} fontSize="48" fontWeight="800">
        {name}
      </SvgText>
      {sport ? (
        <SvgText x="224" y="1624" fill="#514C6B" fontSize="34">
          {sport}
        </SvgText>
      ) : null}
      <SvgText x="104" y="1748" fill={ORANGE} fontSize="40" fontWeight="800">
        {findMe}
      </SvgText>
    </>
  );
}

function PostCard({
  photo,
  logo,
  isVideo,
  name,
  sport,
  watch,
}: {
  photo: string;
  logo: string;
  isVideo: boolean;
  name: string;
  sport: string;
  watch: string;
}) {
  const line = sport ? `${name} · ${sport}` : name;
  return (
    <>
      <Defs>
        <SvgGradient id="postBand" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={INK} stopOpacity="0" />
          <Stop offset="0.45" stopColor={INK} stopOpacity="0.55" />
          <Stop offset="1" stopColor={INK} stopOpacity="0.94" />
        </SvgGradient>
      </Defs>
      <SvgImage
        x="0"
        y="0"
        width={POST_W}
        height={POST_H}
        href={photo}
        preserveAspectRatio="xMidYMid slice"
      />
      {isVideo ? <PlayMark cx={POST_W / 2} cy={560} label={watch} /> : null}
      <Rect x="0" y="960" width={POST_W} height="390" fill="url(#postBand)" />
      <SvgImage x="72" y="1124" width="80" height="80" href={logo} preserveAspectRatio="xMidYMid meet" />
      <SvgText x="176" y="1176" fill="#FFFFFF" fontSize="44" fontWeight="800">
        {clip(line, 36)}
      </SvgText>
      <SvgText x="72" y="1284" fill={ORANGE} fontSize="42" fontWeight="800">
        AceAiX
      </SvgText>
    </>
  );
}

function PlayMark({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  const textW = Math.min(820, Math.max(360, label.length * 22));
  return (
    <>
      <Circle cx={cx} cy={cy} r="96" fill={INK} opacity="0.45" />
      <Path
        d={`M ${cx - 26} ${cy - 40} L ${cx + 46} ${cy} L ${cx - 26} ${cy + 40} Z`}
        fill="#FFFFFF"
      />
      <Rect
        x={cx - textW / 2}
        y={cy + 124}
        width={textW}
        height="72"
        rx="36"
        ry="36"
        fill={INK}
        opacity="0.55"
      />
      <SvgText
        x={cx}
        y={cy + 172}
        fill="#FFFFFF"
        fontSize="32"
        fontWeight="700"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </>
  );
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Sits off to the left of the card that is exporting, long enough for
 * `toDataURL` to read the SVG, and registers the renderer `buildBrandedImage`
 * calls.
 */
export function OffscreenBrandedCard() {
  const svgRef = useRef<Svg>(null);
  const [spec, setSpec] = useState<BrandedCardSpec | null>(null);
  const pending = useRef<{
    resolve: (png: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    setBrandedRenderer(
      (next) =>
        new Promise<string>((resolve, reject) => {
          pending.current = { resolve, reject };
          setSpec(next);
        }),
    );
    return () => setBrandedRenderer(null);
  }, []);

  useEffect(() => {
    if (!spec || !pending.current) return;
    const waiter = pending.current;
    let cancel = false;
    const timer = setTimeout(() => {
      void rasterize(svgRef.current, spec.kind)
        .then((png) => {
          if (!cancel) waiter.resolve(png);
        })
        .catch((error: unknown) => {
          if (!cancel) waiter.reject(error instanceof Error ? error : new Error(String(error)));
        });
    }, 450);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [spec]);

  if (!spec) return null;

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: -4000, top: 0, opacity: 0 }}
    >
      <BrandedShareCard {...spec} svgRef={svgRef} />
    </View>
  );
}

async function rasterize(ref: Svg | null, kind: BrandedKind): Promise<string> {
  const width = kind === 'story' ? STORY_W : POST_W;
  const height = kind === 'story' ? STORY_H : POST_H;
  const node = ref as unknown as {
    toDataURL?: (cb: (value: string) => void, options?: object) => void;
    tagName?: string;
  } | null;

  if (Platform.OS === 'web') {
    const blob = await webPng(node as unknown as SVGSVGElement | null, width, height);
    return blobToBase64(blob);
  }

  if (!node?.toDataURL) throw new Error('Share card could not be read');
  const value = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 8000);
    node.toDataURL!((data) => {
      clearTimeout(timeout);
      resolve(data);
    }, { width, height });
  });
  const raw = value.replace(/^data:image\/\w+;base64,/, '');
  if (!raw) throw new Error('Share card was empty');
  return raw;
}

/** Same browser path the player card uses when there is no native SVG view. */
async function webPng(ref: SVGSVGElement | null, width: number, height: number): Promise<Blob> {
  if (!ref || ref.tagName?.toLowerCase() !== 'svg') {
    throw new Error('Share card SVG is unavailable');
  }
  const source = new XMLSerializer().serializeToString(ref);
  const sourceUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Share card SVG could not be rendered'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Share card PNG could not be created');
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:image\/\w+;base64,/, ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
}
