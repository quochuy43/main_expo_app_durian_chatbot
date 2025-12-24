import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TourGuideProvider } from '@/contexts/TourGuideContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'completed' | 'not_completed'>('loading');

  // Check onboarding status from AsyncStorage
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setOnboardingStatus(completed === 'true' ? 'completed' : 'not_completed');
      } catch (error) {
        setOnboardingStatus('not_completed');
      }
    };
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (isLoading || onboardingStatus === 'loading') return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingPage = segments[0] === 'onboarding';
    const inCameraPage = segments[0] === 'camera';
    const inWeatherPage = segments[0] === 'weather';
    const inHumidityPage = segments[0] === 'humility';
    const IrrigationHistoryPage = segments[0] === 'IrrigationHistory';
    const inBlogPage = segments[0] === 'inblog';

    // Root page is when not in any known route group
    const inRootPage = !inAuthGroup && !inCameraPage && !inWeatherPage && !inHumidityPage && !IrrigationHistoryPage && !inBlogPage;

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated -> go to login
      hasNavigated.current = false;
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup && !hasNavigated.current) {
      // Just authenticated from auth page
      hasNavigated.current = true;
      if (onboardingStatus === 'completed') {
        // User đã hoàn thành onboarding trước đó -> go to camera
        router.replace('/camera');
      } else {
        // User chưa hoàn thành onboarding -> go to onboarding
        router.replace('/onboarding');
      }
    } else if (isAuthenticated && inRootPage && !hasNavigated.current) {
      // Authenticated and on root page (app restart)
      hasNavigated.current = true;
      if (onboardingStatus === 'completed') {
        router.replace('/camera');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [isAuthenticated, isLoading, segments, onboardingStatus]);

  // Show loading screen while checking auth or onboarding status
  if (isLoading || onboardingStatus === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="weather"
          options={{
            headerShown: false,
            title: 'Thời Tiết',
          }}
        />
        <Stack.Screen
          name="humility"
          options={{
            headerShown: false,
            title: 'Độ ẩm',
          }}
        />
        <Stack.Screen
          name="IrrigationHistory"
          options={{
            headerShown: false,
            title: 'Lịch sử tưới cây',
          }}
        />
        <Stack.Screen
          name="inblog"
          options={{
            headerShown: false,
            title: 'Blog',
          }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TourGuideProvider>
        <RootLayoutNav />
      </TourGuideProvider>
    </AuthProvider>
  );
}


