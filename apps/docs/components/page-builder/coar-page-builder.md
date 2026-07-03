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
| `modelValue` / `v-model` | `PageNode` | empty `page` | The page schema. Bound two-way; every edit updates the ref. Every tree entering from **outside** — the initial value, a later external replacement, or an initially-`undefined` ref that is filled once an async load resolves — passes through the same normalization as the JSON tab's Apply: legacy `column`/`row` containers become `stack`, a non-`page` root is wrapped in one, missing/duplicate node ids are repaired with fresh `crypto.randomUUID` ids, missing `children` arrays are added, and the root is stamped `schemaVersion: 1`. Repairs log a DEV-only console warning. |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | — | Allowed elements, available actions, asset callbacks. The same value must be passed to the renderer. |

## Features

- **Palette toolbar** — drag containers (Stack, Card, Section) and elements onto the canvas. Types not in `config.allowedElements` are hidden.
- **Pointer-based drag & drop** — built on pointer events rather than HTML5 drag events, so it works with mouse, touch **and** pen (tablet-first). Mouse drags start after a 5 px movement threshold, so plain clicks keep working; touch/pen drags arm after a 300 ms long-press. A ghost preview follows the pointer, scroll containers auto-scroll near their edges, and `Escape` cancels a drag in flight.
- **Outline tree** — hierarchical node list with selection and real drag-to-reorder: every row except the root carries a grip handle, thin drop bars light up between rows while dragging, and container rows highlight for drop-**into**. Per-row actions: move up/down, duplicate, delete, plus an inline "Add child" menu. Stacks display "Column" or "Row" based on direction. Warning icons mark nodes with validation issues (hover for the full message).
- **Canvas** — real component previews with dashed selection borders; each node's type tab doubles as its drag handle. Unknown or disallowed element types get a "skipped at runtime" banner treatment, so the canvas never pretends the runtime renderer will show them. Switches to live preview in the **Preview** tab and to a paste-and-apply JSON editor in the **JSON** tab.
- **Properties panel** — per-element configuration. Each element type ships its own props component. Validation issues for the selected node are surfaced at the top with colored banners. Includes a select **options editor** (add / remove / reorder options plus a default value that clears itself when its option is removed) and default-value editors for text inputs and checkboxes ("Checked by default").
- **Duplicate** — available as an outline row action and a canvas button. Deep-clones the subtree with fresh ids on every node; colliding field names are flagged by the duplicate-name validation.
- **Stack direction toggle** — change a stack from column to row direction without re-creating it. Children stay put.
- **Layout controls** — every node's Style section exposes the flex model: container `Justify` (main axis) + `Align items` (cross axis), and per-node `Align self`, `Size` (Fit / Fill / Fixed → Width) and `Min height`. Center a single element, distribute a row, or build a full-screen centered page — and the Editor canvas mirrors the result 1:1 with the Preview.
- **Asset picker entry point** — when `config.pickAsset` is set, the image element shows a thumbnail + "Choose…" button that defers to your own picker UI.
- **Responsive preview** — Desktop · Tablet · 768 · Mobile · 375 segmented toggle in the Preview tab. The render area is capped and centered so you can verify the design at common breakpoints.
- **Undo / redo** — `Ctrl+Z` / `Ctrl+Y` (or `Cmd+Z` / `Cmd+Shift+Z`), also via toolbar buttons.
- **Scoped keyboard shortcuts** — undo/redo and `Delete` / `Backspace` (removes the selected node) only act while focus is inside *that builder instance*, and never while focus is in an editable target: the JSON textarea, props-panel inputs and your app's own form fields keep their native undo and delete behavior.
- **Keyboard navigation** — the outline is an ARIA tree (`role="tree"` / `role="treeitem"` with `aria-level`, `aria-selected`, `aria-expanded`) with a roving tabindex: `Arrow Up` / `Arrow Down` / `Home` / `End` move focus, `Enter` / `Space` selects the focused row. Canvas nodes are focusable too; `Enter` / `Space` selects the focused node.

## JSON tab

The JSON tab shows the current schema and lets you paste and **Apply** a replacement. Apply is gated — the pasted tree runs through the same normalization pass the v-model entry points use, but here **any reported issue rejects the Apply** with an inline message and nothing reaches the working tree (or, through `v-model`, your storage):

- **Rejected with a message** — structural problems that need the author: unknown element types, non-object nodes, a non-array `children` value, `children` on a non-container, a non-numeric heading level.
- **Healed silently** — everything with unambiguous intent: legacy `column` / `row` containers (→ `stack`), a non-`page` root (wrapped in a `page`), missing or duplicate node ids (fresh ids), out-of-range numeric heading levels (clamped to 1–6), missing `children` arrays.

A successful Apply lands as a single undoable step and switches back to the Editor tab.

::: info Exported helpers
The same machinery is exported for hosts that persist or migrate schemas themselves: `normalizePageSchema(value)` → `{ schema, issues, changed }`, `migrateLegacyTypes(node)`, and the `KNOWN_ELEMENT_TYPES` set.
:::

## Builder-side validation

The builder runs schema-level validation reactively and surfaces issues at two layers:

- **Outline** — a warning icon next to the affected node row (red ⛔ for errors, yellow ⚠ for warnings). Hover the icon for the full message.
- **Props panel** — a colored banner at the top of the selected node's properties listing every issue for that node.

Built-in rules:

| Rule | Severity |
|------|----------|
| Unknown element type (skipped at render time) | error |
| Type not in `config.allowedElements` (skipped at render time) | error |
| Button / link has no Action | warning |
| Action ID is not in `config.availableActions` (only checked when that list is non-empty) | warning |
| `validation.pattern` does not compile as a regular expression | error |
| Image has no Asset ID | error |
| Two named inputs share the same `name` | error |

Validation is a builder UX scaffold — it does **not** affect what the renderer does. The renderer is governed by `allowedElements` (the hard security boundary) and by which handlers exist in the `actions` map.

## Per-element architecture

Each element type brings its own props component, registered in a single map:

```
packages/page-builder/src/builder/props/
├── registry.ts        ← ElementType → { component, sectionTitle }
├── StackProps.vue
├── CardProps.vue
├── HeadingProps.vue
├── ButtonProps.vue
├── ImageProps.vue
├── SelectProps.vue    ← includes the options editor
├── …
└── StyleProps.vue     ← universal Gap/Justify/Align/Align-self/Size/Min-height/Padding
```

The main `BuilderPropsPanel.vue` is a thin shell that resolves the registry entry and renders `<component :is="entry.component" :node :patch />`. Adding a new element type requires creating one new `<Type>Props.vue` file and adding one line to the registry — no central files are touched.

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
| `coar.pageBuilder.palette.dragToAdd` | `'Drag to add {label}'` |

### Canvas

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.canvas.emptyContainer` | `'Empty {type} — drop something here'` |
| `coar.pageBuilder.canvas.unknownType` | `'Unknown type "{type}" — skipped at runtime'` |
| `coar.pageBuilder.canvas.notAllowed` | `'Not in allowedElements — skipped at runtime'` |

### Element type labels

Used by the palette, the outline's add-child menu and the canvas type tabs.

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
| `coar.pageBuilder.type.textInput` | `'Text Input'` |
| `coar.pageBuilder.type.checkbox` | `'Checkbox'` |
| `coar.pageBuilder.type.select` | `'Select'` |
| `coar.pageBuilder.type.button` | `'Button'` |
| `coar.pageBuilder.type.link` | `'Link'` |
| `coar.pageBuilder.type.image` | `'Image'` |

### Properties panel

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.props.panelTitle` | `'Properties'` |
| `coar.pageBuilder.props.emptyTitle` | `'No node selected'` |
| `coar.pageBuilder.props.emptyHint` | `'Click a node in the outline or canvas to edit it.'` |
| `coar.pageBuilder.props.section.style` | `'Style'` |
| `coar.pageBuilder.props.text` | `'Text'` |
| `coar.pageBuilder.props.title` | `'Title'` |
| `coar.pageBuilder.props.label` | `'Label'` |
| `coar.pageBuilder.props.level` | `'Level'` |
| `coar.pageBuilder.props.name` | `'Name (field key)'` |
| `coar.pageBuilder.props.placeholder` | `'Placeholder'` |
| `coar.pageBuilder.props.inputType` | `'Input type'` |
| `coar.pageBuilder.props.defaultValue` | `'Default value'` |
| `coar.pageBuilder.props.checkedByDefault` | `'Checked by default'` |
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

### Runtime validation messages

Shown by `<CoarPageRenderer>` under invalid fields when a validating button is clicked.

| Key | Default (English) |
|-----|-------------------|
| `coar.pageBuilder.validation.required` | `'This field is required'` |
| `coar.pageBuilder.validation.minLength` | `'Minimum {n} characters'` |
| `coar.pageBuilder.validation.maxLength` | `'Maximum {n} characters'` |
| `coar.pageBuilder.validation.pattern` | `'Invalid format'` |
| `coar.pageBuilder.validation.matchField` | `'Does not match'` |
