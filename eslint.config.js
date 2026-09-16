const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: ["dist/**", ".expo/**", "test-results/**", "playwright-report/**", "android/**", "ios/**", "artifacts/**", "server-php/vendor/**"],
  },
  // Community effects synchronize account-backed state and remote uploads; the
  // state updates are their asynchronous completion handlers, not derivations.
  {
    files: ["src/state/Community.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
]);
