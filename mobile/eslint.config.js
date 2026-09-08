// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    /*
     * The build and test scripts are Node programs, not app code — they run
     * under `node`, never in the bundle. The Expo preset assumes a React Native
     * global scope, so without this `__dirname`, `Buffer` and friends read as
     * undefined identifiers in exactly the files where they are correct.
     */
    files: ["scripts/**/*.js", "scripts/**/*.mjs", "tests/e2e/**/*.mjs"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "writable",
      },
    },
  },
]);
