// ─────────────────────────────────────────────────────────────
// utils/subscription-sync.ts
//
// Shared helper used right after a RevenueCat (Google Play / App
// Store) purchase or restore to confirm the backend has activated
// the subscription.
//
// WHY THIS EXISTS (bug context):
// RevenueCat's REST API is eventually consistent. Right after
// `Purchases.purchasePackage()` resolves on-device, the money has
// already moved, but `GET /v1/subscribers/{id}` on RevenueCat's side
// can take a few seconds to catch up — worse for a subscriber's very
// first purchase. Calling the backend's /api/schools/sync-subscription
// exactly once, immediately after purchase, could hit that gap: the
// backend would see no entitlement yet, leave payment_status as
// 'pending', and every following request would 402 — which the app's
// global fetch interceptor (app/_layout.tsx) turns into "bounce back
// to /pricing", over and over.
//
// This helper retries the sync call a few times with a short delay
// instead of giving up after one shot. The backend (routes/schools.js
// sync-subscription) also retries on its side against RevenueCat
// directly — this is a second, client-side layer of the same fix so
// a slow network or an even longer RC propagation delay doesn't strand
// the user either.
// ─────────────────────────────────────────────────────────────
import { API_BASE_URL } from '@/utils/api-service';

export type SyncResult = { isActive: boolean; expiry?: string | null } | null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function syncOnce(token: string): Promise<SyncResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schools/sync-subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Repeatedly asks the backend to confirm the purchase with RevenueCat,
 * instead of accepting the first "not active yet" as final.
 *
 * @param token           Auth token for the request.
 * @param onAttempt       Optional callback fired before each attempt —
 *                         handy for updating a "Confirming payment
 *                         (2/4)..." message in the UI.
 * @param maxAttempts     Default 4 attempts.
 * @param delayMs         Default 2.5s between attempts.
 */
export async function syncSubscriptionWithRetries(
  token: string,
  onAttempt?: (attempt: number, maxAttempts: number) => void,
  maxAttempts = 4,
  delayMs = 2500
): Promise<SyncResult> {
  let lastResult: SyncResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt, maxAttempts);
    lastResult = await syncOnce(token);

    if (lastResult?.isActive) return lastResult;

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  return lastResult;
}
