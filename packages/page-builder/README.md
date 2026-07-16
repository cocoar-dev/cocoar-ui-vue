# @cocoar/vue-page-builder

A generic, headless visual page builder and renderer for Vue 3, built on the
Cocoar Design System. Users drag UI primitives onto a canvas, configure them,
and the result is a plain JSON schema (`PageNode`) that `<CoarPageRenderer>`
turns back into live Cocoar components.

Everything domain-specific — which actions a button may trigger, where images
come from, which elements are permitted, which element types even exist — is
defined by the **consumer application** through a single `PageConfig`, not by
the library. The renderer enforces `allowedElements` as a security boundary:
disallowed nodes are skipped at render time, even in hand-written or tampered
JSON.

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

## Schema (v2)

The persisted document is a tree of one uniform node grammar: `type` is an
open registry key (built-in or consumer), everything element-specific lives in
the `props` bag, and the host vocabulary — `id`, `style`, the value-model trio
`name` / `defaultValue` / `validation`, and `children` for containers — stays
at node level. The `page` root carries `schemaVersion: 2`.

```jsonc
{
  "id": "3f6c…",
  "type": "page",
  "schemaVersion": 2,
  "style": { "gap": "16px", "padding": "24px" },
  "children": [
    { "id": "a1b2…", "type": "heading", "props": { "text": "Sign in", "level": 2 } },
    {
      "id": "c3d4…",
      "type": "text-input",
      "props": { "label": "Email", "inputType": "email" },
      "name": "email",
      "validation": { "required": true },
      "style": { "size": "fill" }
    },
    {
      "id": "e5f6…",
      "type": "button",
      "props": { "label": "Sign in", "action": "auth:login", "validates": true }
    }
  ]
}
```

Pre-v2 documents (flat element props, no `schemaVersion`) are migrated
transparently on every ingest path; nodes with unknown/unregistered types are
kept losslessly in the tree (flagged in the builder, skipped with a one-time
warning at runtime).

## Custom elements

The built-in elements are just pre-registered entries of an open **element
registry** — a consumer can register its own element types on the exact same
contract via `config.elements` (or app-wide via `PAGE_ELEMENTS_KEY`). One
registration serves palette, canvas preview, props panel and the runtime
renderer; the value model (defaults, `required`, validation, action payloads)
comes from the host for free. Element renderers wire their field state through
`usePageElement()`.

```ts
import { definePageElement, type PageConfig } from '@cocoar/vue-page-builder';
import RatingRenderer from './RatingRenderer.vue';
import RatingInspector from './RatingInspector.vue';

const ratingElement = definePageElement<{ label: string; max: number }>({
  renderer: RatingRenderer, // receives { node }; field wiring via usePageElement()
  value: { isEmpty: (v) => !v || Number(v) === 0 }, // participates in the form value model
  builder: {
    label: { key: 'app.pb.rating', fallback: 'Rating' },
    icon: 'star',
    defaults: () => ({ label: 'Rating', max: 5 }),
    inspector: RatingInspector, // receives { node, patch }
  },
});

const config: PageConfig = {
  elements: { 'acme-rating': ratingElement }, // vendor-prefixed key
  allowedElements: ['stack', 'heading', 'text-input', 'button', 'acme-rating'],
};
```

## Documentation

Full docs — schema reference, `PageConfig` contract, element registry guide,
security model, and an IDP integration walkthrough — at
[docs.cocoar.dev/cocoar-ui-vue](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/):

- [Overview & `PageConfig`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/)
- [`<CoarPageBuilder>`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/coar-page-builder)
- [`<CoarPageRenderer>`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/coar-page-renderer)

## License

Apache-2.0
