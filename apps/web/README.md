# WealthOS Next.js Web Application (`apps/web/`)

Production-grade Next.js 14 App Router web client for WealthOS.

Human-designed, enterprise-ready, accessible, and strictly adhering to the prohibition of AI-generated interfaces and fake financial metrics.

---

## 1. Directory Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Executive financial overview with empty onboarding states
│   │   ├── error.tsx          # Client-side React error boundary
│   │   ├── layout.tsx         # Handcrafted root shell with persistent Sidebar and Header
│   │   ├── loading.tsx        # Skeleton loading state
│   │   ├── not-found.tsx      # Accessible 404 handler
│   │   └── page.tsx           # Entry redirect
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx     # Workspace selector, system status pill, search shortcut
│   │   │   └── Sidebar.tsx    # 9-cluster navigation drawer
│   │   └── ui/
│   │       ├── Badge.tsx      # Status indicators (positive, negative, warning, neutral, brand)
│   │       ├── Button.tsx     # Accessible buttons with variants and loading spinners
│   │       ├── Card.tsx       # Elevated container cards
│   │       └── EmptyState.tsx # Meaningful empty state placeholders
│   └── styles/
│       └── globals.css        # Tailwind base, dark palette tokens, tabular figures
├── Dockerfile                 # Multi-stage production container
├── next.config.js             # Workspace transpilation & API rewrites
├── postcss.config.js
├── tailwind.config.ts         # Integrates @wealthos/design-tokens preset
├── tsconfig.json              # Strict TypeScript compiler options
└── package.json
```

---

## 2. Design Integrity Principles

1. **Zero Artificial Metrics:**
   All dashboard cards display an initial ₹0.00 state with explicit subtext informing the user that bank accounts or statement imports are required.
2. **Accessible Contrast (WCAG 2.1 AA):**
   Colors calibrated to exceed 4.5:1 on dark surfaces (`#0B0F17` canvas, `#111827` surface, `#1E293B` cards).
3. **Tabular Numerics:**
   Financial figures use monospace tabular numbers (`font-variant-numeric: tabular-nums`) to prevent layout shifts.

---

## 3. Local Development

```bash
# Start development server
npm run dev --workspace=@wealthos/web

# Build production bundle
npm run build --workspace=@wealthos/web

# Typecheck
npm run typecheck --workspace=@wealthos/web
```

