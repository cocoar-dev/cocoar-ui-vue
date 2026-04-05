import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';

import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

import App from './App.vue';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
app.mount('#app');
