/**
 * The page of the visual baselines: /visual.html#/visual/<story>?mode=…&scheme=…
 *
 * Only what an app of the library sets up — fonts, styles, the overlay plugin
 * and host, localization — and nothing of the playground (its main.ts loads
 * Monaco and a pdf.js worker on every page, 14 MB, which made 150 parallel
 * captures crash). Part of the comparison: guarded by VISUAL_HARNESS in pr.mjs.
 */
import { createApp, h } from 'vue';
import { createRouter, createWebHashHistory, RouterView } from 'vue-router';
import { CoarOverlayHost, CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/visual/:story', component: () => import('./VisualStoryView.vue') }],
});

const app = createApp({ render: () => [h(RouterView), h(CoarOverlayHost)] });
app.use(router);
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
router.isReady().then(() => app.mount('#app'));
