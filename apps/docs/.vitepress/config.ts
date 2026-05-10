import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import {
  containerPreview,
  componentPreview,
} from '@vitepress-demo-preview/plugin';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  title: 'Cocoar UI Vue',
  description: 'Vue 3 component library for the Cocoar Design System',
  base: '/',

  head: [
    [
      'link',
      { rel: 'icon', type: 'image/svg+xml', href: '/logo_light.svg' },
    ],
    [
      'link',
      {
        rel: 'alternate',
        type: 'text/plain',
        href: '/llms.txt',
        title: 'LLM documentation (summary)',
      },
    ],
    [
      'link',
      {
        rel: 'alternate',
        type: 'text/plain',
        href: '/llms-full.txt',
        title: 'LLM documentation (full)',
      },
    ],
  ],

  vite: {
    server: {
      port: 5177,
    },
    resolve: {
      conditions: ['source'],
      alias: [
        {
          find: /^@cocoar\/vue-ui$/,
          replacement: resolve(
            __dirname,
            '../../../packages/ui/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-ui\/styles$/,
          replacement: resolve(
            __dirname,
            '../../../packages/ui/styles/all.css',
          ),
        },
        {
          find: /^@cocoar\/vue-localization$/,
          replacement: resolve(
            __dirname,
            '../../../packages/localization/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-fragment-parser$/,
          replacement: resolve(
            __dirname,
            '../../../packages/fragment-parser/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-data-grid$/,
          replacement: resolve(
            __dirname,
            '../../../packages/data-grid/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-script-editor$/,
          replacement: resolve(
            __dirname,
            '../../../packages/script-editor/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-markdown-editor$/,
          replacement: resolve(
            __dirname,
            '../../../packages/markdown-editor/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-calendar$/,
          replacement: resolve(
            __dirname,
            '../../../packages/calendar/src/index.ts',
          ),
        },
        {
          find: /^@cocoar\/vue-calendar\/core$/,
          replacement: resolve(
            __dirname,
            '../../../packages/calendar/src/core/index.ts',
          ),
        },
      ],
    },
    plugins: [
      llmstxt({
        excludeUnnecessaryFiles: false,
        ignoreFiles: ['changelog.md'],
      }),
    ],
    ssr: {
      noExternal: [
        '@cocoar/vue-ui',
        '@cocoar/vue-localization',
        '@cocoar/vue-fragment-parser',
        '@cocoar/vue-data-grid',
        '@cocoar/vue-markdown-editor',
        '@cocoar/vue-calendar',
        'ag-grid-community',
        'ag-grid-vue3',
        '@maskito/core',
        '@maskito/kit',
        '@maskito/vue',
        'prismjs',
      ],
      // Monaco is browser-only (canvas, workers, DOM). The demo dynamically imports
      // the editor inside onMounted so this list does not need `@cocoar/vue-script-editor`,
      // but we exclude `monaco-editor` from SSR just to make sure SSR never touches it.
      external: ['monaco-editor'],
    },
  },

  markdown: {
    config(md) {
      md.use(containerPreview);
      md.use(componentPreview);
    },
  },

  // Spike pages link to live playground demos at localhost:5188; the
  // VitePress dead-link checker can't reach them at build time.
  ignoreDeadLinks: [/^https?:\/\/localhost(:\d+)?\//],

  themeConfig: {
    logo: {
      light: '/logo_light.svg',
      dark: '/logo_dark.svg',
    },
    siteTitle: 'Cocoar UI Vue',

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/|/foundations/' },
      { text: 'Components', link: '/components/button', activeMatch: '/components/' },
      { text: 'Kitchen Sink', link: '/foundations/kitchen-sink' },
      { text: 'LLM Docs', link: '/llms-full.txt', target: '_blank' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Changelog', link: '/guide/changelog' },
          ],
        },
        {
          text: 'Foundations',
          items: [
            { text: 'Design Principles', link: '/foundations/design-principles' },
            { text: 'Colors', link: '/foundations/colors' },
            { text: 'Typography', link: '/foundations/typography' },
            { text: 'Spacing & Effects', link: '/foundations/spacing' },
            { text: 'Icons', link: '/foundations/icons' },
            { text: 'Motion', link: '/foundations/motion' },
            {
              text: 'Localization',
              collapsed: false,
              items: [
                { text: 'Setup', link: '/foundations/localization/setup' },
                { text: 'Formatting', link: '/foundations/localization/formatting' },
                { text: 'Translations', link: '/foundations/localization/translations' },
                { text: 'Timezones', link: '/foundations/localization/timezones' },
              ],
            },
          ],
        },
      ],
      '/foundations/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Changelog', link: '/guide/changelog' },
          ],
        },
        {
          text: 'Foundations',
          items: [
            { text: 'Design Principles', link: '/foundations/design-principles' },
            { text: 'Colors', link: '/foundations/colors' },
            { text: 'Typography', link: '/foundations/typography' },
            { text: 'Spacing & Effects', link: '/foundations/spacing' },
            { text: 'Icons', link: '/foundations/icons' },
            { text: 'Motion', link: '/foundations/motion' },
            {
              text: 'Localization',
              collapsed: false,
              items: [
                { text: 'Setup', link: '/foundations/localization/setup' },
                { text: 'Formatting', link: '/foundations/localization/formatting' },
                { text: 'Translations', link: '/foundations/localization/translations' },
                { text: 'Timezones', link: '/foundations/localization/timezones' },
              ],
            },
          ],
        },
      ],
      '/components/': [
        {
          text: 'Form Controls',
          items: [
            { text: 'Button', link: '/components/button' },
            { text: 'Form Field', link: '/components/form-field' },
            { text: 'Text Input', link: '/components/text-input' },
            { text: 'Number Input', link: '/components/number-input' },
            { text: 'Password Input', link: '/components/password-input' },
            { text: 'Select', link: '/components/select' },
            { text: 'Listbox', link: '/components/listbox' },
            { text: 'Dual Listbox', link: '/components/dual-listbox' },
            { text: 'Checkbox', link: '/components/checkbox' },
            { text: 'Radio Group', link: '/components/radio-group' },
            { text: 'Switch', link: '/components/switch' },
            { text: 'Date Picker', link: '/components/date-picker' },
            { text: 'DateTime Picker', link: '/components/date-time-picker' },
            { text: 'Zoned DateTime', link: '/components/zoned-date-time-picker' },
          ],
        },
        {
          text: 'Display',
          items: [
            { text: 'Avatar', link: '/components/avatar' },
            { text: 'Badge', link: '/components/badge' },
            { text: 'Card', link: '/components/card' },
            { text: 'Code Block', link: '/components/code-block' },
            { text: 'Divider', link: '/components/divider' },
            { text: 'Link', link: '/components/link' },
            { text: 'Note', link: '/components/note' },
            { text: 'Progress Bar', link: '/components/progress-bar' },
            { text: 'Spinner', link: '/components/spinner' },
            { text: 'Table', link: '/components/table' },
            { text: 'Tag', link: '/components/tag' },
          ],
        },
        {
          text: 'Navigation',
          items: [
            { text: 'Menu', link: '/components/menu' },
            { text: 'Context Menu', link: '/components/context-menu' },
            { text: 'Sidebar', link: '/components/sidebar' },
            { text: 'Navbar', link: '/components/navbar' },
            { text: 'Tabs', link: '/components/tabs' },
            { text: 'Segmented Control', link: '/components/segmented-control' },
            { text: 'Breadcrumb', link: '/components/breadcrumb' },
            { text: 'Pagination', link: '/components/pagination' },
          ],
        },
        {
          text: 'Overlay',
          items: [
            { text: 'Dialog', link: '/components/dialog' },
            { text: 'Popover', link: '/components/popover' },
            { text: 'Popconfirm', link: '/components/popconfirm' },
            { text: 'Toast', link: '/components/toast' },
            { text: 'Tooltip', link: '/components/tooltip' },
          ],
        },
        {
          text: 'Utilities',
          items: [
            { text: 'Transitions', link: '/components/transitions' },
            { text: 'Virtual List', link: '/components/virtual-list' },
            { text: 'Drag & Drop', link: '/components/drag-drop' },
            { text: 'Fragment Parser & Modal Routing', link: '/components/fragment-parser' },
          ],
        },
        {
          text: 'Content',
          items: [
            { text: 'Markdown', link: '/components/markdown' },
            { text: 'Markdown Editor (Preview)', link: '/components/markdown-editor' },
            { text: 'Script Editor', link: '/components/script-editor' },
          ],
        },
        {
          text: 'Data Grid',
          items: [
            { text: 'Overview', link: '/components/data-grid' },
            { text: 'Editing', link: '/components/data-grid/editing' },
            { text: 'Text Column', link: '/components/data-grid/text' },
            { text: 'Number Column', link: '/components/data-grid/number' },
            { text: 'Select Column', link: '/components/data-grid/select' },
            { text: 'Checkbox Column', link: '/components/data-grid/checkbox' },
          ],
        },
        {
          text: 'Calendar (Preview)',
          items: [
            { text: 'Overview', link: '/components/calendar/' },
            { text: 'CoarCalendar (composer)', link: '/components/calendar/coar-calendar' },
            { text: 'Day View', link: '/components/calendar/day-view' },
            { text: 'Week View', link: '/components/calendar/week-view' },
            { text: 'Month View', link: '/components/calendar/month-view' },
            { text: 'Agenda View', link: '/components/calendar/agenda-view' },
            { text: 'Performance baseline', link: '/components/calendar/performance' },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/cocoar-dev/cocoar-ui-vue',
      },
    ],

    search: { provider: 'local' },

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright 2026-present COCOAR e.U.',
    },
  },
});
