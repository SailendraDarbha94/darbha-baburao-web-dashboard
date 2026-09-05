// Shared, framework-agnostic ESLint rules. Every workspace's eslint.config.mjs imports this and adds
// its framework preset. Kept separate from the root eslint.config.mjs because flat-config `files`/`ignores`
// globs are resolved relative to the config file that declares them, so a per-app file that merely
// re-exported the root config would have its globs re-based and match nothing.
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  tseslint.configs.strict,
  {
    rules: {
      // Brief: no `any` without a comment explaining why. Use `// eslint-disable-next-line ... -- reason`.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Plain-JS config files (metro.config.js) are CommonJS because Expo loads them with require().
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
