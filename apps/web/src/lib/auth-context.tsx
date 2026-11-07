'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, TenantSummary } from '@wealthos/shared-types';
import { apiClient } from './api';

interface AuthContextType {
  user: UserProfile | null;
  workspaces: TenantSummary[];
  currentWorkspace: TenantSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (tenantId: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<TenantSummary[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<TenantSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const res = await apiClient.listWorkspaces();
      if (res.success && res.data) {
        setWorkspaces(res.data);
        const storedTid = localStorage.getItem('wealthos_current_tenant_id');
        let active = res.data.find((w) => w.id === storedTid);
        if (!active && res.data.length > 0) {
          active = res.data[0];
        }
        if (active) {
          setCurrentWorkspace(active);
          apiClient.setTenantId(active.id);
          localStorage.setItem('wealthos_current_tenant_id', active.id);
        }
      }
    } catch {
      // Ignore network errors during background refresh
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        // Attempt token refresh via httpOnly cookie
        const refreshRes = await apiClient.refreshToken();
        if (refreshRes.success && refreshRes.data) {
          apiClient.setAuthToken(refreshRes.data.access_token);
          localStorage.setItem('wealthos_access_token', refreshRes.data.access_token);
          setUser(refreshRes.data.user);
        } else {
          setUser(null);
          apiClient.setAuthToken(undefined);
          localStorage.removeItem('wealthos_access_token');
        }
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      await refreshWorkspaces();
      setIsLoading(false);
    };

    initializeAuth();
  }, [refreshUser, refreshWorkspaces]);

  const login = async (accessToken: string, userProfile: UserProfile) => {
    apiClient.setAuthToken(accessToken);
    localStorage.setItem('wealthos_access_token', accessToken);
    setUser(userProfile);
    await refreshWorkspaces();
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      apiClient.setAuthToken(undefined);
      apiClient.setTenantId(undefined);
      localStorage.removeItem('wealthos_access_token');
      localStorage.removeItem('wealthos_current_tenant_id');
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      window.location.href = '/auth/login';
    }
  };

  const switchWorkspace = async (tenantId: string): Promise<boolean> => {
    try {
      const res = await apiClient.switchWorkspace(tenantId);
      if (res.success && res.data) {
        apiClient.setAuthToken(res.data.access_token);
        localStorage.setItem('wealthos_access_token', res.data.access_token);
        apiClient.setTenantId(tenantId);
        localStorage.setItem('wealthos_current_tenant_id', tenantId);

        const target = workspaces.find((w) => w.id === tenantId);
        if (target) {
          setCurrentWorkspace(target);
        } else {
          await refreshWorkspaces();
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        switchWorkspace,
        refreshUser,
        refreshWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
