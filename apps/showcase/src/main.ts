import { createApp } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import '@cocoar/vue-ui/styles';
import './styles/showcase.css';

import App from './App.vue';
import { router } from './router';

createApp(App)
  .use(router)
  .use(CoarOverlayPlugin)
  .mount('#app');
