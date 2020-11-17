module.exports = {
  globals: {
    'ts-jest': {
      // ...
      diagnostics: {
        ignoreCodes: [151001]
      }
    }
  },
  "moduleNameMapper": {
    "^e2e(.*)$": "<rootDir>$1"
  },
  preset: 'ts-jest',
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: 'node'
};