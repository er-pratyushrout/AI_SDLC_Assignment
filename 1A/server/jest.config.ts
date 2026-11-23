import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  testTimeout: 120000,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
  coverageDirectory: "coverage",
};

export = config;
