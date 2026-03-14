import { createRouter, createWebHistory } from 'vue-router';

export const NAV = [
  {
    label: 'Getting Started',
    path: '/getting-started',
  },
  {
    label: 'Foundations',
    children: [
      { label: 'Design Principles', path: '/foundations/design-principles' },
      { label: 'Colors',            path: '/foundations/colors' },
      { label: 'Typography',        path: '/foundations/typography' },
      { label: 'Spacing & Effects', path: '/foundations/spacing' },
      { label: 'Icons',             path: '/foundations/icons' },
      { label: 'Motion',            path: '/foundations/motion' },
      { label: 'Localization',      path: '/foundations/localization' },
    ],
  },
  {
    label: 'Form Controls',
    children: [
      { label: 'Button',              path: '/form/button' },
      { label: 'Text Input',          path: '/form/text-input' },
      { label: 'Number Input',        path: '/form/number-input' },
      { label: 'Password Input',      path: '/form/password-input' },
      { label: 'Select',              path: '/form/select' },
      { label: 'Checkbox',            path: '/form/checkbox' },
      { label: 'Radio Group',         path: '/form/radio-group' },
      { label: 'Switch',              path: '/form/switch' },
      { label: 'Labels',              path: '/form/labels' },
      { label: 'Date Picker',         path: '/form/date-picker' },
      { label: 'DateTime Picker',     path: '/form/date-time-picker' },
      { label: 'Zoned DateTime',      path: '/form/zoned-date-time-picker' },
    ],
  },
  {
    label: 'Display',
    children: [
      { label: 'Avatar',        path: '/display/avatar' },
      { label: 'Badge',         path: '/display/badge' },
      { label: 'Card',          path: '/display/card' },
      { label: 'Code Block',    path: '/display/code-block' },
      { label: 'Divider',       path: '/display/divider' },
      { label: 'Link',          path: '/display/link' },
      { label: 'Note',          path: '/display/note' },
      { label: 'Progress Bar',  path: '/display/progress-bar' },
      { label: 'Spinner',       path: '/display/spinner' },
      { label: 'Table',         path: '/display/table' },
      { label: 'Tag',           path: '/display/tag' },
    ],
  },
  {
    label: 'Navigation',
    children: [
      { label: 'Menu',       path: '/navigation/menu' },
      { label: 'Sidebar',    path: '/navigation/sidebar' },
      { label: 'Navbar',     path: '/navigation/navbar' },
      { label: 'Tabs',       path: '/navigation/tabs' },
      { label: 'Breadcrumb', path: '/navigation/breadcrumb' },
      { label: 'Pagination', path: '/navigation/pagination' },
    ],
  },
  {
    label: 'Overlay',
    children: [
      { label: 'Dialog',      path: '/overlay/dialog' },
      { label: 'Popover',     path: '/overlay/popover' },
      { label: 'Popconfirm',  path: '/overlay/popconfirm' },
      { label: 'Toast',       path: '/overlay/toast' },
      { label: 'Tooltip',     path: '/overlay/tooltip' },
    ],
  },
];

const PAGE_MAP: Record<string, () => Promise<unknown>> = {
  '/getting-started': () => import('./pages/GettingStartedPage.vue'),
  // Foundations
  '/foundations/design-principles': () => import('./pages/foundations/DesignPrinciplesPage.vue'),
  '/foundations/colors':            () => import('./pages/foundations/ColorsPage.vue'),
  '/foundations/typography':        () => import('./pages/foundations/TypographyPage.vue'),
  '/foundations/spacing':           () => import('./pages/foundations/SpacingPage.vue'),
  '/foundations/icons':             () => import('./pages/foundations/IconsPage.vue'),
  '/foundations/motion':            () => import('./pages/foundations/MotionPage.vue'),
  '/foundations/localization':      () => import('./pages/foundations/LocalizationPage.vue'),
  // Form Controls
  '/form/button':               () => import('./pages/form/ButtonPage.vue'),
  '/form/text-input':           () => import('./pages/form/TextInputPage.vue'),
  '/form/number-input':         () => import('./pages/form/NumberInputPage.vue'),
  '/form/password-input':       () => import('./pages/form/PasswordInputPage.vue'),
  '/form/select':               () => import('./pages/form/SelectPage.vue'),
  '/form/checkbox':             () => import('./pages/form/CheckboxPage.vue'),
  '/form/radio-group':          () => import('./pages/form/RadioGroupPage.vue'),
  '/form/switch':               () => import('./pages/form/SwitchPage.vue'),
  '/form/labels':               () => import('./pages/form/LabelsPage.vue'),
  '/form/date-picker':          () => import('./pages/form/DatePickerPage.vue'),
  '/form/date-time-picker':     () => import('./pages/form/DateTimePickerPage.vue'),
  '/form/zoned-date-time-picker': () => import('./pages/form/ZonedDateTimePickerPage.vue'),
  // Display
  '/display/avatar':       () => import('./pages/display/AvatarPage.vue'),
  '/display/badge':        () => import('./pages/display/BadgePage.vue'),
  '/display/card':         () => import('./pages/display/CardPage.vue'),
  '/display/code-block':   () => import('./pages/display/CodeBlockPage.vue'),
  '/display/divider':      () => import('./pages/display/DividerPage.vue'),
  '/display/link':         () => import('./pages/display/LinkPage.vue'),
  '/display/note':         () => import('./pages/display/NotePage.vue'),
  '/display/progress-bar': () => import('./pages/display/ProgressBarPage.vue'),
  '/display/spinner':      () => import('./pages/display/SpinnerPage.vue'),
  '/display/table':        () => import('./pages/display/TablePage.vue'),
  '/display/tag':          () => import('./pages/display/TagPage.vue'),
  // Navigation
  '/navigation/menu':       () => import('./pages/navigation/MenuPage.vue'),
  '/navigation/sidebar':    () => import('./pages/navigation/SidebarPage.vue'),
  '/navigation/navbar':     () => import('./pages/navigation/NavbarPage.vue'),
  '/navigation/tabs':       () => import('./pages/navigation/TabsPage.vue'),
  '/navigation/breadcrumb': () => import('./pages/navigation/BreadcrumbPage.vue'),
  '/navigation/pagination': () => import('./pages/navigation/PaginationPage.vue'),
  // Overlay
  '/overlay/dialog':      () => import('./pages/overlay/DialogPage.vue'),
  '/overlay/popover':     () => import('./pages/overlay/PopoverPage.vue'),
  '/overlay/popconfirm':  () => import('./pages/overlay/PopconfirmPage.vue'),
  '/overlay/toast':       () => import('./pages/overlay/ToastPage.vue'),
  '/overlay/tooltip':     () => import('./pages/overlay/TooltipPage.vue'),
};

function buildRoutes() {
  const routes = [];
  for (const item of NAV) {
    if ('path' in item) {
      const loader = PAGE_MAP[item.path];
      routes.push({ path: item.path, component: loader ?? (() => import('./pages/PlaceholderPage.vue')) });
    } else {
      for (const child of item.children) {
        const loader = PAGE_MAP[child.path];
        routes.push({ path: child.path, component: loader ?? (() => import('./pages/PlaceholderPage.vue')) });
      }
    }
  }
  return routes;
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/getting-started' },
    ...buildRoutes(),
  ],
});
