/**
 * Babel config.
 * - Expo Go: babel-preset-expo only.
 * - Native A/B (POSETRACKER_NATIVE=1 or worklets installed): adds
 *   react-native-worklets-core/plugin for PoseCameraView frame processors.
 */
module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  try {
    require.resolve('react-native-worklets-core/plugin');
    plugins.push('react-native-worklets-core/plugin');
  } catch {
    // Expo Go path — worklets not installed.
  }
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
