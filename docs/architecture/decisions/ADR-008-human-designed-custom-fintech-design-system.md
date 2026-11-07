# ADR-008: HUMAN-DESIGNED CUSTOM FINTECH DESIGN SYSTEM

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, UI/UX Designer, Senior Full-Stack Engineer  
**Context:**  
AI-generated frontend code typically relies on generic, bloated template libraries filled with non-functional decorative widgets, low-contrast pastel gradients, inconsistent spacing tokens, and sluggish DOM performance. Enterprise financial software requires high information density, strict accessibility (WCAG AA), predictable keyboard navigation, and professional aesthetic rigor.

**Decision:**  
We enforce a **strict human-designed, custom fintech design system**:
1. Zero automated AI UI generation for frontend layouts, screens, or components.
2. Architecture built with Next.js 14, React 18, TypeScript, Tailwind CSS, and headless accessible primitives from shadcn/ui (Radix UI).
3. Design direction: Deep navy and blue-black foundation (`#0B0F17` canvas, `#111827` cards, `#1F2937` borders) with restrained indigo (`#6366F1`) and emerald (`#10B981`) semantic indicators.
4. Monospaced numeric alignment (`font-mono tabular-nums`) for all monetary values, explicit thousand separators, and color-coded directionality (Emerald for inflows, Rose for outflows).
5. Comprehensive state coverage for every view: Skeleton loading, empty states with setup CTAs, informative error boundaries with retry mechanisms, and responsive tablet/mobile adaptations.

**Consequences:**  
- **Positive:** Exceptional usability, fast rendering performance, pristine visual consistency, and durable maintainability.
- **Negative:** Requires rigorous manual design and coding effort across all components and screens.
