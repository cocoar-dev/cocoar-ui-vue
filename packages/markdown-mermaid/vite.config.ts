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
      // The renderer + engine live in `@cocoar/vue-mermaid` (external);
      // `@cocoar/vue-markdown` is a peer (types only — the `FenceRegistry`
      // contract). Neither is bundled into this thin adapter.
      external: ['vue', '@cocoar/vue-mermaid', '@cocoar/vue-markdown'],
      output: {
        globals: {
          vue: 'Vue',
          '@cocoar/vue-mermaid': 'CocoarVueMermaid',
          '@cocoar/vue-markdown': 'CocoarVueMarkdown',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
