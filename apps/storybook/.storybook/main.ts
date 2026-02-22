import type { StorybookConfig } from '@storybook/vue3-vite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    {
      directory: join(__dirname, '../../../packages'),
      titlePrefix: '',
      files: '*/src/**/*.stories.ts',
    },
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
};

export default config;
