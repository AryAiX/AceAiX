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
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { upsertPushToken } from '@/lib/notificationService';

SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await upsertPushToken(userId, tokenData.data, Platform.OS);
  } catch (error) {
    console.warn('Push notification registration failed', error);
  }
}

function RootNavigator() {
  const { session, role, profileError, loading, user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const isEntryRoute = pathname === '/login' || pathname === '/signup';
    const isRecoveryRoute = pathname === '/forgot-password' || pathname === '/reset-password';
    const isPublicAuthRoute = isEntryRoute || isRecoveryRoute;
    if (!session && !isPublicAuthRoute) {
      router.replace('/login');
    } else if (role === 'athlete' && isEntryRoute) {
      router.replace('/');
    } else if (role === 'athlete' && pathname === '/athletes-only') {
      router.replace('/');
    } else if (role !== null && role !== 'athlete' && pathname !== '/athletes-only') {
      router.replace('/athletes-only');
    } else if (session && role === null && !isRecoveryRoute) {
      router.replace({
        pathname: '/athletes-only',
        params: { reason: profileError ? 'load-error' : 'no-profile' },
      });
    }
  }, [session, role, profileError, loading, pathname]);

  useEffect(() => {
    if (user && role === 'athlete') registerPushToken(user.id);
  }, [user, role]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
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
