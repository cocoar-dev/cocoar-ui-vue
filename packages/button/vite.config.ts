import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@cocoar/ui-vue-core'],
      output: {
        globals: {
          vue: 'Vue',
          '@cocoar/ui-vue-core': 'CocoarUiVueCore',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
