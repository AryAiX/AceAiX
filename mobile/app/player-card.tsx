import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Share, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Directory, File as FsFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import {
  Button,
  Card,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile, refreshMyTalentScore, teamsOf } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { displayName, initialsOf } from '@/lib/format';
import { useT } from '@/i18n';

/** The card is drawn at this size and scaled to fit; 4:5 posts well anywhere. */
const CARD_W = 1080;
const CARD_H = 1350;

async function webPngFromSvg(ref: Svg | null): Promise<Blob> {
  const element = ref as unknown as SVGSVGElement | null;
  if (!element || element.tagName.toLowerCase() !== 'svg') {
    throw new Error('Player card SVG is unavailable');
  }

  const source = new XMLSerializer().serializeToString(element);
  const sourceUrl = URL.createObjectURL(
    new Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
  );

  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Player card SVG could not be rendered'));
      image.src = sourceUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(image, 0, 0, CARD_W, CARD_H);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!blob) throw new Error('Player card PNG could not be created');
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function shareOrDownloadWebCard(blob: Blob, name: string, message: string): Promise<void> {
  const file = new globalThis.File([blob], 'aceaix-card.png', { type: 'image/png' });
  const shareData = { files: [file], title: name, text: message };

  if (
    typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))
  ) {
    await navigator.share(shareData);
    return;
  }

  const uri = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = uri;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Firefox and Safari may not consume the Blob until a later task.
    setTimeout(() => URL.revokeObjectURL(uri), 10_000);
  }
}

/**
 * A card of somebody's profile, drawn as vector and exported as an image.
 *
 * Why this exists: a fifteen-year-old will not send a scout a link to a
 * profile, but they will post a card. It is the cheapest distribution AceAiX
 * has, and every card carries the score, the tier and the wordmark.
 *
 * Why SVG rather than a screenshot library: `react-native-svg` is already a
 * dependency and gives native a data URL without a new module. Browsers
 * serialize the same SVG into a canvas-backed PNG, then use Web Share where
 * available and a download everywhere else.
 */
export default function PlayerCardScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();

  const svgRef = useRef<Svg>(null);
  const [busy, setBusy] = useState(false);

  const bundle = useAsync(() => getMyProfile(), []);
  const score = useAsync(() => refreshMyTalentScore(), []);
  const teams = useAsync(() => teamsOf(profile!.id), [profile?.id], { enabled: !!profile?.id });

  const card = useMemo(() => {
    const user = bundle.data?.user;
    const athlete = bundle.data?.athlete;
    const overall = score.data?.overall ?? bundle.data?.score?.overall ?? 0;
    const tier = tierForScore(overall);

    return {
      name: displayName(user?.full_name, ''),
      initials: initialsOf(user?.full_name),
      line: [athlete?.position, athlete?.sport].filter(Boolean).join(' · '),
      place: [user?.city, user?.country].filter(Boolean).join(', '),
      club: athlete?.club ?? null,
      overall,
      tier,
      tierColor: TierColors[tier],
      stats: [
        { label: t('common.matches'), value: bundle.data?.stats.matches ?? 0 },
        { label: t('common.clips'), value: bundle.data?.stats.media ?? 0 },
        { label: t('common.endorsed'), value: bundle.data?.stats.endorsements ?? 0 },
      ],
      supports: (teams.data ?? []).slice(0, 2).map((team) => team.name).join(' · '),
    };
  }, [bundle.data, score.data, teams.data, t]);

  const exportCard = useCallback(async () => {
    if (Platform.OS === 'web') {
      setBusy(true);
      try {
        const blob = await webPngFromSvg(svgRef.current);
        await shareOrDownloadWebCard(
          blob,
          card.name,
          `${card.name} — ${card.overall}/100 on AceAiX`,
        );
        toast.success(t('profile.playerCardShared'));
      } catch (error) {
        // Closing the system share sheet is a cancellation, not a broken card.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        toast.error(t('profile.playerCardFailed'));
      } finally {
        setBusy(false);
      }
      return;
    }
    const ref = svgRef.current as unknown as {
      toDataURL?: (cb: (base64: string) => void, options?: object) => void;
    } | null;
    if (!ref?.toDataURL) {
      toast.error(t('profile.playerCardFailed'));
      return;
    }

    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 8000);
        ref.toDataURL!((value) => {
          clearTimeout(timeout);
          resolve(value);
        });
      });

      const folder = new Directory(Paths.cache, 'cards');
      if (!folder.exists) folder.create({ intermediates: true });
      const file = new FsFile(folder, 'aceaix-card.png');
      file.create({ overwrite: true });
      file.write(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

      /* iOS attaches the file via Share.url; Android ignores url, so use
         expo-sharing there to actually hand the PNG to the share sheet. */
      if (Platform.OS === 'android' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: t('profile.playerCardShare'),
        });
      } else {
        await Share.share({
          url: file.uri,
          message: `${card.name} — ${card.overall}/100 on AceAiX`,
        });
      }
      toast.success(t('profile.playerCardShared'));
    } catch {
      toast.error(t('profile.playerCardFailed'));
    } finally {
      setBusy(false);
    }
  }, [card.name, card.overall, t, toast]);

  const displayWidth = Math.min(width - 32, 420);
  const displayHeight = (displayWidth * CARD_H) / CARD_W;

  if (bundle.loading && !bundle.data) {
    return (
      <Screen header={<Header title={t('profile.playerCard')} back bordered />}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (!bundle.data) {
    return (
      <Screen header={<Header title={t('profile.playerCard')} back bordered />}>
        <ErrorState message={bundle.error} onRetry={bundle.reload} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('profile.playerCard')} back bordered />}
      testID="player-card-screen"
      footer={
        <Button
          label={t('profile.playerCardShare')}
          fullWidth
          loading={busy}
          onPress={exportCard}
        />
      }
    >
      <View style={{ gap: spacing.lg, alignItems: 'center', paddingBottom: spacing.xl }}>
        <Text variant="body" tone="secondary" style={{ alignSelf: 'flex-start' }}>
          {t('profile.playerCardBody')}
        </Text>

        <View
          style={{
            width: displayWidth,
            height: displayHeight,
            borderRadius: 24,
            overflow: 'hidden',
            ...theme.elevation(2),
          }}
        >
          <Svg
            ref={svgRef}
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${CARD_W} ${CARD_H}`}
          >
            <Defs>
              <SvgGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#0B0D11" />
                <Stop offset="1" stopColor="#171B22" />
              </SvgGradient>
              <SvgGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={card.tierColor} stopOpacity="0.55" />
                <Stop offset="1" stopColor={card.tierColor} stopOpacity="0" />
              </SvgGradient>
            </Defs>

            <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill="url(#bg)" />
            <Rect x="0" y="0" width={CARD_W} height="520" fill="url(#glow)" />

            {/* Wordmark */}
            <SvgText x="72" y="112" fill="#FF5A1F" fontSize="46" fontWeight="800">
              Ace
            </SvgText>
            <SvgText x="182" y="112" fill="#FFFFFF" fontSize="46" fontWeight="800">
              AiX
            </SvgText>

            {/* Score ring */}
            <Circle
              cx={CARD_W / 2}
              cy="430"
              r="180"
              stroke={card.tierColor}
              strokeWidth="14"
              fill="none"
              opacity="0.35"
            />
            <SvgText
              x={CARD_W / 2}
              y="480"
              fill="#FFFFFF"
              fontSize="200"
              fontWeight="800"
              textAnchor="middle"
            >
              {String(card.overall)}
            </SvgText>
            <SvgText
              x={CARD_W / 2}
              y="668"
              fill={card.tierColor}
              fontSize="46"
              fontWeight="700"
              textAnchor="middle"
            >
              {t(`common.tier${card.tier.charAt(0).toUpperCase()}${card.tier.slice(1)}` as never)}
            </SvgText>

            {/* Identity */}
            <SvgText
              x={CARD_W / 2}
              y="800"
              fill="#FFFFFF"
              fontSize="72"
              fontWeight="800"
              textAnchor="middle"
            >
              {card.name}
            </SvgText>
            <SvgText
              x={CARD_W / 2}
              y="866"
              fill="#A6AEBB"
              fontSize="40"
              textAnchor="middle"
            >
              {card.line}
            </SvgText>
            {card.club ? (
              <SvgText x={CARD_W / 2} y="926" fill="#A6AEBB" fontSize="36" textAnchor="middle">
                {card.club}
              </SvgText>
            ) : null}

            {/* Stats */}
            {card.stats.map((stat, index) => {
              const x = 180 + index * 360;
              return (
                <React.Fragment key={stat.label}>
                  <SvgText
                    x={x}
                    y="1090"
                    fill="#FFFFFF"
                    fontSize="66"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {String(stat.value)}
                  </SvgText>
                  <SvgText x={x} y="1140" fill="#8A93A0" fontSize="28" textAnchor="middle">
                    {stat.label.toUpperCase()}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {card.supports ? (
              <SvgText
                x={CARD_W / 2}
                y="1250"
                fill="#8A93A0"
                fontSize="30"
                textAnchor="middle"
              >
                {`${t('teams.supportsTitle')}: ${card.supports}`}
              </SvgText>
            ) : null}
          </Svg>
        </View>

        <Card padded tone="alt" style={{ width: '100%' }}>
          <Text variant="caption" tone="muted">
            {t('profile.playerCardHint')}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
