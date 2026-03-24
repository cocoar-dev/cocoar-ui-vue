import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.stories.ts', '**/*.test.ts'],
    }),
  ],
  resolve: {
    conditions: ['source'],
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        fonts: resolve(__dirname, 'src/fonts.ts'),
      },
      formats: ['es'],
      cssFileName: 'index',
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'vue',
        '@cocoar/vue-localization',
        '@cocoar/vue-fragment-parser',
        '@js-temporal/polyfill',
        '@maskito/core',
        '@maskito/kit',
        '@maskito/vue',
        'prismjs',
        /^@fontsource\//,
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@cocoar/vue-localization': 'CocoarVueLocalization',
          '@cocoar/vue-fragment-parser': 'CocoarVueFragmentParser',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
