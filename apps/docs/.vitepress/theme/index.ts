import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h, watchEffect } from 'vue';
import { useData } from 'vitepress';

import '@cocoar/vue-ui/styles';

import './custom.css';
import './coar-overrides.css';

import { CoarOverlayPlugin, CoarOverlayHost } from '@cocoar/vue-ui';

import DemoPreview from './DemoPreview.vue';

const DarkModeSync = {
  setup() {
    const { isDark } = useData();
    watchEffect(() => {
      document.documentElement.classList.toggle('dark-mode', isDark.value);
    });
    return () => null;
  },
};

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => [h(CoarOverlayHost), h(DarkModeSync)],
    });
  },
  enhanceApp({ app }) {
    app.use(CoarOverlayPlugin);
    app.component('demo-preview', DemoPreview);
  },
};

export default theme;
