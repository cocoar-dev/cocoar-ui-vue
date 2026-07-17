# `<CoarPageBuilder>`

The visual-editor half of `@cocoar/vue-page-builder`. Renders a three-panel layout — outline tree on the left, canvas with palette in the centre, properties panel on the right — and emits a `PageNode` JSON tree as `v-model`. The same tree is consumed by [`<CoarPageRenderer>`](./coar-page-renderer) at runtime.

All three panels are resizable via drag handles and collapsible.

::: tip Stylesheet
Import `@cocoar/vue-page-builder/styles` once in your app — it carries the entire builder chrome (panels, canvas, palette). Without it the builder renders unstyled.
:::

## Playground

A live builder with a small starting schema and a restricted `allowedElements` list — note that the palette and the outline's "Add child" menu only offer the permitted types. Drag palette cards onto the canvas, reorder rows in the outline via their grip handles, and try `Ctrl+Z` after an edit. The builder fills its host element, so give it a bounded height.

<preview path="./demos/BuilderPlayground.vue" />

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` / `v-model` | `PageNode` | empty `page` | The page schema. Bound two-way; every edit updates the ref. Every tree entering from **outside** — the initial value, a later external replacement, or an initially-`undefined` ref that is filled once an async load resolves — passes through the same normalization as the JSON tab's Apply: legacy `column`/`row` containers become `stack`, v1 flat documents get their `props` bags, a non-`page` root is wrapped in one, missing/duplicate node ids are repaired with fresh `crypto.randomUUID` ids, missing `children` arrays and `props` bags are added, and the root is stamped `schemaVersion: 2`. Repairs log a DEV-only console warning. |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | — | Allowed elements, [consumer element registrations](./custom-elements), available actions, asset callbacks. The same value must be passed to the renderer. |

## Features

- **Palette toolbar** — drag containers (Stack, Card, Section) and elements onto the canvas. Entries derive from the merged element registry — built-ins plus anything registered via [`config.elements`](./custom-elements) — filtered by `config.allowedElements` (types not in the list are hidden). With a [field contract](./#field-contract) (`config.fields`) a third group, **Fields**, offers one draggable card per contract field (type icon, `*` for required, greyed out once its name is bound anywhere on the page); dropping a card creates the field's default element pre-bound.
- **Pointer-based drag & drop** — built on pointer events rather than HTML5 drag events, so it works with mouse, touch **and** pen (tablet-first). Mouse drags start after a 5 px movement threshold, so plain clicks keep working; touch/pen drags arm after a 300 ms long-press. A ghost preview follows the pointer, scroll containers auto-scroll near their edges, and `Escape` cancels a drag in flight.
- **Outline tree** — hierarchical node list with selection and real drag-to-reorder: every row except the root carries a grip handle, thin drop bars light up between rows while dragging, and container rows highlight for drop-**into**. Per-row actions: move up/down, duplicate, delete, plus an inline "Add child" menu. Stacks display "Column" or "Row" based on direction. Warning icons mark nodes with validation issues (hover for the full message).
- **Canvas** — per-element preview components with dashed selection borders; each node's type tab doubles as its drag handle. A registered element without its own preview renders as a neutral icon+label chip; unregistered or disallowed element types get a red "skipped at runtime" treatment, so the canvas never pretends the runtime renderer will show them. Switches to live preview in the **Preview** tab and to a paste-and-apply JSON editor in the **JSON** tab.
- **Properties panel** — resolved from the element registry: each definition ships its own inspector component. Value-producing elements additionally get a host-owned **Field** section (field name, Required, default value — with a per-element default-value editor when the definition provides one, e.g. "Checked by default" for checkboxes). With a [field contract](./#field-contract), the field-name input becomes a select over the contract fields the element can edit (clearing it unbinds; binding carries the contract label and required along), an **Element** select switches the node to another representation of the same field, and `allowCustomFields` adds a free-text custom-name input. Validation issues for the selected node are surfaced at the top with colored banners. Option-based inputs share an **options editor** (add / remove / reorder options; a removed option clears a default that pointed at it).
- **Duplicate** — available as an outline row action and a canvas button. Deep-clones the subtree with fresh ids on every node; colliding field names are flagged by the duplicate-name validation.
- **Stack direction toggle** — change a stack from column to row direction without re-creating it. Children stay put.
- **Layout controls** — every node's Style section exposes the flex model: container `Justify` (main axis) + `Align items` (cross axis), and per-node `Align self`, `Size` (Fit / Fill / Fixed → Width) and `Min height`. Center a single element, distribute a row, or build a full-screen centered page — and the Editor canvas mirrors the result 1:1 with the Preview.
- **Asset picker entry point** — when `config.pickAsset` is set, the image element shows a thumbnail + "Choose…" button that defers to your own picker UI.
- **Responsive preview** — Desktop · Tablet · 768 · Mobile · 375 segmented toggle in the Preview tab. The render area is capped and centered so you can verify the design at common breakpoints.
- **Undo / redo** — `Ctrl+Z` / `Ctrl+Y` (or `Cmd+Z` / `Cmd+Shift+Z`), also via toolbar buttons.
- **Scoped keyboard shortcuts** — undo/redo and `Delete` / `Backspace` (removes the selected node) only act while focus is inside *that builder instance*, and never while focus is in an editable target: the JSON textarea, props-panel inputs and your app's own form fields keep their native undo and delete behavior.
- **Keyboard navigation** — the outline is an ARIA tree (`role="tree"` / `role="treeitem"` with `aria-level`, `aria-selected`, `aria-expanded`) with a roving tabindex: `Arrow Up` / `Arrow Down` / `Home` / `End` move focus, `Enter` / `Space` selects the focused row. Canvas nodes are focusable too; `Enter` / `Space` selects the focused node.

## JSON tab

The JSON tab shows the current schema and lets you paste and **Apply** a replacement. Apply is gated by **issue severity** — the pasted tree runs through the same normalization pass the v-model entry points use:

- **Errors block Apply** — structural damage where data would be dropped: non-object nodes (and non-JSON input). The inline message lists what is wrong; nothing reaches the working tree (or, through `v-model`, your storage).
- **Warnings apply anyway** and are surfaced next to the Apply button: everything healed in place or lossless — legacy `column` / `row` containers (→ `stack`), v1 flat nodes (→ `props` bags), a non-`page` root (wrapped in a `page`), missing or duplicate node ids (fresh ids), missing or non-object `props` bags, out-of-range or non-numeric heading levels, non-array `children` (reset), `children` on a non-container, and **unknown element types**.

Unknown element types are deliberately *not* rejected: a document from a newer library version — or one using [consumer elements](./custom-elements) this instance hasn't registered — stays pasteable and round-trips **losslessly** (the nodes stay in the tree; the runtime renderer skips them with one console warning per type).

A successful Apply lands as a single undoable step; when there were no findings at all, the builder switches back to the Editor tab.

::: info Exported helpers
The same machinery is exported for hosts that persist or migrate schemas themselves: `normalizePageSchema(value)` → `{ schema, issues, changed }` (issues carry `severity: 'error' | 'warning'`), `migrateLegacyTypes(node)`, `migrateV1PropsBag(node)`, and the `KNOWN_ELEMENT_TYPES` set (built-ins only). See [Legacy schemas & normalization](./coar-page-renderer#legacy-schemas-normalization).
:::

## Builder-side validation

The builder runs schema-level validation reactively and surfaces issues at two layers:

- **Outline** — a warning icon next to the affected node row (red ⛔ for errors, yellow ⚠ for warnings). Hover the icon for the full message.
- **Props panel** — a colored banner at the top of the selected node's properties listing every issue for that node.

Built-in rules:

| Rule | Severity |
|------|----------|
| Element type is not registered (skipped at runtime, but kept losslessly in the tree) | warning |
| Type not in `config.allowedElements` (skipped at render time) | error |
| Button / link has no Action | warning |
| Action ID is not in `config.availableActions` (only checked when that list is non-empty) | warning |
| `validation.pattern` does not compile as a regular expression | error |
| Image has no Asset ID | error |
| Two named inputs share the same `name` | error |
| Bound field name is not in the [field contract](./#field-contract) (`config.fields` set, `allowCustomFields` off) | error |
| Element cannot edit its bound contract field's value type | error |
| Required contract field is missing from the page (reported on the root node) | warning |

Element definitions can contribute their own findings through the definition's `builder.lint` hook — they are merged into the same outline/props-panel surfaces with their declared severity (see [Custom elements](./custom-elements)).

Validation is a builder UX scaffold — it does **not** affect what the renderer does, and no severity blocks saving. The renderer is governed by `allowedElements` (the hard security boundary) and by which handlers exist in the `actions` map.

## Per-element architecture

Every element type — built-in or consumer-registered — is **one registry definition** (`definePageElement`): a runtime renderer plus optional value spec, canvas preview, inspector, default-value editor and lint hook. Built-ins live one folder per element inside the package and are pre-registered on the same contract consumers use:

```
packages/page-builder/src/elements/
├── registry.ts             ← contract types · definePageElement · additive merge
├── builtins.ts             ← the pre-registered built-in registry
├── heading/
│   ├── index.ts            ← the definition (renderer + builder halves)
│   ├── HeadingRenderer.vue
│   ├── HeadingPreview.vue
│   └── HeadingInspector.vue
├── text-input/
└── …
```

`BuilderPropsPanel.vue` is a thin host shell: it resolves the selected node's definition from the merged registry and renders `<component :is="def.builder.inspector" :node :patch />` between the host-owned **Field** and **Style** sections. The palette, add-child menu, canvas previews and outline icons all derive from the same registry — adding an element type is a single definition, **no central files are touched**. Consumer apps register theirs via `config.elements`; the shared `OptionsEditor` component is exported for reuse in consumer inspectors. See the [Custom elements guide](./custom-elements).

## Pairing with the renderer

The builder's Preview tab uses `<CoarPageRenderer>` internally with the same `config` — the renderer falls back to `config.assetResolver` on its own, so thumbnails work without extra wiring. For the actual runtime page (outside the builder), you mount the renderer yourself — see [`<CoarPageRenderer>`](./coar-page-renderer) and the [integration walkthrough](./#complete-idp-integration-walkthrough).

## i18n Keys

All builder chrome — and the runtime renderer's validation messages — resolve through [`@cocoar/vue-localization`](/foundations/localization/translations) (a peer dependency) with keys under `coar.pageBuilder.*`. English fallbacks are built in, so apps without a translation setup render English. Values in `{braces}` are interpolation parameters.

### Chrome (tabs, toolbar, panels, preview widths)

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.chrome.outline` | `'Outline'` |
| `coar.pageBuilder.chrome.collapseOutline` | `'Collapse outline'` |
| `coar.pageBuilder.chrome.expandOutline` | `'Expand outline'` |
| `coar.pageBuilder.chrome.collapseProperties` | `'Collapse properties'` |
| `coar.pageBuilder.chrome.expandProperties` | `'Expand properties'` |
| `coar.pageBuilder.chrome.tabEditor` | `'Editor'` |
| `coar.pageBuilder.chrome.tabPreview` | `'Preview'` |
| `coar.pageBuilder.chrome.tabJson` | `'JSON'` |
| `coar.pageBuilder.chrome.undo` | `'Undo (Ctrl+Z)'` |
| `coar.pageBuilder.chrome.redo` | `'Redo (Ctrl+Y)'` |
| `coar.pageBuilder.chrome.jsonHint` | `'Paste or edit JSON, then click Apply'` |
| `coar.pageBuilder.chrome.jsonApply` | `'Apply →'` |
| `coar.pageBuilder.chrome.previewWidth` | `'Preview width'` |
| `coar.pageBuilder.chrome.previewDesktop` | `'Desktop'` |
| `coar.pageBuilder.chrome.previewFullTitle` | `'Full width'` |
| `coar.pageBuilder.chrome.previewTablet` | `'Tablet · 768'` |
| `coar.pageBuilder.chrome.previewTabletTitle` | `'768px'` |
| `coar.pageBuilder.chrome.previewMobile` | `'Mobile · 375'` |
| `coar.pageBuilder.chrome.previewMobileTitle` | `'375px'` |

### Shared row actions

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.common.moveUp` | `'Move up'` |
| `coar.pageBuilder.common.moveDown` | `'Move down'` |
| `coar.pageBuilder.common.duplicate` | `'Duplicate'` |
| `coar.pageBuilder.common.delete` | `'Delete'` |

### Outline

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.outline.treeLabel` | `'Page structure'` |
| `coar.pageBuilder.outline.addChild` | `'Add child'` |
| `coar.pageBuilder.outline.column` | `'Column'` |
| `coar.pageBuilder.outline.row` | `'Row'` |
| `coar.pageBuilder.outline.validationIssues` | `'Validation issues'` |

### Palette

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.palette.containers` | `'Containers'` |
| `coar.pageBuilder.palette.elements` | `'Elements'` |
| `coar.pageBuilder.palette.fields` | `'Fields'` |
| `coar.pageBuilder.palette.dragToAdd` | `'Drag to add {label}'` |
| `coar.pageBuilder.palette.fieldBound` | `'Already on the page'` |
| `coar.pageBuilder.palette.fieldNoElement` | `'No compatible element available'` |

### Canvas

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.canvas.emptyContainer` | `'Empty {type} — drop something here'` |
| `coar.pageBuilder.canvas.unknownType` | `'Unknown type "{type}" — skipped at runtime'` |
| `coar.pageBuilder.canvas.notAllowed` | `'Not in allowedElements — skipped at runtime'` |

### Element type labels

Used by the palette, the outline's add-child menu and the canvas type tabs. These are the built-in elements' `label` keys; consumer-registered elements carry their own `label: { key, fallback }` in the element definition, so their keys live in the consumer's namespace, not under `coar.pageBuilder.*`.

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.type.page` | `'Page'` |
| `coar.pageBuilder.type.stack` | `'Stack'` |
| `coar.pageBuilder.type.card` | `'Card'` |
| `coar.pageBuilder.type.section` | `'Section'` |
| `coar.pageBuilder.type.divider` | `'Divider'` |
| `coar.pageBuilder.type.spacer` | `'Spacer'` |
| `coar.pageBuilder.type.heading` | `'Heading'` |
| `coar.pageBuilder.type.paragraph` | `'Paragraph'` |
| `coar.pageBuilder.type.note` | `'Note'` |
| `coar.pageBuilder.type.image` | `'Image'` |
| `coar.pageBuilder.type.link` | `'Link'` |
| `coar.pageBuilder.type.button` | `'Button'` |
| `coar.pageBuilder.type.textInput` | `'Text Input'` |
| `coar.pageBuilder.type.passwordInput` | `'Password'` |
| `coar.pageBuilder.type.numberInput` | `'Number Input'` |
| `coar.pageBuilder.type.checkbox` | `'Checkbox'` |
| `coar.pageBuilder.type.switch` | `'Switch'` |
| `coar.pageBuilder.type.select` | `'Select'` |
| `coar.pageBuilder.type.multiSelect` | `'Multi Select'` |
| `coar.pageBuilder.type.radioGroup` | `'Radio Group'` |
| `coar.pageBuilder.type.dateInput` | `'Date'` |
| `coar.pageBuilder.type.dateTimeInput` | `'Date & Time'` |
| `coar.pageBuilder.type.otpInput` | `'OTP Input'` |

### Properties panel

The host-owned **Field** section (name / required / default value, shown for every value-producing element) uses `props.fieldName`, `props.required` and `props.defaultValue`.

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.props.panelTitle` | `'Properties'` |
| `coar.pageBuilder.props.emptyTitle` | `'No node selected'` |
| `coar.pageBuilder.props.emptyHint` | `'Click a node in the outline or canvas to edit it.'` |
| `coar.pageBuilder.props.text` | `'Text'` |
| `coar.pageBuilder.props.title` | `'Title'` |
| `coar.pageBuilder.props.label` | `'Label'` |
| `coar.pageBuilder.props.level` | `'Level'` |
| `coar.pageBuilder.props.fieldName` | `'Field name'` |
| `coar.pageBuilder.props.fieldUnbound` | `'Not bound'` |
| `coar.pageBuilder.props.customFieldName` | `'Custom name'` |
| `coar.pageBuilder.props.elementType` | `'Element'` |
| `coar.pageBuilder.props.placeholder` | `'Placeholder'` |
| `coar.pageBuilder.props.inputType` | `'Input type'` |
| `coar.pageBuilder.props.rows` | `'Rows'` |
| `coar.pageBuilder.props.min` | `'Min'` |
| `coar.pageBuilder.props.max` | `'Max'` |
| `coar.pageBuilder.props.step` | `'Step'` |
| `coar.pageBuilder.props.decimals` | `'Decimals'` |
| `coar.pageBuilder.props.length` | `'Length'` |
| `coar.pageBuilder.props.mask` | `'Mask input'` |
| `coar.pageBuilder.props.otpType` | `'Character set'` |
| `coar.pageBuilder.props.defaultValue` | `'Default value'` |
| `coar.pageBuilder.props.checkedByDefault` | `'Checked by default'` |
| `coar.pageBuilder.props.onByDefault` | `'On by default'` |
| `coar.pageBuilder.props.required` | `'Required'` |
| `coar.pageBuilder.props.disabled` | `'Disabled'` |
| `coar.pageBuilder.props.options` | `'Options'` |
| `coar.pageBuilder.props.addOption` | `'Add option'` |
| `coar.pageBuilder.props.removeOption` | `'Remove option'` |
| `coar.pageBuilder.props.optionLabelPlaceholder` | `'label'` |
| `coar.pageBuilder.props.optionValuePlaceholder` | `'value'` |
| `coar.pageBuilder.props.action` | `'Action'` |
| `coar.pageBuilder.props.actionHint` | `'Matched against the actions map at render time'` |
| `coar.pageBuilder.props.notConfigured` | `'{id} (not configured)'` |
| `coar.pageBuilder.props.validatesForm` | `'Validates form before firing'` |
| `coar.pageBuilder.props.variant` | `'Variant'` |
| `coar.pageBuilder.props.iconLeft` | `'Icon (left)'` |
| `coar.pageBuilder.props.asset` | `'Asset'` |
| `coar.pageBuilder.props.assetId` | `'Asset ID'` |
| `coar.pageBuilder.props.assetIdHint` | `'Resolved via assetResolver at render time'` |
| `coar.pageBuilder.props.altText` | `'Alt text'` |
| `coar.pageBuilder.props.choose` | `'Choose…'` |
| `coar.pageBuilder.props.change` | `'Change…'` |
| `coar.pageBuilder.props.clear` | `'Clear'` |
| `coar.pageBuilder.props.noImage` | `'No image'` |
| `coar.pageBuilder.props.noPreview` | `'No preview'` |
| `coar.pageBuilder.props.stackDirection` | `'Stack direction'` |
| `coar.pageBuilder.props.direction` | `'Direction'` |
| `coar.pageBuilder.props.column` | `'Column'` |
| `coar.pageBuilder.props.row` | `'Row'` |
| `coar.pageBuilder.props.orientation` | `'Orientation'` |
| `coar.pageBuilder.props.horizontal` | `'Horizontal'` |
| `coar.pageBuilder.props.vertical` | `'Vertical'` |
| `coar.pageBuilder.props.wrapChildren` | `'Wrap children'` |
| `coar.pageBuilder.props.gap` | `'Gap'` |
| `coar.pageBuilder.props.padding` | `'Padding'` |
| `coar.pageBuilder.props.justify` | `'Justify (main axis)'` |
| `coar.pageBuilder.props.alignItems` | `'Align items (cross axis)'` |
| `coar.pageBuilder.props.alignSelf` | `'Align self'` |
| `coar.pageBuilder.props.size` | `'Size'` |
| `coar.pageBuilder.props.sizeAuto` | `'Auto'` |
| `coar.pageBuilder.props.sizeFill` | `'Fill'` |
| `coar.pageBuilder.props.sizeFixedWidth` | `'Fixed width'` |
| `coar.pageBuilder.props.sizeCss` | `'Size (CSS)'` |
| `coar.pageBuilder.props.width` | `'Width'` |
| `coar.pageBuilder.props.minHeight` | `'Min height'` |
| `coar.pageBuilder.props.spacerSizeHint` | `'Leave empty to fill available space'` |
| `coar.pageBuilder.props.default` | `'— default'` |
| `coar.pageBuilder.props.inherit` | `'— inherit'` |
| `coar.pageBuilder.props.none` | `'— none'` |

### Inspector section titles

Headings of the collapsible sections in the properties panel. `props.section.field`, `props.section.style` and `props.section.layout` are host-owned; the per-element titles come from each built-in definition's `inspectorTitle`. Consumer-registered elements provide their own `inspectorTitle: { key, fallback }`, so their keys are not under `coar.pageBuilder.*`.

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.props.section.field` | `'Field'` |
| `coar.pageBuilder.props.section.style` | `'Style'` |
| `coar.pageBuilder.props.section.layout` | `'Layout'` |
| `coar.pageBuilder.props.section.card` | `'Card'` |
| `coar.pageBuilder.props.section.section` | `'Section'` |
| `coar.pageBuilder.props.section.spacer` | `'Spacer'` |
| `coar.pageBuilder.props.section.heading` | `'Heading'` |
| `coar.pageBuilder.props.section.paragraph` | `'Paragraph'` |
| `coar.pageBuilder.props.section.note` | `'Note'` |
| `coar.pageBuilder.props.section.image` | `'Image'` |
| `coar.pageBuilder.props.section.link` | `'Link'` |
| `coar.pageBuilder.props.section.button` | `'Button'` |
| `coar.pageBuilder.props.section.textInput` | `'Text input'` |
| `coar.pageBuilder.props.section.passwordInput` | `'Password input'` |
| `coar.pageBuilder.props.section.numberInput` | `'Number input'` |
| `coar.pageBuilder.props.section.checkbox` | `'Checkbox'` |
| `coar.pageBuilder.props.section.switch` | `'Switch'` |
| `coar.pageBuilder.props.section.select` | `'Select'` |
| `coar.pageBuilder.props.section.multiSelect` | `'Multi select'` |
| `coar.pageBuilder.props.section.radioGroup` | `'Radio group'` |
| `coar.pageBuilder.props.section.dateInput` | `'Date'` |
| `coar.pageBuilder.props.section.dateTimeInput` | `'Date & time'` |
| `coar.pageBuilder.props.section.otpInput` | `'OTP input'` |

### Runtime validation messages

Shown by `<CoarPageRenderer>` under invalid fields when a validating button is clicked.

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.validation.required` | `'This field is required'` |
| `coar.pageBuilder.validation.minLength` | `'Minimum {n} characters'` |
| `coar.pageBuilder.validation.maxLength` | `'Maximum {n} characters'` |
| `coar.pageBuilder.validation.pattern` | `'Invalid format'` |
| `coar.pageBuilder.validation.matchField` | `'Does not match'` |
