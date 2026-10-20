import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Compass, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Card, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { getSportFitState, type SfState } from '@/lib/api.sportfit';

/**
 * My Sport Fit, on my profile tab, under Game Intelligence.
 *
 * Two faces: an invitation, or my best three sports. Private to me, so there
 * is no "their" card: nobody else ever sees it. It never renders for a
 * non-athlete or a suspended account — and while a guardian has not approved
 * it, it still invites, because the screen behind it explains how to ask.
 */
export function MySportFitCard({ refreshKey }: { refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const state = useAsync<SfState>(() => getSportFitState(), [refreshKey], { refetchOnFocus: true });

  if (state.loading && !state.data) {
    return <Skeleton height={88} radius={theme.radii.lg} />;
  }
  const data = state.data;
  if (!data || data.consent === 'not_athlete' || data.consent === 'suspended') return null;

  const go = () => router.push(Routes.sportFit);
  const fits = data.result?.fits ?? [];

  if (!fits.length) {
    return (
      <Card onPress={go} padded={false} level={1} testID="sf-card">
        <AnimatedGradient colors={theme.gradients.cool} radius={theme.radii.lg} style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="overline" color="rgba(255,255,255,0.85)">
                {t('sportFit.title')}
              </Text>
              <Text variant="bodyStrong" color="#FFFFFF">
                {t('sportFit.cardCta')}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.9)">
                {t('sportFit.cardCtaBody')}
              </Text>
            </View>
            <ChevronRight size={22} color="#FFFFFF" />
          </View>
        </AnimatedGradient>
      </Card>
    );
  }

  const [first, second, third] = fits;
  return (
    <Card onPress={go} level={1} padded testID="sf-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={26} color={colors.play.cyan} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" tone="muted">
            {t('sportFit.title')}
          </Text>
          <Text variant="bodyStrong">{t('sportFit.cardResult', { sport: t(`sports.${first.sport}`) })}</Text>
          {second && third ? (
            <Text variant="caption" tone="secondary">
              {t('sportFit.cardResultBody', { second: t(`sports.${second.sport}`), third: t(`sports.${third.sport}`) })}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <EyeOff size={14} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {t('sportFit.cardPrivate')}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}
