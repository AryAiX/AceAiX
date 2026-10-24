import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Share, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { Directory, File as FsFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/theme/ThemeProvider';
import { tierForScore } from '@/theme/tokens';
import {
  CARD_H,
  CARD_W,
  PlayerCardArt,
  imageAsDataUri,
  inlineCardFontsCss,
  type PlayerCardData,
} from '@/components/profile/PlayerCardArt';
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

async function webPngFromSvg(ref: Svg | null): Promise<Blob> {
  /* react-native-svg's ref is the DOM <svg> on some versions and a component
     instance on others, so fall back to finding the card in the page. */
  const direct = ref as unknown as { tagName?: string } | null;
  const element = (direct?.tagName?.toLowerCase() === 'svg'
    ? direct
    : document.querySelector('[data-testid="player-card-art"] svg')) as SVGSVGElement | null;
  if (!element) {
    throw new Error('Player card SVG is unavailable');
  }

  /* Inline the app's fonts: an SVG drawn through an <img> cannot load them. */
  const fonts = await inlineCardFontsCss();
  let source = new XMLSerializer().serializeToString(element);
  /* Draw at full size: the on-screen SVG is scaled down, and an <img> of it
     would be rasterised at that small size and then blown up. */
  source = source.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
    const sized = attrs
      .replace(/\swidth="[^"]*"/, ` width="${CARD_W}"`)
      .replace(/\sheight="[^"]*"/, ` height="${CARD_H}"`);
    return `<svg${sized}>${fonts ? `<style>${fonts}</style>` : ''}`;
  });
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

  const photo = useAsync(
    () => imageAsDataUri(bundle.data?.user?.avatar_url),
    [bundle.data?.user?.avatar_url],
    { enabled: !!bundle.data },
  );

  const card = useMemo<PlayerCardData>(() => {
    const user = bundle.data?.user;
    const athlete = bundle.data?.athlete;
    const full = score.data;
    const overall = full?.overall ?? bundle.data?.score?.overall ?? 0;
    const tier = tierForScore(overall);
    const pillars = full?.pillars ?? bundle.data?.score?.pillars;
    const supports = (teams.data ?? []).slice(0, 2).map((team) => team.name).join(' · ');

    return {
      name: displayName(user?.full_name, ''),
      initials: initialsOf(user?.full_name),
      line: [athlete?.position, athlete?.sport].filter(Boolean).join(' · '),
      meta: [athlete?.club, [user?.city, user?.country].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(' · '),
      overall,
      tier,
      tierLabel: t(`common.tier${tier.charAt(0).toUpperCase()}${tier.slice(1)}` as never),
      scoreLabel: t('common.talentScore'),
      photo: photo.data ?? null,
      pillars: [
        { label: t('score.pillarPerformance'), value: pillars?.performance ?? 0 },
        { label: t('score.pillarCredibility'), value: pillars?.credibility ?? 0 },
        { label: t('score.pillarEngagement'), value: pillars?.engagement ?? 0 },
        { label: t('score.pillarProfile'), value: pillars?.profile ?? 0 },
        { label: t('score.pillarMedia'), value: pillars?.media ?? 0 },
      ],
      stats: [
        { label: t('common.matches'), value: bundle.data?.stats.matches ?? 0 },
        { label: t('common.clips'), value: bundle.data?.stats.media ?? 0 },
        { label: t('common.endorsed'), value: bundle.data?.stats.endorsements ?? 0 },
      ],
      footerRight: supports ? `${t('teams.supportsTitle')}: ${supports}` : '',
    };
  }, [bundle.data, score.data, teams.data, photo.data, t]);

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
          testID="player-card-art"
          style={{
            width: displayWidth,
            height: displayHeight,
            borderRadius: (displayWidth * 56) / CARD_W,
            overflow: 'hidden',
            ...theme.elevation(2),
          }}
        >
          <PlayerCardArt ref={svgRef} data={card} width={displayWidth} height={displayHeight} />
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
