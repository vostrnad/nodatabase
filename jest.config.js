module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['<rootDir>/src/**'],
  setupFilesAfterEnv: ['jest-extended/all'],
  globalTeardown: '<rootDir>/test/teardown.ts',
}
