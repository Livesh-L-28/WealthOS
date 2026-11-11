/**
 * WealthOS Client-Side Idempotency Engine.
 *
 * Prevents double-debiting, duplicate submissions, and network replay glitches.
 * Generates cryptographically unique idempotency tokens per user interaction and
 * caches processed tokens in memory/storage with a 24-hour TTL window.
 */

import { generateSecureRandomHex } from './crypto';
import { logger } from './logger';

export interface IdempotencyRecord {
  key: string;
  createdAt: number;
  status: 'PENDING' | 'COMMITTED' | 'FAILED';
  responsePayload?: any;
}

const MEMORY_CACHE = new Map<string, IdempotencyRecord>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a clean UUID-v4 style idempotency key.
 */
export function generateIdempotencyKey(): string {
  const hex = generateSecureRandomHex(16);
  // Format as standard UUID 8-4-4-4-12
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Records an idempotency key before sending a mutating request.
 * Returns true if this is a fresh key, or false if already processed (duplicate detected).
 */
export function registerIdempotencyKey(key: string): boolean {
  cleanExpiredKeys();
  if (MEMORY_CACHE.has(key)) {
    const existing = MEMORY_CACHE.get(key)!;
    if (existing.status === 'COMMITTED' || existing.status === 'PENDING') {
      logger.warn(`Duplicate action blocked by idempotency shield: ${key}`);
      return false;
    }
  }
  MEMORY_CACHE.set(key, {
    key,
    createdAt: Date.now(),
    status: 'PENDING',
  });
  return true;
}

/**
 * Marks an idempotency key as successfully committed.
 */
export function commitIdempotencyKey(key: string, response?: any): void {
  const record = MEMORY_CACHE.get(key);
  if (record) {
    record.status = 'COMMITTED';
    record.responsePayload = response;
  }
}

/**
 * Marks an idempotency key as failed so a user can retry if appropriate.
 */
export function failIdempotencyKey(key: string): void {
  MEMORY_CACHE.delete(key);
}

/**
 * Purges keys older than 24 hours.
 */
function cleanExpiredKeys(): void {
  const now = Date.now();
  for (const [k, v] of MEMORY_CACHE.entries()) {
    if (now - v.createdAt > TTL_MS) {
      MEMORY_CACHE.delete(k);
    }
  }
}
