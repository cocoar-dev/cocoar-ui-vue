import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// The server of the visual baselines (visual/README.md), started by
// playwright.visual.config.ts. It serves only visual.html and must stay
// independent of the playground's vite.config.ts: a plugin or alias there
// must not change what the baselines render. Part of the comparison, guarded
// by VISUAL_HARNESS in .alta/skills/cocoar-pr/scripts/pr.mjs.

const source = (path: string) => resolve(__dirname, '../../packages', path);

export default defineConfig({
  plugins: [vue()],
  server: { port: 5188, strictPort: true },
  resolve: {
    // Include transitive renderer imports too: Docker has no package dist/.
    // Component styles come with the source; built `…/styles` are not available.
    alias: [
      { find: /^@cocoar\/vue-ui$/, replacement: source('ui/src/index.ts') },
      { find: /^@cocoar\/vue-ui\/styles$/, replacement: source('ui/styles/all.css') },
      { find: /^@cocoar\/vue-ui\/fonts$/, replacement: source('ui/src/fonts.ts') },
      { find: /^@cocoar\/vue-localization$/, replacement: source('localization/src/index.ts') },
      {
        find: /^@cocoar\/vue-fragment-parser$/,
        replacement: source('fragment-parser/src/index.ts'),
      },
      { find: /^@cocoar\/vue-page-builder$/, replacement: source('page-builder/src/index.ts') },
      {
        find: /^#page-runtime-worker$/,
        replacement: source('page-builder/src/runtimeWorkerEntry.ts'),
      },
      { find: /^@cocoar\/vue-script-editor$/, replacement: source('script-editor/src/index.ts') },
      {
        find: /^@cocoar\/vue-markdown-editor$/,
        replacement: source('markdown-editor/src/index.ts'),
      },
      { find: /^@cocoar\/vue-markdown$/, replacement: source('markdown/src/index.ts') },
      { find: /^@cocoar\/vue-markdown-core$/, replacement: source('markdown-core/src/index.ts') },
      {
        find: /^@cocoar\/vue-markdown-mermaid$/,
        replacement: source('markdown-mermaid/src/index.ts'),
      },
      { find: /^@cocoar\/vue-mermaid$/, replacement: source('mermaid/src/index.ts') },
      { find: /^@cocoar\/vue-calendar$/, replacement: source('calendar/src/index.ts') },
      { find: /^@cocoar\/vue-calendar\/core$/, replacement: source('calendar/src/core/index.ts') },
      {
        find: /^@cocoar\/vue-calendar\/recurrence$/,
        replacement: source('calendar/src/recurrence/index.ts'),
      },
      {
        find: /^@cocoar\/vue-calendar\/recurrence-rrule-temporal$/,
        replacement: source('calendar/src/recurrence-rrule-temporal/index.ts'),
      },
    ],
  },
  // Scan only the visual page for dependencies to pre-bundle. The playground's
  // index.html imports packages that are not built in a fresh container, which
  // made the scan fail and every page load its dependencies module by module.
  optimizeDeps: { entries: ['visual.html'] },
});
