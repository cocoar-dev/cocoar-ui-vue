# `<CoarPageBuilder>` <Badge type="warning" text="Preview" />

The visual-editor half of `@cocoar/vue-page-builder`. Renders a three-panel layout — outline tree on the left, canvas with palette in the centre, properties panel on the right — and emits a `PageNode` JSON tree as `v-model`. The same tree is consumed by [`<CoarPageRenderer>`](./coar-page-renderer) at runtime.

All three panels are resizable via drag handles and collapsible.

::: tip Stylesheet
Import `@cocoar/vue-page-builder/styles` once in your app — it carries the entire builder chrome (panels, canvas, palette). Without it the builder renders unstyled.
:::

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` / `v-model` | `PageNode` | empty `page` | The page schema. Bound two-way; every edit updates the ref. |
| `config` | [`PageConfig`](./#pageconfig-the-consumer-contract) | — | Allowed elements, available actions, asset callbacks. The same value must be passed to the renderer. |

## Features

- **Palette toolbar** — drag containers (Stack, Card, Section) and elements onto the canvas. Hidden types per `config.allowedElements`.
- **Outline tree** — hierarchical node list with selection, drag-to-reorder, inline add/delete. Stacks display "Column" or "Row" based on direction. Warning icons (⚠ / ⛔) mark nodes with validation issues.
- **Canvas** — real component previews with dashed selection borders. Switches to live preview in the **Preview** tab and to a paste-and-apply JSON editor in the **JSON** tab.
- **Properties panel** — per-element configuration. Each element type ships its own props component. Validation issues for the selected node are surfaced at the top with colored banners.
- **Stack direction toggle** — change a stack from column to row direction without re-creating it. Children stay put.
- **Layout controls** — every node's Style section exposes the flex model: container `Justify` (main axis) + `Align items` (cross axis), and per-node `Align self`, `Size` (Fit / Fill / Fixed → Width) and `Min height`. Center a single element, distribute a row, or build a full-screen centered page — and the Editor canvas mirrors the result 1:1 with the Preview.
- **Asset picker entry point** — when `config.pickAsset` is set, the image element shows a thumbnail + "Choose…" button that defers to your own picker UI.
- **Responsive preview** — Desktop · Tablet · 768 · Mobile · 375 segmented toggle in the Preview tab. The render area is capped and centered so you can verify the design at common breakpoints.
- **Undo / redo** — `Ctrl+Z` / `Ctrl+Y` (or `Cmd+Z` / `Cmd+Shift+Z`), also via toolbar buttons.
- **Keyboard** — `Delete` / `Backspace` removes the selected node (when focus is not in an input).
- **JSON paste migration** — legacy `column` / `row` types are auto-coerced to `stack` on import; other non-`page` root types are auto-wrapped in a `page`.

## Builder-side validation

The builder runs schema-level validation reactively and surfaces issues at two layers:

- **Outline** — a warning icon next to the affected node row (red ⛔ for errors, yellow ⚠ for warnings). Hover the icon for the full message.
- **Props panel** — a colored banner at the top of the selected node's properties listing every issue for that node.

Built-in rules:

| Rule | Severity |
|------|----------|
| Button / link has no Action | warning |
| Action ID is not in `config.availableActions` | warning |
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
├── …
└── StyleProps.vue     ← universal Gap/Justify/Align/Align-self/Size/Min-height/Padding
```

The main `BuilderPropsPanel.vue` is a thin shell that resolves the registry entry and renders `<component :is="entry.component" :node :patch />`. Adding a new element type requires creating one new `<Type>Props.vue` file and adding one line to the registry — no central files are touched.

## Pairing with the renderer

The builder's Preview tab uses `<CoarPageRenderer>` internally, passing through `config.assetResolver` so thumbnails work without extra wiring. For the actual runtime page (outside the builder), you mount the renderer yourself — see [`<CoarPageRenderer>`](./coar-page-renderer) and the [integration walkthrough](./#complete-idp-integration-walkthrough).
