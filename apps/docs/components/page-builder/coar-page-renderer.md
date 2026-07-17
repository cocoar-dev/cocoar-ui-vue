# `<CoarPageRenderer>`

The runtime-renderer half of `@cocoar/vue-page-builder`. Takes a `PageNode` schema (produced by [`<CoarPageBuilder>`](./coar-page-builder) or written by hand) and renders it as live Cocoar components. This is the component you mount on the actual page that end-users see.

The renderer is also the **security boundary** — elements not in `config.allowedElements` are skipped at render time, even if they appear in hand-written or tampered JSON.

::: tip Stylesheet
Import `@cocoar/vue-page-builder/styles` once in your app — the renderer's layout styles (stack flexbox, section/card spacing) live there too, not just the builder chrome.
:::

## Props

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `PageNode` | Required. The page schema to render. Legacy `column`/`row` containers and v1 flat documents are [migrated on the fly](#legacy-schemas-normalization). |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | Security/allowlist boundary. Elements not in `config.allowedElements` are skipped at render time (with one console warning per type) **and excluded from the value model**. Also supplies the `assetResolver` fallback and the [consumer element registrations](./custom-elements) (`config.elements`). |
| `actions` | `Record<string, (values: ActionValues) => void>` | Map of action IDs to handler functions. Buttons and links call these. |
| `onValidate` | `(values: ActionValues) => Record<string, string> \| Promise<Record<string, string>>` | Developer-only cross-field/server validation. Runs at **submit time** — when a `validates: true` button is clicked and after all declarative rules pass. May be sync or async; returns `{ fieldName: errorMessage }`. A non-empty result blocks the action. Not exposed in builder UI. See [Validation](#validation). |
| `assetResolver` | `(id: string) => string` | Resolves an `assetId` to a URL at render time. Falls back to `config.assetResolver` when not set. Needed when the schema contains `image` nodes. |
| `initialValues` | `ActionValues` | Host-supplied field values for edit-form scenarios, merged **over** the schema's `defaultValue`s on init. Only keys that match a **named** input in the (allowed) tree are taken — stray host data never leaks into the action payload. Replacing the object re-initializes the form, like a schema change. |

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

`ActionValues` is `Record<string, unknown>` — a flat map of all named fields at the time the action fires. Every input element with a `name` property contributes its value: text/otp/date inputs and selects contribute **strings** (dates as ISO strings), `number-input` a **number**, `checkbox`/`switch` **booleans**, `multi-select` a **string array**. Hand-written schemas carry no hard type guarantee, so narrow the values in your handler.

To prefill a form (edit scenarios), pass `initialValues` — the values seed **over** the schema defaults, filtered to the named fields that actually exist in the allowed tree:

```vue
<CoarPageRenderer
  :schema="profileSchema"
  :actions="{ 'profile:save': (v) => api.save(v) }"
  :initial-values="{ email: user.email, newsletter: true }"
/>
```

## JSON Schema

One node grammar for every element (wire-format **v2**): the host vocabulary lives at node level, everything element-specific lives in the `props` bag.

```ts
interface ElementNode {
  id:            string                   // stable UUID (crypto.randomUUID), assigned by the builder
  type:          string                   // element-registry key — a built-in type or a consumer key
  props:         Record<string, unknown>  // element-specific props (JSON-safe bag)
  style?:        NodeStyle

  // Value-model trio — meaningful when the element's definition declares `value`:
  name?:         string
  defaultValue?: unknown
  validation?:   FieldValidation

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
  minHeight?: string   // 'min-height' — e.g. '100vh' to make the page fill the viewport
}
```

The root is the one node shape outside the element grammar: `{ id, type: 'page', schemaVersion, style?, children }` — a schema-shape marker, not a placeable element, with no props bag. It carries `schemaVersion?: number`, the wire-format version: **`2`** is the current props-bag grammar, stamped by the builder on new and normalized roots. `1` or absent marks the pre-GA **flat** grammar (element props directly on the node); such documents are [migrated transparently on every ingest path](#legacy-schemas-normalization) — by the builder/`normalizePageSchema` persistently, and by the renderer on the fly.

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

The renderer adds no box of its own (`display: contents`), so the `page` node sits directly inside whatever element you mount `<CoarPageRenderer>` in — that **host provides the width**. To center content on a full-screen page (the classic login card), size the `page` itself:

```json
{ "type": "page", "style": { "minHeight": "100vh", "justify": "center", "align": "center" } }
```

`minHeight: '100vh'` makes the page fill the viewport; `justify: 'center'` centers vertically (a column's main axis is vertical) and `align: 'center'` centers horizontally — no host CSS required beyond the host having its natural width.

### Example — login page

```json
{
  "id": "root",
  "type": "page",
  "schemaVersion": 2,
  "style": { "minHeight": "100vh", "justify": "center", "align": "center", "padding": "48px" },
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
| `radio-group` | `label`, `options`, `orientation`, `disabled` | `string` | `CoarRadioGroup` + `CoarRadioButton` |
| `select` | `label`, `options`, `placeholder`, `disabled` | `string` | `CoarSelect` |
| `multi-select` | `label`, `options`, `placeholder`, `disabled` | `string[]` | `CoarMultiSelect` |
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
| `button` | `label`, `action`, `validates`, `variant`, `size`, `icon` | `CoarButton` — calls the matching `actions` handler. Content-width by default; use `style.size: 'fill'` for a full-width button. |
| `link` | `label`, `action` | Inline text link. Content-width by default. |

When `validates: true` on a button, clicking it validates all named fields before the action fires. The button **stays clickable while the form is invalid** — the click reveals the errors instead of firing the action. It only disables while an async `onValidate` is in flight. See [Validation](#validation).

### Media

| Type | Props | Description |
|------|-------|-------------|
| `image` | `assetId`, `alt` | Resolved via `assetResolver` at render time. Raw URLs are not accepted. |

### Consumer elements

The element set is **open**: register your own element types via `config.elements` (or app-wide via `PAGE_ELEMENTS_KEY`) and they render, join the value model and validate exactly like built-ins. Element renderers wire themselves through the `usePageElement()` context (`getValue` / `setValue` / `getError` / `markTouched` / `triggerAction` / `resolveAsset`). See the [Custom elements guide](./custom-elements).

## Validation

Named fields validate against their declarative `validation` rules reactively, but errors only *show* once a field is **touched**:

- **text inputs** are touched on blur,
- **checkbox / select** are touched on change — choosing a value *is* the interaction, there is no meaningful blur moment,
- **clicking a `validates: true` button marks every named field touched at once.**

### Click reveals errors

A validating button is **not** disabled while the form is invalid. Clicking it with an invalid form marks all fields touched, reveals every error — including checkbox and select errors that have no blur moment — and does **not** run the action. A disabled button can't explain itself; a click can.

The only time a validating button disables is while an async `onValidate` is in flight, to block double-submits.

### `pattern` semantics

`validation.pattern` is applied as a **full-string match** — the source is compiled as `^(?:pattern)$`, the same semantics as the HTML `pattern` attribute. An invalid pattern never crashes the page: it becomes an **inert rule** (the field passes) and the renderer logs one `console.warn` per distinct pattern.

### Submit-time `onValidate`

`onValidate` is the escape hatch for validation that can't be expressed declaratively — server checks, cross-field logic. Its contract:

1. Clicking a `validates: true` button marks all fields touched. If any **declarative** rule fails, the errors show and nothing else happens.
2. Only when the declarative rules pass does `onValidate(values)` run. It may return the error map directly or a `Promise` of it; while a promise is pending, validating buttons are disabled.
3. A non-empty result (`{ fieldName: errorMessage }`) blocks the action and shows each message on its field.
4. Editing a field clears that field's server error immediately — a stale error never outlives the edit that addresses it.
5. If `onValidate` throws (or rejects), the action does not run and the error is logged to the console.
6. An empty result lets the action fire: `actions[id](values)`.

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
| `KNOWN_ELEMENT_TYPES` | `ReadonlySet<string>` of the **built-in** element types. Consumer-registered keys are per-instance data (`config.elements`) and deliberately not part of this module constant. |

## Security boundary

The renderer enforces these rules **regardless of what the schema contains**:

1. **Allowed elements** — `config.allowedElements` is the hard boundary (it takes built-in types and consumer-registered keys alike). Disallowed types are skipped at render time, with one console warning per type. The gate applies to the **value model** too: disallowed subtrees contribute no default values and cannot block validation — an invisible `required` field can never veto a validating button. Unregistered element types (typos, newer schema versions, consumer elements this instance hasn't registered) degrade the same lenient way: skipped with one warning per type, excluded from the value model, but **kept losslessly in the tree** — the builder [flags them as warnings on the canvas and in validation](./coar-page-builder) instead of destroying them.
2. **Actions** — buttons and links store an action `id`, an inert string. Only handlers present in the `actions` prop fire — any other action ID is a silent no-op. The one piece of tenant-authored logic the renderer evaluates is `validation.pattern`: a regex compiled safely (invalid = inert rule) and anchored — never executed as code.
3. **Images** — `image` nodes store an `assetId` reference, never a raw URL. The renderer always goes through `assetResolver` — which makes the resolver **your** part of the boundary: it decides what an id can reach. Validate or encode the id before building a URL, e.g. allowlist `/^[A-Za-z0-9_-]+$/` or `encodeURIComponent(id)`, so a crafted id like `../other-tenant/logo` cannot traverse out of the tenant's asset prefix.

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

## Pairing with the builder

The same `config` should be passed to both `<CoarPageBuilder>` and `<CoarPageRenderer>`. The builder uses it as UI affordance (palette filter, action dropdown, picker hook); the renderer uses it as the security boundary — and falls back to `config.assetResolver` when the `assetResolver` prop is absent, so handing the same object to both really is the whole wiring.

See the [integration walkthrough](./#complete-idp-integration-walkthrough) for the full builder + renderer wiring example.
