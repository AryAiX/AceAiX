import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { FontFamily, TierColors, TierColorsEnd, type Tier } from '@/theme/tokens';
import { LOGO_LOCKUP_DARK } from '@/lib/playerCard/logo';

/** Drawn at this size and scaled to fit; 4:5 posts well anywhere. */
export const CARD_W = 1080;
export const CARD_H = 1350;

export interface PlayerCardData {
  name: string;
  initials: string;
  /** "Striker · Football" */
  line: string;
  /** "Al Jadaf Academy · Dubai, United Arab Emirates" */
  meta: string;
  overall: number;
  tier: Tier;
  tierLabel: string;
  scoreLabel: string;
  /** A data: URI, so the exported image carries the photo. Null → initials. */
  photo: string | null;
  pillars: { label: string; value: number }[];
  stats: { label: string; value: number }[];
  footerRight: string;
}

/*
 * The fonts are the app's own faces. On web the exported PNG would lose them —
 * an SVG drawn into a canvas cannot load anything — so `webPngFromSvg` inlines
 * them as @font-face before it renders (see app/player-card.tsx).
 */
const DISPLAY = FontFamily.displayBlack;
const BODY = FontFamily.semibold;
const BODY_BOLD = FontFamily.bold;

/** Shrink a line so it fits `width` at roughly the face's average advance. */
function fit(text: string, size: number, width: number, advance = 0.5): number {
  if (!text) return size;
  return Math.min(size, Math.floor(width / (text.length * advance)));
}

/**
 * The player card: the real AceAiX lockup, the photo in a tier-coloured ring,
 * the Talent Score, the five pillars it is built from, and three counts.
 *
 * The background borrows the logo's own shapes — the speed streaks coming off
 * the runner and the orange swoosh under the A — so the card reads as AceAiX
 * before the wordmark is even noticed.
 */
export const PlayerCardArt = forwardRef<Svg, { data: PlayerCardData; width: number; height: number }>(
  function PlayerCardArt({ data, width, height }, ref) {
    const tierA = TierColors[data.tier];
    const tierB = TierColorsEnd[data.tier];
    const nameText = data.name.toUpperCase();
    const nameSize = fit(nameText, 96, 900, 0.46);
    const metaSize = fit(data.meta, 32, 920, 0.52);
    const lineSize = fit(data.line, 38, 920, 0.55);

    const logoW = 270;
    const logoH = (logoW * LOGO_LOCKUP_DARK.height) / LOGO_LOCKUP_DARK.width;

    const panelX = 64;
    const panelW = CARD_W - 128;
    const colW = panelW / Math.max(1, data.pillars.length);

    const photoCx = CARD_W / 2;
    const photoCy = 540;
    const photoR = 172;

    return (
      <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
        <Defs>
          <LinearGradient id="pc-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#050812" />
            <Stop offset="0.55" stopColor="#0B1330" />
            <Stop offset="1" stopColor="#170A26" />
          </LinearGradient>
          <LinearGradient id="pc-edge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#12C2E9" />
            <Stop offset="0.35" stopColor="#2563EB" />
            <Stop offset="0.6" stopColor="#7C3AED" />
            <Stop offset="0.8" stopColor="#FF3D7F" />
            <Stop offset="1" stopColor="#FF8A00" />
          </LinearGradient>
          <LinearGradient id="pc-tier" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tierA} />
            <Stop offset="1" stopColor={tierB} />
          </LinearGradient>
          <LinearGradient id="pc-blue" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7C3AED" stopOpacity="0" />
            <Stop offset="0.6" stopColor="#2563EB" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#12C2E9" />
          </LinearGradient>
          <LinearGradient id="pc-warm" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF8A00" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FF8A00" />
            <Stop offset="1" stopColor="#FF3D7F" />
          </LinearGradient>
          <RadialGradient id="pc-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tierA} stopOpacity="0.55" />
            <Stop offset="0.6" stopColor={tierA} stopOpacity="0.12" />
            <Stop offset="1" stopColor={tierA} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id="pc-photo">
            <Circle cx={photoCx} cy={photoCy} r={photoR} />
          </ClipPath>
          <ClipPath id="pc-card">
            <Rect x="0" y="0" width={CARD_W} height={CARD_H} rx="56" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#pc-card)">
          <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill="url(#pc-bg)" />

          {/* Speed streaks off the left edge, as in the logo. */}
          <G opacity="0.75">
            <Path d="M0 392 L330 380 L300 404 L0 412 Z" fill="url(#pc-blue)" />
            <Path d="M0 452 L250 440 L222 462 L0 470 Z" fill="url(#pc-blue)" opacity="0.8" />
            <Path d="M40 512 L292 500 L262 522 L40 530 Z" fill="url(#pc-warm)" opacity="0.8" />
            <Path d="M0 572 L210 562 L186 580 L0 588 Z" fill="url(#pc-blue)" opacity="0.6" />
            <Path d="M1080 610 L800 600 L828 622 L1080 628 Z" fill="url(#pc-warm)" opacity="0.5" />
            <Path d="M1080 670 L850 662 L874 680 L1080 686 Z" fill="url(#pc-blue)" opacity="0.4" />
          </G>

          {/* The swoosh under the A. */}
          <Path d="M-40 1350 C 300 1314, 760 1310, 1120 1330 L1120 1350 Z" fill="url(#pc-warm)" opacity="0.22" />
          <Path d="M-40 1352 C 300 1316, 760 1312, 1120 1332" stroke="url(#pc-warm)" strokeWidth="5" fill="none" opacity="0.45" />

          {/* Glow behind the photo. */}
          <Circle cx={photoCx} cy={photoCy} r="360" fill="url(#pc-glow)" />
        </G>

        {/* Frame */}
        <Rect x="14" y="14" width={CARD_W - 28} height={CARD_H - 28} rx="48" fill="none" stroke="url(#pc-edge)" strokeWidth="6" />
        <Rect x="34" y="34" width={CARD_W - 68} height={CARD_H - 68} rx="36" fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="2" />

        {/* The real logo. */}
        <SvgImage x="50" y="48" width={logoW} height={logoH} href={LOGO_LOCKUP_DARK.uri} preserveAspectRatio="xMidYMid meet" />

        {/* Score, top right */}
        <SvgText x={CARD_W - 70} y="104" fill="#9DB0D3" fontSize="26" fontFamily={BODY_BOLD} letterSpacing={4} textAnchor="end">
          {data.scoreLabel.toUpperCase()}
        </SvgText>
        <SvgText x={CARD_W - 64} y="246" fill="#FFFFFF" fontSize="172" fontFamily={DISPLAY} textAnchor="end">
          {String(data.overall)}
        </SvgText>
        <Rect x={CARD_W - 64 - 210} y="268" width="210" height="58" rx="29" fill="url(#pc-tier)" />
        <SvgText x={CARD_W - 64 - 105} y="309" fill="#FFFFFF" fontSize="34" fontFamily={DISPLAY} letterSpacing={3} textAnchor="middle">
          {data.tierLabel.toUpperCase()}
        </SvgText>

        {/* Photo */}
        <Circle cx={photoCx} cy={photoCy} r={photoR + 30} fill="none" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="2" />
        {data.photo ? (
          <SvgImage
            x={photoCx - photoR}
            y={photoCy - photoR}
            width={photoR * 2}
            height={photoR * 2}
            href={data.photo}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#pc-photo)"
          />
        ) : (
          <>
            <Circle cx={photoCx} cy={photoCy} r={photoR} fill="url(#pc-tier)" />
            <SvgText x={photoCx} y={photoCy + 56} fill="#FFFFFF" fontSize="160" fontFamily={DISPLAY} textAnchor="middle">
              {data.initials}
            </SvgText>
          </>
        )}
        <Circle cx={photoCx} cy={photoCy} r={photoR + 10} fill="none" stroke="url(#pc-tier)" strokeWidth="12" />

        {/* Identity */}
        <SvgText x={CARD_W / 2} y="820" fill="#FFFFFF" fontSize={nameSize} fontFamily={DISPLAY} letterSpacing={2} textAnchor="middle">
          {nameText}
        </SvgText>
        {data.line ? (
          <SvgText x={CARD_W / 2} y="876" fill={tierA} fontSize={lineSize} fontFamily={BODY_BOLD} textAnchor="middle">
            {data.line}
          </SvgText>
        ) : null}
        {data.meta ? (
          <SvgText x={CARD_W / 2} y="926" fill="#9DA8BF" fontSize={metaSize} fontFamily={BODY} textAnchor="middle">
            {data.meta}
          </SvgText>
        ) : null}

        {/* The five pillars of the score */}
        <Rect x={panelX} y="966" width={panelW} height="176" rx="30" fill="#FFFFFF" fillOpacity="0.05" stroke="#FFFFFF" strokeOpacity="0.09" strokeWidth="2" />
        {data.pillars.map((p, i) => {
          const cx = panelX + colW * i + colW / 2;
          const barW = colW - 64;
          const v = Math.max(0, Math.min(100, Math.round(p.value)));
          return (
            <G key={p.label}>
              {i > 0 ? (
                <Rect x={panelX + colW * i} y="996" width="2" height="116" fill="#FFFFFF" fillOpacity="0.08" />
              ) : null}
              <SvgText x={cx} y="1052" fill="#FFFFFF" fontSize="70" fontFamily={DISPLAY} textAnchor="middle">
                {String(v)}
              </SvgText>
              <SvgText x={cx} y="1090" fill="#9DA8BF" fontSize={fit(p.label.toUpperCase(), 21, colW - 36, 0.64)} fontFamily={BODY_BOLD} letterSpacing={1} textAnchor="middle">
                {p.label.toUpperCase()}
              </SvgText>
              <Rect x={cx - barW / 2} y="1108" width={barW} height="8" rx="4" fill="#FFFFFF" fillOpacity="0.1" />
              <Rect x={cx - barW / 2} y="1108" width={Math.max(8, (barW * v) / 100)} height="8" rx="4" fill="url(#pc-tier)" />
            </G>
          );
        })}

        {/* Counts */}
        {data.stats.map((s, i) => {
          const cx = 64 + ((CARD_W - 128) / 3) * i + (CARD_W - 128) / 6;
          return (
            <G key={s.label}>
              <SvgText x={cx} y="1216" fill="#FFFFFF" fontSize="54" fontFamily={DISPLAY} textAnchor="middle">
                {String(s.value)}
              </SvgText>
              <SvgText x={cx} y="1250" fill="#8A95AB" fontSize="22" fontFamily={BODY_BOLD} letterSpacing={2} textAnchor="middle">
                {s.label.toUpperCase()}
              </SvgText>
            </G>
          );
        })}

        {/* Footer */}
        <SvgText x="70" y="1306" fill="#FFFFFF" fillOpacity="0.75" fontSize="26" fontFamily={BODY_BOLD} letterSpacing={1}>
          aceaix.com
        </SvgText>
        {data.footerRight ? (
          <SvgText x={CARD_W - 70} y="1306" fill="#8A95AB" fontSize={fit(data.footerRight, 24, 620, 0.55)} fontFamily={BODY} textAnchor="end">
            {data.footerRight}
          </SvgText>
        ) : null}
      </Svg>
    );
  },
);

/** Fetch an image and return it as a data: URI, or null if it cannot be read. */
export async function imageAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Web only: the @font-face rules for the card's faces, with the font files
 * inlined, so an SVG rendered through an <img> draws in the app's typefaces.
 * Empty when the rules cannot be read; the card then falls back to the
 * browser's sans-serif, which is still legible.
 */
let fontCssCache: Promise<string> | null = null;
export function inlineCardFontsCss(): Promise<string> {
  if (Platform.OS !== 'web') return Promise.resolve('');
  if (fontCssCache) return fontCssCache;
  const wanted = new Set<string>([DISPLAY, BODY, BODY_BOLD]);
  fontCssCache = (async () => {
    const rules: { family: string; url: string }[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList | null = null;
      try { list = sheet.cssRules; } catch { list = null; }
      if (!list) continue;
      for (const rule of Array.from(list)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        const src = rule.style.getPropertyValue('src');
        const url = /url\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
        if (wanted.has(family) && url) rules.push({ family, url });
      }
    }
    const parts = await Promise.all(
      rules.map(async ({ family, url }) => {
        const data = await imageAsDataUri(new URL(url, location.href).href);
        return data ? `@font-face{font-family:'${family}';src:url(${data});}` : '';
      }),
    );
    return parts.join('');
  })().catch(() => '');
  return fontCssCache;
}
