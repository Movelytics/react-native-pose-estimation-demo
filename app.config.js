/**
 * Expo config.
 *
 * Default (no env): Expo Go compatible — camera + asset plugins only.
 * Native A/B: set POSETRACKER_NATIVE=1 (see NATIVE_BUILD.md / enable script)
 * to register vision-camera + fast-tflite config plugins.
 */
const appJson = require('./app.json');

const native = process.env.POSETRACKER_NATIVE === '1';

const plugins = [...(appJson.expo.plugins ?? [])];

if (native) {
  plugins.push([
    'react-native-vision-camera',
    {
      cameraPermissionText:
        "La caméra alimente l'estimation de pose on-device (test SDK natif).",
      enableMicrophonePermission: false,
    },
  ]);
  plugins.push([
    'react-native-fast-tflite',
    {
      enableCoreMLDelegate: true,
      enableAndroidGpuLibraries: true,
    },
  ]);
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
    extra: {
      ...(appJson.expo.extra ?? {}),
      posetrackerNative: native,
    },
  },
};
