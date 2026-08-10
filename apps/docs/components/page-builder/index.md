---
description: "Overview of @cocoar/vue-page-builder, a headless visual page composition framework: consumer-defined element registry, portable JSON schemas, shared PageConfig for builder and renderer."
---

# Page Builder

`@cocoar/vue-page-builder` is a generic, headless visual page composition framework. Users drag UI primitives onto a canvas, configure them, and the result is a portable JSON schema that a companion renderer turns back into live Cocoar components.

Everything domain-specific — what actions a button can trigger, where images come from, which elements are permitted, and even **which element types exist** — is defined by the **consumer application**, not the library. Built-in elements are pre-registered definitions on an open [element registry](./custom-elements); consumer apps register their own element types on the same contract.

## Two components

| Component | Purpose | Docs |
|-----------|---------|------|
| `<CoarPageBuilder>` | Visual editor — 3-panel layout, drag-and-drop, props panel | [→ CoarPageBuilder](./coar-page-builder) |
| `<CoarPageRenderer>` | Runtime renderer — schema → live Cocoar components | [→ CoarPageRenderer](./coar-page-renderer) |

Both share the same `PageConfig`. The builder uses it as UI affordances; the renderer uses it as the security boundary.

## Quick start

Import the stylesheet once (it carries the builder chrome **and** the renderer's
layout styles — without it, stacks lose their flex layout):

```ts
import '@cocoar/vue-page-builder/styles';
```

::: info Peer dependencies
`@cocoar/vue-page-builder` declares `@cocoar/vue-ui` **and** `@cocoar/vue-localization` as peer dependencies. All builder chrome and the renderer's validation messages resolve through `@cocoar/vue-localization` (keys under `coar.pageBuilder.*`), with built-in English fallbacks — English-only apps need no i18n setup.
:::

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarPageBuilder,
  CoarPageRenderer,
  type PageNode,
  type PageConfig,
  type ActionValues,
} from '@cocoar/vue-page-builder';

const schema = ref<PageNode>({
  id: 'root',
  type: 'page',
  schemaVersion: 5,
  style: { gap: '16px', padding: '24px' },
  children: [],
});

const config: PageConfig = {
  allowedElements: ['stack', 'card', 'heading', 'paragraph',
                    'text-input', 'checkbox', 'button', 'link', 'image'],
  availableActions: [
    { id: 'auth:login',  label: 'Sign in' },
    { id: 'auth:forgot', label: 'Forgot password' },
  ],
};

const actions: Record<string, (v: ActionValues) => void> = {
  'auth:login':  (values) => api.login(values),
  'auth:forgot': ()       => router.push('/forgot'),
};
</script>

<template>
  <!-- Visual editor — user builds the page -->
  <CoarPageBuilder v-model="schema" :config="config" style="height: 700px" />

  <!-- Renderer — plays back the schema at runtime -->
  <CoarPageRenderer
    :schema="schema"
    :config="config"
    :actions="actions"
    :asset-resolver="(id) => `/tenant/${tenantId}/assets/${encodeURIComponent(id)}`"
  />
</template>
```

The **same `config` is passed to both** — the builder uses it to filter UI affordances; the renderer uses it as the security boundary at render time. When `config.assetResolver` is set, the renderer falls back to it automatically, so the `:asset-resolver` prop is only needed as an override.

## Architecture

```
Consumer app
  │
  ├── <CoarPageBuilder v-model="schema" :config />     ← visual editor
  │
  └── <CoarPageRenderer :schema :config                ← runtime renderer
                        :actions :asset-resolver />      maps JSON nodes → Cocoar components
                                                         wires action IDs → real handler functions
```

The JSON schema is the single artifact that flows between builder and renderer. It is plain JSON with no library dependency — any renderer (including a custom one) can interpret it.

## PageConfig — the consumer contract

Everything tenant-facing or domain-specific is declared here. Pass the **same value** to both the builder and the renderer.

```ts
interface PageConfig {
  /**
   * Element types permitted to appear in the tree — built-in types and
   * consumer-registered keys alike. Omit to allow every type.
   * `page` (the root marker) is always implicitly allowed.
   */
  allowedElements?: (ElementType | (string & {}))[]

  /**
   * Consumer-registered element types, merged ADDITIVELY over the built-in
   * set (shadowing a built-in key warns in DEV). One registration serves
   * palette, canvas, inspector and runtime. App-wide defaults can be
   * provided under PAGE_ELEMENTS_KEY instead; this field wins when both
   * are present. See the Custom elements guide.
   */
  elements?: PageElementRegistry

  /**
   * The data contract behind the page (DTO fields). When present, the
   * builder's Field section offers these instead of a free-text name —
   * filtered per element to the compatible value types — the palette
   * gains a draggable Fields group, and the builder lint flags unknown
   * names, incompatible bindings and missing required fields.
   * See the Field contract section below.
   */
  fields?: PageFieldSpec[]

  /** Allow-listed host context for property bindings, conditions and repeaters. */
  contextFields?: PageContextField[]

  /** Host states and locales available to authors and the preview toolbar. */
  availableStates?: { id: string; label: string }[]
  locales?: { id: string; label: string }[]
  defaultLocale?: string

  documentLimits?: { maxNodes?: number; maxDepth?: number }

  /** Non-persisted named samples for context/state/locale preview testing. */
  previewFixtures?: {
    id: string
    label: string
    context: Record<string, unknown>
    state?: string
    locale?: string
  }[]

  /**
   * Allow binding names outside `fields`. Defaults to false — with a
   * contract, authors pick from it.
   */
  allowCustomFields?: boolean

  /**
   * Hide free value-producing elements from the library and the Inputs
   * entries of the outline's add-child menu — exactly what the field
   * contract replaces. Containers and content/action elements stay available.
   * Pure authoring UI;
   * `allowedElements` remains the boundary for what may be used at all.
   */
  hideElementPicker?: boolean

  /**
   * Action IDs that registry elements with `action: true` may reference. When provided, the
   * builder's Action input becomes a dropdown of these labeled choices
   * instead of free text. The renderer's `actions` map is the actual
   * security boundary — `availableActions` is a UX affordance.
   */
  availableActions?: { id: string; label: string }[]

  /**
   * Resolves an assetId to a URL. Used by the builder for thumbnails
   * (canvas preview, props panel, Preview tab) and by the runtime
   * renderer for `<img src>`. Same contract as the renderer's
   * `:asset-resolver` prop — the renderer falls back to this when
   * that prop is absent, so passing the same config to both is enough.
   */
  assetResolver?: (id: string) => string

  /**
   * Opens the consumer's own asset picker UI and resolves to the chosen
   * `assetId`, or `null` if the user cancelled. The library does NOT
   * ship a picker — the IDP owns the entire picker UX (browse, upload,
   * search, delete, categorisation, …). When omitted, the image element
   * falls back to a free-text Asset ID input.
   */
  pickAsset?: (currentId?: string) => Promise<string | null>

  /**
   * Resolves an options-source id to the option list of a choice input
   * (select / multi-select / radio-group) — the async sibling of
   * `assetResolver`, for API-backed lists (countries, users, …). A node
   * opts in via its `optionsSourceId` prop; static `options` stay the
   * default and the fallback when this callback is absent.
   */
  optionsSource?: (sourceId: string) => Promise<OptionItem[]>
}
```

### `allowedElements`

Takes built-in types and consumer-registered keys alike. Enforced at **both** layers:
- *Builder*: hidden from the palette and add-child menu; tenants can't insert disallowed types. Nodes of a disallowed type already present in the schema get a validation **error** and a "skipped at runtime" treatment on the canvas; nodes of an *unregistered* type get a **warning** (they stay in the tree losslessly), so authors learn about both before saving.
- *Renderer*: disallowed nodes are skipped at render time (with one `console.warn` per type) even if they appear in hand-written or tampered JSON. This is the security boundary.

The gate also applies to the renderer's **value model**, not just rendering: disallowed subtrees contribute no default values and their fields never block validation — an invisible `required` field can't permanently veto a validating button.

```ts
allowedElements: [
  'stack', 'card', 'section', 'divider',
  'heading', 'paragraph',
  'text-input', 'checkbox', 'button', 'link', 'image',
  'acme-rating',   // a consumer-registered key from config.elements
],
```

Drop element types the tenant shouldn't be able to use. `page` is implicitly always allowed.

### `elements` — custom element types

The element set is open: one `definePageElement()` definition registers a component defined entirely in **your app** as a first-class element — it appears in the palette, canvas, inspector, preview and value model exactly like a built-in. Registrations merge **additively** over the built-ins; keys are lowercase kebab-case (`^[a-z][a-z0-9-]*$`) and a vendor prefix is recommended:

```ts
import { definePageElement, type PageConfig } from '@cocoar/vue-page-builder';
import RatingRenderer from './RatingRenderer.vue';

const config: PageConfig = {
  elements: {
    'acme-rating': definePageElement({
      renderer: RatingRenderer,                      // receives { node }
      value: { isEmpty: (v) => !v || Number(v) === 0 }, // participates in the value model
    }),
  },
  allowedElements: ['stack', 'heading', 'text-input', 'button', 'acme-rating'],
};
```

Unregistered types degrade **losslessly**: kept in the tree and in the JSON tab, flagged in the builder, skipped at runtime with one console warning per type, and excluded from the value model so they can never block a submit. The full contract — builder half (palette label, canvas preview, inspector, lint), `usePageElement()` renderer context, app-wide registration via `PAGE_ELEMENTS_KEY` — is covered in the [Custom elements guide](./custom-elements).

### Field contract

In practice a page is rarely a free-form document — it usually **projects a DTO**: the login request, the profile record, the ticket form. The field names and their types are known up front, and authors should *pick* from them instead of inventing names the backend then has to guess at. `config.fields` declares that contract:

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

Each `PageFieldSpec` is `{ name, valueType, label?, required?, defaultElement? }`: `name` is the `ActionValues` key (the DTO property), `valueType` decides which elements can edit the field, `label` is carried onto the element on binding, `required` sets `validation.required` on binding and keeps a root-level warning alive while the field is missing from the page, and `defaultElement` picks the element the field-first flow creates.

#### Value types and compatibility

Compatibility is an exact token match between the field's `valueType` and the element definition's `ElementValueSpec.types`. `PageValueType` is an **open** token union — the built-in tokens below plus any consumer token (`'geo'`, `'money'`, …):

| `valueType` | Compatible built-in elements |
|-------------|------------------------------|
| `string` | `text-input`, `password-input`, `select`, `radio-group`, `otp-input` |
| `boolean` | `checkbox`, `switch` |
| `number` | `number-input` |
| `string[]` | `multi-select` |
| `date` | `date-input` |
| `datetime` | `datetime-input` |

Consumer elements participate through the same declaration: a rating element whose definition says `value: { types: ['number'] }` becomes a representation for `number` fields — compatibility is registry-driven, not a central table. A value spec **without** `types` is unconstrained (compatible with every field), so consumer elements that don't declare are never falsely blocked. See [Custom elements](./custom-elements#_3-value-model-participation).

#### Two authoring flows

**Element-first** — drop any element, then bind it. With a contract, the Field section's *Field name* control becomes a select over the **compatible** fields only (a `text-input` never offers `rememberMe`). Binding takes the contract label along — never overwriting a label the author already edited — and sets `validation.required` for contract-required fields. Clearing the select unbinds; a bound name outside the contract stays visible as `(custom)`.

**Field-first** — with a contract the palette gains a third group, **Fields**: one draggable card per contract field, with a type icon, the contract label and a `*` for required fields; a card greys out once its name is bound anywhere on the page. Dropping a card creates the field's default element — `field.defaultElement` when registered, else the first compatible value element in registry order — **pre-bound**: name set, contract label carried into the props bag (when the element has a `label` prop at all), `validation.required` applied.

#### Representation switch

Same field, different element: the Field section gains an **Element** select listing the representations that can edit the bound field's value type (unbound: any type the current element declares) — filtered to placeable, allow-listed elements and hidden when fewer than two remain. Switching converts the node **in place**: it keeps `id` (selection follows), `name`, `defaultValue`, `validation`, `style` and the label, while the rest of the props bag restarts from the target element's defaults. One undoable step — username as `text-input` ⇄ `password-input` ⇄ `select` ⇄ `otp-input`, one click each.

#### Contract lint

Three rules join [builder-side validation](./coar-page-builder#builder-side-validation):

- a bound name **outside the contract** is an *error* — unless `allowCustomFields` is set,
- a **type-incompatible** binding (say, a `checkbox` bound to a `string` field) is an *error*,
- a **required contract field missing** from the page is a *warning* on the root node.

#### Strict by default

`allowCustomFields` defaults to `false`: with a contract, binding is select-only, and freshly dropped value elements start **unbound** instead of minting a `field_*` name the lint would immediately flag — the author picks a contract field. Setting `allowCustomFields: true` relaxes all of it: the Field section adds a free-text *Custom name* input, fresh elements mint names again, and the unknown-name lint rule stands down.

#### `allowedElements` governs everything

The allow-list composes with the contract at every seam: a field's default element (field-first drop) and the representation switcher only ever offer **allowed** elements. Drop `password-input` from `allowedElements` and a `string` field can no longer be represented as a password input — the field's `defaultElement` falls back to the first compatible *allowed* element, and a field with no allowed representation greys out in the palette.

#### Fields-only authoring

Set `hideElementPicker: true` to remove free value-producing elements from the right-hand **Elements** library and from the outline's **Inputs** add-child group — exactly the entries the field contract replaces. Fields then come exclusively from dragging contract cards. **Containers** and content/action elements (headings, notes, buttons, links, images) stay available because every form needs structure and chrome. Classification is registry-derived from the value spec, so consumer elements sort themselves. This is pure authoring UI — combine it with `allowedElements` when the *rendering* boundary should shrink too.

#### Typed field lists (opt-in)

For a **static** DTO, `defineFields<TDto>()` checks the field list at compile time — names must be DTO properties, value types must fit the property types (string properties admit the `date`/`datetime` tokens, since dates travel as ISO strings):

```ts
interface LoginDto { username: string; password: string; rememberMe: boolean }

fields: defineFields<LoginDto>([
  { name: 'username',   valueType: 'string', required: true },
  { name: 'rememberMe', valueType: 'boolean' },
  // { name: 'usernme', valueType: 'string' },   // ✗ compile error — not a DTO property
  // { name: 'rememberMe', valueType: 'string' } // ✗ compile error — boolean property
])
```

It is pure opt-in sugar with zero runtime cost: the result is a plain `PageFieldSpec[]`, so dynamically grown DTOs keep working — either skip the helper entirely, or mix: `[...defineFields<LoginDto>([...]), ...dynamicExtraFields]`.

#### Authoring-only by design

The contract constrains **authoring only**. Binding is plain `node.name` — persisted schemas stay self-contained, render without the contract, and a document authored under one contract remains a valid document everywhere. The renderer never consults `fields`; `allowedElements` remains the security boundary.

### `availableActions`

When provided, the Action ID input in Button/Link props becomes a dropdown. Stored action IDs that aren't in the list are surfaced as `auth:something (not configured)` so orphans don't silently disappear.

```ts
availableActions: [
  { id: 'auth:login',           label: 'Sign in' },
  { id: 'auth:register',        label: 'Create account' },
  { id: 'auth:forgot-password', label: 'Forgot password' },
  { id: 'auth:sso-google',      label: 'Sign in with Google' },
  { id: 'auth:sso-microsoft',   label: 'Sign in with Microsoft' },
],
```

The runtime `actions` map on the renderer is the real boundary — it only invokes handlers that exist there. `availableActions` is purely a UX affordance.

### `assetResolver` + `pickAsset`

The library does **not** ship an asset picker. You build your own — a modal, a drawer, a sidebar, however you want — and wire it in via two simple callbacks.

```ts
const config: PageConfig = {
  // ...
  /** Resolves an asset id to a URL. The builder uses this for thumbnails;
      the renderer falls back to it when its :asset-resolver prop is absent. */
  assetResolver: (id) => `https://cdn.example.com/t/${tenantId}/${encodeURIComponent(id)}`,

  /** Opens YOUR picker and resolves to the chosen id (or null on cancel). */
  async pickAsset(currentId) {
    const result = await myAssetModal.open({ initial: currentId });
    return result ?? null;
  },
};
```

::: warning Validate the asset id
`assetResolver` receives whatever `assetId` string sits in the schema — including hand-edited JSON. Encode it (`encodeURIComponent`) or allowlist it (e.g. `/^[A-Za-z0-9_-]+$/`) before splicing it into a URL, or a crafted id like `../other-tenant/logo` walks out of your tenant prefix.
:::

The image element's props panel renders:
- a **thumbnail** using `assetResolver(node.assetId)`
- a **Choose…/Change…** button that calls `pickAsset(currentId)` and patches the returned id onto the schema
- a **Clear** button when an id is set

When `pickAsset` is omitted, the image element falls back to a free-text Asset ID input — useful for development or scripted authoring.

#### What your picker needs to do

The full contract is just `(currentId?: string) => Promise<string | null>`. Inside, you do whatever fits your stack:

- list assets from your API
- handle uploads (sign URL, POST file, etc.)
- search, filter, paginate
- delete
- categorise by tag/folder
- show metadata, dimensions, file size

Return the chosen asset's id, or `null` if the user cancelled. The library doesn't care about anything else.

Example skeleton using Cocoar's `useDialog`:

```ts
import { useDialog } from '@cocoar/vue-ui';
import MyAssetPicker from './MyAssetPicker.vue';

const dialog = useDialog();

const config: PageConfig = {
  // ...
  assetResolver: (id) => assetUrlMap.value.get(id) ?? '',
  async pickAsset(currentId) {
    const { result } = dialog.open<string>(
      MyAssetPicker,
      { title: 'Choose image', size: 'l' },
      { initial: currentId },
    );
    return (await result) ?? null;
  },
};
```

A complete reference implementation lives at `apps/playground/src/components/PlaygroundAssetPicker.vue` — copy it as a starting point.

## Security Model

**Allowed elements** — `config.allowedElements` is enforced at both layers (builder hides and flags; renderer skips, with one `console.warn` per type). The renderer is the hard boundary — even tampered JSON cannot smuggle in disallowed types, and disallowed subtrees are excluded from the value model too (no defaults, no validation veto).

**Actions** — every registry element that declares `action: true` stores the shared optional `ActionProps` contract; built-in buttons and links use it too. The builder supplies one Action + JSON key/value editor with an `fx` switch per value, and the renderer only invokes handlers from the consumer-provided `actions` map — action ids are inert strings. Handler payload precedence is form values < resolved per-key `actionValues` < the legacy bound `actionValue`; only JSON-safe explicit values cross the boundary. Per-key bindings may read controlled context, customer Page State, form fields, named Repeat selections, or the current Repeat item/index. When `config.availableActions` is set, the builder also constrains the Action input to a labeled dropdown. One qualification to "nothing executable lives in the schema": `validation.pattern` is a tenant-authored regular expression that *is* evaluated at render time. It is compiled safely — an invalid pattern becomes an inert rule with a single `console.warn` — and anchored to match the full string, like the HTML `pattern` attribute.

**Images** — `image` nodes store an `assetId` reference, never a raw URL. The renderer calls `assetResolver(id)` at render time. The "tenants cannot reference external domains" guarantee is therefore exactly as strong as **your** `assetResolver` — validate or encode the id before building a URL (see the warning above). Uploads happen entirely inside the consumer-built picker (whatever `pickAsset` opens) — that's where you validate file type, scan for malware, and enforce per-tenant size quotas.

## Complete IDP integration walkthrough

Here's how a tenant-customisable login flow fits together end-to-end.

### 1. Define the tenant config

In a shared file your admin app and your login app both import:

```ts
// tenants/loginConfig.ts
import type { PageConfig } from '@cocoar/vue-page-builder';

export function buildLoginConfig(tenantId: string): PageConfig {
  return {
    allowedElements: [
      'stack', 'card', 'divider',
      'heading', 'paragraph',
      'text-input', 'checkbox', 'button', 'link', 'image',
    ],
    availableActions: [
      { id: 'auth:login',           label: 'Sign in' },
      { id: 'auth:sso-google',      label: 'Sign in with Google' },
      { id: 'auth:sso-microsoft',   label: 'Sign in with Microsoft' },
      { id: 'auth:forgot-password', label: 'Forgot password' },
      { id: 'auth:register',        label: 'Create account' },
      { id: 'nav:login',            label: 'Go to login' },
    ],
    // Allowlist the id — it's tenant-authored schema data, not trusted input.
    assetResolver: (id) =>
      /^[A-Za-z0-9_-]+$/.test(id) ? `https://cdn.example.com/t/${tenantId}/${id}` : '',
    async pickAsset(currentId) {
      // Open your own asset picker — the library does not ship one.
      // Inside MyAssetPickerModal you'd call your /api/tenants/${tenantId}/assets
      // endpoint for the list, POST for uploads, etc.
      return await openMyAssetPickerModal({ tenantId, initial: currentId });
    },
  };
}
```

### 2. Admin page — the builder

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { CoarPageBuilder, type PageNode } from '@cocoar/vue-page-builder';
import { buildLoginConfig } from '@/tenants/loginConfig';

const props = defineProps<{ tenantId: string }>();
const schema = ref<PageNode>({
  id: 'root', type: 'page', style: { gap: '16px', padding: '24px' }, children: [],
});
const config = buildLoginConfig(props.tenantId);
const saving = ref(false);

onMounted(async () => {
  const res = await fetch(`/api/tenants/${props.tenantId}/login-schema`);
  if (res.ok) schema.value = await res.json();
});

async function save() {
  saving.value = true;
  try {
    await fetch(`/api/tenants/${props.tenantId}/login-schema`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema.value),
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="tenant-login-editor">
    <header>
      <h1>Login page editor</h1>
      <button @click="save" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </header>
    <CoarPageBuilder v-model="schema" :config="config" style="height: 80vh" />
  </div>
</template>
```

### 3. Runtime — the login page itself

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { CoarPageRenderer, type PageNode, type ActionValues } from '@cocoar/vue-page-builder';
import { buildLoginConfig } from '@/tenants/loginConfig';

const props = defineProps<{ tenantId: string }>();
const schema = ref<PageNode | null>(null);
const config = buildLoginConfig(props.tenantId);

onMounted(async () => {
  const res = await fetch(`/api/tenants/${props.tenantId}/login-schema`);
  schema.value = await res.json();
});

const actions: Record<string, (v: ActionValues) => void> = {
  'auth:login':           (v) => authService.login(v),
  'auth:forgot-password': ()  => router.push('/forgot'),
  'auth:sso-google':      ()  => authService.startSso('google'),
  'auth:sso-microsoft':   ()  => authService.startSso('microsoft'),
  'auth:register':        (v) => authService.register(v),
  'nav:login':            ()  => router.push('/login'),
};
</script>

<template>
  <!-- No :asset-resolver needed — the renderer falls back to config.assetResolver. -->
  <CoarPageRenderer
    v-if="schema"
    :schema="schema"
    :config="config"
    :actions="actions"
  />
</template>
```

### Notes for the IDP wiring

- **Schema migration** — the builder normalises schemas at **every entry point**: the initial `v-model` value, external `v-model` replacement, and the JSON tab's Apply. Legacy `column`/`row` containers migrate to `stack`, v1 flat documents get their `props` bags, non-`page` roots get wrapped in a `page`, missing or duplicate node ids are repaired, missing `children` arrays / `props` bags and out-of-range heading levels are healed. The runtime renderer additionally runs both migrations on the fly, so old saved schemas keep rendering even without a round-trip through the builder. To run the same migration server-side before persisting, use the exported helpers: `normalizePageSchema(value)` returns `{ schema, issues, changed }`; `migrateLegacyTypes`, `migrateV1PropsBag` and `KNOWN_ELEMENT_TYPES` are exported alongside it.
- **`schemaVersion`** — new roots are stamped with `schemaVersion: 5`. Version 4 keeps the v2 props-bag and v3 runtime-composition grammar and adds a stable page-wide `name` to every element for Element Code (the same name is the form/DTO key for value elements). Version 5 adds builder-only origin metadata for reusable, versioned compositions. Older documents are normalized deterministically. Persist the version as-is.
- **JSON Apply is gated by severity** — structural **errors** (non-object nodes — data would be dropped) reject the Apply with a message; nothing broken reaches your `v-model`. **Warnings** (healed or lossless findings — including *unknown element types*, which stay in the tree losslessly) apply anyway and are surfaced inline, so documents using newer or unregistered element types remain editable.
- **Validation** — builder validation flags authoring mistakes but never blocks saving: a button/link without an action, or with an action id outside `availableActions`, or an *unregistered* element type, is a *warning*; duplicate field names, missing image asset ids, invalid `validation.pattern`, and disallowed element types are *errors*. If you need hard guarantees, validate server-side before persisting (e.g., reject if any image node has an empty `props.assetId`). At runtime, a `validates: true` button stays **clickable** while the form is invalid — clicking it marks every field touched and reveals all errors instead of running the action; it only disables while an async `onValidate` is in flight. Cross-field or server-side checks (e.g., "email domain not allowed for this tenant") go through the renderer's `:on-validate` prop: it runs at submit time after the declarative rules pass, may return a `Promise` of `{ fieldName: errorMessage }`, a non-empty result blocks the action, and editing a field clears its server error. See [CoarPageRenderer](./coar-page-renderer).
- **CSP** — image URLs come from `assetResolver`, so your CDN domain needs to be in `img-src`. Action IDs and labels are inert strings; the one tenant-authored value evaluated at render time is `validation.pattern`, which is compiled safely and anchored (see [Security Model](#security-model)).
- **Full-screen / centering** — the renderer fills and measures its host width. To center content on a full-height screen, set the `page` node's `minHeight: '100dvh'` + `justify: 'center'` + `align: 'center'`. See [Sizing and alignment](./coar-page-renderer#sizing-and-alignment).
- **Per-tenant theming** — the renderer uses the Cocoar Design System tokens; override CSS variables on a wrapping container for tenant brand colors.

## Implementation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **1 — Foundation** | `schema.ts` types · `CoarPageRenderer` · playground demo | ✅ Done |
| **2 — Builder shell** | Canvas + palette · Outline · Props panel · DnD · Undo/redo · JSON tab | ✅ Done |
| **3 — Config + safety** | `page` root · `stack` (direction toggle) · `:config.allowedElements` · `:config.availableActions` | ✅ Done |
| **4 — Asset callbacks + polish** | `:config.pickAsset` + `:config.assetResolver` · builder validation · responsive preview | ✅ Done |
| **5 — Layout & sizing** | Flex model — `justify` / `align` / `alignSelf` / `size` (fit · fill · fixed) / `minHeight`; guided Style-panel controls; Editor matches Preview | ✅ Done |
| **GA hardening** | Correctness & data-safety fixes (schema normalization at every entry point, gated JSON Apply, `crypto.randomUUID` ids, `schemaVersion` stamp, safe `pattern` compile) · pointer-events DnD (mouse + touch/pen long-press, outline drag-to-reorder) · validation UX (clickable validating buttons, submit-time async `onValidate`) · outline ARIA tree + scoped keyboard shortcuts · duplicate / select-options / default-value editors · i18n (`coar.pageBuilder.*` via `@cocoar/vue-localization`) | ✅ Done |
| **Element registry** | Unified props-bag wire format (introduced in v2, current `schemaVersion: 5`, transparent older-document normalization) · open [consumer-registered element types](./custom-elements) (`config.elements`, `definePageElement`, `usePageElement`) · lossless degradation of unregistered types · severity-gated JSON Apply · renderer `initialValues` | ✅ Done |
| **Submit lifecycle & dynamics** | Async actions (`isSubmitting`, spinner, reentry guards) · [form-level error channel](./coar-page-renderer#async-actions-the-form-level-error-channel) (`_form`, banner, `#form-error` slot) · [Enter-to-submit](./coar-page-renderer#enter-to-submit) · built-in email format check · host form API (`update:values`, `values` / `isDirty` / `reset`) · [`visibleWhen`](./coar-page-renderer#conditional-visibility-visiblewhen) conditional visibility · [`optionsSource`](./coar-page-renderer#dynamic-options-optionssource) dynamic option lists | ✅ Done |
| **5b — Style editor (visual)** | Spacing sliders + colour pickers (rolls into the tenant theming track) | Planned |
| **Runtime composition v4** | Mobile-first responsive overrides · safe context/state/item bindings · Page State and per-element code · key-based localization · generic repeaters and selected-key outputs · feedback zones · required-node/limit fallback validation | ✅ Done |
| **5+ — Schema versioning** | Formal multi-step migration framework beyond the current deterministic normalization to v5 | Planned |
