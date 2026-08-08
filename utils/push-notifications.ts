/**
 * utils/push-notifications.ts
 *
 * Two-phase push token strategy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PHASE 1 — App open, no auth needed
 *   requestAndStorePushToken()
 *   → Asks OS for permission, gets Expo token, POSTs to the public endpoint.
 *   → Saved to `device_tokens` with school_id = NULL immediately.
 *   → You can already reach this device with send-all / send-anonymous.
 *
 * PHASE 2 — After login, link the token to the user's identity
 *   syncPushTokenToBackend(jwt, 'school')   → updates `device_tokens`.school_id
 *   syncPushTokenToBackend(jwt, 'student')  → upserts into `student_push_tokens`
 *
 * For SCHOOLS this means ONE row in `device_tokens`:
 *   open app  →  school_id = NULL
 *   login     →  school_id = X       (same row, updated in place)
 *
 * For STUDENTS this means TWO rows across TWO tables ("saves as two"):
 *   open app  →  device_tokens row,        school_id = NULL  (for broadcasts)
 *   login     →  student_push_tokens row,  student_id = Y    (for student-targeted sends)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  _layout.tsx (RootLayout — runs on every app open):
 *    useEffect(() => { requestAndStorePushToken(); }, []);
 *    useEffect(() => { const cleanup = setupForegroundPermissionCheck(); return cleanup; }, []);
 *
 *  (auth)/index.tsx (school login success):
 *    syncPushTokenToBackend(jwtToken, 'school');
 *
 *  (student)/index.tsx (student login success):
 *    syncPushTokenToBackend(jwtToken, 'student');
 *
 *  (auth)/complete-registration.tsx (new school registration success):
 *    syncPushTokenToBackend(jwtToken, 'school');
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Gets the Expo push token string.
 * Returns null on simulators, web, or if the user denies permission.
 */
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice || Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // projectId required for Expo SDK 49+
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const result = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  return result.data ?? null;
}

/** Android requires an explicit channel. Safe no-op on iOS. */
function ensureAndroidChannel(): void {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

function getAppVersion(): string | null {
  return (
    Constants.expoConfig?.version ??
    Constants.manifest?.version ??
    null
  );
}

// ─── Phase 1: Public registration (no auth) ─────────────────────────────────

/**
 * Call this in RootLayout on every app open (empty-dep useEffect).
 *
 * Requests OS permission → gets Expo token → POSTs to the public
 * /api/notifications/register-token endpoint (no JWT required).
 *
 * The token is stored in `device_tokens` with school_id = NULL so you
 * can reach the device immediately with broadcast / anonymous sends,
 * even before the user ever logs in.
 *
 * Non-blocking — fire and forget. Never throws.
 */
export async function requestAndStorePushToken(): Promise<void> {
  try {
    ensureAndroidChannel();

    const token = await getExpoPushToken();
    if (!token) return;

    await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appVersion: getAppVersion() }),
    });
  } catch {
    // Intentionally silent — a failed token save is not user-visible.
  }
}

// ─── Phase 2: Link token to identity after login / registration ──────────────

/**
 * Call this immediately after a successful login or registration,
 * once you have a JWT in hand.
 *
 * userType 'school'
 *   POSTs to /api/schools/push-token (auth required).
 *   Updates the existing `device_tokens` row: school_id is filled in.
 *   Result: one row in `device_tokens`, fully linked.
 *
 * userType 'student'
 *   POSTs to /api/students/push-token (auth required).
 *   Upserts into `student_push_tokens` keyed by student_id.
 *   The original anonymous row in `device_tokens` (school_id = NULL) is
 *   intentionally left in place — it keeps the student reachable via
 *   send-all and send-anonymous. This is the "saves as two" behaviour.
 *
 * Non-blocking — fire and forget. Never throws.
 */
export async function syncPushTokenToBackend(
  jwtToken: string,
  userType: 'school' | 'student' = 'school'
): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;

    const endpoint =
      userType === 'student'
        ? `${API_BASE_URL}/api/students/push-token`
        : `${API_BASE_URL}/api/schools/push-token`;

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ token, appVersion: getAppVersion() }),
    });
  } catch {
    // Intentionally silent — auth flow must not be blocked by this.
  }
}

// ─── Foreground notification display setup ───────────────────────────────────

/**
 * Call once in RootLayout to handle foreground notifications.
 * Returns a cleanup function for useEffect.
 *
 *   useEffect(() => {
 *     const cleanup = setupForegroundPermissionCheck();
 *     return cleanup;
 *   }, []);
 */
export function setupForegroundPermissionCheck(): () => void {
  const subscription = Notifications.addNotificationReceivedListener(() => {
    // Extend here to handle foreground notifications, e.g. show an
    // in-app banner instead of the system tray notification.
  });

  return () => subscription.remove();
}