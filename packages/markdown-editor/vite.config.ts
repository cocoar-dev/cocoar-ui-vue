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
      external: [
        'vue',
        'unified',
        '@cocoar/vue-ui',
        '@cocoar/vue-markdown',
        '@cocoar/vue-markdown-core',
        /^@milkdown\//,
      ],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // @milkdown/ctx's Timer never clears its 3s watchdog setTimeout, even after
    // the editor resolves. On slow runners those timeouts fire between test
    // files — after the happy-dom globals are torn down — and explode as
    // "ReferenceError: removeEventListener is not defined", failing a run whose
    // tests all passed. Ignore exactly that teardown race; everything else
    // stays fatal.
    onUnhandledError(error: Error) {
      if (
        error.name === 'ReferenceError'
        && error.message.includes('removeEventListener is not defined')
        && error.stack?.includes('@milkdown')
      ) {
        return false;
      }
    },
  },
});
