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
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // `mermaid` stays external + is dynamically imported by the component, so
      // the consumer's bundler code-splits it into a lazy chunk loaded only on
      // pages that actually render a diagram.
      external: ['vue', 'mermaid'],
      output: {
        globals: { vue: 'Vue', mermaid: 'mermaid' },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
