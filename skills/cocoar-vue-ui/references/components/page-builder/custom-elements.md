<!-- Generated from apps/docs/components/page-builder/custom-elements.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Custom elements

`@cocoar/vue-page-builder` dispatches every element — built-in and consumer-defined alike — through one **element registry**. A registration is a plain object (`PageElementDefinition`) that packages everything the renderer and the builder need to know about one element type: the runtime component, its value-model participation, and optionally its editor appearance (palette entry, canvas preview, inspector).

Built-ins (`heading`, `text-input`, `card`, …) are pre-registered definitions on exactly this contract. A consumer element you register is therefore a **first-class element**: it appears in the palette, renders on the canvas, gets its own inspector section, participates in required-field validation, and contributes its value to action payloads — indistinguishable from a built-in.

A complete working example (a star-rating input) lives in the playground at `apps/playground/src/components/rating/`, registered in `apps/playground/src/views/PageBuilderView.vue`. This page walks through that element.

## Wire format

Custom nodes use the same node grammar as every other element — there is no `custom` envelope. The `type` is the registry key; everything element-specific lives in the `props` bag:

```json
{
  "id": "3f2c9a6e-…",
  "type": "acme-rating",
  "props": { "label": "How did we do?", "max": 5 },
  "name": "field_ab12",
  "defaultValue": 3,
  "validation": { "required": true },
  "style": { "alignSelf": "start" }
}
```

The **host vocabulary** stays at node level and is the same for every element:

| Field | Owner | Meaning |
|-------|-------|---------|
| `id` | host | Stable UUID, minted by the builder |
| `type` | host | Registry key (built-in type or consumer key) |
| `props` | **element** | The element's own vocabulary — JSON-safe, persisted verbatim |
| `style` | host | [`NodeStyle`](./coar-page-renderer.md#json-schema) — sizing, alignment, gap, padding |
| `name` / `defaultValue` / `validation` | host | Value-model trio; only meaningful when the definition has a `value` spec |
| `children` | host | Only when the definition declares `container` |

The bag exists so element props can never collide with host fields — an element prop named `style` or `children` is just `props.style` / `props.children`. The unified props-bag grammar was introduced in v2; version 4 added a stable name to every element, and version 5 added builder-only origin metadata for reusable compositions, and current `schemaVersion: 6` renamed the repeat's `props.source` to `props.contextPath`. Older documents normalize transparently (see [Degradation and compatibility](#degradation-and-compatibility)).

## Walkthrough: a rating element

The element is an interactive star-rating field. Four small pieces:

```
rating/
├── ratingProps.ts          the props-bag type (shared vocabulary)
├── RatingRenderer.vue      runtime component        ← renderer half
├── RatingPreview.vue       builder canvas preview   ┐
├── RatingInspector.vue     props-panel section      │ builder half
├── RatingDefaultInput.vue  typed default-value edit ┘
└── ratingElement.ts        the definition
```

### 1. The props bag

```ts
// ratingProps.ts
/** The rating element's props bag (JSON-safe, lives in `node.props`). */
export type RatingProps = {
  label?: string;
  max: number;
};
```

Keep it JSON-safe — the bag is persisted verbatim. Non-JSON values (dates, functions) don't survive the round-trip; use string wire values and convert at the component boundary (that's what the built-in date inputs do with ISO strings).

### 2. The runtime renderer

The renderer receives `{ node }` and wires itself into the renderer's value model via `usePageElement()` — a curated, stable context with `getValue` / `setValue` / `getError` / `markTouched` / `triggerAction` / `triggerElementAction` / `isValidating` / `isSubmitting` / `pendingAction` / `formError` / `resolveAsset` / `config`:

```vue
<!-- RatingRenderer.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import { usePageElement, type ElementNode } from '@cocoar/vue-page-builder';
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

const props = defineProps<{ node: ElementNode<string, RatingProps> }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);
</script>

<template>
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
  >
    <RatingStars
      :model-value="name ? Number(ctx.getValue(name) ?? 0) : 0"
      :max="node.props.max"
      @update:model-value="(v) => { if (name) { ctx.setValue(name, v); ctx.markTouched(name); } }"
    />
  </CoarFormField>
</template>
```

Notes:

- `node.name` is optional — a rating dropped without a field name still renders, it just doesn't participate in the value model. Guard your `getValue`/`setValue` calls.
- `getError(name)` returns a non-empty message only once the field is *touched*; call `markTouched(name)` at the interaction that counts (blur for typing inputs, change for choose-is-the-interaction inputs like this one).
- `usePageElement()` throws outside a `<CoarPageRenderer>` — element renderers only run inside the page renderer (the builder canvas uses the preview instead, never this component).
- Submit-affordance elements read the busy state: `isSubmitting` is true while an action's Promise is pending, `pendingAction` names the action id in flight (spin when it matches your own), `isValidating` covers the `onValidate` window. `formError` carries the [form-level error](./coar-page-renderer.md#async-actions-the-form-level-error-channel) — a small consumer element can render the banner *inside* the page (e.g. right above the submit button) instead of the host-level default.
- Choice-style elements can resolve `optionsSourceId` props exactly like the built-ins via the exported `useResolvedOptions(() => props.node.props)` composable.

#### Action-capable consumer elements

Compose your props with the exported `ActionProps`, declare `action: true` on the definition, and trigger through `triggerElementAction`. The builder then adds its universal Action and JSON key/value editor; runtime merging behaves exactly like built-in buttons and links.

```ts
import { definePageElement, type ActionProps } from '@cocoar/vue-page-builder'

type ActionChipProps = ActionProps & { label: string }

export const actionChip = definePageElement<ActionChipProps>({
  action: true,
  renderer: ActionChipRenderer,
  builder: {
    label: { key: 'app.pb.actionChip', fallback: 'Action chip' },
    icon: 'bolt',
    defaults: () => ({ label: 'Run' }),
  },
})
```

```vue
<script setup lang="ts">
import { usePageElement, type ActionProps, type ElementNode } from '@cocoar/vue-page-builder'

defineProps<{ node: ElementNode<string, ActionProps & { label: string }> }>()
const ctx = usePageElement()
</script>

<template>
  <button type="button" @click="ctx.triggerElementAction(node.props)">{{ node.props.label }}</button>
</template>
```

Do not manually merge form data with `actionValues`: the shared trigger path applies the documented precedence (**form < resolved per-key action values < legacy dynamic action value**), removes invalid runtime values, and preserves the renderer's async-action guard.

### 3. Value-model participation

Declaring a `value` spec makes the element a managed field whenever the node carries a `name`: it seeds defaults, joins `required`/`matchField` gating, and its value is included in action payloads.

```ts
value: {
  // A rating edits number fields (field-contract compatibility).
  types: ['number'],
  // What "empty" means for validation.required — a 0-star rating is empty.
  isEmpty: (v) => !v || Number(v) === 0,
}
```

The full spec:

```ts
interface ElementValueSpec<P> {
  /** Value types this element can edit — matched against the field
      contract's `PageFieldSpec.valueType`. Omitted = unconstrained. */
  types?: PageValueType[];
  /** Opt into the host-enforced string rules
      (validation.minLength / maxLength / pattern, and the built-in
      email check when the bag carries inputType: 'email'). */
  textRules?: boolean;
  /** May a plain Enter inside this element submit the page (fire the
      default button)? Only effective when the page root sets
      `enterSubmits`. Boolean, or a per-props predicate
      (text-input: (p) => (p.rows ?? 1) <= 1). Undeclared = never. */
  submitOnEnter?: boolean | ((props: P) => boolean);
  /** Fallback default when the node carries no `defaultValue`. Declare it —
      it keeps untouched fields PRESENT in ActionValues (the built-ins seed
      '' for strings, false for booleans, [] for multi-select, null for
      "nothing picked/entered"). */
  defaultValue?: (props: P) => unknown;
  /** Emptiness test for `validation.required`.
      Default: undefined | null | '' | false | [] count as empty. */
  isEmpty?: (value: unknown, props: P) => boolean;
  /** Element-owned validation, run after required/matchField.
      Return an error message, or null when valid. Crash-guarded by the host. */
  validate?: (value: unknown, node: ElementNode<string, P>, values: ActionValues) => string | null;
}
```

The host enforces `validation.required` (via your `isEmpty`) and `matchField` for every valued element; the string rules (`minLength` / `maxLength` / `pattern`) are host-enforced only for definitions that opt in via `textRules` — they need the localized message pipeline and the crash-safe pattern compiler, so the host runs them (the built-in `text-input` and `password-input` set it; any consumer element with a string value can too). `types` declares which [field-contract](./index.md#field-contract) value types the element can edit — omitted means unconstrained (compatible with every field), so declare them to show up for the right DTO fields: the rating's `types: ['number']` is exactly what makes it a representation for `number` fields. Everything else goes through `validate`; error messages it returns are yours to localize.

### 4. The builder half

Everything editor-facing sits under `builder`. Omit the whole block for renderer-only registrations (see [the contract-package pattern](#the-two-module-contract-package-pattern)).

**Canvas preview** — receives `{ node, resolveAsset? }` as props and is mounted **inert** (`pointer-events: none`; clicks select the node). It renders from the node alone — it never gets the runtime renderer context, so it must not use `usePageElement()`:

```vue
<!-- RatingPreview.vue -->
<script setup lang="ts">
import { CoarFormField } from '@cocoar/vue-ui';
import type { ElementNode } from '@cocoar/vue-page-builder';
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

defineProps<{
  node: ElementNode<string, RatingProps>;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <RatingStars :model-value="Number(node.defaultValue ?? 0)" :max="node.props.max" readonly />
  </CoarFormField>
</template>
```

If you skip `preview`, the canvas shows a neutral icon + label chip — perfectly serviceable for elements whose appearance doesn't matter while authoring.

**Inspector** — the element's own section in the props panel. Receives `{ node, patch }`; `patch({ props: {…} })` merges into the props bag with delete-on-empty semantics per key and goes through the builder's undo history:

```vue
<!-- RatingInspector.vue -->
<script setup lang="ts">
import { CoarFormField, CoarTextInput, CoarNumberInput } from '@cocoar/vue-ui';
import type { ElementNode } from '@cocoar/vue-page-builder';
import type { RatingProps } from './ratingProps';

defineProps<{
  node: ElementNode<string, RatingProps>;
  patch: (update: { props?: Partial<RatingProps> }) => void;
}>();
</script>

<template>
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="node.props.label ?? ''"
      @update:model-value="(v) => patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField label="Max stars">
    <CoarNumberInput
      :model-value="node.props.max"
      :min="1"
      :max="10"
      @update:model-value="(v) => patch({ props: { max: v ?? 5 } })"
    />
  </CoarFormField>
</template>
```

The inspector only edits the **props bag**. Field name, required and default value live in the host-owned Field section — see [What the host owns](#what-the-host-owns). Option-list elements can reuse the exported `OptionsEditor` component (`import { OptionsEditor } from '@cocoar/vue-page-builder'`).

**Typed default-value editor** — the Field section's "Default value" control is a plain text input unless the definition supplies one. Contract: `{ modelValue, props }` in, `update:modelValue` out:

```vue
<!-- RatingDefaultInput.vue -->
<script setup lang="ts">
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

defineProps<{
  modelValue: unknown;
  props: RatingProps;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();
</script>

<template>
  <RatingStars
    :model-value="Number(modelValue ?? 0)"
    :max="props.max"
    @update:model-value="(v) => emit('update:modelValue', v || undefined)"
  />
</template>
```

### 5. The definition

`definePageElement` is an identity helper that preserves the props-bag generic for the hooks and `markRaw`s the component fields (definitions travel through reactive config objects):

```ts
// ratingElement.ts
import { definePageElement } from '@cocoar/vue-page-builder';
import type { RatingProps } from './ratingProps';
import RatingRenderer from './RatingRenderer.vue';
import RatingPreview from './RatingPreview.vue';
import RatingInspector from './RatingInspector.vue';
import RatingDefaultInput from './RatingDefaultInput.vue';

export const ratingElement = definePageElement<RatingProps>({
  renderer: RatingRenderer,
  value: {
    // A rating edits number fields (field-contract compatibility).
    types: ['number'],
    // required = at least one star.
    isEmpty: (v) => !v || Number(v) === 0,
  },
  builder: {
    label: { key: 'acme.pb.type.rating', fallback: 'Rating' },
    icon: 'star',
    defaults: () => ({ label: 'Rating', max: 5 }),
    preview: RatingPreview,
    inspector: RatingInspector,
    inspectorTitle: { key: 'acme.pb.section.rating', fallback: 'Rating' },
    defaultValueInput: RatingDefaultInput,
  },
});
```

The remaining definition fields at a glance:

| Field | Effect |
|-------|--------|
| `container: true` | Node gets a `children` array, canvas dropzones, and the container style fields (gap, justify, align). The **host** renders the children into your renderer's default slot — recursion, allow-gating and direction context stay centralized. |
| `inline: true` | Leaf gets the `width: fit-content` treatment (like button/link) instead of stretching. |
| `builder.group` | Palette grouping: `'container'` or `'element'` (default). The `'element'` group is presented split by value-spec presence: value elements show under **Inputs** (the offering `hideElementPicker` removes), the rest under **Elements**. |
| `builder.hideStyleSection` | Suppresses the universal Style section for spacer-style minimal elements. |
| `builder.quickProperties` | Optional Properties-panel shortcuts that write locked Element Code assignments. Mark human copy with `valueKind: 'localized-text'`; the Builder then stores a translation key and edits its values in the central Translations tab. Leave layout, identifiers and enum values literal. |
| `builder.lint` | `(node, config?) => { severity: 'error' \| 'warning'; message: I18nText }[]` — authoring diagnostics merged into the builder's validation panel. Lint never blocks saving. |
| `normalizeProps` | `(raw: unknown) => P` — ingest healing for the props bag (untrusted JSON). Runs crash-guarded inside `normalizePageSchema` on every builder ingest path (v-model, JSON tab) and wherever the server passes `{ elements }`. Return the input unchanged (same reference) when nothing needs healing. |

Labels and lint messages are `I18nText` pairs — `{ key, fallback }`, translated via `@cocoar/vue-localization` with the fallback used when the key isn't registered. English-only apps need no i18n setup.

> **Warning: `value` + `container` on one element**
>
> The flags compose — an element can carry a value **and** accept children (say, a toggleable group), and the runtime handles both. Two authoring caveats, though: the builder **canvas** renders the generic children body for containers, so such an element's own chrome only shows in the Preview tab (a `builder.preview` on a container definition is never mounted — DEV warns about it), and the representation switcher refuses targets that would drop children (`convertTo` guards against it). If you hit this combination in earnest, tell us — full canvas support needs a designed preview-with-children contract.

## Registering

There is deliberately **no global `register()`** — registries are per-instance data, so two builders with different element sets can coexist. Two channels:

**Per instance, via `config.elementTypes`** (wins when both are present):

```ts
import type { PageConfig } from '@cocoar/vue-page-builder';
import { ratingElement } from './rating/ratingElement';

const config: PageConfig = {
  elements: { 'acme-rating': ratingElement },
  // …
};
```

Pass the same `config` to both `<CoarPageBuilder>` and `<CoarPageRenderer>` — one registration serves palette, canvas, inspector and runtime.

**App-wide default, via `app.provide`:**

```ts
// main.ts
import { PAGE_ELEMENT_TYPES_KEY } from '@cocoar/vue-page-builder';
import { ratingElement } from './rating/ratingElement';

app.provide(PAGE_ELEMENT_TYPES_KEY, { 'acme-rating': ratingElement });
```

Every builder/renderer in the app without its own `config.elementTypes` picks these up.

### `allowedElements` composition

`config.allowedElements` takes built-in types and consumer keys in one list — a consumer element is gated exactly like a built-in (hidden from the palette, blocked on the canvas, skipped by the renderer when absent):

```ts
allowedElements: [
  'stack', 'card', 'heading', 'paragraph',
  'text-input', 'checkbox', 'button',
  'acme-rating',
],
```

Registration makes an element *available*; `allowedElements` (when present) decides whether it's *permitted*. Omitting `allowedElements` allows everything registered.

### Keys

Consumer keys must match `^[a-z][a-z0-9-]*$` — lowercase kebab-case, colon-free (so keys survive stricter grammars such as markdown embeds). **Prefix your keys with a vendor namespace** (`acme-rating`, not `rating`): registration merges *additively* over the built-in set, and shadowing an existing key triggers a DEV warning — an unprefixed `rating` would silently collide the day the library ships a built-in of the same name. `mergeElementRegistries` is exported if you need to compose registries yourself.

## The two-module contract-package pattern

The definition splits into a **renderer half** (top level: `renderer`, `value`, `container`, `inline`) and an optional **builder half** (`builder: {…}`). Runtime apps that only ever render pages should not pull inspector/preview components into their bundle. Ship elements as a small contract package with two entry points:

```ts
// @acme/page-elements/renderer — imported by BOTH apps
import { definePageElement } from '@cocoar/vue-page-builder';
import RatingRenderer from './RatingRenderer.vue';

export const ratingRendererHalf = definePageElement<RatingProps>({
  renderer: RatingRenderer,
  value: { types: ['number'], isEmpty: (v) => !v || Number(v) === 0 },
});
```

```ts
// @acme/page-elements/builder — imported by the ADMIN app only
import { definePageElement } from '@cocoar/vue-page-builder';
import { ratingRendererHalf } from './renderer';
import RatingPreview from './RatingPreview.vue';
import RatingInspector from './RatingInspector.vue';
import RatingDefaultInput from './RatingDefaultInput.vue';

export const ratingElement = definePageElement<RatingProps>({
  ...ratingRendererHalf,
  builder: {
    label: { key: 'acme.pb.type.rating', fallback: 'Rating' },
    icon: 'star',
    defaults: () => ({ label: 'Rating', max: 5 }),
    preview: RatingPreview,
    inspector: RatingInspector,
    defaultValueInput: RatingDefaultInput,
  },
});
```

The runtime app registers `{ 'acme-rating': ratingRendererHalf }`, the admin app `{ 'acme-rating': ratingElement }` — same key, same wire format, no builder-only code in the runtime bundle. A definition without a `builder` half renders fine but never appears in the palette.

## Degradation and compatibility

A document is data; the registry is code. The two can disagree — a document authored against a newer library version, an element the current app didn't register, or a type outside `allowedElements`. The policy is **lossless and lenient**:

| Situation | Builder canvas | Builder JSON tab | Runtime renderer | Value model |
|-----------|----------------|------------------|------------------|-------------|
| **Unregistered type** (unknown to this app) | Red "Unknown type — skipped at runtime" treatment; node stays selectable, movable, deletable | Normalize *warning* — Apply is **not** blocked (only structural errors block), node round-trips byte-for-byte incl. its `children` | Skipped, one `console.warn` per type | Excluded — contributes no defaults, **cannot veto submit** |
| **Registered but not in `allowedElements`** | Same blocked treatment + validation error; hidden from palette/add menu | Pasteable, kept | Skipped (this is the security boundary) | Excluded, same non-veto rule |
| **v1 document** (pre-GA flat props, `schemaVersion` absent or `1`) | Migrated to the v2 props bag on ingest (`migrateV1PropsBag`, idempotent), missing names added and `schemaVersion: 6` stamped | Migrated on Apply | Migrated on the fly | Normal |

The non-veto rule matters: a `required` field of a type this deployment can't render would otherwise permanently block every `validates: true` button. Submission is therefore **lenient by design** — an invisible field can't veto submit. If a document must not execute with fields missing, enforce that server-side against the payload.

Server-side, the same ingest pipeline is exported: `normalizePageSchema(value, options?)` returns `{ schema, issues, changed }` with per-issue `severity: 'error' | 'warning'` (`error` = data was dropped, `warning` = healed or lossless), and runs the legacy-type and v1→v2 migrations first. Pass `{ elements }` to make it registry-aware: registered consumer types then count as known (no unknown-type warning, container recursion honours `container: true`) and each definition's `normalizeProps(raw)` hook runs as a crash-guarded healing pass over the props bag — the element's own ingest gate for untrusted JSON. Without the option you get the registry-less structural pass. `migrateV1PropsBag` is exported separately.

## What the host owns

When writing an element, you own the props bag and the components. Everything else is host machinery you get for free — and must not re-implement:

- **Field section** — the props panel renders name / required / default-value controls automatically whenever the definition has a `value` spec. Your inspector never edits `node.name`, `node.validation` or `node.defaultValue`; supply `defaultValueInput` if the default needs a typed editor.
- **Style section** — the universal `NodeStyle` editor (size, alignment, gap, padding; container fields keyed off `container`). Elements don't define their own layout props — `props` is for element vocabulary, `style` is host-owned.
- **Drag and drop** — palette entry, canvas dropzones, outline reorder, duplicate, undo/redo. Dropzone legality derives from `container`; a freshly dropped node gets `id`, `props` from your `defaults()`, a minted `name` when the definition has a `value` spec (under a strict [field contract](./index.md#field-contract) — `config.dataContract` set, `allowCustomFields` off — fresh value elements start unbound instead, and the author binds a contract field), and `children: []` when it's a container.
- **The allow gate** — `allowedElements` filtering in palette, canvas and renderer, including the value-model exclusion. Renderers never need to check it.
- **Conditional visibility** — [`visibleWhen`](./coar-page-renderer.md#conditional-visibility-visiblewhen) is host vocabulary: the host hides the node (your renderer simply isn't mounted) and excludes its subtree from the value model. Never re-implement show/hide inside a renderer — a hidden-by-you `required` child would still veto submits.
- **Enter-to-submit** — declare eligibility (`value.submitOnEnter`); the host wires the keydown routing and the default-button resolution. No key handlers needed in your renderer.
- **Value plumbing** — default seeding (`node.defaultValue ?? value.defaultValue?.(props)`), the renderer's [`initialValues` host prefill](./coar-page-renderer.md), touched-state, error computation ordering (required → string rules/email → matchField → your `validate`), the busy/submit lifecycle (`isSubmitting`, reentry guards, the form-error banner), and action payload assembly (allowed + visible fields, snapshot).

Registered element components are **trusted consumer code** — the library does not sandbox them. The tenant-facing security boundary remains `allowedElements` plus the renderer's `actions` map; the registry is a developer-facing extension surface.
