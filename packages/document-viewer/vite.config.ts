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
      // Two entries: the default `index.ts` carries the component + generic
      // sources (image, etc.). `pdf.ts` is the opt-in `/pdf` subpath where
      // consumers explicitly opt into pdfjs-dist — image-only consumers
      // never pull pdfjs into their bundle.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        pdf: resolve(__dirname, 'src/sources/pdf.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vue',
        'pdfjs-dist',
        /^pdfjs-dist\/.*/,
        '@cocoar/vue-ui',
      ],
      output: {
        globals: {
          vue: 'Vue',
          'pdfjs-dist': 'pdfjsLib',
        },
        // Stable filenames for the subpath exports map.
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
