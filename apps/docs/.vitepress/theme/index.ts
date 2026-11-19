import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h, watchEffect, onBeforeUnmount, onMounted } from 'vue';
import { useData } from 'vitepress';

import '@cocoar/vue-ui/fonts';
// Declared for the Theme Editor: the browser fetches Onest only once a theme names it.
import '@cocoar/vue-ui/fonts/onest';
import '@cocoar/vue-ui/styles';

import './custom.css';
import './coar-overrides.css';
import './shell-theme.css';
import './navigation.css';

import { CoarOverlayPlugin, CoarOverlayHost } from '@cocoar/vue-ui';
import CoarThemeEditor from '@cocoar/vue-ui/theme-editor';
import { createCoarLocalization } from '@cocoar/vue-localization';

import DemoPreview from './DemoPreview.vue';
import LocaleSwitcher from './LocaleSwitcher.vue';
import DeviceBadges from './DeviceBadges.vue';
import DeviceMatrix from './DeviceMatrix.vue';
import PhoneFrame from './PhoneFrame.vue';
import ShellThemeToggle from './ShellThemeToggle.vue';

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

/**
 * The Inter weights of the Compact values, once the Theme Editor shows a theme and not
 * for every visitor: their faces would replace the synthesized weights of the default look.
 * Whether the VitePress shell follows that theme is the reader's choice (ShellThemeToggle).
 */
const ThemeFontsSync = {
  setup() {
    let observer: MutationObserver | undefined;
    onMounted(() => {
      const html = document.documentElement;
      const sync = () => {
        const themed = getComputedStyle(html).getPropertyValue('--coar-d-role-derivation').trim() === 'on';
        if (themed) void import('@cocoar/vue-ui/fonts/compact');
      };
      sync();
      // The Theme Editor marks each live change with an inline value on its scope.
      observer = new MutationObserver(sync);
      observer.observe(html, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    onBeforeUnmount(() => observer?.disconnect());
    return () => null;
  },
};

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => [h(ShellThemeToggle), h(LocaleSwitcher)],
      'nav-screen-content-after': () => h(ShellThemeToggle),
      'layout-bottom': () => [h(CoarOverlayHost), h(DarkModeSync), h(ThemeFontsSync), h(CoarThemeEditor, { hideDarkToggle: true })],
    });
  },
  enhanceApp({ app }) {
    app.use(CoarOverlayPlugin);
    app.use(localization);
    app.component('demo-preview', DemoPreview);
    app.component('DeviceBadges', DeviceBadges);
    app.component('DeviceMatrix', DeviceMatrix);
    app.component('PhoneFrame', PhoneFrame);
  },
};

export default theme;
