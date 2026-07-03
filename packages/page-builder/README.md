# @cocoar/vue-page-builder

A generic, headless visual page builder and renderer for Vue 3, built on the
Cocoar Design System. Users drag UI primitives onto a canvas, configure them,
and the result is a plain JSON schema (`PageNode`) that `<CoarPageRenderer>`
turns back into live Cocoar components.

Everything domain-specific — which actions a button may trigger, where images
come from, which elements are permitted — is defined by the **consumer
application** through a single `PageConfig`, not by the library. The renderer
enforces `allowedElements` as a security boundary: disallowed nodes are skipped
at render time, even in hand-written or tampered JSON.

## Install

```bash
pnpm add @cocoar/vue-page-builder @cocoar/vue-ui
```

`@cocoar/vue-ui` and `vue` are peer dependencies. Import the stylesheet once —
it carries the builder chrome **and** the renderer's layout styles:

```ts
import '@cocoar/vue-page-builder/styles';
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarPageBuilder,
  CoarPageRenderer,
  type PageNode,
  type PageConfig,
} from '@cocoar/vue-page-builder';

const schema = ref<PageNode>();

const config: PageConfig = {
  allowedElements: ['stack', 'card', 'heading', 'paragraph', 'text-input', 'button'],
  availableActions: [{ id: 'auth:login', label: 'Sign in' }],
};
</script>

<template>
  <!-- Visual editor (needs a bounded height) -->
  <CoarPageBuilder v-model="schema" :config="config" style="height: 700px" />

  <!-- Runtime renderer — same config = same boundary -->
  <CoarPageRenderer
    :schema="schema!"
    :config="config"
    :actions="{ 'auth:login': (values) => console.log(values) }"
  />
</template>
```

## Documentation

Full docs — schema reference, `PageConfig` contract, security model, and an
IDP integration walkthrough — at
[docs.cocoar.dev/cocoar-ui-vue](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/).

## License

Apache-2.0
