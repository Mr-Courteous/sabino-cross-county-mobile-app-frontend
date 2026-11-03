import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api-config';

/**
 * Parent session helpers.
 * The parent login is stored under its OWN keys (parentToken / parentData),
 * never userToken/userData, so it can't be mistaken for a school or student
 * session by the rest of the app.
 */
const KEYS = { token: 'parentToken', data: 'parentData' };

const getItem = async (k: string): Promise<string | null> => {
  try {
    return Platform.OS === 'web' ? localStorage.getItem(k) : await SecureStore.getItemAsync(k);
  } catch { return null; }
};
const setItem = async (k: string, v: string) => {
  try {
    if (Platform.OS === 'web') localStorage.setItem(k, v);
    else await SecureStore.setItemAsync(k, v);
  } catch { /* ignore */ }
};
const delItem = async (k: string) => {
  try {
    if (Platform.OS === 'web') localStorage.removeItem(k);
    else await SecureStore.deleteItemAsync(k);
  } catch { /* ignore */ }
};

export const getParentToken = () => getItem(KEYS.token);

export const getParentData = async (): Promise<any | null> => {
  const raw = await getItem(KEYS.data);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export const saveParentSession = async (token: string, parent: any) => {
  await setItem(KEYS.token, token);
  await setItem(KEYS.data, JSON.stringify(parent));
};

export const clearParentSession = async () => {
  await delItem(KEYS.token);
  await delItem(KEYS.data);
  childTokens.clear();
};

export class SessionExpiredError extends Error {
  constructor() { super('Your session has expired. Please log in again.'); }
}

/** Call the API as the logged-in parent. Throws SessionExpiredError on 401/403. */
export const parentFetch = async (path: string, init: { method?: string; body?: any } = {}) => {
  const token = await getParentToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 || (res.status === 403 && !path.includes('/token'))) {
    const data = await res.clone().json().catch(() => ({}));
    if (data?.code === 'TOKEN_EXPIRED' || data?.code === 'TOKEN_INVALID' || res.status === 401) {
      await clearParentSession();
      throw new SessionExpiredError();
    }
  }
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
};

// ── Child tokens (read-only student-type tokens, valid 1h) ──────────────
const childTokens = new Map<number, { token: string; schoolActive: boolean; expiresAt: number }>();

export const getChildAccess = async (studentId: number) => {
  const cached = childTokens.get(studentId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;
  const r = await parentFetch(`/api/parents/children/${studentId}/token`, { method: 'POST' });
  if (!r.ok) throw new Error(r.json?.error || 'Could not open this child.');
  const entry = { token: r.json.data.token, schoolActive: !!r.json.data.schoolActive, expiresAt: Date.now() + 55 * 60_000 };
  childTokens.set(studentId, entry);
  return entry;
};

/** Call an existing student endpoint as the child (view-only). */
export const childFetch = async (studentId: number, path: string, init: { method?: string; body?: any } = {}) => {
  const access = await getChildAccess(studentId);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}` },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return res;
};

export { API_BASE_URL };
