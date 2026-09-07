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
import { Directory, File, Paths } from 'expo-file-system';

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

/**
 * A card of somebody's profile, drawn as vector and exported as an image.
 *
 * Why this exists: a fifteen-year-old will not send a scout a link to a
 * profile, but they will post a card. It is the cheapest distribution AceAiX
 * has, and every card carries the score, the tier and the wordmark.
 *
 * Why SVG rather than a screenshot library: `react-native-svg` is already a
 * dependency and gives a data URL without a new native module, which keeps the
 * app running in Expo Go. On web `toDataURL` is not implemented, so the export
 * button says so instead of failing silently.
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
      toast.info(t('profile.playerCardFailed'));
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
      const file = new File(folder, 'aceaix-card.png');
      file.create({ overwrite: true });
      file.write(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

      /* React Native's own share sheet — no extra native module. iOS attaches
         the file; Android takes the text and ignores the url, which is why the
         message stands on its own. */
      await Share.share({
        url: file.uri,
        message: `${card.name} — ${card.overall}/100 on AceAiX`,
      });
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
