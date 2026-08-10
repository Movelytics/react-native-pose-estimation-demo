#!/usr/bin/env bash
# Install optional native peers for the Apple Vision A/B (iOS native build).
# The default WebView MoveNet runtime needs NONE of this — it runs in Expo Go.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing Apple Vision native peers (Expo SDK 54-aligned)…"
npx expo install \
  react-native-vision-camera \
  react-native-worklets-core

# Babel helpers required by the worklets transformer (see README).
npm install --save-dev \
  @babel/plugin-proposal-optional-chaining \
  @babel/plugin-proposal-nullish-coalescing-operator \
  @babel/plugin-transform-template-literals \
  @babel/plugin-transform-shorthand-properties \
  @babel/plugin-transform-arrow-functions \
  || true

echo ""
echo "Peers installed. Next:"
echo "  export POSETRACKER_NATIVE=1"
echo "  npx expo prebuild --clean   # optional if ios/android folders missing"
echo "  npx expo run:ios --device"
echo ""
echo "Expo Go (WebView runtime) still works with: npx expo start (POSETRACKER_NATIVE unset)"
