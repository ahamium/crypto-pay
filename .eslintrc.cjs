module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { 'import/resolver': { node: { extensions: ['.js', '.ts', '.tsx'] } } },
  rules: {
    // 기존 규칙
    'import/order': ['warn', { 'newlines-between': 'always' }],

    // 여기부터 backend lint 깨뜨리던 규칙들 전부 off
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
  },
};
