import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirectedToCamera = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inCameraPage = segments[0] === 'camera';
    const inWeatherPage = segments[0] === 'weather';
    const inHumidityPage = segments[0] === 'humility';
    const IrrigationHistoryPage = segments[0] === 'IrrigationHistory';
    // Root page is when not in any known route group
    const inRootPage = !inAuthGroup && !inCameraPage && !inWeatherPage && !inHumidityPage && !IrrigationHistoryPage;

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on auth page -> go to login
      hasRedirectedToCamera.current = false;
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Just authenticated from auth page -> go to camera
      hasRedirectedToCamera.current = true;
      router.replace('/camera');
    } else if (isAuthenticated && inRootPage && !hasRedirectedToCamera.current) {
      // Authenticated and landing on root without going through camera first -> go to camera
      hasRedirectedToCamera.current = true;
      router.replace('/camera');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Show loading screen while checking auth
  if (isLoading) {
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
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
