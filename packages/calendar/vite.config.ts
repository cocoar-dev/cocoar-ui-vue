import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.test.ts', '**/__tests__/**'],
    }),
  ],
  resolve: {
    conditions: ['source'],
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        core: resolve(__dirname, 'src/core/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vue',
        '@cocoar/vue-ui',
        '@cocoar/vue-localization',
        '@js-temporal/polyfill',
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@cocoar/vue-ui': 'CocoarVueUi',
          '@cocoar/vue-localization': 'CocoarVueLocalization',
          '@js-temporal/polyfill': 'TemporalPolyfill',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
