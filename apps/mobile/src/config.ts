/**
 * WealthOS Mobile Environment & API Configuration.
 *
 * Dynamically resolves the backend API URL based on runtime environment,
 * platform defaults (Android emulator vs iOS simulator vs Web),
 * and EXPO_PUBLIC_API_URL environment configuration.
 */

// Dynamically resolve Platform to safely coexist in test and bundle environments
function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    if (rn && rn.Platform && rn.Platform.OS) return rn.Platform.OS;
  } catch {
    // fallback
  }
  return typeof window !== 'undefined' ? 'web' : 'ios';
}

export interface AppConfig {
  apiUrl: string;
  isDevelopment: boolean;
  requestTimeoutMs: number;
}

function resolveApiBaseUrl(): string {
  // 1. Explicit environment variable takes absolute priority
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Headless test environment
  if (process.env.NODE_ENV === 'test') {
    return 'http://127.0.0.1:8000';
  }

  // 3. Physical Android Device with ADB Reverse (adb reverse tcp:8005 tcp:8005)
  if (process.env.EXPO_PUBLIC_USE_ADB_REVERSE === 'true') {
    return 'http://127.0.0.1:8005';
  }

  // 4. Native platform defaults - Connect to Host Machine LAN IP
  return 'http://192.168.31.228:8000';
}

export const config: AppConfig = {
  apiUrl: resolveApiBaseUrl(),
  isDevelopment: typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production',
  requestTimeoutMs: 3000,
};

