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
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@cocoar/vue-localization', '@cocoar/vue-fragment-parser'],
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
