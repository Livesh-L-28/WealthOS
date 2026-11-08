# WealthOS Phase 19 — Mobile Offline-First Architecture

## 1. Principles
The WealthOS React Native / Expo mobile application operates seamlessly in offline or flaky network environments (e.g., flights, transit, rural cellular reception).

---

## 2. Offline Mutation Queue Lifecycle

```
[ User Interaction: Create Account / Add Transaction ]
                         │
                         ▼
           [ Local SQLite / WatermelonDB ]
             Status: PENDING_SYNC
             Assigned local mutation_id + client_version
                         │
                  (Network Online)
                         ▼
        [ Sync Worker: POST /api/v1/sync/replay ]
                         │
          ┌──────────────┴──────────────┐
          │ Version Match               │ Conflict Detected
          ▼                             ▼
    [ Status: SYNCED ]        [ Conflict Resolver ]
    - Update entity ID        - Server-Authoritative or LWW
    - Prune offline queue     - Update local cache with server facts
```

## 3. Hardware Keychain & SecureStore Security
- Biometric authentication secrets and OAuth JWT refresh tokens are persisted exclusively inside iOS Keychain and Android Keystore (via `expo-secure-store`).
- Upon explicit user logout, remote session revocation, or 5 consecutive failed biometric attempts, the hardware keychain is securely wiped.

