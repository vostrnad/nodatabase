module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all'],
  globalTeardown: '<rootDir>/test/teardown.ts',
}
