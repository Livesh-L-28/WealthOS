# WealthOS Mobile — System Architecture Specification

> **Document Version:** 2.0.0  
> **Target Subsystem:** `apps/mobile`  
> **Runtime:** React Native 0.76.7 • Expo SDK 52 • TypeScript 5.3  
> **Status:** Active & Implemented  

---

## 1. Architectural Philosophy

WealthOS Mobile is architected around the core requirements of an enterprise family office and high-net-worth personal wealth operating system:
1. **Double-Entry Ground Truth:** The application views financial state not as superficial balance tags, but as balanced debit/credit journal transactions anchored to a Chart of Accounts.
2. **Strict Fail-Closed Security:** Authentication tokens and cryptographic credentials reside in hardware-backed Keychains (iOS) and Keystores (Android) via Expo SecureStore. The application defaults to unauthenticated on boot and unconditionally rejects fail-open bypass attempts.
3. **Decoupled Service Layer:** Pure presentation components consume typed domain services (`apps/mobile/src/api/domainServices.ts`) that orchestrate requests through `@wealthos/api-client`.
4. **Native High-Performance Visualizations:** Vector charts avoid heavy WebView bridges by utilizing pure React Native SVG cubic bezier path calculations.

---

## 2. Layered Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────┐  │
│  │  Pillars & Nav Dock   │  │   16 Screen Hubs     │  │  10 Modals  │  │
│  │ (Home/Money/Invest/   │  │(Overview, Accounts,  │  │(QuickAdd,   │  │
│  │  Plan/More Drawer)    │  │ Portfolio, Budgets...)│  │ Transfer...) │  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └──────┬──────┘  │
└──────────────┼─────────────────────────┼─────────────────────┼─────────┘
               │                         │                     │
┌──────────────▼─────────────────────────▼─────────────────────▼─────────┐
│                     APPLICATION CONTROLLER LAYER                       │
│                                                                        │
│  - App.tsx (Root State, Live Refresh, Session Restoration, Deep Link)  │
│  - ErrorBoundary (Resilient Exception Trapping & Ledger Protection)   │
│  - ThemeProvider (Dark / Light Design Tokens from theme.ts)           │
└──────────────┬─────────────────────────┬───────────────────────────────┘
               │                         │
┌──────────────▼──────────┐   ┌──────────▼───────────────────────────────┐
│  SECURITY & CRYPTO      │   │          DOMAIN SERVICES LAYER           │
│                         │   │                                          │
│ - ExpoSecureStoreDriver │   │ - accountingService  - investmentsService│
│ - MobileAuthStorage     │   │ - budgetService      - goalsService      │
│ - DeepLinkValidator     │   │ - copilotService     - documentsService  │
│ - OfflineSyncQueue      │   │ - analyticsService   - liabilitiesService│
└──────────────┬──────────┘   └──────────┬───────────────────────────────┘
               │                         │
┌──────────────▼─────────────────────────▼───────────────────────────────┐
│                    API CLIENT & NETWORKING LAYER                       │
│                                                                        │
│  - WealthOSClient (@wealthos/api-client)                               │
│  - config.ts (Dynamic 10.0.2.2 vs localhost vs EXPO_PUBLIC_API_URL)    │
│  - Authorization: Bearer <JWT> & X-Tenant-ID Request Interceptors      │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────────────┐
│                 FASTAPI v1 BACKEND INFRASTRUCTURE                      │
│     19 Domain Routers • PostgreSQL 16 RLS • Redis • MinIO Storage      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Component Modules

### 3.1 Security & Storage Subsystem (`src/storage.ts`)
- **`ExpoSecureStoreDriver`:** Communicates directly with native SecureStore using `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility.
- **`MemorySecureStoreDriver`:** Mock driver utilized during headless Vitest runs.
- **`MobileAuthStorage`:** Higher-order session orchestrator managing `AUTH_TOKEN`, `REFRESH_TOKEN`, and `ACTIVE_TENANT`.
- **`OfflineSyncQueue`:** Deterministic state machine (`QUEUED` -> `SYNCING` -> `COMMITTED` / `FAILED_RETRYABLE` / `FAILED_FATAL`) with tamper-detection checksums (`computeMutationChecksum`).

### 3.2 Deep Link Engine (`src/deeplink.ts`)
- Whitelists schemes (`wealthos://`) and hosts (`app.wealthos.com`).
- Whitelists paths: `/auth/callback`, `/dashboard`, `/verify-email`, `/reset-password`, `/notifications`, `/accounts`.
- Strips and rejects credentials in query parameters.
- Bound to native `Linking.addEventListener` in `App.tsx`.

### 3.3 Dynamic Networking & Config (`src/config.ts` & `src/api/client.ts`)
- Resolves loopback hosts: `http://10.0.2.2:8000` on Android emulator; `http://127.0.0.1:8000` on iOS simulator/desktop; or `process.env.EXPO_PUBLIC_API_URL`.
- Enforces request abort timeouts (15,000ms default).

### 3.4 Domain Services (`src/api/domainServices.ts`)
Encapsulates backend endpoint communication and transforms PostgreSQL models into mobile UI interfaces:
- `accountingService`: Fetches accounts, auto-seeds Chart of Accounts, executes balanced direct journal entries, and performs atomic inter-account transfers.
- `budgetService`: Fetches envelopes, seeds categories, and tracks spend progress.
- `goalsService`: Establishes strategic milestones and handles incremental savings deposits.
- `investmentsService`: Queries holding lots and records acquisitions.
- `documentsService`: Ingests statements and reports arithmetic verification status.
- `copilotService`: Sends natural-language prompts to `/api/v1/copilot/conversations` with fallback heuristic grounding.

---

## 4. Navigation Architecture

WealthOS Mobile implements an elevated modern fintech navigation hierarchy:
1. **Primary 5-Pillar Bottom Dock (`BottomNav.tsx`):**
   - **Home (`overview`):** High-level financial clarity, net worth hero, cash flow, and recent activity.
   - **Money (`accounts`):** Depository accounts, credit cards, loans, and categorized transaction stream.
   - **Invest (`investments`):** Demat holdings, unrealized/realized P&L, asset allocation, and SIP tracking.
   - **Plan (`budgets`):** Zero-based spending envelopes, strategic goals, and debt manager.
   - **More (`EnterpriseDrawer.tsx`):** Slide-out drawer accessing 11 family office hubs.
2. **Elevated Quick Action Center (`QuickAddModal.tsx`):**
   Floating center `+` button triggering instant modals: Add Expense, Add Income, Transfer Funds, Connect Bank, Import Statement, Add Investment, Create Budget, Ask Copilot.
3. **Hub Routing:**
   Contextual back-navigation returns to the active pillar seamlessly (`onBack={() => setActiveScreen('overview')}`).

---

## 5. State Management & Data Flow

- **Session Bootstrapping:**
  On app start, `isRestoringSession` triggers `restoreActiveSession()`. If valid tokens exist in SecureStore, the app unlocks and invokes `loadLiveLedgerData()`.
- **Optimistic UI Updates with Server Confirmation:**
  When a financial action occurs (e.g. adding an expense or goal savings), the UI immediately reflects the delta and then asynchronously dispatches the mutation to the backend.
- **Fail-Closed Gate 4 Screen:**
  If tokens are missing, expired, or invalid, the app renders `AuthScreen`. Failed attempts display an inline error alert and **never** bypass security.

