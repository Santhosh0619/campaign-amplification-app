import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getItem, setItem } from '@/lib/storage';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Android emulators reach the host machine through 10.0.2.2; everything else uses localhost.
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (fromExtra ?? `http://${host}:4000`).replace(/\/$/, '');
}

export const API_BASE = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let authToken: string | null = null;
let deviceId: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (t: string | null) => {
  authToken = t;
};
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function ensureDeviceId() {
  if (deviceId) return deviceId;
  const stored = await getItem('device_id');
  if (stored) {
    deviceId = stored;
  } else {
    deviceId = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await setItem('device_id', deviceId);
  }
  return deviceId;
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; timeoutMs?: number; signal?: AbortSignal };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  opts.signal?.addEventListener('abort', () => controller.abort());

  try {
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': await ensureDeviceId(),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const e = (json ?? {}) as { code?: string; message?: string; fields?: Record<string, string> };
      if (res.status === 401 && authToken && onUnauthorized) onUnauthorized();
      throw new ApiError(res.status, e.code ?? 'error', e.message ?? 'Something went wrong. Please try again.', e.fields);
    }
    return json as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(
      0,
      aborted ? 'timeout' : 'network',
      aborted
        ? 'The server took too long to respond. It may be waking up, so try again in a moment.'
        : 'Could not reach the server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Absolute URL for images the backend serves (uploads). External URLs pass through untouched. */
export const assetUrl = (url?: string) => (!url ? undefined : url.startsWith('/') ? `${API_BASE}${url}` : url);

export const errorMessage = (err: unknown) => (err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong.');
