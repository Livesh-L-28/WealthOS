import { WealthOSClient } from '@wealthos/api-client';

const API_BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.BACKEND_API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export const apiClient = new WealthOSClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 45000,
});

// Initialize client with stored preferences if available in browser
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
