---
description: "Markdown custom embeds — register Vue components rendered from :::key{props} directives in both viewer and editor, with lossless round-trip to plain text"
---

# Custom Embeds <Badge type="warning" text="Preview" />

Embed your own Vue components into markdown with a `:::key{props}` directive. The
**same** registry drives the shared viewer (`<CoarMarkdown>`) and the editor
(`<CoarMarkdownEditor>`): a registered component renders read-only when reading
and editable when writing, and the directive round-trips losslessly to text.

The embedded component has **zero dependency on markdown** — it's a plain
component with normal props that a consumer registers from the outside. The
markdown packages never depend on it; the registry is the only meeting point.

::: info Spans three packages
The directive parser lives in `@cocoar/vue-markdown-core` (Vue-free); the registry
and renderer in `@cocoar/vue-markdown`; the editor NodeView + insert affordance in
`@cocoar/vue-markdown-editor`. Registering an embed once lights up all three.
:::

<preview path="./markdown-embeds/demos/MarkdownEmbeds.vue" />

The demo registers one embed under the key `stat`. Edit the metric inline in the
editor, or insert a fresh one from the **Insert ▾** flyout in the left rail — the
viewer (right) updates from the same markdown.

## The directive

A custom embed is a standalone block on its own line:

```
:::stat{label="Revenue" value="1,284" trend="+12.4%" tone=positive}
```

- `stat` is the **key** — it selects the registered component.
- The `{…}` attributes become the component's props. Values are strings;
  bareword values may be unquoted (`tone=positive`, `id=2f1c0b9e-…`), values with
  spaces or specials are quoted (`label="Revenue"`). A valueless attribute
  (`{interactive}`) is an empty string.

The parser is **registry-agnostic**: any `:::key{…}` parses to a generic `embed`
node and round-trips, even when no component is registered for that key (it then
renders as a labelled placeholder — see [Unknown keys](#unknown-keys)).

::: tip Lossless round-trip
`parse → serialize → parse` is a fixed point. Canonical forms like
`:::map{id=<guid>}` are byte-stable; non-canonical input (extra quoting) is
normalized on the first serialize and stable thereafter.
:::

## Registering an embed

The registry maps a key to a definition. Pass it to the viewer and/or editor via
the `embeds` prop:

```ts
import type { EmbedRegistry } from '@cocoar/vue-markdown';
import StatCard from './StatCard.vue';        // your read-only component
import StatCardConfig from './StatCardConfig.vue'; // your editable component

const embeds: EmbedRegistry = {
  stat: {
    viewer: StatCard,           // required — read-only render (viewer + editor fallback)
    editor: StatCardConfig,     // optional — editable variant in the editor
    insert: {                   // optional — toolbar insert affordance
      label: 'Stat card',
      icon: 'layout-grid',
    },
  },
};
```

| Field | Type | Description |
|---|---|---|
| `viewer` | `Component` | **Required.** Read-only render for this key. Used by the viewer, and as the editor's fallback when no `editor` is supplied. Receives the directive attributes as props. |
| `editor` | `Component` | _Optional._ Editable variant mounted in the editor. Receives a single `controller` prop — see [The editor contract](#the-editor-contract). Falls back to `viewer` when omitted. |
| `insert` | `EmbedInsertIntegration` | _Optional._ Toolbar insert affordance — `{ label?, icon?, pick? }`. See [Toolbar insert](#toolbar-insert). |

::: tip `markRaw` your components
Wrap component definitions in `markRaw(...)` when building the registry so Vue
doesn't make them reactive: `{ viewer: markRaw(StatCard) }`.
:::

## Viewer

Pass `embeds` to `<CoarMarkdown>`. The directive renders through the registered
`viewer`, read-only:

```vue
<template>
  <CoarMarkdown :doc="doc" :embeds="embeds" />
</template>

<script setup lang="ts">
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { embeds } from './embeds';

const doc = parse(':::stat{label="Revenue" value="1,284"}', { gfm: true });
</script>
```

An app-wide default works too — `app.provide(MARKDOWN_EMBEDS_KEY, embeds)`. A
per-instance `embeds` prop wins over the provided value.

## Editor

Custom embeds are **non-portable**, so they're gated behind the `cocoar`
[flavor](/components/markdown-editor#flavors-portability) (or an explicit
`{ embeds: true }` capability). Pass the same registry via `embeds`:

```vue
<CoarMarkdownEditor
  v-model="value"
  flavor="cocoar"
  :embeds="embeds"
/>
```

The editor folds a `:::key{…}` line into an **atomic block** rendered by a live
NodeView. When the registry entry provides an `editor` component it's mounted
editable; otherwise the read-only `viewer` is shown. Either way the directive
round-trips on save.

### The editor contract

An editor component receives a single, typed `controller` prop — there is no
`v-model` emit string to remember. The controller carries the current attributes
and the write-back methods:

```ts
interface EmbedEditorController<T extends Record<string, string> = Record<string, string>> {
  readonly props: Readonly<T>;     // current directive attributes
  update(next: T): void;           // replace the whole bag → writes to markdown
  patch(partial: Partial<T>): void; // merge a partial patch (the common case)
}

interface EmbedEditorProps<T extends Record<string, string> = Record<string, string>> {
  controller: EmbedEditorController<T>;
}
```

Type your component with `EmbedEditorProps` and call `controller.patch(...)` to
write changes back. Those writes flow into the ProseMirror node and round-trip to
the `:::key{props}` markdown — which is the **only** difference between an editor
and the viewer: the viewer renders an immutable parsed document and cannot write.

```vue
<script setup lang="ts">
import type { EmbedEditorProps } from '@cocoar/vue-markdown';
import StatCard from './StatCard.vue';

const props = defineProps<EmbedEditorProps>();
</script>

<template>
  <div>
    <input
      :value="props.controller.props.label ?? ''"
      @input="props.controller.patch({ label: ($event.target as HTMLInputElement).value })"
    />
    <StatCard v-bind="props.controller.props" />
  </div>
</template>
```

::: tip Any edit UX — inline, modal, picker
The editor component is yours. It can edit inline (as above), or render the
read-only preview plus an **Edit** button that opens a `useDialog()` modal and
calls `controller.update(next)` on save. The library only provides the write
channel; the configuration UI is the embed's to design.
:::

::: info Generic attribute typing
`EmbedEditorProps<T>` is generic, so a specific embed can type its own bag —
`defineProps<EmbedEditorProps<{ id: string; zoom: string }>>()` — instead of the
default `Record<string, string>`.
:::

## Toolbar insert

Give a registry entry an `insert` and it can be placed in the toolbar. The
**registry** defines the *item* (icon, label, behaviour); the editor's
[`tools`](/components/markdown-editor#toolbar-layout-tools) layout decides
*where* it appears — referenced by `embed:<key>`:

```ts
const tools: CoarMarkdownEditorToolEntry[] = [
  'bold', 'italic', 'headings',
  'divider',
  { flyout: ['embed:stat'], label: 'Insert', icon: 'plus' }, // submenu, builtin + embed mixable
  'divider',
  'undo', 'redo',
];
```

```vue
<CoarMarkdownEditor v-model="value" flavor="cocoar" :embeds="embeds" :tools="tools" toolbar-mode="both" />
```

::: warning Insert lives in the sidebar
Like the table / image / code-block buttons, the insert item is a **sidebar**
tool — use `toolbar-mode="fixed"` or `"both"` so the rail is visible. Embeds are
block inserts, not text formatting, so they never appear in the floating toolbar.
:::

`EmbedInsertIntegration`:

| Field | Type | Description |
|---|---|---|
| `label` | `string` | Item label / tooltip. Defaults to the key. |
| `icon` | `string` | `CoarIcon` name. Defaults to `layout-grid`. |
| `pick` | `() => Promise<Record<string,string> \| null> \| Record<string,string> \| null` | _Optional._ Resolve the **start attributes** for a new embed — e.g. open a picker dialog. Return `null` to cancel. When omitted, a bare `:::key` is inserted. |

A `pick` callback is where you'd open a chooser (which map? which chart?) and
return its props, e.g. `() => ({ id: chosenGuid })` → inserts `:::map{id=…}`.

## Unknown keys

A `:::key{…}` whose key isn't registered still parses and round-trips — it just
renders as a labelled placeholder (`🧩 Unknown embed: :::key`) in both the viewer
and the editor, so the author sees that an embed is there instead of a blank gap.
This also means a document moved to an app that hasn't registered the embed
degrades gracefully rather than losing content.

## Security

In the JS renderer, attribute values are bound as **Vue props / text**, never via
`innerHTML` — so untrusted author text (a label like `</script><img onerror=…>`)
is inert by construction; no manual HTML escaping is needed. (A server-side
string-lowering renderer in another language must escape on its own.)

## API reference

### `@cocoar/vue-markdown-core`

| Export | Description |
|---|---|
| `parseEmbedDirective(line)` | Parse a single line into `{ key, props } \| null`. |
| `serializeEmbedDirective({ key, props })` | Serialize back to the canonical `:::key{props}` form. |
| `toEmbedProps(value)` | Coerce an unknown value into a clean `Record<string, string>`. |
| `'embed'` node type | Added to `MarkdownNodeType`; `attrs` carry `{ key, props }`. |

### `@cocoar/vue-markdown`

| Export | Description |
|---|---|
| `EmbedRegistry` | `Record<string, EmbedDefinition>` — the key → definition map. |
| `EmbedDefinition` | `{ viewer, editor?, insert? }`. |
| `EmbedEditorProps` / `EmbedEditorController` | The editor component's `controller` contract. |
| `EmbedInsertIntegration` | `{ label?, icon?, pick? }`. |
| `MARKDOWN_EMBEDS_KEY` | Inject key for an app-wide registry. |
| `EmbedRenderer` | The shared resolve-and-render component (used internally by viewer + editor). |

### `@cocoar/vue-markdown-editor`

| Export | Description |
|---|---|
| `CoarMarkdownEditorToolEntry` | A `tools` entry: a ref, a `{ flyout }` group, or `'divider'`. |
| `CoarMarkdownEditorToolRef` | `CoarMarkdownEditorTool \| ` `` `embed:${string}` ``. |
| `CoarMarkdownEditorToolFlyout` | `{ flyout, label?, icon? }`. |

All embed types are re-exported from `@cocoar/vue-markdown-editor`, so a consumer
can import everything from one place.
