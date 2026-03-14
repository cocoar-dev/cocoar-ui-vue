import vue from '@vitejs/plugin-vue';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/cocoar-ui-vue/' : '/',
  plugins: [vue()],
  resolve: {
    conditions: ['source'],
    alias: [
      { find: /^@cocoar\/vue-ui$/, replacement: join(__dirname, '../../packages/ui/src/index.ts') },
      {
        find: /^@cocoar\/vue-ui\/styles$/,
        replacement: join(__dirname, '../../packages/ui/styles/all.css'),
      },
      {
        find: /^@cocoar\/vue-localization$/,
        replacement: join(__dirname, '../../packages/localization/src/index.ts'),
      },
    ],
  },
});
