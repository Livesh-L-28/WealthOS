#!/bin/bash
# WealthOS Mobile — 1-Click ADB Install & Launch Script

set -e

export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$PATH:$ANDROID_HOME/platform-tools

APK_PATH="${1:-/Users/livesh/WEALTHOS/apps/mobile/wealthos-staging.apk}"

echo "==============================================="
echo "  WealthOS Android 1-Click Installer"
echo "==============================================="
echo "Target APK: $APK_PATH"
echo "SHA-256: $(shasum -a 256 "$APK_PATH" | awk '{print $1}')"
echo ""

DEVICES=$(adb devices | grep -w "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
  echo "⚠️  No Android phone currently detected via USB."
  echo "👉 Connect your phone via USB with 'USB Debugging' enabled."
  echo "⏳ Waiting for device..."
  adb wait-for-device
fi

DEVICE_ID=$(adb devices | grep -w "device" | head -n 1 | awk '{print $1}')
echo "📱 Found device: $DEVICE_ID"

echo "📦 Sideloading APK to physical device..."
adb -s "$DEVICE_ID" install -r "$APK_PATH"

echo "🔗 Port forwarding API ports (8005 staging & 8000 dev)..."
adb -s "$DEVICE_ID" reverse tcp:8005 tcp:8005 || true
adb -s "$DEVICE_ID" reverse tcp:8000 tcp:8000 || true

echo "🚀 Launching WealthOS..."
adb -s "$DEVICE_ID" shell monkey -p com.wealthos.app -c android.intent.category.LAUNCHER 1

echo ""
echo "✅ Installation complete! App is now running on your phone."

