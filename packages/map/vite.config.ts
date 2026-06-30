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
      // Leaflet (and its CSS) stay external + lazily imported by the component,
      // so the consumer bundles it only on pages that actually render a map.
      external: ['vue', 'leaflet', /^leaflet\//],
      output: {
        globals: { vue: 'Vue', leaflet: 'L' },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
