// Set up as an app sets up the library: fonts and styles, the overlay plugin (the host is in
// App.vue), localization, `coar-mobile` on <html> (index.html) and the dark-mode class (scheme.ts).
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';

import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

import App from './App.vue';
import HomeView from './HomeView.vue';
import DemoView from './DemoView.vue';
import { findDemo } from './demos';
import './scheme';

const router = createRouter({
  // Hash routes (#/form): the built app is static files under any base, without rewrites.
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomeView },
    {
      path: '/:id',
      component: DemoView,
      props: true,
      beforeEnter: (to) => (findDemo(String(to.params.id)) ? true : '/'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

createApp(App)
  .use(router)
  .use(CoarOverlayPlugin)
  .use(createCoarLocalization({ defaultLanguage: 'en-US' }))
  .mount('#app');
