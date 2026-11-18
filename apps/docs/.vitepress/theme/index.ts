import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h, watchEffect, onBeforeUnmount, onMounted } from 'vue';
import { useData } from 'vitepress';

import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

import './custom.css';
import './coar-overrides.css';
import './compact.css';
import './navigation.css';

import { CoarOverlayPlugin, CoarOverlayHost } from '@cocoar/vue-ui';
import CoarThemeEditor from '@cocoar/vue-ui/theme-editor';
import { createCoarLocalization } from '@cocoar/vue-localization';

import DemoPreview from './DemoPreview.vue';
import LocaleSwitcher from './LocaleSwitcher.vue';
import DeviceBadges from './DeviceBadges.vue';
import DeviceMatrix from './DeviceMatrix.vue';
import PhoneFrame from './PhoneFrame.vue';
import PresentationSwitcher from '../../components/PresentationSwitcher.vue';

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
 * The VitePress shell and prose follow the library theme in effect on `<html>`
 * (compact.css), whichever way it is applied: the `.coar-compact` entry of the
 * style switcher, or a theme loaded in the Theme Editor, which sets no class. A
 * selector cannot ask for a value, so the shell gets a class of its own.
 */
const ShellThemeSync = {
  setup() {
    let observer: MutationObserver | undefined;
    onMounted(() => {
      const html = document.documentElement;
      const sync = () => {
        const themed = getComputedStyle(html).getPropertyValue('--coar-d-role-derivation').trim() === 'on';
        if (html.classList.contains('coar-docs-themed') !== themed) html.classList.toggle('coar-docs-themed', themed);
        // Fonts a theme names are loaded when it names them, not for every visitor:
        // the Inter weights of the Compact values, and Onest from the Theme Editor.
        if (themed) void import('@cocoar/vue-ui/fonts/compact');
        const families = ['--coar-font-family-body', '--coar-font-family-title']
          .map((token) => getComputedStyle(html).getPropertyValue(token));
        if (families.some((family) => /\bOnest\b/.test(family))) void import('@cocoar/vue-ui/fonts/onest');
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
      'nav-bar-content-after': () => [h(PresentationSwitcher), h(LocaleSwitcher)],
      'nav-screen-content-after': () => h(PresentationSwitcher),
      'layout-bottom': () => [h(CoarOverlayHost), h(DarkModeSync), h(ShellThemeSync), h(CoarThemeEditor, { hideDarkToggle: true })],
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
