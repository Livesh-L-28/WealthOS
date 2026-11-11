/**
 * WealthOS Mobile Environment & API Configuration.
 *
 * Dynamically resolves the backend API URL based on runtime environment,
 * platform defaults (Android emulator vs iOS simulator vs Web vs Physical Phone),
 * and custom server URLs configured by the user in Settings.
 */

function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    if (rn && rn.Platform && rn.Platform.OS) return rn.Platform.OS;
  } catch {
    // fallback
  }
  return typeof window !== 'undefined' ? 'web' : 'android';
}

export interface AppConfig {
  apiUrl: string;
  isDevelopment: boolean;
  requestTimeoutMs: number;
}

let activeCustomUrl: string | null = null;

export function setRuntimeApiUrl(url: string | null) {
  if (url && url.trim().length > 0) {
    activeCustomUrl = url.trim().replace(/\/$/, '');
    config.apiUrl = activeCustomUrl;
  } else {
    activeCustomUrl = null;
    config.apiUrl = resolveApiBaseUrl();
  }
}

function resolveApiBaseUrl(): string {
  // 0. Runtime custom server URL takes absolute priority
  if (activeCustomUrl) {
    return activeCustomUrl;
  }

  // 1. Explicit environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Headless test environment
  if (process.env.NODE_ENV === 'test') {
    return 'http://127.0.0.1:8000';
  }

  // 3. Web environment (dynamically use current host)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }

  // 4. Physical Android Device with ADB Reverse
  if (process.env.EXPO_PUBLIC_USE_ADB_REVERSE === 'true') {
    return 'http://127.0.0.1:8005';
  }

  // 5. Native platform default - Host Machine Current LAN IP
  return 'http://192.168.31.120:8000';
}

export const config: AppConfig = {
  apiUrl: resolveApiBaseUrl(),
  isDevelopment: typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production',
  requestTimeoutMs: 3000,
};
