const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const { build: buildLucideBarrel } = require('./scripts/slim-lucide');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native-reanimated': path.resolve(__dirname, 'stubs/reanimated-pkg'),
};

/* Only the icons the app draws. Regenerated here so it tracks the source. */
const lucide = buildLucideBarrel();

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  /* Exactly the bare package — deep paths (including the barrel's own imports)
     still resolve to the real thing. */
  if (moduleName === 'lucide-react-native') {
    return { type: 'sourceFile', filePath: lucide.entry };
  }
  const next = defaultResolve ?? context.resolveRequest;
  return next(context, moduleName, platform);
};

module.exports = config;
