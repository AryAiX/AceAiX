import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
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
import { ConfigMissing } from '@/components/common/ConfigMissing';
import { LanguageGate } from '@/components/common/LanguageGate';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { I18nProvider, primeLayoutDirection, useI18n } from '@/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';
    const isPublic = group === 'legal' || group === '+not-found';
    /* `/` renders the entry spinner and has no group of its own. Without this
       a signed-in person opening the app cold would sit on that spinner for
       ever, because no other branch below would move them. */
    const atEntry = (segments as readonly string[]).length === 0;

    if (!session) {
      if (!inAuth && !isPublic) router.replace('/(auth)/welcome');
      return;
    }

    // Signed in. Wait for the profile row before deciding anything else.
    if (!profile) return;

    if (!profile.onboarding_completed) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    if (inAuth || inOnboarding || atEntry) router.replace('/(tabs)');
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

  if (!configured) return <ConfigMissing />;

  /* Language comes before everything, including the session check: there is no
     point deciding which screen to show until we know what language to show it
     in. On every launch after the first, the stored choice makes this
     invisible. */
  if (languageLoading) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  if (!hasChosen) return <LanguageGate />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
