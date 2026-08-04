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
      // @cocoar/vue-localization is a peer and @js-temporal/polyfill must share
      // the app's single instance with @cocoar/vue-ui (Temporal values cross the
      // package boundary; a bundled copy breaks instanceof at the picker edge).
      external: ['vue', '@cocoar/vue-ui', '@cocoar/vue-localization', '@cocoar/vue-script-editor', 'monaco-editor', '@js-temporal/polyfill'],
      output: { globals: { vue: 'Vue' } },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
