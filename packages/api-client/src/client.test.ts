import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WealthOSClient } from './client';

describe('WealthOSClient', () => {
  let client: WealthOSClient;

  beforeEach(() => {
    client = new WealthOSClient({
      baseUrl: 'http://localhost:8000',
      timeoutMs: 5000,
    });
    vi.restoreAllMocks();
  });

  it('sets and retrieves tenant ID and auth token', () => {
    client.setTenantId('tenant-123');
    client.setAuthToken('token-abc');

    expect(client.getTenantId()).toBe('tenant-123');
    expect(client.getAuthToken()).toBe('token-abc');
  });

  it('includes Authorization and X-Tenant-ID headers in requests', async () => {
    client.setTenantId('tenant-123');
    client.setAuthToken('token-abc');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'usr-1', email: 'test@example.com' },
        error: null,
      }),
    });
    global.fetch = mockFetch;

    const res = await client.getMe();

    expect(res.success).toBe(true);
    expect(res.data?.email).toBe('test@example.com');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
          'X-Tenant-ID': 'tenant-123',
        }),
      })
    );
  });

  it('handles API errors gracefully and returns structured envelope', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        detail: 'Invalid credentials or expired session',
      }),
    });
    global.fetch = mockFetch;

    const res = await client.login({ email: 'test@example.com', password: 'bad-password' });

    expect(res.success).toBe(false);
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe('Invalid credentials or expired session');
  });

  it('handles workspace listing and tenant switching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { message: 'Switched context', access_token: 'new-jwt', tenant_id: 'tenant-456' },
        error: null,
      }),
    });
    global.fetch = mockFetch;

    const res = await client.switchWorkspace('tenant-456');

    expect(res.success).toBe(true);
    expect(res.data?.access_token).toBe('new-jwt');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tenants/tenant-456/switch',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
