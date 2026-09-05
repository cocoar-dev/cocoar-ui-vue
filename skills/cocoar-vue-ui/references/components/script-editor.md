<!-- Generated from apps/docs/components/script-editor.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Script Editor

A Monaco-based code editor for Vue 3 with Cocoar Design System theming. Supports **TypeScript, JavaScript, and JSON**, with first-class support for user-supplied type definitions (IntelliSense for your domain types).

> **Info: Separate Package**
>
```bash
pnpm add @cocoar/vue-script-editor monaco-editor
```
> `monaco-editor` is a peer dependency — consumers install and configure it themselves. This keeps the library bundle small and lets each app decide which Monaco languages and features to ship.

## Worker Setup

Monaco offloads language services to Web Workers. Register them once **before any editor mounts**. Pick the pattern that matches your app's shape.

### SPA (client-only, Vite)

The common case. Register at application entry (`src/main.ts` or equivalent):

```ts
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};
```

Omit the JSON branch if your app never uses `language="json"`.

### SSR / static-generation (VitePress, Nuxt, Astro)

Monaco touches `window` and the DOM, so it cannot run during server-side rendering. Defer both worker registration and the editor import to `onMounted`, and wrap the template in `<ClientOnly>`:

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
  const [mod, editorWorker, tsWorker, jsonWorker] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  self.MonacoEnvironment = {
    getWorker(_id, label) {
      if (label === 'typescript' || label === 'javascript') return new tsWorker.default();
      if (label === 'json') return new jsonWorker.default();
      return new editorWorker.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>
```

> **Info: Where does `<ClientOnly>` come from?**
>
> VitePress and Nuxt register `<ClientOnly>` globally. In a plain Vite SPA you don't need it — the SPA pattern above is simpler. In Astro use `client:only="vue"` on the component instead.

Other bundlers (Webpack, Rollup, esbuild, or a CDN setup) use the same `self.MonacoEnvironment.getWorker` contract with different worker-import syntax — see [Monaco's official docs](https://github.com/microsoft/monaco-editor/tree/main/docs).

## Basic Usage

The editor exposes a plain `v-model` for the source text. Use `language` to choose between `'typescript'` (default), `'javascript'`, and `'json'`.

**Demo — `script-editor/demos/ScriptEditorBasic.vue`**

```vue
<template>
  <ClientOnly>
    <component
      :is="Editor"
      v-if="Editor"
      v-model="code"
      language="typescript"
      style="height: 320px"
    />
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const code = ref(`function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet('World');
console.log(message);
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

```vue
<template>
  <CoarScriptEditor v-model="code" language="typescript" style="height: 320px" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';

const code = ref(`function greet(name: string) {\n  return \`Hello, \${name}\`;\n}\n`);
</script>
```

> **Tip: Sizing**
>
> The editor fills its parent container. Either pass a `height` prop (`"160px"`, `240`, `"40vh"`) or wrap in a parent with explicit height. The editor's own default `min-height: 200px` only applies when no parent height is set.

## Form Integration

`CoarScriptEditor` is a full citizen of the Cocoar form ecosystem. Drop it inside `CoarFormField` and label, error message, `aria-describedby` wiring, and disabled state propagate automatically — the same way `CoarTextInput` and `CoarSelect` behave. Use `variant="inline"` for a compact form-field look (no line numbers, no gutter, tight padding) and `script-mode` to suppress the "top-level return/await" errors Monaco normally emits for full `.ts` programs.

`preamble` gives you per-editor type context without polluting the global TS namespace: the declaration lines render invisibly above the user script (hidden + locked), and `modelValue` only round-trips the user portion.

**Demo — `script-editor/demos/ScriptEditorInForm.vue`**

```vue
<template>
  <ClientOnly>
    <div v-if="Editor && FormField && Button" class="form-demo">
      <component :is="FormField" label="Script name" :error="nameError" required>
        <component :is="TextInput" v-model="form.name" placeholder="mytask" />
      </component>

      <component :is="FormField" label="Handler script" :error="scriptError" hint="TypeScript body. `query` is pre-declared." required>
        <component
          :is="Editor"
          v-model="form.script"
          variant="inline"
          language="typescript"
          height="180px"
          placeholder="// return query.filter(...)"
          script-mode
          preamble="declare const query: TodoQuery;"
          :extra-libs="extraLibs"
        />
      </component>

      <div class="row">
        <component :is="Button" type="primary" @clicked="onSubmit">Save</component>
        <component :is="Button" @clicked="onReset">Reset</component>
      </div>

      <pre class="preview">{{ preview }}</pre>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, type Component } from 'vue';

const form = reactive({
  name: '',
  script: '',
});

const nameError = computed(() => (form.name.length === 0 ? 'Required.' : ''));
const scriptError = computed(() =>
  form.script.trim().length === 0 ? 'Provide a handler body.' : '',
);
const preview = computed(() => JSON.stringify(form, null, 2));

function onSubmit() {
  if (nameError.value || scriptError.value) return;
  // eslint-disable-next-line no-console
  console.log('submit', form);
}

function onReset() {
  form.name = '';
  form.script = '';
}

const extraLibs = [
  {
    filePath: 'file:///types/todo-query.d.ts',
    content: `
interface Todo { id: string; title: string; done: boolean; }
interface TodoQuery {
  filter(predicate: (todo: Todo) => boolean): Todo[];
  find(predicate: (todo: Todo) => boolean): Todo | undefined;
  map<T>(mapper: (todo: Todo) => T): T[];
}
    `.trim(),
  },
];

const Editor = shallowRef<Component | null>(null);
const FormField = shallowRef<Component | null>(null);
const TextInput = shallowRef<Component | null>(null);
const Button = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, ui, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('@cocoar/vue-ui'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
  FormField.value = ui.CoarFormField;
  TextInput.value = ui.CoarTextInput;
  Button.value = ui.CoarButton;
});
</script>

<style scoped>
.form-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  gap: 8px;
}

.preview {
  background: var(--coar-surface-neutral-secondary, #f9fafb);
  border: 1px solid var(--coar-border-neutral-tertiary, #e5e7eb);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #4b5563);
  overflow: auto;
  margin: 0;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

```vue
<template>
  <CoarFormField label="Handler script" :error="scriptError" required>
    <CoarScriptEditor
      v-model="form.script"
      variant="inline"
      language="typescript"
      height="180px"
      placeholder="// return query.filter(...)"
      script-mode
      preamble="declare const query: TodoQuery;"
      :extra-libs="[{ filePath: 'file:///types/todo-query.d.ts', content: todoQueryTypes }]"
    />
  </CoarFormField>
</template>
```

### `preamble` — per-editor type context

`preamble` is a hidden, auto-locked prefix prepended to the editor content. It's rendered invisibly, can't be edited or cursored into, and never appears in the emitted `modelValue`. The TypeScript service sees it as normal source, so IntelliSense resolves symbols declared inside it.

Typical use-case: your runtime executes the user's script as a function body with a specific set of bindings (`query`, `ctx`, `request`, …). Declare them in the preamble so the editor IntelliSense matches the runtime shape exactly:

```vue
<CoarScriptEditor
  v-model="form.script"
  preamble="declare const query: TodoQuery;\ndeclare const ctx: WorkflowCtx;"
/>
```

**When to use `preamble` vs `extraLibs`:**

| Signal                                            | Use `preamble`                           | Use `extraLibs`                    |
| ------------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| Scope should be limited to this editor instance   | ✅                                        | ❌ (globally ambient)               |
| Different editors need different variable names   | ✅                                        | ❌                                  |
| App-wide shared domain types, interfaces          | ❌                                        | ✅                                  |
| You want the declaration to match a runtime shape | ✅ (declaration is literal code)          | 〰️ (works if wrapped in `declare global`) |

The two are complementary — most real forms use `extraLibs` for interfaces (`TodoQuery`, `Todo`, …) and `preamble` for the bindings that actually exist at runtime (`declare const query: TodoQuery`).

### `script-mode` — suppress script-body diagnostics

Enables suppression of the diagnostic codes TypeScript emits for "script body" constructs that are invalid in a full program but expected in an executable snippet:

| Code   | Suppressed meaning                                                            |
| ------ | ----------------------------------------------------------------------------- |
| `1108` | `return` statement outside a function                                         |
| `1208` | Cannot use `export` in a non-module (`export {}` forces module scope)          |
| `1375` | `await` allowed only in async functions                                       |
| `2304` | Cannot find name … (when the user relies on pre-injected globals)              |
| `2695` | Left-hand side of assignment is invalid                                       |
| `7027` | Unreachable code detected                                                     |

> **Warning: Global side-effect**
>
> `script-mode` calls `monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions` which is **shared across every TS/JS editor on the page**. The codes are additive — Cocoar merges them into the existing ignore list and never clears them, so toggling `script-mode` off does not restore the diagnostics. If your app mixes "full program" editors with "script body" editors, use the escape-hatch (`monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions`) from the consumer side for finer control.

### Compact `variant="inline"`

Flipping `variant` to `'inline'` restyles Monaco for form-field use — no line numbers, no glyph margin, folding off, context menu off, tight 8px padding, word wrap on, and a hover/focus ring that matches `CoarTextInput`.

```vue
<CoarScriptEditor v-model="code" variant="inline" height="160px" />
```

Use `'editor'` (the default) whenever the editor is the page focus — IDE-like experience, line numbers, full gutter.

## Custom Type Definitions (`extraLibs`)

Inject `.d.ts` contents into the editor's TypeScript service to get autocomplete, hover types, and inline diagnostics for your domain objects — without polluting the global TS server.

**Demo — `script-editor/demos/ScriptEditorExtraLibs.vue`**

```vue
<template>
  <ClientOnly>
    <component
      :is="Editor"
      v-if="Editor"
      v-model="code"
      language="typescript"
      :extra-libs="extraLibs"
      style="height: 360px"
    />
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

type ExtraLib = { content: string; filePath: string };

const extraLibs: ExtraLib[] = [
  {
    content: `declare interface AppContext {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string; plan: 'free' | 'pro' | 'enterprise' };
}

declare function getContext(): AppContext;
`,
    filePath: 'file:///types/app-context.d.ts',
  },
];

const code = ref(`// Try typing \`ctx.\` to get autocompletion from the injected types.
const ctx = getContext();
const greeting = \`Welcome \${ctx.user.name} from \${ctx.tenant.name}\`;
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor, type CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';

const extraLibs: CoarScriptEditorExtraLib[] = [
  {
    content: `declare interface AppContext {
      user: { id: string; name: string };
      tenant: { id: string; name: string };
    }

    declare function getContext(): AppContext;`,
    filePath: 'file:///types/app-context.d.ts',
  },
];

const code = ref(`const ctx = getContext();\nconsole.log(ctx.user.name);\n`);
</script>

<template>
  <CoarScriptEditor v-model="code" language="typescript" :extra-libs="extraLibs" />
</template>
```

Each entry maps to `monaco.languages.typescript.typescriptDefaults.addExtraLib(...)` (or `javascriptDefaults` in JS mode). Use a stable, unique `filePath` per lib — Monaco keys its entries on the path.

## Runtime lib configuration

Monaco ships with a default lib set of `es5 + dom + webworker.importscripts + scripthost` — surfacing thousands of browser APIs (`document.*`, `fetch`, `localStorage`, `WScript`, …) in IntelliSense. For script editors backed by a non-browser runtime (e.g. Jint/Edge.js in a .NET host), autocompleting those APIs would lure users into writing code that crashes at execution time.

`CoarScriptEditor` therefore forces Monaco to `lib: ['es2024']` the first time it's mounted, dropping the browser-specific libs and keeping only the standard ECMAScript surface. It also applies to both TS and JS defaults and sets `target: ES2024`, `allowNonTsExtensions: true`, `noResolve: true`.

Host-specific globals (e.g. your runtime's `fetch`, `require`, `exit`) should be layered on top via `extraLibs` — opt-in and explicit, so what Monaco shows matches what Jint can run.

If you need a different lib set for non-Jint scenarios, call `monaco.languages.typescript.typescriptDefaults.setCompilerOptions(...)` yourself **after** the first `CoarScriptEditor` has mounted — `setCompilerOptions` is a module-global last-writer-wins, so your override takes effect immediately for every editor on the page.

> **Warning: `filePath` must start with `file:///`**
>
> Monaco's TypeScript service silently ignores declarations registered under any other URI scheme, so a value like `'types/foo.d.ts'` will compile without error but produce no IntelliSense. In development mode the component emits a `console.warn` when it detects this, but there's no runtime error — it's easy to miss in production. Always prefix with `file:///`.

> **Warning: Untrusted content**
>
> `extraLibs.content` is parsed by Monaco's TypeScript service as a `.d.ts` file — it is not `eval`'d, so arbitrary code in `content` cannot execute in the browser. Declaration files *can* however expose surprising types / module augmentations. If the content comes from untrusted sources (e.g. another tenant's template), treat it as you would any other user-generated data: validate server-side and consider sandboxing the editor in an iframe with a restrictive CSP.

## JSON mode

Set `language="json"` to edit JSON with Monaco's native JSON services — syntax validation, bracket matching, format-on-save, and optional schema-based IntelliSense all work out of the box.

**Demo — `script-editor/demos/ScriptEditorJson.vue`**

```vue
<template>
  <ClientOnly>
    <component
      :is="Editor"
      v-if="Editor"
      v-model="code"
      language="json"
      style="height: 280px"
    />
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const code = ref(`{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.5.0"
  }
}`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';

const config = ref(`{
  "name": "example",
  "version": "1.0.0"
}`);
</script>

<template>
  <CoarScriptEditor v-model="config" language="json" />
</template>
```

> **Tip: JSON schemas**
>
> `extraLibs` is TypeScript-specific and is ignored in JSON mode. For schema-driven validation and autocompletion, call Monaco's JSON defaults directly — typically once at app entry:
>
```ts
import * as monaco from 'monaco-editor';

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  validate: true,
  schemas: [
    {
      uri: 'https://my-app/schemas/config.json',
      fileMatch: ['*.json'],
      schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    },
  ],
});
```
>
> If you need per-editor schema attachment, use the `getEditor()` escape hatch to access the model's URI and register matching schemas.

## Read-only & Minimap

Both boolean flags default to `false`. Toggle `readonly` for viewer-style contexts and `minimap` when long files benefit from the overview gutter.

**Demo — `script-editor/demos/ScriptEditorReadonly.vue`**

```vue
<template>
  <ClientOnly>
    <component
      :is="Editor"
      v-if="Editor"
      v-model="code"
      language="javascript"
      readonly
      minimap
      style="height: 260px"
    />
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const code = ref(`// Read-only JavaScript snippet with minimap enabled.
const items = [1, 2, 3, 4, 5];
const doubled = items.map((n) => n * 2);
console.log(doubled);
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

## Constrained Mode (Protected Lines)

Any line of the source that contains `// @locked` is protected: the user cannot edit it, merge it with a neighbour, or delete it. Everything else — other lines, file-top imports, helpers between functions — is freely editable.

The TypeScript language service sees the whole file as one document, so IntelliSense, Auto-Import, and domain types resolve exactly as in a normal `.ts` file. Markers are plain line comments, so the stored value is also a valid `.ts` file in any toolchain.

**Demo — `script-editor/demos/ScriptEditorConstrained.vue`**

```vue
<template>
  <ClientOnly>
    <div v-if="Editor" class="constrained-demo">
      <div class="toolbar">
        <label>
          <input v-model="authoring" type="checkbox" />
          Authoring mode — enforcement {{ authoring ? 'OFF' : 'ON' }}
        </label>
      </div>
      <component
        :is="Editor"
        v-model="code"
        :authoring="authoring"
        language="typescript"
        :extra-libs="extraLibs"
        style="height: 320px"
      />
      <details>
        <summary>Persisted value (<code>v-model</code>)</summary>
        <pre>{{ code }}</pre>
      </details>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

type ExtraLib = { content: string; filePath: string };

const code = ref(`declare interface Order {
  id: string;
  total: number;
  customer: { id: string; name: string };
}

function describeOrder(order: Order): string { // @locked
  return \`Order \${order.id} for \${order.customer.name}\`;
} // @locked

function orderTotal(orders: Order[]): number { // @locked
  return orders.reduce((sum, o) => sum + o.total, 0);
} // @locked
`);

const authoring = ref(false);

const extraLibs: ExtraLib[] = [
  {
    content: `declare interface Order {
  id: string;
  total: number;
  customer: { id: string; name: string };
}`,
    filePath: 'file:///types/order.d.ts',
  },
];

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.constrained-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  border-radius: 4px;
}

.toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

details {
  font-size: 11px;
}

details pre {
  margin: 8px 0 0;
  padding: 8px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';

const code = ref(`declare interface Order {
  id: string;
  total: number;
}

function describeOrder(order: Order): string { // @locked
  return \`Order \${order.id}\`;
} // @locked
`);
</script>

<template>
  <CoarScriptEditor v-model="code" language="typescript" />
</template>
```

### Why line-based `@locked` (and not open/close tags)

Three real-world benefits:

- **Auto-Import works.** When the user types an unresolved type, TypeScript's quickfix inserts the `import` at the top of the file — a non-locked line, so the edit passes. Locked lines below simply shift down with the rest of the text; Monaco's native text handling does the bookkeeping for us.
- **No pairing errors.** Each `// @locked` marker is self-contained; you can't accidentally leave one open or nest them wrong. Copy-pasting a function across templates "just works".
- **Helpers fit naturally.** The user can declare local types, utility functions, or blank lines between the locked signatures without asking permission.

### The model value is the persistence format

`v-model` always contains the full source *including* the `// @locked` comments. Save and reload the exact same string — nothing to serialize:

```ts
// Save
localStorage.setItem('snippet', code.value);

// Load (later)
code.value = localStorage.getItem('snippet') ?? defaultTemplate;
```

> **Tip: Free mode**
>
> Without any `// @locked` markers the editor behaves like a regular code editor — no guards, no decorations. Adding a marker to any line turns enforcement on for just that line.

### Reacting to rejected edits

Bind `@reject` to surface user feedback when an edit was rolled back:

```vue
<script setup lang="ts">
import type { CoarScriptEditorRejectEvent } from '@cocoar/vue-script-editor';

function onReject(event: CoarScriptEditorRejectEvent) {
  // Show a toast, trigger a shake animation, flash the affected line, etc.
  const line = event.range?.startLineNumber;
  toast.warn(`This line is protected.${line != null ? ` (line ${line})` : ''}`);
}
</script>

<template>
  <CoarScriptEditor v-model="code" @reject="onReject" />
</template>
```

### Authoring mode (`authoring` prop)

Template authors need to edit the protected parts too. Pass `:authoring="true"` to suspend enforcement: locked lines become editable, markers render at full size in a warm accent colour, and the author can add new markers or remove existing ones. Toggle the prop back to `false` and enforcement resumes with whatever markers are currently in the text.

```vue
<script setup lang="ts">
const editing = ref(false);
</script>

<template>
  <button @click="editing = !editing">
    {{ editing ? 'Exit authoring mode' : 'Enter authoring mode' }}
  </button>
  <CoarScriptEditor v-model="code" :authoring="editing" />
</template>
```

The demo above exposes the same toggle inline so you can flip between the modes.

### How it works

- **Marker detection**: `/\/\/\s*@locked\b/` — a line is locked if it contains `// @locked` anywhere. Match is case-sensitive; `@lockedx` does not count.
- **Protected range**: every locked line is protected inclusively, including its trailing newline. Backspace at the start of a line below a locked one, Delete at the end of a line above — both blocked.
- **Overlap check**: if any change in the batch intersects any protected range, the entire multi-cursor batch is rolled back via `editor.trigger('undo')`. An internal stack boundary keeps the rejected edit from coalescing with surrounding legal edits.
- **Cursor guard**: cursors that land inside a locked line snap to the nearer free boundary. Silenced when `authoring` is on.
- **Diagnostics filter**: error-severity markers emitted on locked lines are suppressed — an in-progress body that makes TypeScript mark the signature as broken won't surface that to the user, because they can't fix it anyway. Warnings and info remain; the filter also stands down in `authoring` mode so authors see everything.
- **Auto-features policy**: Monaco's `formatOnType`, `formatOnPaste`, and `linkedEditing` are turned off in constrained mode so cross-boundary reformats don't generate confusing rejections. Auto-Import (the lightbulb quickfix) is deliberately left on — its edits go to the file top, which is virtually always outside any lock.
- **Rejections**: `@reject` emits an object `{ reason, range? }` so you can surface a toast, shake animation, or highlight the affected line range. See the Events section below for the full payload.

> **Warning: Editor-option override**
>
> The auto-feature overrides above run on mount when constrained mode activates. If you call `editorRef.value?.getEditor().updateOptions({ formatOnType: true })` from consumer code, the override will re-apply next time constrained mode is set up (e.g. when `modelValue` gains or loses `// @locked` markers). If you need to re-enable these features for a constrained-mode editor, file an issue describing your use case — we may add an opt-out prop.

### Styling

Two CSS variable groups, set per editor root and overridden automatically by the `coar-script-editor--authoring` class:

```css
.coar-script-editor {
  --coar-script-editor-marker-scale: 0.6;        /* relative to editor font */
  --coar-script-editor-marker-opacity: 0.45;
  --coar-script-editor-marker-color: var(--coar-text-neutral-tertiary);
  --coar-script-editor-locked-line-bg: /* subtle tint */;
}
.coar-script-editor--authoring {
  --coar-script-editor-marker-scale: 1;
  --coar-script-editor-marker-opacity: 0.85;
  --coar-script-editor-marker-color: var(--coar-text-warning);
  --coar-script-editor-locked-line-bg: /* warm tint */;
}
```

Override per-editor via inline style or globally via your theme stylesheet.

### Pure helpers

Available without mounting an editor — use them for validation, on the server, or in tests:

```ts
import {
  hasLockedMarkers,
  scanLockedLines,
  computeProtectedRanges,
  getEditableSegments,
  getSlots,
  getSlot,
  editIsProtected,
  snapOffsetAwayFromLocked,
  countLockedLines,
  isEverySegmentNonEmpty,
  validateSource,
  SLOT_MARKER_PATTERN,
} from '@cocoar/vue-script-editor';

// Structural queries
if (hasLockedMarkers(source)) { /* ... constrained ... */ }
const n = countLockedLines(source);
const lines = scanLockedLines(source);          // per locked line
const ranges = computeProtectedRanges(lines);   // merged blocks for overlap/snap

// Segmentation
const segments = getEditableSegments(source);   // stretches between locks

// Named slots (per-region access by name; see the Named slots section)
const allSlots = getSlots(source);              // { slotName: bodyContent }
const fn2Body = getSlot(source, 'fn2');         // string | undefined

// Submit-gating
if (isEverySegmentNonEmpty(source)) {
  submit(source);
}

// Soft validation (non-throwing, surfaces informational warnings)
const v: SourceValidation = validateSource(source);
// v.ok — no warnings surfaced
// v.lockedLineCount — number of // @locked lines
// v.segmentCount — number of editable stretches between locks
// v.warnings — e.g. "source starts with a locked line" (imports can't be added above)
```

The full type shapes:

```ts
interface SourceValidation {
  ok: boolean;
  lockedLineCount: number;
  segmentCount: number;
  warnings: string[];
}

interface LockedLine {
  lineIndex: number;        // 0-based
  lineStart: number;        // char offset of first line char
  lineEnd: number;          // offset of trailing `\n` (or source.length for last line)
  protectedStart: number;   // inclusive start of the protected range
  protectedEnd: number;     // inclusive end (covers the `\n`)
  snapBefore: number | null; // cursor-snap target before, null for first line
  snapAfter: number | null;  // cursor-snap target after, null for last line
  slotName?: string;        // name parsed from @slot:NAME on this locked line
}

interface ProtectedRange {
  start: number;
  end: number;
  snapBefore: number | null;
  snapAfter: number | null;
}
```

### Named slots (`@slot:NAME`)

Templates with multiple fillable regions — e.g. an event-handler script with three function bodies the user may or may not fill in — need a way to identify *which* body belongs to *which* function in the persisted source. Line-based locking alone tells you "this stretch is editable" but not "this is the body of `onLoad`".

The `@slot:NAME` attribute solves it. Placed on a `// @locked` line, it **names the editable segment that follows** (up to the next locked line or EOF):

```ts
function fn1(input) { // @locked @slot:fn1
} // @locked

function fn2(input) { // @locked @slot:fn2
} // @locked

function fn3(input) { // @locked @slot:fn3
  return input * 2;
} // @locked
```

Because the marker sits on a **locked line**, the user cannot delete or move it — the slot anchor survives whatever edits the user makes to the bodies. Auto-Import inserts at the file top shift all slot markers down with the rest of the text; the scanner re-derives positions on each call.

#### Reading slot content

Two helpers, both pure functions over the source string:

```ts
import { getSlots, getSlot } from '@cocoar/vue-script-editor';

// All slots as a dictionary, slot name → body content
const slots = getSlots(code.value);
// { fn1: '', fn2: '', fn3: '  return input * 2;' }

// A single slot, or `undefined` if the template does not declare it
const fn2Body = getSlot(code.value, 'fn2');
// '' — declared but not filled in

const missing = getSlot(code.value, 'fn4');
// undefined — template does not have this slot
```

- **Empty string** (`''`) = slot exists but body is whitespace-only (user skipped it). Check with `content.trim().length === 0`.
- **`undefined`** = slot not declared in the template. Lets callers distinguish "not part of the template" from "part of the template but empty".
- **First-wins on duplicates** — if two locked lines declare the same slot name, the first one's segment is returned. `validateSource()` warns on duplicates during template authoring.
- **Content trim rule**: leading and trailing blank lines are stripped; indentation of the remaining content is preserved, so multi-line bodies keep their shape.

#### Submit-gating by slot

```ts
const slots = getSlots(code.value);
const filled = Object.entries(slots)
  .filter(([, body]) => body.trim().length > 0)
  .map(([name]) => name);

if (filled.length === 0) {
  // Block save — user hasn't filled in anything.
}
```

#### Symmetric parsing on the server

The slot format is regex-matchable, so consumers running the saved script server-side (e.g. a C# Jint host) can extract the same info without shipping JS. The regex is exported as `SLOT_MARKER_PATTERN`:

```ts
import { SLOT_MARKER_PATTERN } from '@cocoar/vue-script-editor';
// '\/\/\s*@locked\b[^\n]*?@slot:([A-Za-z_][A-Za-z0-9_-]*)'
```

Drop the helper below into your backend project as-is. It matches the JS implementation one-to-one: same regexes, same first-wins rule on duplicates, same CRLF normalization, same blank-line trimming:

```csharp
using System.Text.RegularExpressions;

public static class ScriptSlots
{
    private static readonly Regex LockedMarker =
        new(@"//\s*@locked\b", RegexOptions.Compiled);

    private static readonly Regex SlotMarker =
        new(@"//\s*@locked\b[^\n]*?@slot:([A-Za-z_][A-Za-z0-9_-]*)", RegexOptions.Compiled);

    /// <summary>
    /// All named slots in the source keyed by slot name.
    /// Empty string = slot exists but body is whitespace-only.
    /// First-wins on duplicates.
    /// </summary>
    public static Dictionary<string, string> GetSlots(string source)
    {
        // Normalize CRLF so Windows-saved sources parse identically.
        var lines = source.Replace("\r\n", "\n").Split('\n');
        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        for (int i = 0; i < lines.Length; i++)
        {
            var match = SlotMarker.Match(lines[i]);
            if (!match.Success) continue;

            var name = match.Groups[1].Value;
            if (result.ContainsKey(name)) continue; // first-wins

            // Find the next locked line (or EOF).
            int end = i + 1;
            while (end < lines.Length && !LockedMarker.IsMatch(lines[end])) end++;

            var bodyLines = lines.Skip(i + 1).Take(end - i - 1);
            result[name] = TrimBlankLines(string.Join("\n", bodyLines));
        }

        return result;
    }

    /// <summary>
    /// Content of a single slot. Returns null when no locked line declares that name.
    /// Returns "" when the slot exists but its body is empty — callers distinguish
    /// "not declared" from "declared but empty".
    /// </summary>
    public static string? GetSlot(string source, string name)
        => GetSlots(source).TryGetValue(name, out var v) ? v : null;

    private static string TrimBlankLines(string raw)
    {
        var lines = raw.Split('\n');
        int start = 0, end = lines.Length;
        while (start < end && string.IsNullOrWhiteSpace(lines[start])) start++;
        while (end > start && string.IsNullOrWhiteSpace(lines[end - 1])) end--;
        return string.Join("\n", lines.Skip(start).Take(end - start));
    }
}
```

With this helper, the Jint host can decide per-function whether to invoke it:

```csharp
var source = await dbContext.Scripts
    .Where(s => s.Id == id)
    .Select(s => s.SourceCode)
    .FirstAsync();

var slots = ScriptSlots.GetSlots(source);
var engine = new Engine().Execute(source);

foreach (var (name, body) in slots)
{
    if (!string.IsNullOrWhiteSpace(body))
        engine.Invoke(name, input);
}
```

Or pull a single handler directly:

```csharp
var onSave = ScriptSlots.GetSlot(source, "onSave");
if (!string.IsNullOrWhiteSpace(onSave))
    engine.Invoke("onSave", input);
```

The C# port mirrors the JS behaviour exactly, so you can reuse the 13 slot-related test cases from `LockedLineScanner.test.ts` as a parity check — same input strings must produce the same outputs.

#### Slot name rules

- Must match `[A-Za-z_][A-Za-z0-9_-]*` — starts with a letter or underscore, then letters / digits / underscores / hyphens.
- Names that don't match (e.g. `@slot:1bad`) are ignored silently — the locked line still locks, but no slot is registered.
- Must sit on a `// @locked` line. A lone `// @slot:X` on a free line is not recognised, because the user could delete it.

### Limitations (v1)

- **Languages**: TypeScript, JavaScript, JSON. Other Monaco-supported languages (CSS, HTML, Markdown, SQL, etc.) work too if you register their workers, but the component is only tested against these three.
- **Per-line granularity.** Locking a specific *character range* inside a line is not supported; the whole line is locked.
- **Monaco auto-edits that cross a boundary are blocked.** Format Document over a locked line, Rename Symbol touching both a locked and a free stretch — the whole operation is rolled back. Usually what you want; flip `authoring` on if not.
- **Authoring toggle + stale markers**: when `authoring` flips from `false` to `true`, previously-suppressed error markers on locked lines reappear only after the next TypeScript analysis pass (i.e. the next edit). This is a minor UX quirk of Monaco's marker model and does not affect correctness.

## API

### Props

| Prop           | Type                                    | Default        | Description                                                                              |
| -------------- | --------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `modelValue`   | `string`                                | `''`           | Editor source. Any line containing `// @locked` is protected.                            |
| `authoring`    | `boolean`                               | `false`        | Authoring mode — suspends enforcement so template authors can modify locked lines or markers. |
| `language`     | `'typescript' \| 'javascript' \| 'json'` | `'typescript'` | Language mode. Changing it switches the model live.                                      |
| `readonly`     | `boolean`                               | `false`        | Viewer mode — user cannot edit but selection / copy / navigation still work.              |
| `disabled`     | `boolean`                               | `false`        | Non-interactive form state. Dimmed, pointer-events suppressed, picked up from `CoarFormField`. |
| `error`        | `boolean`                               | `false`        | Error state — red border. Auto-picked up from `CoarFormField.error`.                      |
| `placeholder`  | `string`                                | `''`           | Placeholder shown when the editor is empty and not focused.                               |
| `required`     | `boolean`                               | `false`        | Sets `aria-required="true"`. Does not enforce submission.                                |
| `autofocus`    | `boolean`                               | `false`        | Focus the editor after mount.                                                            |
| `id`           | `string`                                | `''`           | HTML id. Auto-generated if omitted; `CoarFormField.id` takes precedence.                  |
| `name`         | `string`                                | `''`           | Informational. Emitted as `data-name` (the editor is not a native form control).          |
| `height`       | `string \| number`                      | `undefined`    | Explicit height — CSS string (`"160px"`, `"40%"`) or pixels as number.                    |
| `variant`      | `'editor' \| 'inline'`                  | `'editor'`     | UI preset. `'editor'` = full IDE chrome. `'inline'` = compact form-field look.             |
| `lineNumbers`  | `boolean`                               | `undefined`    | Explicit line-numbers toggle. Overrides the variant default. Off-state keeps a small left margin so text doesn't hit the border. |
| `scriptMode`   | `boolean`                               | `false`        | Suppresses TS/JS diagnostics for "script body" code. Global side-effect — see Form Integration. |
| `preamble`     | `string`                                | `''`           | Hidden + locked prefix providing per-editor type context. Does not round-trip through `modelValue`. |
| `minimap`      | `boolean`                               | `false`        | Show the Monaco minimap gutter.                                                          |
| `theme`        | `'auto' \| 'light' \| 'dark'`           | `'auto'`       | `auto` tracks `.dark-mode` class on `<html>`/`<body>`, `data-theme="dark"`, then OS `prefers-color-scheme` — reactively. See Theming below. |
| `extraLibs`    | `CoarScriptEditorExtraLib[]`            | `[]`           | TypeScript declarations available for IntelliSense.                                      |

### Events

| Event               | Payload                              | Description                                                                          |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `update:modelValue` | `string`                             | Full editor text. Markers stay in the value so it round-trips. Preamble is stripped before emit. |
| `reject`            | `CoarScriptEditorRejectEvent`        | Emitted when an edit was rolled back. See the payload shape below.                    |
| `focused`           | `void`                               | Fired when the editor widget gains focus (including suggestion popup).                |
| `blurred`           | `void`                               | Fired when the editor widget loses focus — use this to trigger form-touched state.    |

```ts
interface CoarScriptEditorRejectEvent {
  reason: CoarScriptEditorRejectReason;
  /** 1-based line range of the rejected edit (from Monaco). */
  range?: { startLineNumber: number; endLineNumber: number };
}

// Currently a single value; the type is an open union so consumers pattern-match forward-compatibly.
type CoarScriptEditorRejectReason = 'edit-overlaps-locked-line';
```

### Types

```ts
interface CoarScriptEditorExtraLib {
  content: string;   // .d.ts source
  filePath: string;  // e.g. 'file:///types/app-context.d.ts'
}

type CoarScriptEditorLanguage = 'typescript' | 'javascript' | 'json';
type CoarScriptEditorTheme = 'auto' | 'light' | 'dark';
```

### Exposed Methods

```ts
const editorRef = ref<InstanceType<typeof CoarScriptEditor> | null>(null);

// Standard helper
editorRef.value?.focus();

// Escape-hatch access to the raw Monaco editor instance and its text model
editorRef.value?.getEditor();
editorRef.value?.getModel();
```

Use `getEditor()` / `getModel()` for APIs not covered by the declarative props — markers, custom commands, folding ranges, formatting actions, etc.

## Theming

Two Monaco themes ship with the package — `coar-light` and `coar-dark`. They're registered via `monaco.editor.defineTheme` the first time any editor mounts.

### How `theme="auto"` decides

Monaco's theme is not CSS-driven — it's switched via an imperative `monaco.editor.setTheme()` call. `auto` mode watches the page for common dark-mode signals and calls `setTheme` whenever any of them changes. The resolution order is:

1. `.dark-mode` class on `<html>` or `<body>` → dark (Cocoar convention)
2. `.dark` class on `<html>` or `<body>` → dark
3. `data-theme="dark"` / `data-theme="light"` attribute on `<html>` or `<body>`
4. OS-level `prefers-color-scheme`

All four sources are watched live via `MutationObserver` + `matchMedia` listeners, so toggling your app's theme switcher flips the editor in the same frame.

> **Tip: Custom theme switchers**
>
> If your app uses a different convention (e.g. a Pinia store driving a root attribute), skip `auto` and bind the prop directly:
>
```vue
<CoarScriptEditor v-model="code" :theme="isDark ? 'dark' : 'light'" />
```
>
> Monaco's `setTheme` is called whenever the prop changes, so this is the cheapest integration.

The editor container surfaces these CSS custom properties:

```css
.coar-script-editor {
  --coar-border-neutral-tertiary: /* editor border */;
  --coar-background-neutral-primary: /* editor surface */;
  --coar-radius-xs: /* rounded corners */;
}
```

To register your own Monaco theme, call `monaco.editor.defineTheme('my-theme', {...})` anywhere in your app and pass it via the underlying editor instance (`editorRef.value?.getEditor().updateOptions({ theme: 'my-theme' })`).

### Font

The editor renders code in **Cascadia Code** (Microsoft's ligature-enabled coding font) with `Consolas`, `Monaco`, `Courier New` as fallback. Ligatures are enabled by default, so `!=`, `=>`, `===`, and `&&` render as combined glyphs. This matches `CoarCodeBlock` — both components share the same font stack.

Cascadia Code is bundled via `@cocoar/vue-ui/fonts` (weights 400 / 600 / 700). If your app imports that stylesheet — the standard Cocoar setup — the font loads automatically:

```ts
import '@cocoar/vue-ui/fonts'
import '@cocoar/vue-ui/styles'
```

If you don't import `@cocoar/vue-ui/fonts` (e.g. an app that only uses the script editor), Monaco falls back to Consolas/Monaco/Courier New. The editor keeps working; you just don't get the Cascadia Code glyphs or ligatures.

To override the font — e.g. to a custom corporate monospace — use the `getEditor()` escape hatch:

```ts
editorRef.value?.getEditor()?.updateOptions({
  fontFamily: "'JetBrains Mono', monospace",
  fontLigatures: true,
});
```
