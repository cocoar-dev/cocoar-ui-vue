# @cocoar/vue-ui

Cocoar Design System — a touch-first Vue 3 component library with 30+ accessible, themeable components.

## Install

```bash
pnpm add @cocoar/vue-ui
```

## Quick Start

```ts
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';
import { CoarButton } from '@cocoar/vue-ui';
```

## Scoped application themes

`CoarThemeScope` applies one host-owned theme to a subtree without changing
the surrounding application. Supply stable brand primitives; Cocoar derives
the normal light/dark primitive and semantic token graph from them. Geometry
and font values are shared by both modes. Teleported Cocoar overlays opened
inside the scope inherit the same theme automatically.

```vue
<script setup lang="ts">
import { CoarThemeScope, type CoarTheme } from '@cocoar/vue-ui';

const customerTheme: CoarTheme = {
  accent: '#10b981',
  error: '#e5484d',
  buttonRadius: 999,
  inputRadius: 14,
  cardRadius: 20,
  bodyFontFamily: 'Inter, sans-serif',
};
</script>

<template>
  <CoarThemeScope :theme="customerTheme" mode="auto">
    <CustomerApplication />
  </CoarThemeScope>
</template>
```

`mode` is `'light'`, `'dark'`, or `'auto'`. Auto follows the nearest
`.light-mode` / `.dark-mode` (or `data-theme`) ancestor and otherwise the OS
preference. The scope is generic: it has no knowledge of tenants, OAuth
clients, the PageBuilder, or how the host resolved the theme.

## Documentation

Full documentation, live demos, and API reference: **[docs.cocoar.dev/cocoar-ui-vue](https://docs.cocoar.dev/cocoar-ui-vue/)**

## License

Apache-2.0
