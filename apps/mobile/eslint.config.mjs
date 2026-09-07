import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";
import base from "../../eslint.base.mjs";

export default defineConfig(
  globalIgnores([
    "node_modules/**",
    ".expo/**",
    "ios/**",
    "android/**",
    "dist/**",
    "expo-env.d.ts",
  ]),
  expoConfig,
  base,
  prettier,
);
