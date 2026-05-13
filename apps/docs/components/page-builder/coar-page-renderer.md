# `<CoarPageRenderer>` <Badge type="warning" text="Preview" />

The runtime-renderer half of `@cocoar/vue-page-builder`. Takes a `PageNode` schema (produced by [`<CoarPageBuilder>`](./coar-page-builder) or written by hand) and renders it as live Cocoar components. This is the component you mount on the actual page that end-users see.

The renderer is also the **security boundary** — elements not in `config.allowedElements` are skipped at render time, even if they appear in hand-written or tampered JSON.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `PageNode` | Required. The page schema to render. |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | Security/allowlist boundary. Elements not in `config.allowedElements` are skipped at render time (with one console warning per type). |
| `actions` | `Record<string, (values: ActionValues) => void>` | Map of action IDs to handler functions. Buttons and links call these. |
| `onValidate` | `(values: ActionValues) => Promise<Record<string, string>>` | Developer-only async/cross-field validation. Returns `{ fieldName: errorMessage }`. Not exposed in builder UI. |
| `assetResolver` | `(id: string) => string` | Resolves an `assetId` to a URL at render time. Required when the schema contains `image` nodes. |

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
  :asset-resolver="(id) => `/tenant/${tenantId}/assets/${id}`"
/>
```

`ActionValues` is `Record<string, string | boolean>` — a flat map of all named fields at the time the action fires. Fields are collected from `text-input`, `checkbox`, and `select` nodes that have a `name` property.

## JSON Schema

Every node shares a common base:

```ts
interface PageNode {
  id:        string      // stable UUID, assigned by the builder
  type:      ElementType
  style?:    NodeStyle
  children?: PageNode[]  // containers only
  // ...element-specific props
}

interface NodeStyle {
  gap?:     string   // CSS value — '8px', '1rem', …
  padding?: string
  width?:   string   // '380px', '100%', …
  align?:   'start' | 'center' | 'end' | 'stretch'
}
```

### Layout behaviour

- **page** — the schema root. Behaves like a vertical stack and is the only element that can sit at the top of the tree.
- **stack** — generic flex container. `direction: 'column' | 'row'` (default `column`). When direction is `'row'`, children get `flex: 1` by default so they share available width equally — set `style.width` on a child to opt out.
- **card** — `CoarCard` wrapper, optional `title`. Children are stacked vertically inside.
- **section** — semantic `<section>` with optional `title` heading.

### Example — login page

```json
{
  "id": "root",
  "type": "page",
  "style": { "align": "center", "padding": "48px" },
  "children": [
    {
      "id": "n1",
      "type": "card",
      "style": { "width": "400px", "gap": "16px" },
      "children": [
        { "id": "n2", "type": "image",      "assetId": "logo-primary", "alt": "Acme logo" },
        { "id": "n3", "type": "heading",    "text": "Welcome back",  "level": 1 },
        { "id": "n4", "type": "text-input", "label": "Email",    "name": "email",    "inputType": "email"    },
        { "id": "n5", "type": "text-input", "label": "Password", "name": "password", "inputType": "password" },
        { "id": "n6", "type": "checkbox",   "label": "Remember me", "name": "rememberMe" },
        { "id": "n7", "type": "button",     "label": "Sign in", "action": "auth:login", "validates": true, "style": { "width": "100%" } },
        { "id": "n8", "type": "link",       "label": "Forgot password?", "action": "auth:forgot-password" }
      ]
    }
  ]
}
```

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
| `text-input` | `label`, `name`, `inputType`, `placeholder`, `validation` | `CoarTextInput` / `CoarPasswordInput` |
| `checkbox` | `label`, `name`, `validation` | `CoarCheckbox` |
| `select` | `label`, `name`, `options`, `placeholder` | `CoarSelect` |

All three support `name` (wires the value into `ActionValues`), `disabled`, and `validation`.

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

### Actions

| Type | Key props | Description |
|------|-----------|-------------|
| `button` | `label`, `action`, `validates`, `variant`, `size`, `icon` | `CoarButton` — calls the matching `actions` handler. Defaults to content width; set `style.width: '100%'` for full-width buttons. |
| `link` | `label`, `action` | Inline text link. Defaults to content width. |

When `validates: true` on a button, all named fields are validated before the action fires. The button is disabled while any field is invalid.

### Media

| Type | Props | Description |
|------|-------|-------------|
| `image` | `assetId`, `alt` | Resolved via `assetResolver` at render time. Raw URLs are not accepted. |

## Security boundary

The renderer enforces three rules **regardless of what the schema contains**:

1. **Allowed elements** — `config.allowedElements` is the hard boundary. Disallowed types are skipped silently (with one console warning per type).
2. **Actions** — buttons and links store an action `id`. Only handlers present in the `actions` prop fire — any other action ID is a silent no-op. Arbitrary JavaScript is never stored in the schema.
3. **Images** — `image` nodes store an `assetId` reference, never a raw URL. The renderer always goes through `assetResolver`. Tenants cannot reference external domains.

See the [Security Model](./#security-model) section on the overview page for the full discussion.

## Pairing with the builder

The same `config` should be passed to both `<CoarPageBuilder>` and `<CoarPageRenderer>`. The builder uses it as UI affordance (palette filter, action dropdown, picker hook); the renderer uses it as the security boundary. Putting the SAME object in both keeps "what tenants can author" and "what gets rendered" in sync.

See the [integration walkthrough](./#complete-idp-integration-walkthrough) for the full builder + renderer wiring example.
