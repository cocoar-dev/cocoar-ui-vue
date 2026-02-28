import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
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
      external: ['vue', '@cocoar/vue-core'],
      output: {
        globals: {
          vue: 'Vue',
          '@cocoar/vue-core': 'CocoarVueCore',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
