import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Platform, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '@/contexts/theme-context';
import { getUserTypeFromToken } from '@/utils/jwt-decoder';

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
          console.log('✅ Token found, decoding...');
          const type = getUserTypeFromToken(token);
          setUserType(type);
          setIsSignedIn(true);
          console.log(`🎯 User type detected: ${type}`);
        } else {
          console.log('❌ No token found');
          setIsSignedIn(false);
          setUserType(null);
        }
      } catch (e) {
        console.error('❌ Auth check error:', e);
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
      // Re-fetch token to handle the transition from login -> dashboard
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const currentRoot = segments[0];
      const inAuthGroup = !segments.length || currentRoot === '(auth)' || currentRoot === 'index';
      const inStudentGroup = currentRoot === '(student)';
      const inDashboard = currentRoot === 'dashboard';

      if (!token) {
        console.log('🔄 No token found, redirecting to home');
        // No token - redirect to home/auth
        if (!inAuthGroup) {
          router.replace('/' as any);
        }
        return;
      }

      // Decode token to determine user type
      const detectedUserType = getUserTypeFromToken(token);
      console.log(`🔍 Current route: ${currentRoot}, Detected user type: ${detectedUserType}`);

      // Handle student routing
      if (detectedUserType === 'student') {
        if (!inStudentGroup) {
          console.log('🚀 Routing student to /(student)/dashboard');
          router.replace('/(student)/dashboard' as any);
        }
        return;
      }

      // Handle school routing
      if (detectedUserType === 'school') {
        if (inStudentGroup || inAuthGroup) {
          console.log('🚀 Routing school to /dashboard');
          router.replace('/dashboard' as any);
        }
        return;
      }

      // Invalid token - redirect to auth
      if (!inAuthGroup) {
        console.log('⚠️ Invalid or unrecognized token, redirecting to home');
        router.replace('/' as any);
      }
    };

    performRedirect();
  }, [isLoading, segments]); // Re-run when URL segments change

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
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
        <Stack.Screen name="report-view.tsx" options={{ headerShown: true, title: 'Report Card' }} />
        <Stack.Screen name="preferences" options={{ headerShown: true, title: 'Preferences' }} />

      </Stack>
    </ThemeProvider>
  );
}