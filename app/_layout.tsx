import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Platform, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '@/contexts/theme-context';
import { getUserTypeFromToken } from '@/utils/jwt-decoder';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userType, setUserType] = useState<'student' | 'school' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Initial check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = Platform.OS !== 'web'
          ? await SecureStore.getItemAsync('userToken')
          : localStorage.getItem('userToken');

        if (token) {
          const type = getUserTypeFromToken(token);
          setUserType(type);
          setIsSignedIn(true);
        } else {
          setIsSignedIn(false);
          setUserType(null);
        }
      } catch (e) {

      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Responsive Router: Re-checks token and routes based on user type on every route change
  useEffect(() => {
    if (isLoading) return;

    const performRedirect = async () => {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const currentRoot = segments[0] as any;
      const inAuthGroup = !segments.length || currentRoot === '(auth)' || currentRoot === 'index';
      const inStudentGroup = currentRoot === '(student)';

      const isPublicStudentRoute = inStudentGroup && (!segments[1] || ['verify-email', 'verify-otp', 'register'].includes(segments[1]));

      const inDashboard = currentRoot === 'dashboard' || (inStudentGroup && segments[1] === 'dashboard');

      if (!token) {
        if (!inAuthGroup && !isPublicStudentRoute) {
          router.replace('/' as any);
        }
        return;
      }

      const detectedUserType = getUserTypeFromToken(token);

      if (detectedUserType === 'student') {
        if (!inStudentGroup) {
          router.replace('/(student)/dashboard' as any);
        }
        return;
      }

      if (detectedUserType === 'school') {
        const isResetRoute = currentRoot === '(auth)' && ['forgot-password', 'verify-reset-otp', 'reset-password'].includes(segments[1] as string);
        if (inStudentGroup || (inAuthGroup && !isResetRoute)) {

          router.replace('/dashboard' as any);
        }
        return;
      }

      if (!inAuthGroup) {

        router.replace('/' as any);
      }
    };

    performRedirect();
  }, [isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="register-student" options={{ headerShown: true, title: 'Register' }} />
          <Stack.Screen name="students_list" options={{ headerShown: true, title: 'Students' }} />
          <Stack.Screen name="score-entry" options={{ headerShown: true }} />
          <Stack.Screen name="report-cards" options={{ headerShown: true }} />
          <Stack.Screen name="report-view" options={{ headerShown: true, title: 'Report Card' }} />
          <Stack.Screen name="preferences" options={{ headerShown: true, title: 'Preferences' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}