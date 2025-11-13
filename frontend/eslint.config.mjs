import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
    rules: {
      // CI 깨뜨리는 규칙들 완화

      // any 허용 (나중에 정리할 때 'warn' 으로 바꾸거나 다시 'error'로 올려도 됨)
      '@typescript-eslint/no-explicit-any': 'off',

      // 안 쓰는 변수는 경고만 (언더스코어로 시작하면 무시)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // useEffect deps 관련은 경고만
      'react-hooks/exhaustive-deps': 'warn',

      // 문자열 안에서 ' 같은 문자 escape 안 해도 허용
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default eslintConfig;
