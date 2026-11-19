import { createApp } from 'vue';
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';
import '@cocoar/vue-calendar';
import Scene from './scene.vue';

document.documentElement.classList.toggle(
  'dark-mode',
  new URLSearchParams(location.search).get('scheme') === 'dark',
);
createApp(Scene).mount('#app');
