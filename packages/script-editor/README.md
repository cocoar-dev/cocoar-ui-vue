# @cocoar/vue-script-editor

Monaco-based script editor for Vue 3 with Cocoar Design System theming and **locked-line protection** for templates where signatures stay fixed and users fill in bodies.

Initial scope: **TypeScript and JavaScript** only, with support for user-supplied type definitions (`extraLibs`).

## Install

```bash
pnpm add @cocoar/vue-script-editor monaco-editor
```

`monaco-editor` is a peer dependency — consumers install and configure it themselves (this
keeps the library bundle small and avoids double-bundling Monaco's ~5 MB of language services).

## Worker setup

Monaco needs its language services to run in Web Workers. You register them by assigning a
getter to `self.MonacoEnvironment` **before any editor mounts**. Pick the pattern that
matches your app's shape.

### SPA (client-only, Vite)

The common case — a single-page app that runs only in the browser. Register workers once at
application entry:

```ts
// src/main.ts
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};
```

Drop the `JsonWorker` entries if you don't use JSON mode.

### SSR / static-generation (VitePress, Nuxt, Astro)

Monaco touches `window`, `document`, and the DOM — it cannot run during server-side
rendering. Defer both the worker registration AND the editor import to `onMounted`, and
guard with `<ClientOnly>` in your template:

```vue
<template>
  <ClientOnly>
    <component :is="Editor" v-if="Editor" v-model="code" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const Editor = shallowRef<Component | null>(null);
const code = ref('// ...');

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  self.MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>
```

`<ClientOnly>` is registered globally by VitePress and Nuxt. In a plain Vite SPA you don't
need it — the SPA pattern above is simpler. In Astro use `client:only="vue"` on the component.

### Other bundlers

`monaco-editor`'s [official docs](https://github.com/microsoft/monaco-editor/tree/main/docs)
cover Webpack, esbuild, Rollup, and plain CDN setups. The same `self.MonacoEnvironment.getWorker`
contract applies — only the worker import syntax changes.

## Basic usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';

const code = ref(`function greet(name: string) {\n  return \`Hello, \${name}\`;\n}\n`);
</script>

<template>
  <CoarScriptEditor v-model="code" language="typescript" />
</template>
```

## Constrained mode — `// @locked` lines

Any line of the source that contains `// @locked` is **protected**: users cannot edit,
merge, or delete it. Everything else is freely editable — including the file top, so
TypeScript's Auto-Import quickfix works as in any normal `.ts` file.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor, type CoarScriptEditorRejectEvent } from '@cocoar/vue-script-editor';

const code = ref(`function describeOrder(order: Order): string { // @locked
  return \`Order \${order.id}\`;
} // @locked
`);

function onReject(event: CoarScriptEditorRejectEvent) {
  // Reject reason is 'edit-overlaps-locked-line'. Surface a toast, shake, etc.
  console.log('Edit rejected on line', event.range?.startLineNumber);
}
</script>

<template>
  <CoarScriptEditor v-model="code" language="typescript" @reject="onReject" />
</template>
```

The `v-model` string **includes** the `// @locked` markers, so it round-trips through
persistence unchanged — save and reload the exact same value.

### Authoring mode

Template authors need to edit the protected parts too. Pass `:authoring="true"` to suspend
enforcement — locked lines become editable, markers render at full size with a warm accent
colour, and the author can add or remove markers. Toggle back to `false` and enforcement
resumes with whatever markers are currently in the text.

```vue
<CoarScriptEditor v-model="code" :authoring="isAuthor" />
```

### Custom type definitions (`extraLibs`)

Inject `.d.ts` contents so user code can reference your domain types with full IntelliSense:

```ts
import type { CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';

const extraLibs: CoarScriptEditorExtraLib[] = [
  {
    content: `declare interface AppContext { user: { id: string; name: string } };`,
    // IMPORTANT: must start with `file:///` — Monaco's TypeScript service keys on path
    // and silently ignores non-file URIs. A dev-mode console.warn flags this in dev.
    filePath: 'file:///types/app-context.d.ts',
  },
];
```

### Pure helpers (no editor mount required)

For server-side validation, submit-gating, or tests:

```ts
import {
  hasLockedMarkers,
  getEditableSegments,
  getSlots,
  getSlot,
  isEverySegmentNonEmpty,
  validateSource,
  countLockedLines,
  SLOT_MARKER_PATTERN,
} from '@cocoar/vue-script-editor';

if (isEverySegmentNonEmpty(code)) submit(code);

const v = validateSource(code);
// v.ok, v.lockedLineCount, v.segmentCount, v.warnings: string[]
```

### Named slots

Mark an editable region with `@slot:NAME` on a `// @locked` line to name it. `getSlots(source)` returns a `{ slotName: bodyContent }` dictionary; `getSlot(source, name)` returns a single body (or `undefined` if the slot is not declared). The slot marker sits on a locked line so the user cannot delete it.

```ts
const template = `function fn1(x) { // @locked @slot:fn1
  return x + 1;
} // @locked

function fn2(x) { // @locked @slot:fn2
} // @locked`;

const slots = getSlots(template);
// { fn1: '  return x + 1;', fn2: '' }
```

Empty string = slot exists but body is whitespace-only. Server-side parsers (e.g. a C# Jint host) can mirror the same regex via `SLOT_MARKER_PATTERN`. See the [full docs](https://docs.cocoar.dev/cocoar-ui-vue/components/script-editor) for the C# port.

See the full docs page for the deeper helpers (`scanLockedLines`, `computeProtectedRanges`,
`editIsProtected`, `snapOffsetAwayFromLocked`).

## Props

| Prop           | Type                                      | Default        | Description                                                                |
| -------------- | ----------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `modelValue`   | `string`                                  | `''`           | Editor content (use with `v-model`). `// @locked` lines protected.          |
| `authoring`    | `boolean`                                 | `false`        | Authoring mode — suspends enforcement for template authors.                 |
| `language`     | `'typescript' \| 'javascript' \| 'json'`  | `'typescript'` | Language mode.                                                             |
| `readonly`     | `boolean`                                 | `false`        | Viewer mode — selection / copy still work.                                  |
| `disabled`     | `boolean`                                 | `false`        | Non-interactive form state. Picked up from `CoarFormField`.                 |
| `error`        | `boolean`                                 | `false`        | Error state — red border. Auto-picked up from `CoarFormField`.              |
| `placeholder`  | `string`                                  | `''`           | Placeholder shown when empty and not focused.                              |
| `required`     | `boolean`                                 | `false`        | Sets `aria-required="true"`.                                               |
| `autofocus`    | `boolean`                                 | `false`        | Focus the editor after mount.                                              |
| `id`           | `string`                                  | `''`           | HTML id (auto-generated if omitted; `CoarFormField.id` wins).               |
| `name`         | `string`                                  | `''`           | Informational `data-name` (the editor is not a native form control).        |
| `height`       | `string \| number`                        | `undefined`    | CSS string (`"160px"`, `"40vh"`) or pixels as number.                       |
| `variant`      | `'editor' \| 'inline'`                    | `'editor'`     | UI preset: full chrome vs compact form-field look.                         |
| `lineNumbers`  | `boolean`                                 | `undefined`    | Explicit toggle for the line-number gutter. Overrides the variant default.  |
| `scriptMode`   | `boolean`                                 | `false`        | Suppress TS/JS diagnostics for script-body code. **Global side-effect**.    |
| `preamble`     | `string`                                  | `''`           | Hidden + locked per-editor type context (not in `modelValue`).              |
| `minimap`      | `boolean`                                 | `false`        | Show the Monaco minimap gutter.                                            |
| `theme`        | `'auto' \| 'light' \| 'dark'`             | `'auto'`       | `auto` follows `.dark-mode` class and `prefers-color-scheme`.               |
| `extraLibs`    | `CoarScriptEditorExtraLib[]`              | `[]`           | TypeScript declarations for IntelliSense.                                  |

## Events

| Event               | Payload                        | Description                                                                       |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `update:modelValue` | `string`                       | Full editor text. Markers stay; preamble is stripped before emit.                 |
| `reject`            | `CoarScriptEditorRejectEvent`  | Emitted when an edit was rolled back by the constrained guards.                    |
| `focused`           | `void`                         | Editor widget gained focus (including suggestion popups).                          |
| `blurred`           | `void`                         | Editor widget lost focus — use for form-touched state.                             |

```ts
interface CoarScriptEditorRejectEvent {
  reason: 'edit-overlaps-locked-line';
  range?: { startLineNumber: number; endLineNumber: number };
}
```

## Exposed methods

The component exposes `focus()` as a convenience, plus `getEditor()` and `getModel()` for access
to the raw Monaco instance when you need APIs beyond the declarative props (markers, custom
commands, folding, etc.):

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';

const editorRef = ref<InstanceType<typeof CoarScriptEditor> | null>(null);

function focusEditor() {
  editorRef.value?.focus();
}
</script>

<template>
  <CoarScriptEditor ref="editorRef" v-model="code" />
</template>
```

## Forms

`CoarScriptEditor` integrates with `CoarFormField` the same way `CoarTextInput` does — label,
error state, `aria-describedby`, required marker, and disabled state all wire up automatically:

```vue
<CoarFormField label="Handler script" :error="scriptError" required>
  <CoarScriptEditor
    v-model="form.script"
    variant="inline"
    height="180px"
    placeholder="// return query.filter(...)"
    script-mode
    preamble="declare const query: TodoQuery;"
    :extra-libs="[{ filePath: 'file:///types/query.d.ts', content: queryTypes }]"
  />
</CoarFormField>
```

- **`preamble`** — hidden + locked type-context lines, per-editor scope. Emitted `modelValue`
  is the user portion only.
- **`script-mode`** — suppresses diagnostics for top-level `return`/`await`/`export`. Global
  side-effect across all TS/JS editors.
- **`variant="inline"`** — compact form-field chrome: no line numbers, no gutter, tight padding.
- **`height`** — CSS string or pixels. The editor fills its parent if omitted.

## Full documentation

See the [Cocoar UI Vue docs](https://docs.cocoar.dev/cocoar-ui-vue/components/script-editor)
for the complete guide, including styling, `@reject` payload details, a live playground,
and the full list of pure helpers.
