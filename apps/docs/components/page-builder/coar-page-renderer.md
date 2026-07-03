# `<CoarPageRenderer>`

The runtime-renderer half of `@cocoar/vue-page-builder`. Takes a `PageNode` schema (produced by [`<CoarPageBuilder>`](./coar-page-builder) or written by hand) and renders it as live Cocoar components. This is the component you mount on the actual page that end-users see.

The renderer is also the **security boundary** — elements not in `config.allowedElements` are skipped at render time, even if they appear in hand-written or tampered JSON.

::: tip Stylesheet
Import `@cocoar/vue-page-builder/styles` once in your app — the renderer's layout styles (stack flexbox, section/card spacing) live there too, not just the builder chrome.
:::

## Props

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `PageNode` | Required. The page schema to render. Legacy `column`/`row` containers are [migrated to `stack` on the fly](#legacy-schemas-normalization). |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | Security/allowlist boundary. Elements not in `config.allowedElements` are skipped at render time (with one console warning per type) **and excluded from the value model**. Also supplies the `assetResolver` fallback. |
| `actions` | `Record<string, (values: ActionValues) => void>` | Map of action IDs to handler functions. Buttons and links call these. |
| `onValidate` | `(values: ActionValues) => Record<string, string> \| Promise<Record<string, string>>` | Developer-only cross-field/server validation. Runs at **submit time** — when a `validates: true` button is clicked and after all declarative rules pass. May be sync or async; returns `{ fieldName: errorMessage }`. A non-empty result blocks the action. Not exposed in builder UI. See [Validation](#validation). |
| `assetResolver` | `(id: string) => string` | Resolves an `assetId` to a URL at render time. Falls back to `config.assetResolver` when not set. Needed when the schema contains `image` nodes. |

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

`ActionValues` is `Record<string, unknown>` — a flat map of all named fields at the time the action fires. Fields are collected from `text-input`, `checkbox`, and `select` nodes that have a `name` property: text inputs contribute strings, checkboxes booleans, selects the chosen option's `value`. Hand-written schemas carry no hard type guarantee, so narrow the values in your handler.

## JSON Schema

Every node shares a common base:

```ts
interface PageNode {
  id:        string      // stable UUID (crypto.randomUUID), assigned by the builder
  type:      ElementType
  style?:    NodeStyle
  children?: PageNode[]  // containers only
  // ...element-specific props
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

The `page` root additionally carries `schemaVersion?: number` — the wire-format version, reserved for a future migration framework. The builder stamps `1` on new and normalized roots; the renderer tolerates and preserves it. An absent `schemaVersion` marks a pre-versioning document and renders the same.

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
  "schemaVersion": 1,
  "style": { "minHeight": "100vh", "justify": "center", "align": "center", "padding": "48px" },
  "children": [
    {
      "id": "n1",
      "type": "card",
      "style": { "size": "fixed", "width": "400px", "gap": "16px" },
      "children": [
        { "id": "n2", "type": "image",      "assetId": "logo-primary", "alt": "Acme logo" },
        { "id": "n3", "type": "heading",    "text": "Welcome back",  "level": 1 },
        { "id": "n4", "type": "text-input", "label": "Email",    "name": "email",    "inputType": "email",
          "validation": { "required": true } },
        { "id": "n5", "type": "text-input", "label": "Password", "name": "password", "inputType": "password",
          "validation": { "required": true, "minLength": 8 } },
        { "id": "n6", "type": "checkbox",   "label": "Remember me", "name": "rememberMe", "defaultValue": false },
        { "id": "n7", "type": "button",     "label": "Sign in", "action": "auth:login", "validates": true, "style": { "size": "fill" } },
        { "id": "n8", "type": "link",       "label": "Forgot password?", "action": "auth:forgot-password" }
      ]
    }
  ]
}
```

### Try it live

The same card rendered live (logo omitted). Email is `required` + `inputType: 'email'`, password is `required` + `minLength: 8`, and the Sign-in button `validates`. Click it with empty fields — the click marks every field touched and reveals all errors at once; once the form is valid, the action receives the `ActionValues` and writes them below the card.

<preview path="./demos/RendererLoginCard.vue" />

## Built-in Elements

### Containers

| Type | Description |
|------|-------------|
| `page` | Root container. Always column-direction. |
| `stack` | Generic flex container with toggleable `direction` (`column` \| `row`). Optional `wrap` for row-direction stacks. |
| `card` | `CoarCard` wrapper with optional `title` |
| `section` | Semantic section with optional `title` heading |
| `divider` | Visual separator (`CoarDivider`) |
| `spacer` | Empty space — `flex: 1` (fills available space) unless `size` is set |

### Typography

| Type | Props | Description |
|------|-------|-------------|
| `heading` | `text`, `level` (1–6) | H1–H6 heading |
| `paragraph` | `text` | Body text block |

### Inputs

| Type | Key props | Cocoar component |
|------|-----------|-----------------|
| `text-input` | `label`, `name`, `inputType`, `placeholder`, `defaultValue`, `validation` | `CoarTextInput` / `CoarPasswordInput` |
| `checkbox` | `label`, `name`, `defaultValue`, `validation` | `CoarCheckbox` |
| `select` | `label`, `name`, `options`, `placeholder`, `defaultValue`, `validation` | `CoarSelect` |

All three support `name` (wires the value into `ActionValues`), `defaultValue`, `disabled`, and `validation`. Fields with `validation.required` get the `*` marker via `CoarFormField`.

#### `inputType`

`text-input` maps its `inputType` onto the right control and autocomplete hints:

| `inputType` | Renders | Autocomplete |
|-------------|---------|--------------|
| `'text'` (default) | `CoarTextInput` with `type="text"` | — |
| `'email'` | `CoarTextInput` with `type="email"` | `autocomplete="email"` |
| `'url'` | `CoarTextInput` with `type="url"` | `autocomplete="url"` |
| `'password'` | `CoarPasswordInput` (masked) | — |

#### Declarative rules

Rules live on the node's `validation` property:

```ts
interface FieldValidation {
  required?:   boolean
  minLength?:  number     // text-input only
  maxLength?:  number     // text-input only
  pattern?:    string     // text-input only; regex source applied as full-string match
  matchField?: string     // value must equal this other named field's value (text-input only)
  message?:    string     // custom error message — overrides defaults
}
```

`checkbox` and `select` accept only the `required` rule. How and when errors surface is described under [Validation](#validation).

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

The renderer migrates legacy `column` / `row` containers to `stack` (with `direction: 'column'` / `'row'`) **on the fly** — schemas saved before the stack model still render. The migration happens at render time only and never mutates the schema object you passed in.

The builder goes further and normalizes at **every entry point** — the initial `v-model` value, external `v-model` replacement, and the JSON tab's Apply (which [rejects structurally broken input outright](./coar-page-builder)). The same helpers are exported for your own persistence layer:

```ts
import {
  normalizePageSchema,
  migrateLegacyTypes,
  KNOWN_ELEMENT_TYPES,
} from '@cocoar/vue-page-builder';

const { schema, issues, changed } = normalizePageSchema(stored);
```

| Export | Description |
|--------|-------------|
| `normalizePageSchema(value)` | Returns `{ schema, issues, changed }`. Heals silently what has unambiguous intent: legacy `column`/`row` types, a non-`page` root (wrapped in a fresh page), missing `children` arrays, missing/duplicate/empty node ids (fresh UUIDs), numeric heading levels outside 1–6 (clamped), a missing `schemaVersion` (stamped `1`). Reports as `issues` what needs an author: non-object nodes (dropped), unknown element types (kept — the renderer skips them anyway), non-array `children` (reset to `[]`), non-numeric heading levels (reset to 2), `children` on a non-container. |
| `migrateLegacyTypes(node)` | Just the `column`/`row` → `stack` mapping, recursive and identity-preserving when there is nothing to migrate. |
| `KNOWN_ELEMENT_TYPES` | `ReadonlySet<string>` of every element type this version of the package knows. |

## Security boundary

The renderer enforces these rules **regardless of what the schema contains**:

1. **Allowed elements** — `config.allowedElements` is the hard boundary. Disallowed types are skipped at render time, with one console warning per type. The gate applies to the **value model** too: disallowed subtrees contribute no default values and cannot block validation — an invisible `required` field can never veto a validating button. Unknown element types (typos, newer schema versions) are skipped the same way; the builder additionally [reports them as validation errors and flags them on the canvas](./coar-page-builder).
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
