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
        recurrence: resolve(__dirname, 'src/recurrence/index.ts'),
        'recurrence-rrule-temporal': resolve(
          __dirname,
          'src/recurrence-rrule-temporal/index.ts',
        ),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vue',
        '@cocoar/vue-ui',
        '@cocoar/vue-localization',
        '@js-temporal/polyfill',
        // The recurrence engine adapter is externalized so the
        // `recurrence-rrule-temporal` chunk doesn't bundle
        // rrule-temporal itself — apps pull it in via their own
        // dependency graph (it's a regular dep of @cocoar/vue-calendar).
        'rrule-temporal',
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
