# Getting Started

Set up the Cocoar Design System in your Vue 3 project in a few steps.

## 1. Install

```bash
pnpm add @cocoar/vue-ui
```

## 2. Import Fonts & Styles

Import fonts and styles in your app's entry point. Fonts are self-hosted via `@fontsource` — no external CDN needed.

```ts
// main.ts
import '@cocoar/vue-ui/fonts';   // Poppins + Inter (self-hosted)
import '@cocoar/vue-ui/styles';  // Design tokens + component styles
```

::: info Bring your own fonts?
The font import is optional. If you prefer a CDN or custom fonts, skip `@cocoar/vue-ui/fonts` and load them yourself. Components fall back to system fonts gracefully.
:::

## 3. Use Components

Import components directly — no global registration required. Tree-shaking is automatic.

```vue
<script setup>
import { CoarButton } from '@cocoar/vue-ui';
</script>

<template>
  <CoarButton>Hello Coar</CoarButton>
</template>
```

## 4. Dark Mode

Toggle dark mode by adding the `.dark-mode` class to the root element. All design tokens and components adapt automatically.

```ts
document.documentElement.classList.toggle('dark-mode', isDark);
```

## 5. Overlay System

For components that render overlays (Dialog, Toast, Popover, Tooltip), register the plugin once:

```ts
// main.ts
import { createApp } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');
```

And add the overlay host to your root layout:

```vue
<template>
  <router-view />
  <CoarOverlayHost />
</template>
```

## Additional Packages

Optional packages for extended functionality:

```bash
pnpm add @cocoar/vue-localization   # i18n & timezone
pnpm add @cocoar/vue-data-grid      # AG Grid wrapper
pnpm add @cocoar/vue-markdown       # Markdown viewer
```
