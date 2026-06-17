import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h, watchEffect, onMounted } from 'vue';
import { useData, inBrowser } from 'vitepress';

import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

import './custom.css';
import './coar-overrides.css';

import { CoarOverlayPlugin, CoarOverlayHost } from '@cocoar/vue-ui';
import CoarThemeEditor from '@cocoar/vue-ui/theme-editor';
import { createCoarLocalization } from '@cocoar/vue-localization';

import DemoPreview from './DemoPreview.vue';
import LocaleSwitcher from './LocaleSwitcher.vue';

const localization = createCoarLocalization({ defaultLanguage: 'en-US' });

const DarkModeSync = {
  setup() {
    const { isDark } = useData();
    onMounted(() => {
      watchEffect(() => {
        document.documentElement.classList.toggle('dark-mode', isDark.value);
      });
    });
    return () => null;
  },
};

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(LocaleSwitcher),
      'layout-bottom': () => [h(CoarOverlayHost), h(DarkModeSync), h(CoarThemeEditor, { hideDarkToggle: true })],
    });
  },
  enhanceApp({ app }) {
    app.use(CoarOverlayPlugin);
    app.use(localization);
    app.component('demo-preview', DemoPreview);
  },
};

export default theme;
