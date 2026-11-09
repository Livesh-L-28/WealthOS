# WealthOS — Phase 20I: Shared Component and Business Logic Strategy

**Programme:** Phase 20 Web & Mobile Experience Parity, Product Consistency & Release Acceptance  
**Project:** WealthOS  
**Standard:** Monorepo Code Reuse vs Platform-Native Implementation Strategy  
**Date:** 2026-11-09  

---

## 1. Monorepo Package Sharing Architecture

WealthOS leverages an npm workspaces monorepo architecture to share foundational contracts and tokens without introducing artificial cross-platform UI coupling:

```
packages/
├── shared-types/     # TypeScript domain types (Account, Transaction, Holding, Budget, Goal)
├── design-tokens/    # FinTech Light & Dark tokens, WCAG AA verified color scales, chart series
└── api-client/       # TypeScript API client with automatic tenant header injection
```

---

## 2. Shared vs Platform-Specific Separation Matrix

| Domain Layer | Strategy | Web Implementation | Mobile Implementation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Domain Types** | **100% Shared** | Imports from `@wealthos/shared-types` | Imports from `@wealthos/shared-types` | Guarantees identical field names, types, and enums across both applications. |
| **Design Tokens** | **100% Shared** | Imports `fintechLight` and `chartTokens` | Mirrors tokens in `theme.ts` | Enforces exact matching hex codes (`#16A36A`, `#F7F9F7`, `#17231D`). |
| **API Client** | **100% Shared** | Used for backend communication | Used for backend communication | Standardizes request headers, tenant scoping, and error unwrapping. |
| **Currency Formatter**| **Unified Logic** | `formatCurrency` in `lib/formatters.ts` | `formatINR` in `src/formatters.ts` | Formats according to Indian numbering system (paise, lakhs, crores). |
| **Chart Visualizations**| **Platform-Native** | Recharts / SVG Web Components | `react-native-svg` Native Components | Native SVG on mobile utilizes GPU rasterization, ensuring 60fps scrolling and no DOM bridges. |
| **Navigation** | **Platform-Native** | Next.js App Router (`/dashboard`, etc.) | Bottom Nav Dock (5 tabs + center action) | Respects mobile one-handed ergonomics vs desktop widescreen navigation. |
| **Modal Dialogs** | **Platform-Native** | Tailwind CSS / Headless UI modals | React Native `<Modal>` & KeyboardAvoidingView | Eliminates web-view wrappers; delivers smooth native spring animations. |

---

## 3. Financial Logic Authority Rule

- **Non-Negotiable Rule:** Client applications (both Web and Mobile) are strictly presentation and input collection layers.
- Authoritative financial calculations (Ledger balance reconciliation, FIFO lot disposal matching, Capital Gains exemptions, reducing balance amortization, and 5-pillar health scores) are computed **exclusively by backend domain services** with Python `Decimal` and database constraints.
- Neither client contains competing or divergent financial calculation engines.
