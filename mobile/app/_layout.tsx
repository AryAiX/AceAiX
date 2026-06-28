import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { StoriesProvider } from '@/context/StoriesContext';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { upsertPushToken } from '@/lib/notificationService';

SplashScreen.preventAutoHideAsync();

async function registerPushToken(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as any;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await upsertPushToken(userId, tokenData.data, Platform.OS);
  } catch (_) {
    // Non-fatal — push not available in this build
  }
}

function RootNavigator() {
  const { session, role, loading, user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const isPublicAuthRoute = pathname === '/login' || pathname === '/signup';
    if (!session && !isPublicAuthRoute) {
      router.replace('/login');
    } else if (role === 'athlete' && isPublicAuthRoute) {
      router.replace('/');
    } else if (role !== null && role !== 'athlete') {
      router.replace('/athletes-only');
    }
  }, [session, role, loading, pathname]);

  useEffect(() => {
    if (user) registerPushToken(user.id);
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="athletes-only" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <NotificationProvider>
        <StoriesProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </StoriesProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
