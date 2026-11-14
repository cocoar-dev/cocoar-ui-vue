// The mobile documentation: a small Vue app of its own, opened on a phone or shown in a
// <PhoneFrame> of the docs (.vitepress/theme/PhoneFrame.vue). The docs build runs
// `vite build --config mobile/vite.config.ts` after `vitepress build`, into .vitepress/dist/mobile;
// in `vitepress dev` the plugin in .vitepress/mobile-dev.ts serves it at <base>mobile/.
//
// `base: './'` keeps every asset address relative, so the built app works under whatever path the
// docs are deployed to; the routes are hash routes (#/form), so no server rewrite is needed.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const packages = fileURLToPath(new URL('../../../packages/', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    // The workspace packages from source, as in the docs (their "source" export condition).
    conditions: ['source'],
    alias: [{ find: /^@cocoar\/vue-ui\/styles$/, replacement: `${packages}ui/styles/all.css` }],
    dedupe: ['vue'],
  },
  build: {
    outDir: fileURLToPath(new URL('../.vitepress/dist/mobile', import.meta.url)),
    emptyOutDir: true,
  },
});
