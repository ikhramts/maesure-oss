module.exports = {
  globals: {
    'ts-jest': {
      // ...
      diagnostics: {
        ignoreCodes: [151001]
      }
    }
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: [
    "<rootDir>/e2e-tests/"
  ],
  "moduleNameMapper": {
    "^app(.*)$": "<rootDir>/dashboard/src/app$1",
    "^shared(.*)$": "<rootDir>/shared$1"
  }
};