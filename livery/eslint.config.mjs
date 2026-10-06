import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-check/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sample projects for the flow tests, not part of the app.
    "tests/flow/repos/**",
  ]),
]);

export default eslintConfig;
