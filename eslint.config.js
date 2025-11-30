import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['web/main.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        confirm: 'readonly',
        location: 'readonly',
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',
        Date: 'readonly',
      },
    },
    rules: {
      'no-console': 'error',
      'no-unused-vars': 'warn',
    },
  },
];