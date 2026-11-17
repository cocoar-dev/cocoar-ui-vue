/**
 * Entry of the calendar state scenes: what an app of the library sets up (fonts, styles, overlay plugin
 * and host, localization) and one parameterised scene.
 * Scene = ?scene=<name>&profile=compact|legacy&w=<px>&h=<px>&draft=; the html classes (coar-mobile, dark-mode)
 * are put on <html> by the spec before load, where an app puts them.
 */
import { createApp, h } from 'vue';
import { CoarOverlayHost, CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';
import Scene from './calendar-scene.vue';

const app = createApp({ render: () => [h(Scene), h(CoarOverlayHost)] });
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
app.mount('#app');
