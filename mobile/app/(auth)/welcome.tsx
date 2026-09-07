import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gauge, ShieldCheck, Telescope } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Button, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { LegalLine } from '@/components/onboarding/Shared';
import { Routes } from '@/lib/routes';

/**
 * The first screen anyone sees.
 *
 * No photography — we have none, and stock athletes would be a lie. The whole
 * screen is built from type, a gradient made of theme colours, and space, so it
 * holds up in light and dark without a single hardcoded value.
 */

function Highlight({ icon, children }: { icon: React.ReactNode; children: string }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
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

export default function WelcomeScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing, radii, alpha } = theme;
  const router = useRouter();

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const rise = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.statusBar} />

      {/*
        The first screen anybody sees.
        It was one colour at three opacities — a brand wash over the page
        background — which on the dark scheme came out the colour of weak tea.
        It is now three flares in three different hues, drifting against each
        other, over a wash that is itself a gradient of two.
      */}
      <LinearGradient
        colors={[
          alpha(theme.gradients.hero[0], 0.34),
          alpha(theme.gradients.hero[1], 0.16),
          colors.bg,
        ]}
        locations={[0, 0.42, 0.84]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <AnimatedGradient
        colors={[alpha(theme.gradients.action[1], 0.55), alpha(theme.gradients.action[0], 0)]}
        period={16}
        radius={radii.pill}
        style={{ position: 'absolute', top: -150, right: -120, width: 360, height: 360 }}
      />
      <AnimatedGradient
        colors={[alpha(theme.gradients.cool[0], 0.4), alpha(theme.gradients.cool[2], 0)]}
        period={21}
        radius={radii.pill}
        style={{ position: 'absolute', top: 190, left: -170, width: 320, height: 320 }}
      />
      <AnimatedGradient
        colors={[alpha(theme.gradients.hero[2], 0.32), alpha(theme.gradients.hero[0], 0)]}
        period={13}
        radius={radii.pill}
        style={{ position: 'absolute', bottom: -110, right: -90, width: 300, height: 300 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* flexGrow keeps the layout centred on a big phone and scrollable on a
            small one, rather than clipping the buttons off the bottom. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
              rise,
            ]}
          >
            {/* Wordmark. The brand is cased "AceAiX" — the display face is
                already condensed, so it does not need shouting as well. */}
            <View style={{ paddingTop: spacing.xl, gap: spacing.xs }}>
              <Text variant="title" style={{ letterSpacing: 0.4 }}>
                Ace<Text variant="title" tone="primary">AiX</Text>
              </Text>
              <Text variant="overline" tone="primary">
                {t('common.tagline')}
              </Text>
            </View>

            <View style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl }}>
              <Text variant="hero">{t('auth.welcome.headline')}</Text>
              <Text variant="title" tone="primary" style={{ marginTop: spacing.xs }}>
                {t('auth.welcome.subheadline')}
              </Text>

              <Text
                variant="body"
                tone="secondary"
                style={{ marginTop: spacing.lg, maxWidth: 360 }}
              >
                {t('auth.welcome.body')}
              </Text>

              <View
                style={{
                  marginTop: spacing.xxl,
                  padding: spacing.lg,
                  gap: spacing.md,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Highlight icon={<Gauge size={18} color={colors.primary} />}>
                  {t('auth.welcome.highlightScore')}
                </Highlight>
                <Highlight icon={<Telescope size={18} color={colors.primary} />}>
                  {t('auth.welcome.highlightTrials')}
                </Highlight>
                <Highlight icon={<ShieldCheck size={18} color={colors.primary} />}>
                  {t('auth.welcome.highlightGuardian')}
                </Highlight>
              </View>
            </View>

            <View style={{ gap: spacing.md }}>
              <Button
                label={t('auth.createAccount')}
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
                style={{ marginTop: spacing.sm }}
                onOpenTerms={() => router.push(Routes.terms)}
                onOpenPrivacy={() => router.push(Routes.privacy)}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
