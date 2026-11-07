/**
 * Authentication, Identity & Security Types
 */

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'pending_verification' | 'suspended' | 'deactivated';
  is_email_verified: boolean;
  is_mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserProfile;
  mfa_required?: boolean;
  mfa_token?: string;
}

export interface UserSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

export interface MfaSetupResponse {
  secret_key: string;
  provisioning_uri: string;
  backup_recovery_codes: string[];
}

export interface TenantMember {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  status: string;
  joined_at: string;
}

export interface TenantInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export interface SecurityAuditLog {
  id: string;
  event_type: string;
  status: 'success' | 'failure';
  user_id?: string | null;
  tenant_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}
