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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local scratch/evidence directories (screenshots, diagnostic JS):
    ".p15/**",
    ".p16/**",
    ".p17/**",
    ".p18/**",
    ".p19/**",
    ".p20/**",
  ]),
]);

export default eslintConfig;
