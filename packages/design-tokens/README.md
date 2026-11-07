# @wealthos/design-tokens

Framework-independent, WCAG 2.1 Level AA audited design tokens and Tailwind CSS preset for **WealthOS**.

---

## 🎨 Token Architecture

This package provides strongly-typed TypeScript definitions and presets for:
- **Colors:** Deep navy canvas (`#0B0F17`), surface panel (`#111827`), card (`#1E293B`), hover (`#243042`), with audited contrast $\ge 4.5:1$ across all normal text foregrounds.
- **Typography:** Dual-font setup (Inter for UI, JetBrains Mono for monospaced tabular financial numbers).
- **Spacing:** 4px base scale (`space-1` to `space-16`).
- **Elevation & Radii:** Dark-mode layered luminance and border highlights.

---

## 📦 Installation & Build

Build the package locally:

```bash
cd packages/design-tokens
npm install
npm run build
```

This compiles TypeScript source files in `src/` to CommonJS in `dist/index.js` along with type declaration files `dist/index.d.ts` and source maps.

---

## ⚡ Tailwind CSS Integration

### Compatibility
- Compatible with **Tailwind CSS v3.4+** and **Tailwind CSS v4.x**.

### Usage in `tailwind.config.js` or `tailwind.config.ts`:

```javascript
module.exports = {
  presets: [
    require('@wealthos/design-tokens/tailwind-preset')
  ],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
};
```
