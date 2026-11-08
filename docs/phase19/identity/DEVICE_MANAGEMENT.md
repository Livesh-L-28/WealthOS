# WealthOS Phase 19 — Trusted Device Management Architecture

## 1. Device Fingerprinting
Every client session is tied to a deterministic SHA-256 fingerprint generated from browser/hardware entropy:
- User-Agent string
- Client viewport and screen resolution
- System timezone offset
- Canvas / WebGL hardware rendering profile (where available)

```sql
CREATE TABLE device_registries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(128) NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'WEB_DESKTOP',
    client_ip VARCHAR(45) NULL,
    is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 2. User Device Controls
- Users can view their active devices and session locations in Security Settings.
- Users can revoke any device with a single click. Revoking a device sets `is_trusted = False`, `is_revoked = True`, and invalidates all associated JWT refresh tokens and active sessions.

