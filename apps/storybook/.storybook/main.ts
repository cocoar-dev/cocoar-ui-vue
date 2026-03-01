import type { StorybookConfig } from '@storybook/vue3-vite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  stories: [
    {
      directory: join(__dirname, '../../../packages'),
      titlePrefix: '',
      files: '*/src/**/*.stories.ts',
    },
    {
      directory: join(__dirname, '../src'),
      titlePrefix: '',
      files: '**/*.stories.ts',
    },
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    const existingAlias = Array.isArray(config.resolve.alias) ? config.resolve.alias : [];
    config.resolve.alias = [
      ...existingAlias,
      { find: /^@cocoar\/vue-ui$/, replacement: join(__dirname, '../../../packages/ui/src/index.ts') },
      { find: /^@cocoar\/vue-data-grid$/, replacement: join(__dirname, '../../../packages/data-grid/src/index.ts') },
      { find: /^@cocoar\/vue-core$/, replacement: join(__dirname, '../../../packages/core/src/index.ts') },
      { find: /^@cocoar\/vue-fragment-parser$/, replacement: join(__dirname, '../../../packages/fragment-parser/src/index.ts') },
      { find: /^@cocoar\/vue-localization$/, replacement: join(__dirname, '../../../packages/localization/src/index.ts') },
    ];
    return config;
  },
};

export default config;
