import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // No suites yet — keep `pnpm test` green until the first tests land
    // (ensureGmailWatch, in a follow-up PR). A no-op once tests exist.
    passWithNoTests: true,
  },
});
