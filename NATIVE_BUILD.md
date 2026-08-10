# Native A/B build (TFLite + Apple Vision)

Expo Go reste le chemin par défaut (**TF.js only**). Ce document décrit le
**dev build** pour comparer `tfjs` ⇄ `tflite` ⇄ `vision` (iOS).

## Prérequis

- Device physique (GPU / Neural Engine — les simulateurs sont peu fiables)
- Xcode (iOS) / Android Studio SDK (Android)
- Peers natifs du SDK (optionnels, absents du `package.json` Expo Go)

## 1. Installer les peers natifs

```bash
cd posetracker-sdk-testapp
npm run native:peers
# équivalent : bash scripts/enable-native-peers.sh
```

Cela installe : `react-native-vision-camera`, `react-native-worklets-core`,
`vision-camera-resize-plugin`, `react-native-fast-tflite`,
`react-native-nitro-modules`.

Le SDK embarque aussi le pod **PoseTrackerVision** (frame processor Apple
Vision) — autolinké depuis
`../packages-tracker/react-native-pose-estimation`.

## 2. Lancer un dev build

```bash
# Active les config plugins vision-camera + fast-tflite (app.config.js)
export POSETRACKER_NATIVE=1

# iOS — A/B tfjs | tflite | vision
npx expo run:ios --device
# ou : npm run ios:device

# Android — A/B tfjs | tflite (vision grisé)
npx expo run:android --device
# ou : npm run android:device
```

Sur l’écran diagnostic, le toggle **tfjs | tflite | vision | auto** remonte
le provider et rejoue le cold start. Comparer :

1. timeline `idle → … → ready` (`t+ms`)
2. `acceleration` + `runtime` / `delegate`
3. écran caméra : FPS + latence médiane (fenêtre 30)

## 3. Expo Go (inchangé)

```bash
cd posetracker-sdk-testapp
npx expo start
# ou : npm run start:go
```

Ne **pas** définir `POSETRACKER_NATIVE`. Les toggles tflite/vision restent
grisés. Aucun require Nitro n’est évalué (`isExpoGo()` + Metro stub).

## Attendu perf (ordre de grandeur)

| Backend | Plateforme | Inférence | FPS caméra |
|---|---|---|---|
| tfjs / expo-gl | iPhone A15 | ~17–36 ms | ~15–25 |
| tfjs / expo-gl | Android Mali-G52 | ~220–280 ms | ~3–5 |
| tflite CoreML | iPhone A15 | ~3–8 ms | ~30–60 |
| tflite GPU / XNNPACK | Android mid | ~5–30 ms | ~20–60 |
| apple-vision | iPhone A15 | ~5–15 ms | ~30–60 |

## Dépannage

- **NitroModules are not supported in Expo Go** : vous avez ouvert le bundle
  avec des peers natifs dans Expo Go, ou `POSETRACKER_NATIVE` a fuité.
  Relancer `npx expo start` sans l’env, ou utiliser uniquement le dev build
  pour tflite.
- **vision grisé sur iOS native** : le pod PoseTrackerVision n’est pas lié —
  `npx expo prebuild --clean` puis `npx expo run:ios --device`.
- **tflite grisé** : relancer `npm run native:peers` puis rebuild.
