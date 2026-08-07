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

## Schema (v4)

The persisted document is a tree of one uniform node grammar: `type` is an
open registry key (built-in or consumer), everything element-specific lives in
the `props` bag, and the host vocabulary — `id`, `style`, the value-model trio
`name` / `defaultValue` / `validation`, and `children` for containers — stays
at node level. The `page` root carries `schemaVersion: 4`. Version 4 gives every
element a stable, page-wide `name`; value elements use that same name as their
form/DTO property and Element Code uses it as its authoring identity.

```jsonc
{
  "id": "3f6c…",
  "type": "page",
  "schemaVersion": 4,
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

Older documents are normalized transparently on every ingest path: pre-v2 flat
props move into the `props` bag, v3 runtime-composition documents keep their
meaning, and v4 deterministically adds missing element names. Unknown or
unregistered types stay losslessly in the tree (flagged in the builder, skipped
with a one-time warning at runtime).

## Action payloads

Every action-capable element uses the same optional `ActionProps` contract:

```ts
interface ActionProps {
  action?: string;
  actionValues?: Record<string, unknown>;
  actionValueField?: string;
  actionValue?: unknown;
}
```

`actionValues` contains JSON-safe defaults. Every individual entry can be
switched to **fx** or bound through `bindings["actionValues.<key>"]` to a host
context value, customer Page State, form field, named Repeat selection, current
Repeat item/index, or a sandbox expression. `actionValue` /
`actionValueField` remain as the backwards-compatible single-dynamic-value
shape. The handler receives one snapshot with deterministic precedence:
**form values < resolved `actionValues` < dynamic `actionValue`**. Explicit
action arguments therefore win key collisions with form fields.

```jsonc
{
  "props": {
    "action": "auth:consent-allow",
    "actionValues": { "approvedScopes": [] }
  },
  "bindings": {
    "actionValues.approvedScopes": {
      "source": "selection",
      "path": "approvedScopes"
    }
  }
}
```

The builder supplies this editor automatically to built-in buttons/links and
to consumer elements registered with `action: true`. A custom action renderer
should call `usePageElement().triggerElementAction(node.props)` so it follows
the identical merge, validation and async-action path.

## Host themes and style presets

Runtime applications wrap the renderer in the generic `CoarThemeScope` from
`@cocoar/vue-ui`. For authoring, pass the same theme as `previewTheme`; it is
applied only to the preview canvas, never to the builder chrome.

Host CSS can be exposed as controlled presets through `PageConfig`:

```ts
const config: PageConfig = {
  stylePresets: [{
    id: 'brand-auth-visual',
    label: 'Brand Auth Visual',
    className: 'brand-auth-visual',
    allowedOn: ['page', 'stack', 'card'],
  }],
};
```

The page document stores only `stylePreset: 'brand-auth-visual'`; it never
stores raw CSS or an arbitrary class. The host must load the matching CSS in
both administration and runtime. Unknown, unsafe, or disallowed presets are an
authoring error and are safely ignored by the renderer.

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

## Field contract

Every element has one page-wide unique `name`, which is its exact Page-Code
key (`elements.pageTitle`). For value elements, the same name is also the form
and DTO property (`elements.username` and `fields.username`); there is no
second field-name or identifier property.

Pages are usually projections of a DTO — the value-element names and types are
known up front. Declare them as `config.fields` and authors *pick* fields instead
of inventing names: the props panel's Name becomes a select filtered to the
value types each element can edit (`ElementValueSpec.types`; the rating above
declares `types: ['number']` and shows up for number fields), the palette
gains a draggable **Fields** group that drops pre-bound default elements, an
**Element** select switches a bound field to another compatible
representation, and the builder lint flags unknown names, incompatible
bindings and missing required fields. Authoring-only: binding is plain
`node.name`, so persisted schemas stay self-contained and render without the
contract.

```ts
const config: PageConfig = {
  fields: [
    { name: 'username',   valueType: 'string',  label: 'Username', required: true },
    { name: 'password',   valueType: 'string',  label: 'Password', required: true, defaultElement: 'password-input' },
    { name: 'rememberMe', valueType: 'boolean', label: 'Remember me' },
    { name: 'age',        valueType: 'number',  label: 'Age' },
    { name: 'dueUntil',   valueType: 'date',    label: 'Due until' },
  ],
};
```

## Page-owned translations

Human-readable element properties use stable translation keys instead of
embedding one object per language into every node. The root owns the editable
catalogue and Element Code keeps only a data-safe reference:

```jsonc
{
  "type": "page",
  "translations": {
    "de": { "page.submit.label": "Anmelden" },
    "en": { "page.submit.label": "Sign in" }
  }
}
```

```js
element.props.label = i18n.text('page.submit.label', undefined, 'Sign in');
```

The Builder's **Translations** tab edits the catalogue, reports missing/unused
keys and shares its language with the preview. Localizability is explicit
element metadata (`valueKind: 'localized-text'`), so layout strings such as
`style.width` never accidentally get translation UI. Monaco completes the
keys present in the page document. At runtime page messages win, then the
host's `@cocoar/vue-localization` store is consulted, followed by the binding
fallback and finally the key itself. The legacy `LocalizedValue` shape remains
readable for existing documents, but new authoring uses translation bindings.

## JavaScript property bindings

Bindable properties can retain a static fallback and opt into a pure
JavaScript expression. In the right-hand Properties panel, a compact `fx`
control in the property's label row switches modes without opening an editor
(struck through = static, accent colour = expression). Its explicit Edit action
opens the shared lazy Monaco dialog. Disabled expressions remain persisted with
`enabled: false`, so switching modes never loses authored code. The optional
Logic overview opens that same dialog and edits the same record:

```ts
const submit = {
  id: 'submit',
  type: 'button',
  props: { label: 'Sign in', disabled: false },
  bindings: {
    disabled: {
      source: 'expression',
      expression: '!fields.username?.trim() || !fields.password',
    },
  },
};
```

The builder never evaluates this source. A host-owned sandbox session extracts
definitions with `collectPageRuntimeExpressions()`, evaluates them, and passes
the data-only result map to `CoarPageRenderer.expressionValues` (or
`CoarPageBuilder.previewExpressionValues`). Static props remain active during
startup and after runtime failures. Monaco is lazy-loaded in JavaScript mode;
host field/context contracts provide its IntelliSense declarations.

## Browser Page Runtime

The package contains the SES Worker runtime used by Page State, constrained Page
Root Code and per-element code.
Create the host once in the consumer application. It is a capability catalogue,
not shared page state; every `usePageCodeRuntime()` call owns an isolated Worker
session and disposes it with the Vue component.

```ts
import {
  definePageRuntimeHost,
  withRuntimeEndowmentContext,
} from '@cocoar/vue-page-builder';

export const pageRuntimeHost = definePageRuntimeHost({
  endowments: {
    api: {
      loadOptions: withRuntimeEndowmentContext(
        ({ signal, tenantId }, source: unknown) =>
          applicationApi.loadOptions(String(source), { tenantId, signal }),
      ),
    },
  },
  grants: ({ pageId, definition }) =>
    pageId.startsWith('auth:') && definition.id.startsWith('element-action:')
      ? ['api']
      : [],
});
```

```ts
const runtime = usePageCodeRuntime({
  pageId,
  tenantId,
  schema,
  context,
  viewport,
  runtimeHost: pageRuntimeHost,
});
```

Pass `runtime.pageCodeValues` and `runtime.onRuntimeChange` to the renderer and
route unknown action ids through `runtime.runPageAction`. If no host is passed,
the package uses a no-capability host: there is no ambient `fetch`, `window`, DOM
or application API inside tenant code.

The consuming Vite build emits the SES runtime as a same-origin
`pageScriptRuntime.worker-<hash>.js` module asset. Keep the document CSP free of
`unsafe-eval`; see `IDP_INTEGRATION.md` for the Worker-response CSP requirement.
For Vite development, exclude only the dedicated runtime entry from dependency
pre-bundling:

```ts
optimizeDeps: { exclude: ['@cocoar/vue-page-builder/runtime-worker'] }
```

`CoarPageBuilder` owns its embedded preview runtime. A selected fixture now
provides context, view state, locale and viewport as one effective preview
contract; the Builder evaluates Page State, Page Root Code and Element Code in
that same isolated session. Pass `previewRuntimeHost` only when preview actions
need the application's explicitly granted capabilities.

The package also exports four optional integration presets:
`createAuthPageDocument()` and `createAuthPageConfig()` for `login`,
`password-forgot`, `logout` and `consent`. They are example/default documents;
all underlying elements, repeaters, feedback zones and runtime APIs remain
generic.

See [IDP_INTEGRATION.md](./IDP_INTEGRATION.md) for the complete draft/publish,
host-action and security contract.

## Documentation

Full docs — schema reference, `PageConfig` contract, element registry guide,
security model, and an IDP integration walkthrough — at
[docs.cocoar.dev/cocoar-ui-vue](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/):

- [Overview & `PageConfig`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/)
- [`<CoarPageBuilder>`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/coar-page-builder)
- [`<CoarPageRenderer>`](https://docs.cocoar.dev/cocoar-ui-vue/components/page-builder/coar-page-renderer)

## License

Apache-2.0
