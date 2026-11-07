import { WealthOSClient } from '@wealthos/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = new WealthOSClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 15000,
});

// Initialize client with stored tokens if available in browser
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('wealthos_access_token');
  const tenantId = localStorage.getItem('wealthos_current_tenant_id');
  if (token) {
    apiClient.setAuthToken(token);
  }
  if (tenantId) {
    apiClient.setTenantId(tenantId);
  }
}
