# Getting Started

Set up the Cocoar Design System in your Vue 3 project in a few steps.

## 1. Install

```bash
pnpm add @cocoar/vue-ui
```

## 2. Load Fonts

Cocoar uses **Poppins** (body, headings) and **Inter** (display titles). Add them to your `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

::: info
Without these fonts, components fall back to system fonts and won't match the design specs.
:::

## 3. Import Styles

Import the stylesheet in your app's entry point. This loads all design tokens (CSS variables) and component styles.

```ts
// main.ts
import '@cocoar/vue-ui/styles';
```

## 4. Use Components

Import components directly — no global registration required. Tree-shaking is automatic.

```vue
<script setup>
import { CoarButton } from '@cocoar/vue-ui';
</script>

<template>
  <CoarButton>Hello Coar</CoarButton>
</template>
```

## 5. Dark Mode

Toggle dark mode by adding the `.dark-mode` class to the root element. All design tokens and components adapt automatically.

```ts
document.documentElement.classList.toggle('dark-mode', isDark);
```

## 6. Overlay System

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
