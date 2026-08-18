import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.test.ts'],
    }),
  ],
  resolve: {
    conditions: ['source'],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'vue',
        '@cocoar/vue-ui',
        '@cocoar/vue-markdown',
        '@cocoar/vue-markdown-core',
        '@cocoar/vue-markdown-editor',
        '@js-temporal/polyfill',
      ],
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
