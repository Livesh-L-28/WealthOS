import {
  ApiResponse,
  HealthCheckResponse,
  UserProfile,
  AuthTokens,
  LoginResponse,
  UserSession,
  MfaSetupResponse,
  TenantSummary,
  TenantMember,
  TenantInvitation,
  SecurityAuditLog,
} from '@wealthos/shared-types';

export interface ClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  tenantId?: string;
  authToken?: string;
  onTokenRefresh?: () => Promise<string | null>;
}

export class WealthOSClient {
  private baseUrl: string;
  private timeoutMs: number;
  private tenantId?: string;
  private authToken?: string;
  private onTokenRefresh?: () => Promise<string | null>;
  private isRefreshing = false;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 45000;
    this.tenantId = config.tenantId;
    this.authToken = config.authToken;
    this.onTokenRefresh = config.onTokenRefresh;
  }

  public setOnTokenRefresh(callback: (() => Promise<string | null>) | undefined): void {
    this.onTokenRefresh = callback;
  }

  public setTenantId(tenantId: string | undefined): void {
    this.tenantId = tenantId;
  }

  public getTenantId(): string | undefined {
    return this.tenantId;
  }

  public setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  public getAuthToken(): string | undefined {
    return this.authToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials ?? 'include',
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (
          response.status === 401 &&
          this.onTokenRefresh &&
          !this.isRefreshing &&
          !endpoint.includes('/auth/login') &&
          !endpoint.includes('/auth/refresh')
        ) {
          this.isRefreshing = true;
          try {
            const newToken = await this.onTokenRefresh();
            if (newToken) {
              this.setAuthToken(newToken);
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              };
              const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
                credentials: options.credentials ?? 'include',
                signal: controller.signal,
              });
              const retryData = await retryResponse.json().catch(() => null);
              if (retryResponse.ok) {
                return retryData as ApiResponse<T>;
              }
            }
          } catch {
            // Refresh failed, proceed to return original 401 response
          } finally {
            this.isRefreshing = false;
          }
        }

        return {
          success: false,
          data: null,
          error: data?.error || {
            code: `HTTP_${response.status}`,
            message: data?.detail || response.statusText || 'Request failed',
            details: data,
          },
        };
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === 'AbortError';
      return {
        success: false,
        data: null,
        error: {
          code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isAbort
            ? `Request timed out after ${this.timeoutMs}ms`
            : (err as Error)?.message || 'Unknown network error',
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ==========================================
  // Health & Diagnostics
  // ==========================================

  public async getHealth(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/health');
  }

  public async getLiveness(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/healthz');
  }

  public async getReadiness(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/readyz');
  }

  // ==========================================
  // Authentication & Identity
  // ==========================================

  public async register(payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    personal_workspace_name?: string;
  }): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: {
    email: string;
    password: string;
    remember_me?: boolean;
  }): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async sendOtp(payload: {
    identifier: string;
  }): Promise<ApiResponse<{ success: boolean; message: string; identifier: string; debug_otp?: string }>> {
    return this.request<{ success: boolean; message: string; identifier: string; debug_otp?: string }>(
      '/api/v1/auth/otp/send',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async verifyOtp(payload: {
    identifier: string;
    otp: string;
  }): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyMfa(payload: {
    mfa_token: string;
    code?: string;
    recovery_code?: string;
  }): Promise<ApiResponse<AuthTokens>> {
    return this.request<AuthTokens>('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async refreshToken(refreshToken?: string): Promise<ApiResponse<AuthTokens>> {
    return this.request<AuthTokens>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
  }

  public async getMe(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/api/v1/auth/me');
  }

  public async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  public async logoutAll(): Promise<ApiResponse<{ message: string; revoked_count: number }>> {
    return this.request<{ message: string; revoked_count: number }>('/api/v1/auth/logout-all', {
      method: 'POST',
    });
  }

  public async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  }

  public async resendVerification(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/resend-verification', {
      method: 'POST',
    });
  }

  public async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(payload: {
    token: string;
    new_password: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async changePassword(payload: {
    current_password: string;
    new_password: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getSessions(): Promise<ApiResponse<UserSession[]>> {
    return this.request<UserSession[]>('/api/v1/auth/sessions');
  }

  public async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Two-Factor Authentication (MFA)
  // ==========================================

  public async setupMfa(): Promise<ApiResponse<MfaSetupResponse>> {
    return this.request<MfaSetupResponse>('/api/v1/auth/mfa/setup', {
      method: 'POST',
    });
  }

  public async activateMfa(code: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/mfa/activate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  public async disableMfa(currentPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword }),
    });
  }

  public async regenerateRecoveryCodes(currentPassword: string): Promise<ApiResponse<{ backup_recovery_codes: string[] }>> {
    return this.request<{ backup_recovery_codes: string[] }>('/api/v1/auth/mfa/recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword }),
    });
  }

  // ==========================================
  // Workspaces & Multi-Tenancy
  // ==========================================

  public async listWorkspaces(): Promise<ApiResponse<TenantSummary[]>> {
    return this.request<TenantSummary[]>('/api/v1/tenants');
  }

  public async createWorkspace(payload: {
    name: string;
    type?: string;
    base_currency?: string;
  }): Promise<ApiResponse<TenantSummary>> {
    return this.request<TenantSummary>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getWorkspace(tenantId: string): Promise<ApiResponse<TenantSummary>> {
    return this.request<TenantSummary>(`/api/v1/tenants/${tenantId}`);
  }

  public async updateWorkspace(
    tenantId: string,
    payload: { name?: string; base_currency?: string; settings?: Record<string, unknown> }
  ): Promise<ApiResponse<TenantSummary>> {
    return this.request<TenantSummary>(`/api/v1/tenants/${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async switchWorkspace(tenantId: string): Promise<ApiResponse<{ message: string; access_token: string; tenant_id: string }>> {
    return this.request<{ message: string; access_token: string; tenant_id: string }>(
      `/api/v1/tenants/${tenantId}/switch`,
      { method: 'POST' }
    );
  }

  public async listMembers(tenantId: string): Promise<ApiResponse<TenantMember[]>> {
    return this.request<TenantMember[]>(`/api/v1/tenants/${tenantId}/members`);
  }

  public async inviteMember(
    tenantId: string,
    payload: { email: string; role?: string }
  ): Promise<ApiResponse<TenantInvitation>> {
    return this.request<TenantInvitation>(`/api/v1/tenants/${tenantId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listInvitations(tenantId: string): Promise<ApiResponse<TenantInvitation[]>> {
    return this.request<TenantInvitation[]>(`/api/v1/tenants/${tenantId}/invitations`);
  }

  public async revokeInvitation(tenantId: string, invitationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/tenants/${tenantId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  public async updateMemberRole(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/tenants/${tenantId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  public async removeMember(tenantId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/tenants/${tenantId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  public async transferOwnership(
    tenantId: string,
    payload: { new_owner_user_id: string; current_password: string }
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/tenants/${tenantId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getAuditLogs(tenantId: string, limit: number = 50): Promise<ApiResponse<SecurityAuditLog[]>> {
    return this.request<SecurityAuditLog[]>(`/api/v1/tenants/${tenantId}/audit-logs?limit=${limit}`);
  }
}
