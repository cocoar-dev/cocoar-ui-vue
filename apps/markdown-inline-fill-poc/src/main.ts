import { createApp } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';
import '@cocoar/vue-markdown-form/styles';
import App from './App.vue';
import './styles.css';

const app = createApp(App);
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
app.mount('#app');
