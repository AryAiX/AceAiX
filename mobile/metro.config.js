const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native-reanimated': path.resolve(__dirname, 'stubs/reanimated-pkg'),
};

module.exports = config;
