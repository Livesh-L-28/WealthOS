# WealthOS React Native & Expo Mobile Application (`apps/mobile/`)

Mobile application foundation for WealthOS, built on React Native and Expo SDK 51.

Supports iOS and Android devices with a shared design-token palette and dark-mode foundation.

---

## 1. Directory Structure

```
apps/mobile/
├── app.json         # Expo configuration (name, slug, bundle identifiers, dark theme)
├── App.tsx          # Root mobile application screen with onboarding layout
├── package.json     # Expo dependencies (@wealthos/design-tokens, @wealthos/api-client)
└── tsconfig.json    # Strict TypeScript configuration extending expo/tsconfig.base
```

---

## 2. Local Development

```bash
# Start Expo development server
npm run --workspace=@wealthos/mobile start

# Run Android emulator
npm run --workspace=@wealthos/mobile android

# Run iOS simulator (macOS required)
npm run --workspace=@wealthos/mobile ios

# Run TypeScript typecheck
npm run --workspace=@wealthos/mobile typecheck
```

