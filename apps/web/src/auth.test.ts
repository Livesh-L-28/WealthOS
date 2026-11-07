import { describe, it, expect } from 'vitest';

export function validateNistPassword(password: string) {
  return {
    length: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    isValid:
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
  };
}

export function hasPermission(userRoles: string[], requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };
  const highest = Math.max(...userRoles.map((r) => roleHierarchy[r.toLowerCase()] || 0));
  const target = roleHierarchy[requiredRole.toLowerCase()] || 0;
  return highest >= target;
}

describe('Web Application Auth & Security Utilities', () => {
  describe('NIST SP 800-63B Password Validation', () => {
    it('rejects passwords shorter than 12 characters', () => {
      const res = validateNistPassword('Short1!Aa');
      expect(res.length).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('rejects passwords without special characters', () => {
      const res = validateNistPassword('WealthOS2026MasterPassword');
      expect(res.hasSpecial).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      const res = validateNistPassword('WealthOSMasterPassword!');
      expect(res.hasDigit).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('accepts compliant enterprise passwords', () => {
      const res = validateNistPassword('WealthOS-Secured#2026');
      expect(res.length).toBe(true);
      expect(res.hasUpper).toBe(true);
      expect(res.hasLower).toBe(true);
      expect(res.hasDigit).toBe(true);
      expect(res.hasSpecial).toBe(true);
      expect(res.isValid).toBe(true);
    });
  });

  describe('RBAC Role Hierarchy Verification', () => {
    it('allows owner to perform all subordinate actions', () => {
      expect(hasPermission(['owner'], 'admin')).toBe(true);
      expect(hasPermission(['owner'], 'member')).toBe(true);
      expect(hasPermission(['owner'], 'viewer')).toBe(true);
    });

    it('allows admin to perform member and viewer actions, but not owner-restricted', () => {
      expect(hasPermission(['admin'], 'admin')).toBe(true);
      expect(hasPermission(['admin'], 'member')).toBe(true);
      expect(hasPermission(['admin'], 'owner')).toBe(false);
    });

    it('denies viewer write or administrative privileges', () => {
      expect(hasPermission(['viewer'], 'member')).toBe(false);
      expect(hasPermission(['viewer'], 'admin')).toBe(false);
      expect(hasPermission(['viewer'], 'viewer')).toBe(true);
    });
  });
});
