# Authoring contract

Every capability the renderer honours must be reachable from an authoring
surface. This page is the inventory: each part of the document grammar, the
surface that writes it, and — where a surface is missing — whether that is a
**named exception** or an **open gap**.

## The rules

1. **Nothing is JSON-only.** Every capability is reachable through Element Code
   / Page Code or a panel control. Editing raw JSON is a convenience, never a
   requirement.
2. **Nothing rewrites the document behind the author's back.** Problems are
   reported, not silently healed.
3. **Code is the truth.** Element Code, Page Code and Page State are the
   authored artifact; the document follows from them. A Quick Property is
   nothing but a fixed Element Code block — not editable as text, placed before
   the element's custom code, so custom code can override it. Quick Properties
   are a convenience for frequently-touched properties, not a second model.
4. **Renderer ⊆ Builder.** `CoarPageRenderer` supports exactly what the builder
   can write. It cannot do more than the editor can author.

An exception to any of these is legitimate **only if it is named on this
page**. An unnamed exception is a bug.

## Two modes, one of them on the way out

`authoringMode="properties"` is the **legacy** mode. It writes values directly
into the document (`node.style`, `node.props`, `node.visibleWhen`) through
per-element inspectors, a Style section, a Visibility section and a Field
section. It is scheduled for removal.

`authoringMode="code"` is the target. Everything is authored as code:

| Surface | Writes | Notes |
|---|---|---|
| **Element Code** | `props`, `style`, `responsive`, `validation`, `visibleWhen`, `bindings`, `defaultValue` | Computed per render. Cannot change `type` or `name`. |
| **Quick Properties** | locked assignments inside `elementCode`, ahead of the custom-code slot | Paths limited to `props.*`, `style.*`, `validation.*` |
| **Page Root Code** | `style`, `responsive`, `enterSubmits` on the root | |
| **Page Code / Page State** | shared state, repeat `items`, cross-element logic | |
| **Structure section** | `type` (representation switch), `name` (free or contract-bound) | Structural — deliberately not code |
| **Canvas / Outline** | `children`, tree order, `id` | Structural |
| **Logic tab** | `bindings`, expressions | |
| **Translations tab** | `translations` | |
| **JSON tab** | everything, as a paste-and-apply convenience | Never the only way |

The inventory below is written against the **target** state. Where a capability
today has only a legacy-mode control, that is called out — it is a gap that
opens the day properties mode is removed, not a gap you can see now.

## Node grammar

### Every node

| Field | Target-state surface |
|---|---|
| `id` | Canvas / Outline, builder-assigned — **named exception** |
| `style` | Element Code (`element.style`), Quick Properties for the common keys |
| `responsive` | Element Code (`element.responsive`) — **no Quick Property**, see gaps |
| `stylePreset` | **none** — see gaps. Legacy-only today. |
| `composition`, `compositionOrigins` | Compositions library — **named exception** |

`NodeStyle` in full: presentation (`surface`, `foreground`, `borderTone`,
`borderWidth`, `radius`, `elevation`), typography (`fontFamily`, `fontSize`,
`fontWeight`, `fontStyle`, `fontVariationSettings`, `lineHeight`,
`letterSpacing`, `textAlign`, `textDecoration`), layout (`gap`, `padding`,
`justify`, `align`, `direction`, `wrap`, `alignSelf`, `size`, `width`,
`minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`, `aspectRatio`,
`overflow`, `hidden`). All of it is writable from Element Code. Quick Properties
cover the layout subset plus `hidden`; the token-backed keys are deliberately
code-only, because they carry design-system semantics that a free-text field
would invite authors to bypass.

### Elements

| Field | Target-state surface |
|---|---|
| `type` | Palette; Structure section for a representation switch |
| `name` | Structure section (free text, or a select over the field contract) |
| `props` | Element Code; Quick Properties for the common ones |
| `defaultValue` | Element Code (`element.defaultValue`) — no Quick Property |
| `validation` | Element Code; Quick Property for `required` only |
| `bindings` | Logic tab and the per-property *fx* buttons; Element Code |
| `visibleWhen` | Element Code (`element.visibleWhen`), full grammar |
| `elementCode` | Element Code dialog |
| `children` | Canvas / Outline |

### Page root

| Field | Target-state surface |
|---|---|
| `enterSubmits` | Page Root Code (`page.enterSubmits`) |
| `style`, `responsive` | Page Root Code, Quick Properties |
| `pageCode`, `rootCode`, `stateCode` | Their own editors |
| `translations` | Translations tab |
| `children` | Canvas / Outline |
| `schemaVersion` | Builder-managed — **named exception** |
| `style.width`, `style.height` | Not authorable — **named exception** |

## Named exceptions

Each states what it costs.

### The page is exactly its host container

Size values on the page root are dropped, and the root offers no size fields.
The page is one element inside the host's viewport, and the host container owns
its box; `overflow` stays authorable and defaults to `auto`. The contract for
the host is that the container must have a determinable height — for `body`
that means `html, body { height: 100% }`.

**Cost:** a document cannot make itself taller than its host. That is the
intent: a page that fights its container breaks in every second embedding.

### Structure is not code

`type`, `name`, `id` and `children` are authored visually, never by Element
Code — the runtime patch deliberately drops them. A program that could rename
or retype its own node would break every binding and Page Code reference that
points at it, at render time, with no way for the builder to see it coming.

**Cost:** generating elements from data is not possible per element. The
`repeat` element covers the case that motivates it.

### Identity is builder-managed

`id` is a UUID the builder assigns; `schemaVersion` is the wire format. A
hand-picked id collides, and a hand-picked version lies about the shape of the
document.

**Cost:** none for authors. Existing ids are preserved — the builder only
assigns missing ones.

### Composition metadata is repository-owned

`composition` and `compositionOrigins` record which reusable definition a
subtree came from and at which pinned version. Written by the Compositions
library, stripped by `compilePageCompositions()` before runtime delivery, never
hand-edited.

**Cost:** hand-editing them detaches an instance from its definition. The
builder then treats the subtree as ordinary nodes.

### Legacy ingest may rewrite the document

A document from an older `schemaVersion` is migrated on entry. This is the one
place where rule 2 does not hold, and it is bounded to documents the current
builder could not otherwise open.

**Cost:** a v1–v4 document saved by this builder comes back as v5. Round-trips
within one version rewrite nothing.

### Token-backed style keys are code-only

`surface`, `radius`, `elevation` and the typography keys have no Quick
Property. They carry design-system semantics, and a quick field next to the
canvas invites authors to reach for them instead of a style preset.

**Cost:** changing a card's surface needs the code editor. Deliberate friction.

## Open gaps

These violate the rules and are not exceptions.

### Blocking the removal of properties mode

| Gap | Evidence | Consequence |
|---|---|---|
| `stylePreset` has no code-mode surface at all | Element Code's returned patch covers `props`, `style`, `responsive`, `validation`, `visibleWhen`, `bindings`, `defaultValue` — not `stylePreset`. Its only control is the legacy Style section. | Style presets become unauthorable the day properties mode is removed. Either the code patch accepts `stylePreset`, or it needs a structural control. |
| `visibleWhen` has no code-mode control | The Visibility section is legacy-only | Conditions become text-only. Acceptable under rule 1, but it is the single most-used non-style property. |
| Element inspectors are legacy-only | Only `visual-markup` sets `inspectorInCodeMode` | Every per-element prop not covered by a Quick Property becomes text-only: `heading.level`, `note.variant`, `otp.length`, `select.options`, `button.icon`/`validates`/`default`, `image.alt`/`assetId`, `repeat.*`, action wiring. |

### Renderer beyond the builder

| Gap | Evidence | Consequence |
|---|---|---|
| `repeat.maxItems` is not authorable anywhere | Renderer clamps to it (default 100, ceiling 500); no inspector field | A list longer than 100 items truncates and the author cannot say otherwise |
| `repeat.itemAlias` is not authorable | Only read, to label the binding picker | Cosmetic; the alias is stuck at its default |
| `feedback.emptyText` exists in the schema and nothing reads it | Neither renderer nor inspector | Dead field: implement it or remove it |

### Rule 2

| Gap | Evidence |
|---|---|
| Normalization heals instead of reporting | Duplicate names renamed, ids reassigned, heading levels clamped, legacy containers converted, non-object children dropped — on `v-model` assignment, initial value and JSON apply alike |

### Legacy-mode wording, dying with the mode

The Visibility section tells the author to "edit it in the JSON tab" for an
`in` condition and for an `equals` against a multi-value field, and its operator
list omits `in` / `notIn` although `conditions.ts` evaluates both. All three
live only in properties mode. They are wrong today — Element Code expresses all
of it — but they disappear with the mode rather than needing their own fix.
