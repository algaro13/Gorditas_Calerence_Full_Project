// ESLint 9 (flat config). Reglas de arquitectura: dependencias hacia adentro y sin dominios literales.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

const sharedLow = ['shared-domain', 'shared-utils'];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'prisma/**', 'coverage/**', 'uploads/**', 'scripts/setup-stripe-products.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'scripts/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'shared-domain', pattern: 'src/shared/domain/**', mode: 'full' },
        { type: 'shared-application', pattern: 'src/shared/application/**', mode: 'full' },
        { type: 'shared-utils', pattern: 'src/shared/utils/**', mode: 'full' },
        { type: 'shared-config', pattern: 'src/shared/config/**', mode: 'full' },
        { type: 'shared-infrastructure', pattern: 'src/shared/infrastructure/**', mode: 'full' },
        { type: 'shared-http', pattern: 'src/shared/http/**', mode: 'full' },
        { type: 'module-domain', pattern: 'src/modules/*/domain/**', capture: ['module'], mode: 'full' },
        { type: 'module-application', pattern: 'src/modules/*/application/**', capture: ['module'], mode: 'full' },
        { type: 'module-infrastructure', pattern: 'src/modules/*/infrastructure/**', capture: ['module'], mode: 'full' },
        { type: 'module-http', pattern: 'src/modules/*/http/**', capture: ['module'], mode: 'full' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**', mode: 'full' },
        { type: 'root', pattern: 'src/*.ts', mode: 'full' },
      ],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/kustodela\\.com/i]',
          message: 'No escribas el dominio literal. Usa shared/config/domain.ts (APP_DOMAIN).',
        },
        {
          selector: 'TemplateElement[value.raw=/kustodela\\.com/i]',
          message: 'No escribas el dominio literal. Usa shared/config/domain.ts (APP_DOMAIN).',
        },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'shared-domain', allow: ['shared-domain'] },
            { from: 'shared-utils', allow: sharedLow },
            { from: 'shared-config', allow: ['shared-config', ...sharedLow] },
            { from: 'shared-application', allow: ['shared-application', 'shared-domain'] },
            { from: 'shared-infrastructure', allow: ['shared-infrastructure', 'shared-application', 'shared-config', ...sharedLow] },
            { from: 'shared-http', allow: ['shared-http', 'shared-infrastructure', 'shared-application', 'shared-config', ...sharedLow] },
            { from: 'module-domain', allow: [...sharedLow, ['module-domain', { module: '${from.module}' }]] },
            {
              from: 'module-application',
              allow: [...sharedLow, 'shared-application', ['module-domain', { module: '${from.module}' }], ['module-application', { module: '${from.module}' }]],
            },
            {
              from: 'module-infrastructure',
              allow: [
                ...sharedLow,
                'shared-application',
                'shared-config',
                'shared-infrastructure',
                ['module-domain', { module: '${from.module}' }],
                ['module-application', { module: '${from.module}' }],
                ['module-infrastructure', { module: '${from.module}' }],
              ],
            },
            {
              from: 'module-http',
              allow: [
                ...sharedLow,
                'shared-application',
                'shared-config',
                'shared-http',
                ['module-domain', { module: '${from.module}' }],
                ['module-application', { module: '${from.module}' }],
                ['module-http', { module: '${from.module}' }],
              ],
            },
            { from: 'infrastructure', allow: ['infrastructure', ...sharedLow, 'shared-application', 'shared-config', 'shared-infrastructure'] },
            {
              from: 'root',
              allow: ['root', ...sharedLow, 'shared-application', 'shared-config', 'shared-infrastructure', 'shared-http', 'infrastructure', 'module-application', 'module-infrastructure', 'module-http'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts', 'scripts/**/*.ts'],
    rules: { 'boundaries/element-types': 'off' },
  },
);
