module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'google'
  ],
  rules: {
    'quotes': ['error', 'single'],
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
};
