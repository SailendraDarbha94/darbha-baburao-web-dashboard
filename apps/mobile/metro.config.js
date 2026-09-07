// Monorepo Metro config (docs/PLAN.md, decision l).
// - watchFolders: Metro must watch the whole monorepo so edits in packages/* trigger rebuilds and so that
//   the raw-TS workspace packages (@claims/*) can be bundled without a build step.
// - nodeModulesPaths: resolve from the app's own node_modules first, then the hoisted root. With
//   node-linker=hoisted everything lives at the root; the app-level entry only matters if a dependency
//   ever ends up nested.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
