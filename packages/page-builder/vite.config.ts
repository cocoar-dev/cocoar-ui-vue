import vue from '@vitejs/plugin-vue';
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

const runtimeWorkerEntry = '@cocoar/vue-page-builder/runtime-worker';

export default defineConfig({
  plugins: [
    {
      name: 'page-runtime-worker-subpath',
      enforce: 'pre',
      apply: 'build',
      resolveId(source) {
        if (source === '#page-runtime-worker') {
          return { id: runtimeWorkerEntry, external: true };
        }
        return null;
      },
    },
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.test.ts'],
    }),
    {
      name: 'page-runtime-worker-relative-url',
      renderChunk(code) {
        const next = code
          .replace(
            /(["'])\/assets\/(pageScriptRuntime\.worker-[^"']+\.js)\1/g,
            '$1./assets/$2$1',
          )
          .replace(/\s*\/\* @vite-ignore \*\/\s*(?=["']\.\/assets\/pageScriptRuntime\.worker-)/g, '')
          .replace(/["']{2}\s*\+\s*import\.meta\.url/g, 'import.meta.url');
        return next === code ? null : next;
      },
    },
  ],
  resolve: {
    conditions: ['source'],
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'runtime-worker': resolve(__dirname, 'src/runtimeWorkerEntry.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'index',
    },
    rollupOptions: {
      // @cocoar/vue-localization is a peer and @js-temporal/polyfill must share
      // the app's single instance with @cocoar/vue-ui (Temporal values cross the
      // package boundary; a bundled copy breaks instanceof at the picker edge).
      external: (id) => id === runtimeWorkerEntry || externalDependencies.has(id),
      output: { globals: { vue: 'Vue' } },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
