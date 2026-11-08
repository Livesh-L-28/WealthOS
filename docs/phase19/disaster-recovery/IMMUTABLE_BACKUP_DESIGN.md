# WealthOS Phase 19 — Immutable Backup & Cryptographic Architecture

## Overview
WealthOS enforces an authenticated, zero-trust backup architecture ensuring that backup artifacts are immutable, tamper-evident, and cryptographically protected before storage in S3/MinIO.

---

## 1. Envelope Encryption Format (`WOSGCM01`)
Backups are encrypted using AES-256 in Galois/Counter Mode (GCM):

```
+------------------+-------------------+--------------------+--------------------+
| Magic Header     | Nonce / IV        | Ciphertext Payload | Authentication Tag |
| 8 Bytes: WOSGCM01| 12 Bytes (Random) | N Bytes            | 16 Bytes (GCM Tag) |
+------------------+-------------------+--------------------+--------------------+
```

### 1.1 Key Derivation
Master secrets are never stored alongside data or in code. Key material is derived using HKDF-SHA256:
- **Salt**: `wealthos_backup_key_derivation_salt_v1`
- **Info**: `wealthos_postgresql_backup_encryption`
- **Key Length**: 256 bits (32 bytes)

### 1.2 Cryptographic Manifest
Every backup generates a sidecar JSON manifest:
```json
{
  "backup_name": "wealthos_20261108_180000.dump",
  "database": "wealthos",
  "encrypted_sha256": "4b5c...89d4",
  "plaintext_sha256": "9a1e...2f10",
  "encryption_algorithm": "AES-256-GCM",
  "kdf": "HKDF-SHA256",
  "created_at": "2026-11-08T18:00:00Z"
}
```

## 2. Immutability & Object Locking
- In production S3-compatible object storage, backups are deposited with **Object Lock (Compliance Mode)** and a 90-day retention period.
- No user, IAM role, or administrative account can delete or overwrite an existing backup artifact during the lock period.

