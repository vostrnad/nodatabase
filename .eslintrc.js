module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
    'plugin:node/recommended-module',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'node', 'prefer-arrow', 'unicorn'],
  env: {
    node: true,
  },
  globals: {
    __dirname: 'readonly',
    __filename: 'readonly',
    exports: 'writable',
    module: 'readonly',
    require: 'readonly',
  },
  rules: {
    // increasing error level from recommended preset
    '@typescript-eslint/no-unused-vars': 2,

    // typescript-eslint
    '@typescript-eslint/array-type': [1, { default: 'array-simple' }],
    '@typescript-eslint/explicit-module-boundary-types': 1,
    '@typescript-eslint/naming-convention': [
      1,
      {
        selector: 'default',
        format: ['camelCase'],
      },
      {
        selector: 'variable',
        modifiers: ['const'],
        format: ['camelCase', 'UPPER_CASE'],
      },
      {
        selector: 'parameter',
        modifiers: ['unused'],
        format: ['camelCase'],
        leadingUnderscore: 'require',
      },
      {
        selector: 'classProperty',
        modifiers: ['readonly'],
        format: ['camelCase', 'UPPER_CASE'],
      },
      {
        selector: 'objectLiteralProperty',
        format: ['camelCase', 'UPPER_CASE'],
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
    ],
    '@typescript-eslint/no-confusing-non-null-assertion': 1,
    '@typescript-eslint/no-meaningless-void-operator': 2,
    '@typescript-eslint/no-unnecessary-condition': 2,
    '@typescript-eslint/prefer-for-of': 1,
    '@typescript-eslint/prefer-includes': 1,
    '@typescript-eslint/prefer-literal-enum-member': 2,
    '@typescript-eslint/prefer-optional-chain': 1,
    '@typescript-eslint/prefer-readonly': 2,
    '@typescript-eslint/prefer-string-starts-ends-with': 1,
    '@typescript-eslint/promise-function-async': 1,
    '@typescript-eslint/switch-exhaustiveness-check': 2,

    // turn off eslint rules that have overrides
    'dot-notation': 0,
    'no-dupe-class-members': 0,
    'no-duplicate-imports': 0,
    'no-loss-of-precision': 0,
    'no-shadow': 0,
    'no-throw-literal': 0,
    'no-unused-expressions': 0,

    // extension rules
    '@typescript-eslint/dot-notation': 1,
    '@typescript-eslint/no-dupe-class-members': 1,
    '@typescript-eslint/no-duplicate-imports': 1,
    '@typescript-eslint/no-loss-of-precision': 2,
    '@typescript-eslint/no-shadow': 2,
    '@typescript-eslint/no-throw-literal': 2,
    '@typescript-eslint/no-unused-expressions': 2,

    // eslint
    curly: [1, 'multi-line'],
    'no-console': 1,
    eqeqeq: 2,
    'no-extend-native': 2,
    'no-multi-assign': 1,
    'no-sequences': 1,
    'no-useless-concat': 1,
    'object-shorthand': 1,
    radix: 2,
    'sort-imports': [1, { ignoreDeclarationSort: true }],
    'spaced-comment': 1,
    yoda: 1,

    // import
    'import/no-absolute-path': 2,
    'import/no-deprecated': 1,
    'import/no-mutable-exports': 2,
    'import/first': 1,
    'import/order': [
      1,
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
        ],
        pathGroups: [
          {
            pattern: '@*/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        alphabetize: {
          order: 'asc',
        },
        'newlines-between': 'never',
      },
    ],
    'import/newline-after-import': 1,

    // node
    'node/no-unpublished-import': 0,
    'node/no-missing-import': 0,
    'node/no-path-concat': 2,
    'node/no-process-exit': 2,
    'node/exports-style': 2,
    'node/no-process-env': 1,
    'node/no-sync': [2, { allowAtRootLevel: true }],
    'node/prefer-promises/fs': 2,

    // prefer-arrow
    'prefer-arrow/prefer-arrow-functions': 2,

    // unicorn
    'unicorn/consistent-destructuring': 1,
    'unicorn/escape-case': 1,
    'unicorn/explicit-length-check': 2,
    'unicorn/filename-case': 1,
    'unicorn/no-abusive-eslint-disable': 2,
    'unicorn/no-console-spaces': 1,
    'unicorn/no-hex-escape': 2,
    'unicorn/no-instanceof-array': 2,
    'unicorn/no-new-array': 2,
    'unicorn/no-unreadable-array-destructuring': 1,
    'unicorn/no-unsafe-regex': 2,
    'unicorn/no-useless-promise-resolve-reject': 2,
    'unicorn/no-useless-spread': 1,
    'unicorn/no-zero-fractions': 1,
    'unicorn/number-literal-case': 1,
    'unicorn/numeric-separators-style': 1,
    'unicorn/prefer-array-find': 2,
    'unicorn/prefer-array-index-of': 2,
    'unicorn/prefer-array-some': 2,
    'unicorn/prefer-date-now': 2,
    'unicorn/prefer-default-parameters': 2,
    'unicorn/prefer-includes': 2,
    'unicorn/prefer-json-parse-buffer': 2,
    'unicorn/prefer-negative-index': 2,
    'unicorn/prefer-number-properties': [2, { checkInfinity: false }],
    'unicorn/prefer-optional-catch-binding': 2,
    'unicorn/prefer-regexp-test': 2,
    'unicorn/prefer-string-slice': 2,
    'unicorn/require-array-join-separator': 2,
    'unicorn/require-number-to-fixed-digits-argument': 2,
    'unicorn/throw-new-error': 2,
  },
}
