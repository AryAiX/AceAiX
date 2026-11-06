import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import { Check, Eye, Gauge, ShieldCheck, Telescope } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, ScoreRing, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { LegalLine } from '@/components/onboarding/Shared';
import { LogoMark, LogoWord } from '@/components/common/Logo';
import { Routes } from '@/lib/routes';
import { NATIVE_DRIVER } from '@/lib/motion';
import { sportLabel } from '@/constants/sports';

/**
 * The first screen anyone sees.
 *
 * A blue → violet hero with two sample cards floating in it — a Talent Score
 * and a club shortlist — so the app shows what it does before it says it.
 * Under the headline, a white sheet rises over the hero with the three
 * promises and the two ways in. The sample cards are illustrations, marked as
 * such for screen readers, and use no real person.
 */

/** A sample club for the illustration; a name, so it is not translated. */
const SAMPLE_CLUB = 'Falcon Padel Club';
const SAMPLE_SCORE = 72;
const SAMPLE_DELTA = 6;
const SAMPLE_SCOUTS = 12;
const WHITE = '#FFFFFF';
/** The headline's second line, in the sun yellow of the brand mark. */
const SUN = '#FFD84D';

function PromiseRow({
  icon,
  tint,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  children: string;
}) {
  const theme = useTheme();
  const { radii, spacing } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.alpha(tint, 0.14),
        }}
      >
        {icon}
      </View>
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

/** A small white card floating in the hero, tilted a touch. */
function FloatCard({
  children,
  rotate,
  style,
}: {
  children: React.ReactNode;
  rotate: string;
  style: object;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          position: 'absolute',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          padding: theme.spacing.md,
          transform: [{ rotate }],
          ...theme.elevation(3),
          shadowColor: '#140C46',
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Tag({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.alpha(color, 0.14),
      }}
    >
      {icon}
      <Text variant="captionStrong" color={color} style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [entrance]);
  const rise = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    /* `overflow: hidden` keeps the court lines and tilted cards from widening
       the page on web. */
    <View style={{ flex: 1, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── The hero ─────────────────────────────────────────────────── */}
        <View style={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl + spacing.lg }}>
          <LinearGradient
            colors={theme.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Faint court lines, so the colour reads as a pitch, not a wash. */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line x1="-20%" y1="30%" x2="120%" y2="85%" stroke={WHITE} strokeOpacity={0.1} strokeWidth={2} />
            <Line x1="-20%" y1="70%" x2="120%" y2="20%" stroke={WHITE} strokeOpacity={0.08} strokeWidth={2} />
            <Line x1="55%" y1="0%" x2="70%" y2="100%" stroke={WHITE} strokeOpacity={0.08} strokeWidth={2} />
          </Svg>

          <Animated.View style={[{ paddingHorizontal: spacing.xl }, rise]}>
            {/* The mark leads: the icon they tapped should still be here. */}
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <LogoMark size={34} />
                <LogoWord height={20} onDark />
              </View>
              <Text variant="overline" color={theme.alpha(WHITE, 0.85)}>
                {t('common.tagline')}
              </Text>
            </View>

            {/* The sample cards. Hidden from screen readers: they illustrate. */}
            <View
              style={{ height: 178, marginTop: spacing.md }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="welcome-samples"
            >
              {/* A soft light behind the cards, so they sit in front of
                  something instead of floating on flat colour. */}
              <View
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -40,
                  width: 260,
                  height: 260,
                  borderRadius: 130,
                  backgroundColor: theme.alpha(WHITE, 0.12),
                }}
              />
              <FloatCard rotate="3deg" style={{ top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ScoreRing score={SAMPLE_SCORE} size={48} showTier={false} animate={false} />
                <View style={{ gap: 2 }}>
                  <Text variant="overline" tone="muted" style={{ fontSize: 10 }}>
                    {t('common.talentScore')}
                  </Text>
                  <Tag label={t('common.tierGold')} color={theme.play.flame} />
                  <Text variant="captionStrong" color={colors.success} style={{ fontSize: 11 }}>
                    {t('auth.welcome.demoScoreDelta', { count: SAMPLE_DELTA })}
                  </Text>
                </View>
              </FloatCard>

              <FloatCard rotate="-2deg" style={{ top: 86, left: 0, width: '74%', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radii.sm,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="captionStrong" color={WHITE}>
                      FP
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>
                      {SAMPLE_CLUB}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11 }}>
                      {t('auth.welcome.demoShortlist')}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Tag
                    label={t('opportunities.status.athlete.shortlisted')}
                    color={theme.play.flame}
                    icon={<Check size={11} color={theme.play.flame} strokeWidth={3} />}
                  />
                  <Tag label={sportLabel(t, 'padel')} color={colors.primary} />
                  <Text variant="caption" tone="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>
                    {t('common.now')}
                  </Text>
                </View>
              </FloatCard>

              <View
                style={{
                  position: 'absolute',
                  right: spacing.sm,
                  top: 152,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: radii.pill,
                  backgroundColor: SUN,
                  transform: [{ rotate: '-2deg' }],
                }}
              >
                <Eye size={13} color="#5A3D00" />
                <Text variant="captionStrong" color="#5A3D00" style={{ fontSize: 11 }}>
                  {t('auth.welcome.demoScouts', { count: SAMPLE_SCOUTS })}
                </Text>
              </View>
            </View>

            <Text variant="hero" color={WHITE} style={{ marginTop: spacing.xl }}>
              {t('auth.welcome.headline')}
            </Text>
            <Text variant="title" color={SUN}>
              {t('auth.welcome.subheadline')}
            </Text>
            <Text variant="caption" color={theme.alpha(WHITE, 0.9)} style={{ marginTop: spacing.sm, maxWidth: 360 }}>
              {t('auth.welcome.body')}
            </Text>
          </Animated.View>
        </View>

        {/* ── The sheet: three promises and the two ways in ─────────────── */}
        <View
          style={{
            flexGrow: 1,
            marginTop: -spacing.xxl,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: insets.bottom + spacing.sm,
            gap: spacing.lg,
            justifyContent: 'space-between',
            /* Lifted off the hero by a shadow cast upward. */
            shadowColor: '#140C46',
            shadowOpacity: 0.16,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: -8 },
            elevation: 12,
          }}
        >
          <View style={{ gap: spacing.md }}>
            <PromiseRow tint={colors.primary} icon={<Gauge size={18} color={colors.primary} />}>
              {t('auth.welcome.highlightScore')}
            </PromiseRow>
            <PromiseRow tint={theme.play.flame} icon={<Telescope size={18} color={theme.play.flame} />}>
              {t('auth.welcome.highlightTrials')}
            </PromiseRow>
            <PromiseRow tint={colors.accent} icon={<ShieldCheck size={18} color={colors.accent} />}>
              {t('auth.welcome.highlightGuardian')}
            </PromiseRow>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Button
              label={t('auth.createAccount')}
              /* The warm ombre of the Challenges banner: the one bright, hot
                 thing on the sheet, so the way in is impossible to miss. */
              variant="warm"
              size="lg"
              fullWidth
              onPress={() => router.push(Routes.auth.signUp)}
              testID="welcome-create-account"
            />
            <Button
              label={t('auth.welcome.signIn')}
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.push(Routes.auth.signIn)}
              testID="welcome-sign-in"
            />
            <LegalLine
              templateKey="auth.legalContinue"
              tone="muted"
              align="center"
              onOpenTerms={() => router.push(Routes.terms)}
              onOpenPrivacy={() => router.push(Routes.privacy)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
