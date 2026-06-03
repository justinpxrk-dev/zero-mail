import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const config = {
  // jsdom for the React component/snapshot tests to come; backend specs opt
  // into node with a `@jest-environment node` docblock.
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Clean slate before each test, so specs set up in beforeEach with no manual
  // teardown: clear call history on mocks, restore spies to their originals.
  clearMocks: true,
  restoreMocks: true,
};

export default createJestConfig(config);
