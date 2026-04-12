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
        'ag-grid-community',
        'ag-grid-vue3',
        '@maskito/core',
        '@maskito/kit',
        '@maskito/vue',
        'prismjs',
      ],
    },
  },

  markdown: {
    config(md) {
      md.use(containerPreview);
      md.use(componentPreview);
    },
  },

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
            { text: 'Fragment Parser & Modal Routing', link: '/components/fragment-parser' },
          ],
        },
        {
          text: 'Content',
          items: [
            { text: 'Markdown', link: '/components/markdown' },
          ],
        },
        {
          text: 'Data',
          items: [
            { text: 'Data Grid', link: '/components/data-grid' },
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
