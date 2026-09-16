const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const projectRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Native binaries, PHP dependencies and database fixtures are not app modules.
// Keeping them out of Metro avoids crawling build output and development tools.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  // Anchor to this project: packages can legitimately contain an android/ JS folder.
  new RegExp(`^${projectRoot}[/\\\\](artifacts|server-php|test-results|playwright-report|android|ios|\\.git)[/\\\\]`),
];
config.maxWorkers = 4;
module.exports = config;
