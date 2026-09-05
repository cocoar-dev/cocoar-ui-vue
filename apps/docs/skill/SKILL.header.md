---
name: cocoar-vue-ui
description: >
  Cocoar Design System for Vue 3 (@cocoar/vue-ui and its companion packages). Use when working
  with Coar* components (CoarButton, CoarSelect, CoarFormField, CoarDialog, CoarDataGrid,
  CoarCalendar, CoarTree, CoarMarkdown, CoarPageBuilder …), --coar-* design tokens, theming and
  dark mode, the overlay plugin, Temporal-based date pickers, @cocoar/vue-localization,
  @cocoar/vue-data-grid, @cocoar/vue-calendar, @cocoar/vue-markdown (-editor, -form, -mermaid),
  @cocoar/vue-page-builder, @cocoar/vue-document-viewer, @cocoar/vue-map,
  @cocoar/vue-file-explorer-core or @cocoar/vue-script-editor.
metadata:
  author: Bernhard Windisch
  source: https://docs.cocoar.dev/cocoar-ui-vue/
---

# Cocoar UI Vue

A touch-first Vue 3 component library for the Cocoar Design System: 30+ accessible, themeable,
tree-shakeable components in `@cocoar/vue-ui`, plus companion packages for localization, data
grid, calendar, markdown, page builder, document viewer, map, file explorer and script editor.
This skill is the documentation, page by page, under `references/`, with every live demo inlined
as a `vue` code block. The index at the bottom says which page answers what.

## Packages

| Package | Purpose |
|---|---|
| `@cocoar/vue-ui` | The component library: form controls, display, navigation, layout, overlays, transitions, virtual list, drag & drop; design tokens and styles |
| `@cocoar/vue-localization` | `createCoarLocalization()` plugin: locale-aware formatting (`useL10n`), translations (`useI18n`), timezone detection |
| `@cocoar/vue-data-grid` | `CoarDataGrid` — AG Grid wrapper with Cocoar theming, typed column definitions and Cocoar cell editors |
| `@cocoar/vue-calendar` | `CoarCalendar` + standalone Year/Month/Week/Day/Agenda/Timeline views; Temporal-only public surface |
| `@cocoar/vue-markdown` | `CoarMarkdown` viewer + the shared rendering registry (custom embeds, fence renderers) |
| `@cocoar/vue-markdown-editor` | `CoarMarkdownEditor` — Milkdown WYSIWYG editor sharing the viewer's component map |
| `@cocoar/vue-markdown-form` | `CoarMarkdownForm` — template-driven forms with fixed prose and registered field controls |
| `@cocoar/vue-mermaid`, `@cocoar/vue-markdown-mermaid` | `CoarMermaidDiagram` and the adapter that renders ```` ```mermaid ```` fences in the viewer |
| `@cocoar/vue-script-editor` | `CoarScriptEditor` — Monaco-based TS/JS/JSON editor with constrained and authoring modes |
| `@cocoar/vue-page-builder` | `CoarPageBuilder` (visual editor) + `CoarPageRenderer` (runtime) over an open element registry |
| `@cocoar/vue-document-viewer` | `CoarDocumentViewer` — PDF/image/gallery pages via a `PageProvider`, tools, annotations |
| `@cocoar/vue-map` | `CoarMap` + `CoarMapEditor` — Leaflet map fed with resolved data |
| `@cocoar/vue-file-explorer-core` | Headless `useFileExplorer({ store })` over an `AssetStore<T>`; compose with `CoarTree` + `CoarPanelLayout` |
| `@cocoar/vue-fragment-parser` | URL fragment parsing and modal routing composables |

Every companion package has `@cocoar/vue-ui` as a peer dependency and pins the same version.

## Things an assistant gets wrong without the docs

- **Two imports in `main.ts`, and one CSS class for dark mode.** `import '@cocoar/vue-ui/fonts'`
  (optional, self-hosted Poppins + Inter) and `import '@cocoar/vue-ui/styles'` (tokens and
  component styles). Dark mode is the `dark-mode` class on the root element — not a
  `data-theme` attribute and not `prefers-color-scheme` alone. Companion packages ship their own
  stylesheet under the same convention (`@cocoar/vue-calendar/styles`, `@cocoar/vue-markdown/styles`,
  `@cocoar/vue-page-builder/styles`, `@cocoar/vue-document-viewer/styles`, `@cocoar/vue-map/styles` …).
- **Overlays need the plugin and the host.** `app.use(CoarOverlayPlugin)` once and
  `<CoarOverlayHost />` in the root layout, or Dialog, Toast, Popover, Tooltip and Popconfirm render
  nothing. `useDialog().confirm(...)` and Popconfirm return Promises that reject when the overlay
  is torn down — always `.catch()`.
- **Boolean props default to `false`, without exception.** Features are opt-in: `clearable` on
  every input, `closable` on `CoarTag`, `show-search` on `CoarDataGrid`. Do not assume a feature is
  on because other libraries default it on.
- **Dates are `Temporal`, not `Date` or strings.** The date pickers use `Temporal.PlainDate`,
  `Temporal.PlainDateTime` and `Temporal.ZonedDateTime` (via `@js-temporal/polyfill`, already a
  dependency); `CoarCalendar` events carry `Temporal.PlainDate` (all-day) or
  `Temporal.ZonedDateTime` (timed) and reject anything else. Convert the wire format at the boundary.
- **Theming is a handful of base colors, not a palette.** Set `--coar-accent`, `--coar-success`,
  `--coar-error`, `--coar-warning`, `--coar-info` on `:root`; every shade scale for light and
  dark mode is derived with oklch. Style with `--coar-*` tokens; do not hard-code hex values or
  override generated shades.
- **Touch-first, tablet-first.** Interactive elements are at least 44 × 44 px and work with touch
  and focus; hover is an enhancement only. No hover-only interactions, no phone-first layouts.
- **Props, not slots, where the docs say so.** `CoarCheckbox` takes its text via the `label` prop,
  `CoarBadge` via `content`. `CoarTag` uses `closable` and `@closed`; `CoarPopconfirm` uses
  `message` with `@confirmed` / `@cancelled`. `CoarFormField` wraps a control and supplies label,
  hint, status and required to it.
- **Localization is a plugin, not a prop.** `app.use(createCoarLocalization({ ... }))` once; then
  `useL10n()` / `useI18n()` in components. Formatting reacts to language changes automatically.
- **Companion packages are separate installs.** `@cocoar/vue-ui` does not pull in the data grid,
  calendar, markdown or page builder; add the package you need, its styles, and (for the data grid)
  AG Grid's own modules as the page describes.
