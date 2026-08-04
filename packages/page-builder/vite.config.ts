import vue from '@vitejs/plugin-vue';
import { copyFile } from 'node:fs/promises';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const externalDependencies = new Set([
  'vue',
  '@cocoar/vue-ui',
  '@cocoar/vue-localization',
  '@cocoar/vue-script-editor',
  'monaco-editor',
  '@js-temporal/polyfill',
]);

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.test.ts'],
    }),
    {
      name: 'page-runtime-worker-source',
      async closeBundle() {
        await Promise.all([
          copyFile(
            resolve(__dirname, 'src/runtime/pageScriptRuntime.worker.ts'),
            resolve(__dirname, 'dist/runtime/pageScriptRuntime.worker.ts'),
          ),
          copyFile(
            resolve(__dirname, 'src/runtime/runtimeProtocol.ts'),
            resolve(__dirname, 'dist/runtime/runtimeProtocol.ts'),
          ),
        ]);
      },
    },
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
      external: (id) =>
        id.endsWith('pageScriptRuntime.worker.ts?worker&url') || externalDependencies.has(id),
      output: { globals: { vue: 'Vue' } },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
