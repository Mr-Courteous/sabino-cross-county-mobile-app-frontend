import { Stack } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { ensurePushPermission, requestAndStorePushToken, setupForegroundPermissionCheck, setupPushTokenListener } from '@/utils/push-notifications';
import { useRouter, useSegments } from 'expo-router';
import { Platform, ActivityIndicator, View, AppState, Alert, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { getUserTypeFromToken } from '@/utils/jwt-decoder';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error if already hidden */
});

// Global reference for navigation state to be used by the top-level interceptor
const navState = {
  router: null as any,
  segments: [] as string[],
  isRedirecting: false
};

// Patch global.fetch IMMEDIATELY at load time to avoid race conditions with child components
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await originalFetch(input, init);

  if (response.status === 402) {
    const currentSegments = navState.segments;
    const currentRouter = navState.router;

    console.log(`🔒 [Interceptor] 402 detected on: ${input}`);

    if (currentSegments[0] === 'pricing') return response;

    // Parents never see the subscription / pricing screens: a 402 on a child's
    // data just means that school's account is inactive, and the parent
    // screens show that message themselves.
    if (currentSegments[0] === '(parent)') return response;

    if (!navState.isRedirecting) {
      navState.isRedirecting = true;

      if (!currentRouter) {
        console.warn('⚠️ [Interceptor] 402 received but router not ready. Redirect will happen on mount.');
        // We set isRedirecting to true so we don't spam, and we'll check it in the component
        return response;
      }

      const clone = response.clone();
      clone.json().then((data: any) => {
        const err: string = data?.error || data?.message || '';
        console.warn(`🔒 [Interceptor] 402 Detail: "${err}"`);

        const isSubError =
          err.toLowerCase().includes('subscription') ||
          err.toLowerCase().includes('subscribe') ||
          err.toLowerCase().includes('payment') ||
          err.toLowerCase().includes('expired');

        if (isSubError) {
          const isStudent = currentSegments[0] === '(student)';
          const targetPath = isStudent ? '/(student)/access-denied' : '/pricing';

          console.warn(`⚠️ [Interceptor] Subscription error — redirecting to ${targetPath}`);
          currentRouter.replace(targetPath as any);
        } else {
          navState.isRedirecting = false;
        }
      }).catch(() => {
        const isStudent = currentSegments[0] === '(student)';
        const targetPath = isStudent ? '/(student)/access-denied' : '/pricing';

        console.warn(`⚠️ [Interceptor] 402 detected (fallback) — redirecting to ${targetPath}`);
        currentRouter.replace(targetPath as any);
      });

      setTimeout(() => { navState.isRedirecting = false; }, 5000);
    }
  }

  return response;
};

function RootLayoutContent() {
  const { recordActivity, logout, isSignedIn: authIsSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  // Handle inactivity
  useEffect(() => {
    if (!authIsSignedIn) return;

    // Periodic check
    const interval = setInterval(() => {
      // The checkInactivity logic is inside AuthProvider, 
      // but we need to ensure the AppState listener is active.
    }, 60000);

    return () => clearInterval(interval);
  }, [authIsSignedIn]);

  // Handle hiding splash screen
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => { });
      setIsLoading(false);
    }
  }, [fontsLoaded, fontError]);

  // Sync navigation state to the global interceptor
  useEffect(() => {
    navState.router = router;
    navState.segments = segments;
  }, [router, segments]);

  // Redirection logic
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const performRedirect = async () => {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const currentRoot = segments[0] as any;
      const inAuthGroup = !segments.length || currentRoot === '(auth)' || currentRoot === 'index';
      const inStudentGroup = currentRoot === '(student)';
      const inParentGroup = currentRoot === '(parent)';
      const isPricingPage = currentRoot === 'pricing';
      const isAccessDenied = segments.includes('access-denied');

      const isPublicStudentRoute = inStudentGroup && (!segments[1] || ['verify-email', 'verify-otp', 'register', 'forgot-password', 'verify-reset-otp', 'reset-password'].includes(segments[1]));

      if (!token) {
        // Parent sessions are stored separately (parentToken), so the parent area
        // is allowed here; its own screens check the parent login.
        if (!inAuthGroup && !isPublicStudentRoute && !isPricingPage && !isAccessDenied && !inParentGroup) {
          router.replace('/' as any);
        }
        return;
      }

      const detectedUserType = getUserTypeFromToken(token);

      if (detectedUserType === 'student') {
        if (!inStudentGroup && !isAccessDenied) {
          router.replace('/(student)/dashboard' as any);
        }
        return;
      }

      if (detectedUserType === 'school') {
        // If they are on a reset password route, let them stay
        const isResetRoute = currentRoot === '(auth)' && ['forgot-password', 'verify-reset-otp', 'reset-password'].includes(segments[1] as string);

        // If they are on dashboard, pricing, or reset routes, let them stay.
        // Otherwise (if they are in auth group like login/register), move to dashboard.
        if (inAuthGroup && !isResetRoute) {
          router.replace('/dashboard' as any);
        }
        return;
      }

      if (!inAuthGroup && !isPricingPage) {
        router.replace('/' as any);
      }
    };

    performRedirect();
  }, [isLoading, segments, fontsLoaded, router]);

  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        recordActivity();
        return false;
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="register-student" options={{ headerShown: true, title: 'Register' }} />
        <Stack.Screen name="students_list" options={{ headerShown: true, title: 'Students' }} />
        <Stack.Screen name="score-entry" options={{ headerShown: true }} />
        <Stack.Screen name="assessment-settings" options={{ headerShown: false }} />
        <Stack.Screen name="academic-setup" options={{ headerShown: false }} />
        <Stack.Screen name="parent-access" options={{ headerShown: false }} />
        <Stack.Screen name="attendance" options={{ headerShown: true }} />
        <Stack.Screen name="report-cards" options={{ headerShown: true }} />
        <Stack.Screen name="report-view" options={{ headerShown: true, title: 'Report Card' }} />
        <Stack.Screen name="preferences" options={{ headerShown: true, title: 'Preferences' }} />
        <Stack.Screen name="pricing" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

// Only notifications delivered by the backend are presented to the user.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const permissionPromptShown = useRef(false);

  useEffect(() => {
    const checkNotificationAccess = async () => {
      if (Platform.OS === 'web') return;

      const enabled = await ensurePushPermission();
      if (enabled) {
        await requestAndStorePushToken();
        return;
      }

      if (!permissionPromptShown.current) {
        permissionPromptShown.current = true;
        Alert.alert(
          'Notifications are disabled',
          'Enable notifications in your phone settings to receive important updates.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    };

    checkNotificationAccess();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkNotificationAccess();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const cleanup = setupForegroundPermissionCheck();
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = setupPushTokenListener();
    return cleanup;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}