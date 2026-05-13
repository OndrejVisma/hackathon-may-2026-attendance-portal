// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          // FE refinement §22.4: no module-level `let`. Const-only at module scope.
          selector: "Program > VariableDeclaration[kind='let']",
          message: 'No module-level `let`. Module state must live in a service or be const.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          // FE refinement §21: domain layer is framework-agnostic — no Angular imports.
          patterns: [
            {
              group: ['**/features/*/domain/*', '**/features/*/infrastructure/*'],
              message: 'Cross-feature internals are forbidden. Import from the feature\'s public barrel (features/<x>/index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    // Domain folders must not import Angular or any infrastructure.
    files: ['**/features/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@angular/*'], message: 'Domain code must be framework-agnostic.' },
            { group: ['../infrastructure/*', '../presentation/*'], message: 'Domain may not depend on adapters or UI.' },
            { group: ['rxjs', 'rxjs/*'], message: 'Domain stays pure — no RxJS.' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
