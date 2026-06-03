import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tsdoc from "eslint-plugin-tsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.ts", "*.config.mts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
      tsdoc,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { enableAutofixRemoval: { imports: true } }],
      "tsdoc/syntax": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    // JS/config files carry JSDoc `@type` pragmas, which aren't valid TSDoc.
    rules: { "tsdoc/syntax": "off" },
  },
  {
    // Test specs use Jest docblock pragmas (e.g. `@jest-environment`), not TSDoc.
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: { "tsdoc/syntax": "off" },
  },
);
