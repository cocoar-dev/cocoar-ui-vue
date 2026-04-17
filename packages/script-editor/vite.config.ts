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
      external: ['vue', 'monaco-editor'],
      output: {
        globals: {
          vue: 'Vue',
          'monaco-editor': 'monaco',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    alias: {
      'monaco-editor': resolve(__dirname, 'src/__mocks__/monaco-editor.ts'),
    },
  },
});
