// Root config: lints packages/*. Each app has its own eslint.config.mjs (see eslint.base.mjs for why).
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import base from "./eslint.base.mjs";

export default defineConfig(
  globalIgnores([
    "apps/**",
    "**/node_modules/**",
    "**/.turbo/**",
    "packages/supabase/types.ts", // generated
  ]),
  base,
  prettier,
);
