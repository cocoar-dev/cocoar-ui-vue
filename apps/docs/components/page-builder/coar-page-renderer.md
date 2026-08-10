---
description: "CoarPageRenderer turns a PageNode schema into live Cocoar components at runtime, enforcing the allowedElements security boundary with actions, validation and initialValues."
---

# `<CoarPageRenderer>` <Badge type="warning" text="Preview" />

The runtime-renderer half of `@cocoar/vue-page-builder`. Takes a `PageNode` schema (produced by [`<CoarPageBuilder>`](./coar-page-builder) or written by hand) and renders it as live Cocoar components. This is the component you mount on the actual page that end-users see.

The renderer is also the **security boundary** — elements not in `config.allowedElements` are skipped at render time, even if they appear in hand-written or tampered JSON.

::: tip Stylesheet
Import `@cocoar/vue-page-builder/styles` once in your app — the renderer's layout styles (stack flexbox, section/card spacing) live there too, not just the builder chrome.
:::

## Props

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `PageNode` | Required. The page schema to render. Legacy `column`/`row` containers and v1 flat documents are [migrated on the fly](#legacy-schemas-normalization). |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | Security/allowlist boundary. Elements not in `config.allowedElements` are skipped at render time (with one console warning per type) **and excluded from the value model**. Also supplies the `assetResolver` fallback and the [consumer element registrations](./custom-elements) (`config.elementTypes`). |
| `actions` | `Record<string, (values: ActionValues) => void \| Promise<unknown>>` | Map of action IDs to handler functions. Buttons and links call these. A returned Promise is awaited: buttons disable (the triggering one spins) until it settles, further clicks are ignored, and a rejection surfaces in the [form-level error banner](#async-actions-the-form-level-error-channel). |
| `onValidate` | `(values: ActionValues) => Record<string, string> \| Promise<Record<string, string>>` | Developer-only cross-field/server validation. Runs at **submit time** — when a `validates: true` button is clicked and after all declarative rules pass. May be sync or async; returns `{ fieldName: errorMessage }`. A non-empty result blocks the action. The reserved key `_form` addresses the form as a whole (banner instead of a field). Not exposed in builder UI. See [Validation](#validation). |
| `assetResolver` | `(id: string) => string` | Resolves an `assetId` to a URL at render time. Falls back to `config.assetResolver` when not set. Needed when the schema contains `image` nodes. |
| `initialValues` | `ActionValues` | Host-supplied field values for edit-form scenarios, merged **over** the schema's `defaultValue`s on init. Only keys that match a **named** input in the (allowed) tree are taken — stray host data never leaks into the action payload. Replacing the object with **different values** re-initializes the form, like a schema change; a value-identical replacement (e.g. an inline object literal re-created by a parent re-render — nested objects/arrays compare by content) is ignored, so in-progress user input survives. |
| `runtimeContext` | `Record<string, unknown>` | Host-owned runtime data. The document can only read paths explicitly declared by `config.contextFields`; undeclared paths resolve to the binding fallback. |
| `locale` | `string` | Active locale used to resolve page translation keys, legacy `LocalizedValue` props and localized templates. Regional locales fall back to their base locale and then `config.defaultLocale`. |
| `viewportWidth` | `number` | Optional deterministic container width. Runtime normally measures its container; previews and tests can provide an exact width. |
| `fallbackSchema` | `PageNode` | Host-owned safe document rendered when the customized document fails allow-list, binding or document-limit validation. `usingFallback` is exposed on the component ref. |

## Usage

```vue
<CoarPageRenderer
  :schema="savedSchema"
  :config="tenantConfig"
  :actions="{
    'auth:login':           (v) => auth.login(v),
    'auth:forgot-password': ()  => router.push('/forgot'),
  }"
  :on-validate="async (v) => serverValidate(v)"
  :asset-resolver="(id) => `/tenant/${tenantId}/assets/${encodeURIComponent(id)}`"
/>
```

`ActionValues` is `Record<string, unknown>` — a flat map of all named fields at the time the action fires. Every input element with a `name` property contributes its value — **including untouched ones**: text/otp inputs contribute **strings** (`''` when untouched), `number-input` a **number** (`null`), `checkbox`/`switch` **booleans** (`false`), `multi-select` a **string array** (`[]`), `select`/`radio-group` a **string** (`null`), date inputs an **ISO string** (`null`). Fields in [conditionally hidden](#conditional-visibility-visiblewhen) or disallowed subtrees are excluded. Handlers receive a snapshot, not live state. Hand-written schemas carry no hard type guarantee, so narrow the values in your handler.

To prefill a form (edit scenarios), pass `initialValues` — the values seed **over** the schema defaults, filtered to the named fields that actually exist in the allowed tree. Prefer a stable reference (a `computed` or plain object created once): replacing it with different values re-initializes the form and discards user edits.

```vue
<script setup>
// Stable per user — recomputed only when the source data changes.
const profileValues = computed(() => ({ email: user.email, newsletter: true }));
</script>

<template>
  <CoarPageRenderer
    :schema="profileSchema"
    :actions="{ 'profile:save': (v) => api.save(v) }"
    :initial-values="profileValues"
  />
</template>
```

## Events & host form API

The renderer is not a black box between init and action click — it emits value changes and exposes a small form API on its component ref:

| Surface | Description |
|---------|-------------|
| `@update:values` (event) | Fires with a snapshot of the current value map on init, on every field edit and on `reset()` — unlocks autosave, drafts and dirty tracking. The snapshot is a copy, safe to keep; it contains the named fields of the allowed **and currently visible** tree. |
| `values` (exposed) | Snapshot of the current value map (same rules as the event). |
| `isDirty` (exposed) | `true` once any field differs from its initial state (schema defaults + `initialValues`). |
| `isFormValid` (exposed) | Quiet validation state — `true` while every declarative rule passes. Shows no errors. |
| `reset()` (exposed) | Back to the initial state: schema defaults + `initialValues`; touched flags, server errors and the form banner are cleared. |

```vue
<script setup>
const form = ref();
onBeforeRouteLeave(() => !form.value?.isDirty || confirm('Discard changes?'));
</script>

<template>
  <CoarPageRenderer ref="form" :schema="schema" @update:values="autosave" />
</template>
```

## JSON Schema

One node grammar for every element (wire-format **v4**): the v2 `props`-bag and v3 runtime-composition grammar remain compatible; v4 gives every element a stable page-wide `name` for Element Code and form identity.

```ts
interface ElementNode {
  id:            string                   // stable UUID (crypto.randomUUID), assigned by the builder
  type:          string                   // element-registry key — a built-in type or a consumer key
  props:         Record<string, unknown>  // element-specific props (JSON-safe bag)
  style?:        NodeStyle
  responsive?:   Partial<Record<'phone' | 'tablet' | 'desktop', Partial<NodeStyle>>>
  bindings?:     Record<string, RuntimeBinding | RuntimeTemplate>

  // Value-model trio — meaningful when the element's definition declares `value`:
  name?:         string
  defaultValue?: unknown
  validation?:   FieldValidation

  visibleWhen?:  VisibleWhen              // conditional visibility — see below
  children?:     PageNode[]               // containers only
}

interface NodeStyle {
  // ── Container: how this node lays out its children ──
  gap?:       string   // CSS gap between children — '8px', '1rem', …
  padding?:   string   // CSS padding inside this node
  justify?:   'start' | 'center' | 'end'             // justify-content — main-axis
            | 'space-between' | 'space-around' | 'space-evenly'
  align?:     'start' | 'center' | 'end' | 'stretch' // align-items — cross-axis

  // ── Self: how this node sits inside its parent ──
  alignSelf?: 'start' | 'center' | 'end' | 'stretch' // align-self — overrides parent `align`
  size?:      'fit' | 'fill' | 'fixed'               // sizing along the parent's main axis
  width?:     string   // used when size: 'fixed' — '380px', '100%', …
  minHeight?: string   // 'min-height' — e.g. '100dvh' to make the page fill the viewport
}
```

The root is the one node shape outside the element grammar: `{ id, type: 'page', schemaVersion, enterSubmits?, stateCode?, rootCode?, translations?, style?, responsive?, children }` — a schema-shape marker, not a placeable element, with no props bag. `rootCode` is a constrained reactive presentation binding and can return only root `style`, `responsive`, and `enterSubmits` changes. **`4`** is current. Older documents remain readable and are normalized deterministically. `enterSubmits` opts the page into [Enter-to-submit](#enter-to-submit).

Node `id`s must be unique page-wide — the builder assigns them via `crypto.randomUUID()` and [repairs missing or duplicate ids](#legacy-schemas-normalization) at every entry point.

### Layout behaviour

Containers are flexbox. The `page` root and `card` / `section` bodies are columns; a `stack` is either (`direction: 'column' | 'row'`, default `column`, plus optional `wrap` for rows).

- **page** — the schema root. A vertical stack; the only element allowed at the top of the tree.
- **stack** — generic flex container. Toggle `direction` between `column` and `row`. Row children are **natural-width by default** — opt a child into growing with `size: 'fill'`.
- **card** — `CoarCard` wrapper, optional `title`. Children stacked vertically.
- **section** — semantic `<section>` with optional `title` heading.

#### Sizing and alignment

`NodeStyle` separates *how a container arranges its children* from *how a node sizes and places itself*:

| Field | Applies to | Maps to | Use |
|-------|-----------|---------|-----|
| `justify` | containers | `justify-content` | distribute children on the main axis (e.g. push a button row right with `end`) |
| `align` | containers | `align-items` | align children on the cross axis |
| `alignSelf` | any node | `align-self` | override the parent's `align` for one node — e.g. center a single button in a left-aligned column |
| `size` | any node | flex / width | `fit` (natural) · `fill` (take available space) · `fixed` (+ `width`) |
| `minHeight` | any node | `min-height` | give a node a minimum height (see below) |

`size: 'fill'` is **direction-aware**: in a row it grows along the row; in a column it becomes full-width (so a "fill" Sign-in button spans the whole card).

#### Full-screen / centered pages

The renderer is a width-filling block and measures that container for responsive resolution. To center content on a full-screen page (the classic login card), size the `page` itself:

```json
{ "type": "page", "style": { "minHeight": "100dvh", "justify": "center", "align": "center" } }
```

`minHeight: '100dvh'` makes the page fill the current dynamic viewport; `justify: 'center'` centers vertically (a column's main axis is vertical) and `align: 'center'` centers horizontally — no host CSS required beyond the host having its natural width. Legacy `vh` and the modern `svh`/`lvh` variants are supported as well.

### Example — login page

```json
{
  "id": "root",
  "type": "page",
  "schemaVersion": 3,
  "style": { "minHeight": "100dvh", "justify": "center", "align": "center", "padding": "48px" },
  "children": [
    {
      "id": "n1",
      "type": "card",
      "props": {},
      "style": { "size": "fixed", "width": "400px", "gap": "16px" },
      "children": [
        { "id": "n2", "type": "image",      "props": { "assetId": "logo-primary", "alt": "Acme logo" } },
        { "id": "n3", "type": "heading",    "props": { "text": "Welcome back", "level": 1 } },
        { "id": "n4", "type": "text-input", "name": "email",
          "props": { "label": "Email", "inputType": "email" },
          "validation": { "required": true } },
        { "id": "n5", "type": "password-input", "name": "password",
          "props": { "label": "Password" },
          "validation": { "required": true, "minLength": 8 } },
        { "id": "n6", "type": "checkbox",   "name": "rememberMe", "defaultValue": false,
          "props": { "label": "Remember me" } },
        { "id": "n7", "type": "button",     "style": { "size": "fill" },
          "props": { "label": "Sign in", "action": "auth:login", "validates": true } },
        { "id": "n8", "type": "link",       "props": { "label": "Forgot password?", "action": "auth:forgot-password" } }
      ]
    }
  ]
}
```

Note the split: `name`, `defaultValue`, `validation` and `style` sit at **node level** (host vocabulary, uniform for every element), while `label`, `inputType`, `action`, `assetId`, … sit in **`props`** (each element's own vocabulary).

### Try it live

The same card rendered live (logo omitted). Email is `required` + `inputType: 'email'`, password is `required` + `minLength: 8`, and the Sign-in button `validates`. Click it with empty fields — the click marks every field touched and reveals all errors at once; once the form is valid, the action receives the `ActionValues` and writes them below the card.

<preview path="./demos/RendererLoginCard.vue" />

## Generic runtime composition (v4)

These features are domain-neutral. Authentication pages are one consumer: names such as `approvedScopes` are ordinary schema configuration, not package concepts.

### Responsive styles

The renderer applies a mobile-first cascade using its measured container width: Compact/base from 320 px, Phone from 390 px, Tablet from 768 px and Desktop from 1280 px. Base values live in `style`; breakpoint differences live in `responsive.phone`, `responsive.tablet` and `responsive.desktop`. The renderer and builder preview share the same resolver. Length values pass through a restrictive CSS-length parser, while colors, typography, radii and elevation use controlled design-token enums.

### Safe bindings, localization and conditions

`bindings` maps an element prop to a controlled runtime source. A target may
be a top-level prop (`disabled`, `label`, …) or one action argument
(`actionValues.approvedScopes`). Supported direct sources are:

| Source | Value |
|--------|-------|
| `context` + `path` | Exact host path declared by `config.contextFields` |
| `state` + `path` | Customer-authored `definePageState(...)` value |
| `field` + `path` | Current named form value |
| `selection` + `path` | Current named Repeat selection (`string[]`) |
| `item` + `path` | Current Repeat item path declared by that Repeat's context contract |
| `index` | Current Repeat index |
| `expression` | Host-sandboxed JavaScript result supplied through `expressionValues` |

Context/item traversal is allow-listed; state/form/selection names come from
the page contract itself. A `RuntimeTemplate` can interpolate several
allow-listed values.

New page documents keep customer-owned messages once on the page root and reference them with a serializable translation binding:

```json
{
  "source": "translation",
  "key": "page.submit.label",
  "params": { "name": "Ada" },
  "fallback": "Sign in"
}
```

Element Code creates the same value through `i18n.text(key, params?, fallback?)`. Resolution is page catalogue → host `@cocoar/vue-localization` catalogue → fallback → key. `LocalizedValue` is retained as a compatibility format for existing schemas.

`visibleWhen` uses the same field/context/item sources with `equals`, `notEquals`, `in`, `notIn`, `exists`, `isEmpty` and `isNotEmpty`. Conditions can be combined with bounded `all`/`any` groups. Hidden subtrees do not render, validate or contribute values/action payloads.

### Generic repeaters and selections

`repeat` renders its child template for an allow-listed context array. Item bindings and conditions can only read declared `itemFields`; `maxItems` is capped at 500. Its optional selection contract is also generic:

```json
{
  "type": "repeat",
  "props": {
    "source": "catalog.items",
    "keyPath": "id",
    "selection": {
      "name": "chosenItemIds",
      "valuePath": "id",
      "requiredPath": "mandatory",
      "defaultSelection": "all"
    }
  }
}
```

The result is `ActionValues.chosenItemIds: string[]`. Required items are always
selected and cannot be unchecked. Host `initialValues` may seed the selection;
otherwise `defaultSelection` is `'none'` or `'all'`. Reconciliation retains
the current choice, removes stale and duplicate values, adds required values,
and emits the source-array order. The output name and item paths are freely
configured; the primitive has no knowledge of scopes, products, roles or any
other domain.

### Feedback placement, actions and fallback

`feedback` is an authorable semantic zone. `kind: 'form-error'` places rejected async-action or `_form` validation errors at that exact tree position; other kinds provide error, success, info and loading status with appropriate live-region semantics. Every action-capable element uses the same optional [`ActionProps`](#action-arguments) payload contract.

Hosts can mark nodes as required, lock their visibility/style/placement, and cap node count/depth through `PageConfig`. If a saved customization violates those invariants, `fallbackSchema` provides a safe host-owned render path rather than a partially broken page.

## Built-in Elements

Built-ins are pre-registered [element definitions](./custom-elements) — they ride exactly the same registry contract as consumer-registered elements. The prop names listed below live in each node's **`props` bag**; `name` / `defaultValue` / `validation` / `style` are node-level host fields on every element.

### Containers

| Type | Description |
|------|-------------|
| `page` | Root container. Always column-direction. |
| `stack` | Generic flex container with toggleable `direction` (`column` \| `row`). Optional `wrap` for row-direction stacks. |
| `card` | `CoarCard` wrapper with optional `title` |
| `section` | Semantic section with optional `title` heading |
| `divider` | Visual separator (`CoarDivider`) |
| `spacer` | Empty space — `flex: 1` (fills available space) unless `size` is set |

### Typography & Display

| Type | Props | Description |
|------|-------|-------------|
| `heading` | `text`, `level` (1–6) | H1–H6 heading |
| `paragraph` | `text` | Body text block |
| `note` | `text`, `variant` (`neutral` \| `info` \| `success` \| `warning` \| `error` \| `accent`) | `CoarNote` callout box |

### Inputs

| Type | Key props (in `props`) | Value type | Cocoar component |
|------|-----------|------------|-----------------|
| `text-input` | `label`, `inputType`, `rows`, `placeholder`, `disabled` | `string` | `CoarTextInput` (textarea when `rows > 1`) |
| `password-input` | `label`, `placeholder`, `disabled` | `string` | `CoarPasswordInput` (masked) |
| `number-input` | `label`, `placeholder`, `min`, `max`, `step`, `decimals`, `disabled` | `number` | `CoarNumberInput` |
| `checkbox` | `label`, `disabled` | `boolean` | `CoarCheckbox` |
| `switch` | `label`, `disabled` | `boolean` | `CoarSwitch` |
| `radio-group` | `label`, `options`, `optionsSourceId`, `orientation`, `disabled` | `string` | `CoarRadioGroup` + `CoarRadioButton` |
| `select` | `label`, `options`, `optionsSourceId`, `placeholder`, `disabled` | `string` | `CoarSelect` |
| `multi-select` | `label`, `options`, `optionsSourceId`, `placeholder`, `disabled` | `string[]` | `CoarMultiSelect` |
| `otp-input` | `label`, `length`, `otpType`, `mask`, `disabled` | `string` | `CoarOtpInput` |
| `date-input` | `label`, `placeholder`, `disabled` — `defaultValue` is ISO `YYYY-MM-DD` | ISO `string` | `CoarPlainDatePicker` |
| `datetime-input` | `label`, `placeholder`, `disabled` — `defaultValue` is ISO `YYYY-MM-DDTHH:mm[:ss]` | ISO `string` | `CoarPlainDateTimePicker` |

All inputs support the node-level `name` (wires the value into `ActionValues`), `defaultValue`, and `validation`, plus `props.disabled`. Fields with `validation.required` get the `*` marker via `CoarFormField`. Required semantics adapt to the value shape: a required `multi-select` needs **at least one** selection, a required `otp-input` needs a **complete** code (all cells filled), a required `switch`/`checkbox` must be **on**.

::: info Date values are ISO strings
The wire format for `date-input`/`datetime-input` is always the ISO string — in the schema's `defaultValue` **and** in `ActionValues`. The renderer converts to/from `Temporal.PlainDate`/`PlainDateTime` at the picker boundary; an unparsable value renders as an empty picker instead of crashing. Zoned (time-zone-aware) date-times are deliberately not part of the element set yet.
:::

#### `inputType`

`text-input` maps its `inputType` onto the right control and autocomplete hints:

| `inputType` | Renders | Autocomplete |
|-------------|---------|--------------|
| `'text'` (default) | `CoarTextInput` with `type="text"` | — |
| `'email'` | `CoarTextInput` with `type="email"` | `autocomplete="email"` |
| `'url'` | `CoarTextInput` with `type="url"` | `autocomplete="url"` |

Masked passwords are their own element: `password-input` (renders `CoarPasswordInput`). Legacy `text-input` nodes with `inputType: 'password'` migrate to it transparently on load.

`inputType: 'email'` also opts the field into the built-in **email format check** — see [Email format](#email-format).

#### Dynamic options (`optionsSource`)

The choice inputs (`select`, `multi-select`, `radio-group`) take their options from the static `options` array by default. For API-backed lists (countries, users, …), set the node's `optionsSourceId` and provide the resolver in the config — the async sibling of `assetResolver`:

```ts
const config: PageConfig = {
  optionsSource: async (sourceId) => {
    if (sourceId === 'countries') return api.countries(); // Promise<OptionItem[]>
    return [];
  },
};
```

A set `optionsSourceId` wins over the static `options`; without a configured `optionsSource` the static options are used (and the builder lint warns). While a load is in flight the list is empty; a failed load stays empty and warns once. The resolver is called once per element instance — memoize consumer-side when several elements share a source. Consumer elements get the same behavior via the exported `useResolvedOptions` composable.

#### Declarative rules

Rules live on the node-level `validation` property (host vocabulary, uniform for every valued element):

```ts
interface FieldValidation {
  required?:   boolean    // any valued element — emptiness comes from the element's definition
  minLength?:  number     // string-rule elements (text-input, password-input, …)
  maxLength?:  number     // string-rule elements
  pattern?:    string     // string-rule elements; regex source applied as full-string match
  matchField?: string     // any valued element — value must equal this other named field's value
  message?:    string     // custom error message — overrides defaults
}
```

`required` and `matchField` are host-enforced on every valued element; the string rules (`minLength` / `maxLength` / `pattern`) are host-enforced on elements whose definition opts in via `value.textRules` (built-in: `text-input` and `password-input`). Other elements express extra rules through their definition's `validate` hook (run crash-guarded, after the host rules) — see [Custom elements](./custom-elements). How and when errors surface is described under [Validation](#validation).

### Actions

| Type | Key props | Description |
|------|-----------|-------------|
| `button` | `label`, `action`, `validates`, `default`, `variant`, `size`, `icon` | `CoarButton` — calls the matching `actions` handler. Content-width by default; use `style.size: 'fill'` for a full-width button. `default: true` marks it as the [Enter-to-submit](#enter-to-submit) target. |
| `link` | `label`, `action` | Inline text link. Content-width by default. |

When `validates: true` on a button, clicking it validates all named fields before the action fires. The button **stays clickable while the form is invalid** — the click reveals the errors instead of firing the action. While a trigger is in flight (an async `onValidate` **or** an async action), the triggering button spins and every other action button and link disables; further clicks are ignored. See [Validation](#validation).

#### Action arguments

Buttons, links and consumer elements with `action: true` share one contract:

```ts
interface ActionProps {
  action?: string
  actionValues?: Record<string, unknown>
  actionValueField?: string
  actionValue?: unknown
}
```

All four fields are optional. `actionValues` is a JSON-safe key/value map. The
common Properties-panel editor accepts values such as `"de"`, `42`, `true`,
`null`, arrays and objects; every key has its own **fx** switch. A nested
binding such as `bindings["actionValues.language"]` replaces only that entry.
`actionValue` supplies the older single additional value under
`actionValueField` and remains supported.

The renderer builds a detached handler payload in this explicit order:

1. current named form values,
2. resolved `actionValues` (static defaults plus per-key bindings), overwriting colliding form keys,
3. the dynamic `actionValue`, overwriting a static entry with the same `actionValueField`.

This order is identical for click, link activation, Enter-to-submit and consumer action elements. Invalid non-JSON values never reach a handler; builder and activation validation report them as errors.

### Media

| Type | Props | Description |
|------|-------|-------------|
| `image` | `assetId`, `alt` | Resolved via `assetResolver` at render time. Raw URLs are not accepted. |

### Consumer elements

The element set is **open**: register your own element types via `config.elementTypes` (or app-wide via `PAGE_ELEMENT_TYPES_KEY`) and they render, join the value model and validate exactly like built-ins. Element renderers wire themselves through the `usePageElement()` context (`getValue` / `setValue` / `getError` / `markTouched` / `triggerAction` / `isValidating` / `isSubmitting` / `pendingAction` / `formError` / `resolveAsset` / `config`). See the [Custom elements guide](./custom-elements).

## Validation

Named fields validate against their declarative `validation` rules reactively, but errors only *show* once a field is **touched**:

- **text inputs** are touched on blur,
- **checkbox / select** are touched on change — choosing a value *is* the interaction, there is no meaningful blur moment,
- **clicking a `validates: true` button marks every named field touched at once.**

### Click reveals errors

A validating button is **not** disabled while the form is invalid. Clicking it with an invalid form marks all fields touched, reveals every error — including checkbox and select errors that have no blur moment — focuses and scrolls the **first invalid control** into view (off-screen errors must not make the click look dead), and does **not** run the action. A disabled button can't explain itself; a click can.

Buttons disable only while a trigger is genuinely in flight — an async `onValidate` or an async action. The triggering button shows a spinner; every other action button and link disables; repeated clicks are ignored (double-submit guard for validating and non-validating buttons alike).

### `pattern` semantics

`validation.pattern` is applied as a **full-string match** — the source is compiled as `^(?:pattern)$`, the same semantics as the HTML `pattern` attribute. An invalid pattern never crashes the page: it becomes an **inert rule** (the field passes) and the renderer logs one `console.warn` per distinct pattern.

### Email format

A `text-input` with `inputType: 'email'` validates the entered value against the WHATWG email pattern (`input[type=email]` constraint semantics, full string) **by default** — no hand-written `pattern` needed. The check skips empty values (`required` decides those) and uses the localized `coar.pageBuilder.validation.email` message. Since submission is JS-driven (there is no `<form>`), the browser's own constraint never fires — this host-side rule replaces it. It rides the `textRules` opt-in, so a consumer element with `textRules` and an `inputType` prop participates the same way.

### Submit-time `onValidate`

`onValidate` is the escape hatch for validation that can't be expressed declaratively — server checks, cross-field logic. Its contract:

1. Clicking a `validates: true` button marks all fields touched. If any **declarative** rule fails, the errors show, the first invalid control is focused, and nothing else happens.
2. Only when the declarative rules pass does `onValidate(values)` run. It may return the error map directly or a `Promise` of it; while a promise is pending, the triggering button spins and the other action buttons are disabled.
3. A non-empty result blocks the action: `{ fieldName: errorMessage }` entries show on their fields, the reserved **`_form`** key (exported as `FORM_ERROR_KEY`) shows in the [form-level banner](#async-actions-the-form-level-error-channel). Errors keyed to fields that cannot display (hidden by `visibleWhen`, renamed, never on the page) are routed to the banner too — a blocked submit is never invisible.
4. Editing a field clears that field's server error (and the form banner) immediately — a stale error never outlives the edit that addresses it.
5. If `onValidate` throws (or rejects), the action does not run, a localized generic message shows in the form banner, and the error is logged to the console.
6. An empty result lets the action fire — with **the exact snapshot `onValidate` approved** (edits made while an async `onValidate` was in flight never ship unvalidated; they need their own submit). A returned Promise is awaited.

`onValidate` does **not** run on keystrokes — it fires at submit time only.

```vue
<CoarPageRenderer
  :schema="schema"
  :actions="{ 'auth:login': (v) => auth.login(v) }"
  :on-validate="async (v) => {
    const taken = await api.isEmailTaken(v.email as string);
    return taken ? { email: 'This email is already registered' } : {};
  }"
/>
```

### Async actions & the form-level error channel

Real submits are API calls. An action handler may return a Promise — the renderer awaits it, keeps the whole form in its busy state (spinner on the triggering button, everything else disabled, reentry blocked) until it settles, and routes a **rejection** into the form-level error banner:

```ts
const actions = {
  'auth:login': async (v) => {
    const res = await api.login(v);
    // Throw an Error whose message is user-facing — it becomes the banner text.
    if (!res.ok) throw new Error('Invalid credentials');
  },
};
```

- An `Error`'s `message` is shown verbatim — that is the consumer's channel for user-facing failure text. Catch-and-rethrow if your transport errors ("Failed to fetch") shouldn't reach end users.
- Any other rejection shows the localized generic message (`coar.pageBuilder.formError.actionFailed`).
- The same banner shows the `_form` key of an `onValidate` result — for form-level *validation* outcomes like "Invalid credentials" from a validation endpoint.
- The banner clears on any field edit and at the start of every new trigger.

The default banner renders above the page (a `CoarNote` with `role="alert"`). Two ways to take over the presentation:

```vue
<!-- Replace the banner via the slot… -->
<CoarPageRenderer :schema="schema" :actions="actions">
  <template #form-error="{ error }">
    <MyToast v-if="error" :text="error" />
  </template>
</CoarPageRenderer>
```

…or render it **inside** the page (e.g. right above the submit button) with a small custom element reading `usePageElement().formError` — see [Custom elements](./custom-elements).

## Enter to submit

Enter-to-submit is double opt-in — the page and the element under the caret both agree:

1. The **page root** sets `enterSubmits: true` (a checkbox in the builder's Page section; default off).
2. The **element** declares Enter-eligibility in its definition (`value.submitOnEnter`). Built-ins: single-line `text-input` (`rows <= 1`), `password-input`, `number-input`. A multiline textarea, `select`s, `otp-input`, the date inputs (their picker panel uses Enter) and consumer elements that don't declare the flag never submit on Enter.

A plain Enter (no modifiers) inside an eligible input fires the page's **default button**: the first button with `default: true` (a checkbox in the button inspector; the lint warns when several buttons claim it), else the first `validates: true` button in tree order — with the full submit pipeline (validation, `onValidate`, busy state). Before triggering, the input is blurred so commit-on-blur controls (number input) flush the value the user sees. An Enter the element already consumed (`preventDefault`, e.g. inside a picker popover) and an IME composition-commit Enter never submit.

## Conditional visibility (`visibleWhen`)

Any node can declare a visibility condition against the **live value model** (host vocabulary — works on every element, containers and consumer elements included):

```jsonc
{
  "id": "company", "type": "text-input", "name": "companyName",
  "props": { "label": "Company name" },
  "validation": { "required": true },
  "visibleWhen": { "field": "isBusiness", "equals": true }
}
```

| Field | Meaning |
|-------|---------|
| `field` | Name of the controlling field (a named input on the page). |
| `equals` | Visible while the field's value equals this (JSON-safe values compare by **content**, arrays and objects included). |
| `in` | Visible while the field's value is one of these (array). |

The condition gates the node **and its whole subtree** — in rendering *and* in the value model, in the same walk as `allowedElements`:

- A hidden `required` field never vetoes a validating button.
- Hidden values never ship: action payloads, `onValidate` input, `update:values` and the exposed `values` all carry only the allowed and **visible** tree.
- Values typed before hiding are kept internally and return when the node is re-shown (so a mis-click doesn't wipe input) — they just don't leave the renderer while hidden.
- A malformed condition fails **open** (the node stays visible), and a condition on the **page root is ignored** (a page can never blank itself). The builder lint flags malformed conditions, references to fields that aren't on the page, and **circular chains** (a field whose visibility depends on itself or on a mutual loop — hidden controllers can't be edited, so such chains can lock each other hidden).

Authoring: the builder's **Visibility** section offers the controlling-field select and a typed `equals` editor (checked/unchecked for boolean controllers, the option list for choice controllers, free text otherwise); the `in` form is JSON-authorable. Conditional nodes carry an eye marker on the canvas — the canvas always *shows* them (it is an authoring surface); the Preview tab applies the real gating.

## Legacy schemas & normalization

The renderer migrates **on the fly**: legacy `column` / `row` containers become `stack` (with `direction: 'column'` / `'row'`), then v1 flat nodes (pre-GA grammar, element props directly on the node) get their `props` bag. Old saved schemas keep rendering without a round-trip through the builder. The migration happens at render time only and never mutates the schema object you passed in.

The builder goes further and normalizes at **every entry point** — the initial `v-model` value, external `v-model` replacement, and the JSON tab's Apply (which [gates on issue severity](./coar-page-builder#json-tab): errors block, warnings apply). The same helpers are exported for your own persistence layer:

```ts
import {
  normalizePageSchema,
  migrateLegacyTypes,
  migrateV1PropsBag,
  KNOWN_ELEMENT_TYPES,
} from '@cocoar/vue-page-builder';

const { schema, issues, changed } = normalizePageSchema(stored);
```

| Export | Description |
|--------|-------------|
| `normalizePageSchema(value)` | Returns `{ schema, issues, changed }`. Runs both migrations, then heals silently what has unambiguous intent: a non-`page` root (wrapped in a fresh page), missing `children` arrays, missing/duplicate/empty node ids (fresh UUIDs), missing `props` bags, numeric heading levels outside 1–6 (clamped), a missing/`1` `schemaVersion` (stamped `2`). Every `issue` carries a `severity`: **`error`** = data was dropped (non-object nodes — structurally broken input), **`warning`** = healed in place or lossless (unknown element types — kept in the tree, skipped at render time; non-array `children` or non-object `props` reset; non-numeric heading levels reset to 2; `children` on a non-container). |
| `migrateLegacyTypes(node)` | Just the `column`/`row` → `stack` mapping, recursive and identity-preserving when there is nothing to migrate. |
| `migrateV1PropsBag(node)` | The v1 → v2 wire-format migration: per node, a known element type without a `props` object gets its flat element props moved into a fresh bag. Idempotent and identity-preserving — safe to run unconditionally. |
| `KNOWN_ELEMENT_TYPES` | `ReadonlySet<string>` of the **built-in** element types. Consumer-registered keys are per-instance data (`config.elementTypes`) and deliberately not part of this module constant. |

## Security boundary

The renderer enforces these rules **regardless of what the schema contains**:

1. **Allowed elements** — `config.allowedElements` is the hard boundary (it takes built-in types and consumer-registered keys alike). Disallowed types are skipped at render time, with one console warning per type. The gate applies to the **value model** too: disallowed subtrees contribute no default values and cannot block validation — an invisible `required` field can never veto a validating button. Unregistered element types (typos, newer schema versions, consumer elements this instance hasn't registered) degrade the same lenient way: skipped with one warning per type, excluded from the value model, but **kept losslessly in the tree** — the builder [flags them as warnings on the canvas and in validation](./coar-page-builder) instead of destroying them.
2. **Actions** — every registry element with `action: true` stores an action `id`, an inert string. Only handlers present in the `actions` prop fire — any other action ID is a silent no-op. The one piece of tenant-authored logic the renderer evaluates is `validation.pattern`: a regex compiled safely (invalid = inert rule) and anchored — never executed as code.
3. **Reserved field names** — `__proto__`, `constructor` and `prototype` are excluded from the value model entirely (they would collide with `Object.prototype` machinery when used as map keys): such fields neither veto submission nor appear in payloads, and the builder lint flags them as errors.
4. **Images** — `image` nodes store an `assetId` reference, never a raw URL. The renderer always goes through `assetResolver` — which makes the resolver **your** part of the boundary: it decides what an id can reach. Validate or encode the id before building a URL, e.g. allowlist `/^[A-Za-z0-9_-]+$/` or `encodeURIComponent(id)`, so a crafted id like `../other-tenant/logo` cannot traverse out of the tenant's asset prefix.

See the [Security Model](./#security-model) section on the overview page for the full discussion.

## i18n Keys

The renderer's validation messages can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations) (a peer dependency — English fallbacks are built in). A field-level `validation.message` overrides all of them for that field.

| Key | Default (English) | Used when |
|-----|-------------------|-----------|
| `coar.pageBuilder.validation.required` | `'This field is required'` | `required` fails — value empty, unset, or unchecked |
| `coar.pageBuilder.validation.minLength` | `'Minimum {n} characters'` | text shorter than `minLength` — `{n}` = the limit |
| `coar.pageBuilder.validation.maxLength` | `'Maximum {n} characters'` | text longer than `maxLength` — `{n}` = the limit |
| `coar.pageBuilder.validation.pattern` | `'Invalid format'` | `pattern` full-string match fails |
| `coar.pageBuilder.validation.matchField` | `'Does not match'` | value differs from the referenced field |
| `coar.pageBuilder.validation.email` | `'Enter a valid email address'` | the [built-in email check](#email-format) fails on an `inputType: 'email'` field |
| `coar.pageBuilder.formError.actionFailed` | `'Something went wrong. Please try again.'` | an action rejects without an `Error` message, or `onValidate` throws |

## Pairing with the builder

The same `config` should be passed to both `<CoarPageBuilder>` and `<CoarPageRenderer>`. The builder uses it as UI affordance (palette filter, action dropdown, picker hook); the renderer uses it as the security boundary — and falls back to `config.assetResolver` when the `assetResolver` prop is absent, so handing the same object to both really is the whole wiring.

See the [integration walkthrough](./#complete-idp-integration-walkthrough) for the full builder + renderer wiring example.
