import { ApiResponse, HealthCheckResponse } from '@wealthos/shared-types';

export interface ClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  tenantId?: string;
  authToken?: string;
}

export class WealthOSClient {
  private baseUrl: string;
  private timeoutMs: number;
  private tenantId?: string;
  private authToken?: string;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.tenantId = config.tenantId;
    this.authToken = config.authToken;
  }

  public setTenantId(tenantId: string | undefined): void {
    this.tenantId = tenantId;
  }

  public setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
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
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: data?.error || {
            code: `HTTP_${response.status}`,
            message: response.statusText || 'Request failed',
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
          message: isAbort ? `Request timed out after ${this.timeoutMs}ms` : (err as Error)?.message || 'Unknown network error',
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Healthcheck & Diagnostics
   */
  public async getHealth(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/health');
  }

  public async getLiveness(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/healthz');
  }

  public async getReadiness(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/readyz');
  }
}
