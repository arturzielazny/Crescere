import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  sonarjs.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        requestAnimationFrame: 'readonly',
        ResizeObserver: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      'no-console': 'off',
      // Tune sonarjs rules for this project
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],
      'sonarjs/todo-tag': 'off',
      'sonarjs/no-commented-code': 'off',
      'sonarjs/sonar-no-unused-vars': 'off',
      'sonarjs/function-name': 'off',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/sonar-no-fallthrough': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-ignored-exceptions': 'warn',
      'sonarjs/no-nested-functions': 'warn'
    }
  },
  {
    // Relax duplicate string rule in test files
    files: ['**/*.test.js'],
    rules: {
      'sonarjs/no-duplicate-string': 'off'
    }
  },
  {
    // Node.js scripts: allow Node globals and OS commands
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        performance: 'readonly'
      }
    },
    rules: {
      'sonarjs/os-command': 'off',
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/no-unused-vars': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', 'reports/']
  }
];
