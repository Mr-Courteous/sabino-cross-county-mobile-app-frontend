import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

// On app open — primary, sends immediately
export async function requestAndStorePushToken(): Promise<string> {
  try {
    console.log('[Push] Step 1 - function called');

    if (!Device.isDevice || Platform.OS === 'web') {
      console.log('[Push] Step 1 FAILED - not a real device or web');
      return 'FAILED: Not a real device or web';
    }

    console.log('[Push] Step 2 - checking permission');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Push] Step 2 - current status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Push] Step 2 - after request status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Step 2 FAILED - permission not granted');
      return 'FAILED: Permission not granted';
    }

    console.log('[Push] Step 3 - setting android channel');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Sabino Edu',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    console.log('[Push] Step 4 - getting push token');
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log('[Push] Step 4 - projectId:', projectId);

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Step 4 - token received:', expoPushToken);

    const appVersion = Constants.expoConfig?.version ?? null;
    console.log('[Push] Step 5 - saving to SecureStore');
    await SecureStore.setItemAsync('expoPushToken', expoPushToken);

    console.log('[Push] Step 6 - sending to backend:', `${API_BASE_URL}/api/notifications/register-token`);
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expoPushToken, appVersion }),
    });

    const data = await response.json();
    console.log('[Push] Step 6 - backend response:', response.status, data);

    return 'success';

  } catch (error: any) {
    console.error('[Push] CRASHED at:', error);
    return `FAILED: ${error?.message || error}`;
  }
}

// On login — secondary, just links school identity to existing token
export async function syncPushTokenToBackend(authToken: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const expoPushToken = await SecureStore.getItemAsync('expoPushToken');
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
    console.warn('[Push] Token sync failed:', error);
  }
}