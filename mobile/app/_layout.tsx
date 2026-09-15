import React, { useCallback, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  SairaCondensed_600SemiBold,
  SairaCondensed_700Bold,
  SairaCondensed_800ExtraBold,
} from '@expo-google-fonts/saira-condensed';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { UnreadProvider } from '@/providers/UnreadProvider';
import { ProgressProvider } from '@/providers/ProgressProvider';
import { BrandSplash } from '@/components/common/BrandSplash';
import { ConfigMissing } from '@/components/common/ConfigMissing';
import { LanguageGate } from '@/components/common/LanguageGate';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { I18nProvider, primeLayoutDirection, useI18n } from '@/i18n';
import { routeDecision } from '@/lib/routes';

SplashScreen.preventAutoHideAsync().catch(() => {});

const WEB_APP_MAX_WIDTH = 840;

/* Set the layout direction from last launch's choice before React renders, so
   an Arabic install comes up mirrored rather than flipping a beat later. */
primeLayoutDirection();

/**
 * Routing gate.
 *
 * One place decides where a person belongs: signed out → auth, signed in but
 * unfinished profile → onboarding, otherwise → the app. Screens never redirect
 * each other, which is what used to produce the loops and dead ends.
 */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;

    const target = routeDecision({
      hasSession: Boolean(session),
      profile,
      segments: segments as readonly string[],
    });
    if (target) router.replace(target);
  }, [session, profile, loading, configured, segments, router]);

  return <>{children}</>;
}

function Shell() {
  const theme = useTheme();
  const { loading, configured } = useAuth();
  const { hydrating: languageLoading, hasChosen } = useI18n();

  /* Registers the push token when permission already exists and routes a
     notification tap. It never *asks* for permission here — that request is
     made from Settings, after the person has a reason to say yes. */
  usePushNotifications();

  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !languageLoading) onReady();
  }, [loading, languageLoading, onReady]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.backgroundColor = theme.colors.bg;
    document.body.style.backgroundColor = theme.colors.bg;
  }, [theme.colors.bg]);

  if (!configured) return <ConfigMissing />;

  /* Language comes before everything, including the session check: there is no
     point deciding which screen to show until we know what language to show it
     in. On every launch after the first, the stored choice makes this
     invisible. */
  if (languageLoading) return <BrandSplash />;
  if (!hasChosen) return <LanguageGate />;

  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.bg },
        Platform.OS === 'web'
          ? {
              width: '100%',
              maxWidth: WEB_APP_MAX_WIDTH,
              alignSelf: 'center',
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: theme.colors.border,
            }
          : null,
      ]}
    >
      <RouteGuard>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(onboarding)" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="age-review" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen
            name="compose"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="opportunity/new"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          {/* Legal is reachable from the signed-out welcome screen, so it must
              not be gated behind a session. */}
          <Stack.Screen name="legal" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </RouteGuard>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SairaCondensed_600SemiBold,
    SairaCondensed_700Bold,
    SairaCondensed_800ExtraBold,
  });

  // A missing font file must not leave the user staring at a splash screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>
                <UnreadProvider>
                  {/* Inside auth (it reads the session) and outside Shell, so
                      a celebration can appear over any screen. */}
                  <ProgressProvider>
                    <Shell />
                  </ProgressProvider>
                </UnreadProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
