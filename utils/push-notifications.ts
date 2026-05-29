import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking, AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

const TOKEN_STORAGE_KEY = 'expoPushToken';

/**
 * Call this when the app first loads (root layout).
 * Requests permission immediately and saves token to backend.
 * Returns a status string for debug banner (remove banner in production).
 */
export async function requestAndStorePushToken(): Promise<string> {
  try {
    if (!Device.isDevice || Platform.OS === 'web') {
      return 'skipped: not a real device or web';
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return 'permission denied — user must enable in phone settings';
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Sabino Edu',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const appVersion = Constants.expoConfig?.version ?? null;

    // Save locally so syncPushTokenToBackend can use it after login
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, expoPushToken);

    // Send immediately to public endpoint — no auth needed
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expoPushToken, appVersion }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Backend rejected token');

    return 'success';
  } catch (error: any) {
    return `FAILED: ${error?.message || String(error)}`;
  }
}

/**
 * Call this right after login succeeds.
 * Links the stored token to the school account in device_tokens table.
 */
export async function syncPushTokenToBackend(authToken: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const expoPushToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (!expoPushToken) return;

    const appVersion = Constants.expoConfig?.version ?? null;

    await fetch(`${API_BASE_URL}/api/schools/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: expoPushToken, appVersion }),
    });
  } catch (error) {
    console.warn('[Push] Token sync failed silently:', error);
  }
}

/**
 * Call this when you want to re-check permission (e.g. when app comes to foreground).
 * If previously denied, opens phone Settings so user can enable manually.
 * Returns current permission status.
 */
export async function recheckAndPromptIfNeeded(): Promise<'granted' | 'denied' | 'needs_settings'> {
  try {
    if (!Device.isDevice || Platform.OS === 'web') return 'denied';

    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') {
      // Already granted — make sure token is registered
      await requestAndStorePushToken();
      return 'granted';
    }

    // On Android you can try requesting again
    // On iOS once denied it's permanent — must go to settings
    if (Platform.OS === 'android') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus === 'granted') {
        await requestAndStorePushToken();
        return 'granted';
      }
    }

    // Denied and can't re-request — open settings
    await Linking.openSettings();
    return 'needs_settings';
  } catch (error) {
    console.warn('[Push] Recheck failed:', error);
    return 'denied';
  }
}

/**
 * Sets up a listener that re-checks push permission every time
 * the app comes back to foreground (e.g. after user visited Settings).
 * Call this once in your root layout.
 * Returns the cleanup function to call on unmount.
 */
export function setupForegroundPermissionCheck(
  onStatusChange?: (status: 'granted' | 'denied') => void
): () => void {
  const handleAppStateChange = async (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      // App came back to foreground — re-check permission
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        // Silently register token in case it wasn't saved before
        await requestAndStorePushToken();
        onStatusChange?.('granted');
      } else {
        onStatusChange?.('denied');
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}