/**
 * WealthOS Mobile API Client & Session Manager.
 *
 * Integrates @wealthos/api-client with dynamic environment resolution,
 * token persistence via MobileAuthStorage, and automatic X-Tenant-ID header injection.
 */

import { WealthOSClient } from '@wealthos/api-client';
import { config } from '../config';
import { createSecureStorageDriver, MobileAuthStorage } from '../storage';

export const authStorage = new MobileAuthStorage(createSecureStorageDriver());

export const apiClient = new WealthOSClient({
  baseUrl: config.apiUrl,
  timeoutMs: config.requestTimeoutMs,
});

// Configure silent token refresh interceptor for mobile session persistence
apiClient.setOnTokenRefresh(async () => {
  try {
    const stored = await authStorage.getSession();
    if (!stored?.refreshToken) return null;

    const res = await apiClient.refreshToken(stored.refreshToken);
    if (res.success && res.data) {
      const tokens = res.data as any;
      const newAccessToken = tokens.access_token;
      const newRefreshToken = tokens.refresh_token || stored.refreshToken;
      await authStorage.storeSession({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tenantId: stored.tenantId || '',
      });
      return newAccessToken;
    }
  } catch {
    // Refresh failed or network offline
  }
  return null;
});

export interface UserSessionData {
  user: {
    id: string;
    email: string;
    name: string;
    mfa_enabled?: boolean;
  };
  activeTenant: {
    id: string;
    name: string;
    slug?: string;
    role?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Configure API client credentials in-memory and persist in hardware-backed SecureStore.
 */
export async function setAuthenticatedSession(sessionData: UserSessionData): Promise<void> {
  apiClient.setAuthToken(sessionData.tokens.accessToken);
  apiClient.setTenantId(sessionData.activeTenant.id);

  await authStorage.storeSession({
    accessToken: sessionData.tokens.accessToken,
    refreshToken: sessionData.tokens.refreshToken,
    tenantId: sessionData.activeTenant.id,
  });
}

/**
 * Clear client credentials from in-memory client and wipe hardware-backed SecureStore.
 */
export async function clearAuthenticatedSession(): Promise<void> {
  apiClient.setAuthToken(undefined);
  apiClient.setTenantId(undefined);
  await authStorage.clearSession();
}

/**
 * Attempt to restore an active session from SecureStore on application boot.
 * Validates the token against the backend; refreshes token if expired.
 */
export async function restoreActiveSession(): Promise<UserSessionData | null> {
  try {
    const stored = await authStorage.getSession();
    if (!stored.accessToken || !stored.tenantId) {
      return null;
    }

    apiClient.setAuthToken(stored.accessToken);
    apiClient.setTenantId(stored.tenantId);

    // Validate token against backend /api/v1/auth/me
    const meRes = await apiClient.getMe();
    if (meRes.success && meRes.data) {
      const userData = meRes.data as any;
      return {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.full_name || userData.first_name || 'WealthOS User',
          mfa_enabled: userData.mfa_enabled,
        },
        activeTenant: userData.active_tenant || {
          id: stored.tenantId,
          name: 'Primary Workspace',
        },
        tokens: {
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken || '',
        },
      };
    }

    // Offline resilience: if network is unreachable or timed out, preserve local session
    if (meRes.error?.code === 'NETWORK_ERROR' || meRes.error?.code === 'TIMEOUT') {
      return {
        user: {
          id: 'local-session-user',
          email: 'user@wealthos.local',
          name: 'WealthOS User',
        },
        activeTenant: {
          id: stored.tenantId,
          name: 'Primary Workspace',
        },
        tokens: {
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken || '',
        },
      };
    }

    // If access token expired, attempt refresh
    if (stored.refreshToken) {
      const refreshRes = await apiClient.refreshToken(stored.refreshToken);
      if (refreshRes.success && refreshRes.data) {
        const tokens = refreshRes.data as any;
        const newAccessToken = tokens.access_token;
        const newRefreshToken = tokens.refresh_token || stored.refreshToken;

        apiClient.setAuthToken(newAccessToken);
        await authStorage.storeSession({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tenantId: stored.tenantId,
        });

        const secondMeRes = await apiClient.getMe();
        if (secondMeRes.success && secondMeRes.data) {
          const userData = secondMeRes.data as any;
          return {
            user: {
              id: userData.id,
              email: userData.email,
              name: userData.full_name || userData.first_name || 'WealthOS User',
              mfa_enabled: userData.mfa_enabled,
            },
            activeTenant: userData.active_tenant || {
              id: stored.tenantId,
              name: 'Primary Workspace',
            },
            tokens: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            },
          };
        }
      }
    }

    // Invalid or expired session that could not be refreshed
    await clearAuthenticatedSession();
    return null;
  } catch (err: any) {
    // If network failure occurred, keep stored session active for offline usage
    try {
      const stored = await authStorage.getSession();
      if (stored?.accessToken && stored?.tenantId) {
        return {
          user: {
            id: 'offline-user',
            email: 'user@wealthos.local',
            name: 'WealthOS User',
          },
          activeTenant: {
            id: stored.tenantId,
            name: 'Primary Workspace',
          },
          tokens: {
            accessToken: stored.accessToken,
            refreshToken: stored.refreshToken || '',
          },
        };
      }
    } catch {}
    await clearAuthenticatedSession();
    return null;
  }
}

