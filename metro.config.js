/**
 * Metro config for the Expo Go PoseTracker testapp.
 * Consumes `@posetracker-tracker/react-native-pose-estimation` via `file:`.
 *
 * - `expo-file-system` → `expo-file-system/legacy` for SDK package requests
 *   (Expo SDK 54 main entry is the new File API).
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sdkPackageRoot = path.resolve(
  projectRoot,
  '../packages-tracker/react-native-pose-estimation',
);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sdkPackageRoot];
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previousBlockList)
    ? previousBlockList
    : previousBlockList
      ? [previousBlockList]
      : []),
  new RegExp(
    `${escapeRegExp(sdkPackageRoot + path.sep)}node_modules${escapeRegExp(path.sep)}.*`,
  ),
];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let resolvedName = moduleName;
  if (
    moduleName === 'expo-file-system' &&
    context.originModulePath.includes('pose-estimation-react-native')
  ) {
    resolvedName = 'expo-file-system/legacy';
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, resolvedName, platform);
  }
  return context.resolveRequest(context, resolvedName, platform);
};

module.exports = config;
