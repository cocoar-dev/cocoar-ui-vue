# Page Builder <Badge type="warning" text="Preview" />

`@cocoar/vue-page-builder` is a generic, headless visual page composition framework. Users drag UI primitives onto a canvas, configure them, and the result is a portable JSON schema that a companion renderer turns back into live Cocoar components.

Everything domain-specific — what actions a button can trigger, where images come from, which elements are permitted — is defined by the **consumer application**, not the library.

## Two components

| Component | Purpose | Docs |
|-----------|---------|------|
| `<CoarPageBuilder>` | Visual editor — 3-panel layout, drag-and-drop, props panel | [→ CoarPageBuilder](./coar-page-builder) |
| `<CoarPageRenderer>` | Runtime renderer — schema → live Cocoar components | [→ CoarPageRenderer](./coar-page-renderer) |

Both share the same `PageConfig`. The builder uses it as UI affordances; the renderer uses it as the security boundary.

## Quick start

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
    :asset-resolver="(id) => `/tenant/${tenantId}/assets/${id}`"
  />
</template>
```

The **same `config` is passed to both** — the builder uses it to filter UI affordances; the renderer uses it as the security boundary at render time.

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
   * Element types permitted to appear in the tree. Omit to allow every type.
   * `page` (the root marker) is always implicitly allowed.
   */
  allowedElements?: ElementType[]

  /**
   * Action IDs that buttons and links may reference. When provided, the
   * builder's Action input becomes a dropdown of these labeled choices
   * instead of free text. The renderer's `actions` map is the actual
   * security boundary — `availableActions` is a UX affordance.
   */
  availableActions?: { id: string; label: string }[]

  /**
   * Resolves an assetId to a URL. Used by the builder for thumbnails
   * (canvas preview, props panel, Preview tab) and by the runtime
   * renderer for `<img src>`. Same contract as the renderer's
   * `:asset-resolver` prop.
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
}
```

### `allowedElements`

Enforced at **both** layers:
- *Builder*: hidden from the palette and add-child menu; tenants can't insert disallowed types.
- *Renderer*: disallowed nodes are skipped at render time even if they appear in hand-written or tampered JSON. This is the security boundary.

```ts
allowedElements: [
  'stack', 'card', 'section', 'divider',
  'heading', 'paragraph',
  'text-input', 'checkbox', 'button', 'link', 'image',
],
```

Drop element types the tenant shouldn't be able to use. `page` is implicitly always allowed.

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
      pass the same function (or one equivalent) to the renderer's :asset-resolver. */
  assetResolver: (id) => `https://cdn.example.com/t/${tenantId}/${id}`,

  /** Opens YOUR picker and resolves to the chosen id (or null on cancel). */
  async pickAsset(currentId) {
    const result = await myAssetModal.open({ initial: currentId });
    return result ?? null;
  },
};
```

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

**Allowed elements** — `config.allowedElements` is enforced at both layers (builder hides; renderer skips). The renderer is the hard boundary — even tampered JSON cannot smuggle in disallowed types.

**Actions** — buttons and links store an action `id`. The renderer only invokes handlers from the consumer-provided `actions` map. Arbitrary JavaScript is never stored in the schema. When `config.availableActions` is set, the builder also constrains the Action input to a labeled dropdown.

**Images** — `image` nodes store an `assetId` reference, never a raw URL. The renderer calls `assetResolver(id)` at render time. Tenants cannot reference external domains. Uploads happen entirely inside the consumer-built picker (whatever `pickAsset` opens) — that's where you validate file type, scan for malware, and enforce per-tenant size quotas.

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
    assetResolver: (id) => `https://cdn.example.com/t/${tenantId}/${id}`,
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
  <CoarPageRenderer
    v-if="schema"
    :schema="schema"
    :config="config"
    :actions="actions"
    :asset-resolver="config.assetResolver"
  />
</template>
```

### Notes for the IDP wiring

- **Schema migration** — JSON pasted into the builder is normalised (`column`/`row` → `stack`, non-`page` roots get wrapped in a `page`). Schemas loaded from your backend that pre-date these types still work — the renderer accepts them implicitly because the builder migrates on paste, but if you have old saved schemas you should run the same migration server-side before storing the new shape.
- **Validation** — the builder warns about missing actions, duplicate field names, and missing asset IDs, but lets the tenant save anyway. If you want hard server-side validation before persisting, walk the tree and reject (e.g., reject if any `image.assetId === ''`).
- **CSP** — image URLs come from `assetResolver`, so your CDN domain needs to be in `img-src`. Action IDs and labels are plain strings — nothing executable lives in the schema.
- **Full-screen / centering** — the renderer is `display: contents`, so the `page` fills the host element's width. To center a login card on a full-height screen, set the `page` node's `minHeight: '100vh'` + `justify: 'center'` + `align: 'center'` — no host CSS needed. See [Sizing and alignment](./coar-page-renderer#sizing-and-alignment).
- **Per-tenant theming** — the renderer uses the Cocoar Design System tokens; override CSS variables on a wrapping container for tenant brand colors.

## Implementation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **1 — Foundation** | `schema.ts` types · `CoarPageRenderer` · playground demo | ✅ Done |
| **2 — Builder shell** | Canvas + palette · Outline · Props panel · DnD · Undo/redo · JSON tab | ✅ Done |
| **3 — Config + safety** | `page` root · `stack` (direction toggle) · `:config.allowedElements` · `:config.availableActions` | ✅ Done |
| **4 — Asset callbacks + polish** | `:config.pickAsset` + `:config.assetResolver` · builder validation · responsive preview | ✅ Done |
| **5 — Layout & sizing** | Flex model — `justify` / `align` / `alignSelf` / `size` (fit · fill · fixed) / `minHeight`; guided Style-panel controls; Editor matches Preview | ✅ Done |
| **5b — Style editor (visual)** | Spacing sliders + colour pickers (rolls into the tenant theming track) | Planned |
| **6+ — Schema versioning** | Formal `version` field + migration framework | Planned |
