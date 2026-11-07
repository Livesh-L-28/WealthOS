/**
 * Multi-Tenancy & Workspace Role Definitions
 */

export enum TenantType {
  PERSONAL = 'PERSONAL',
  HOUSEHOLD = 'HOUSEHOLD',
  FAMILY_OFFICE = 'FAMILY_OFFICE',
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  AUDITOR = 'AUDITOR',
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  base_currency: string;
  role: WorkspaceRole;
}

