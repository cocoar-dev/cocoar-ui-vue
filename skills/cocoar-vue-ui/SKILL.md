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

<!-- Everything below is generated by apps/docs/scripts/sync-skill.mjs from the docs frontmatter. Edit the docs, not this file. -->

## Reference documentation

Each file under `references/` is one page of the documentation with its live demos inlined
as `vue` code blocks. Read the one whose description matches the task; they are independent
of each other.

### Guide

- [Getting Started](references/guide/getting-started.md) — Set up @cocoar/vue-ui in a Vue 3 project: install, import fonts and styles, use components, toggle dark mode, and register the overlay plugin.
- [Error Handling](references/guide/error-handling.md) — Error handling patterns in Cocoar UI: graceful fallbacks, overlay Promise rejections, error toasts, and handling failures in application code.
- [Theming](references/guide/theming.md) — Theme Cocoar with CSS custom properties: set five oklch base colors and all shade scales for light and dark mode recalculate automatically.
- [Migrating to 2.11](references/guide/migration.md) — Migration guide for Cocoar UI 2.11: date/time pickers move onto CoarFormField, the clear button becomes opt-in, and two CSS tokens are renamed.
- [Migrating Page Builder to 3.0](references/guide/migration-page-builder-3.md) — Migration guide for @cocoar/vue-page-builder 3.0: four PageConfig concepts removed, several names disambiguated, and documents migrated to schemaVersion 6.

### Foundations

- [Design Principles](references/foundations/design-principles.md) — The six Cocoar Design System principles — clarity, consistency, accessibility, touch-first, performance, developer experience — plus the design token architecture and do's and don'ts.
- [Colors](references/foundations/colors.md) — Cocoar's two-layer color system: primitive palettes and semantic tokens that adapt to light and dark mode, with naming convention and full token reference.
- [Typography](references/foundations/typography.md) — The Cocoar type scale: eleven utility classes from display to footnote using Inter and Poppins, with sizes, weights, and usage examples.
- [Spacing & Effects](references/foundations/spacing.md) — Spacing and effects tokens: the 4 px spacing scale, border radius, stroke widths, and six shadow elevation levels with reference tables.
- [Icons](references/foundations/icons.md) — CoarIcon and the built-in SVG icon set: preset sizes, colors, rotation, spin animation, and registering custom icon sources with fallback.
- [Motion](references/foundations/motion.md) — Motion design tokens: duration and easing CSS variables plus pre-composed transition values, with interactive demos and usage examples.
- [Theme Editor](references/foundations/theming.md) — CoarThemeEditor, a live token editor: explore primitive, semantic, and component token layers, apply presets, and export a CSS snippet.

### Localization (@cocoar/vue-localization)

- [Localization Setup](references/foundations/localization/setup.md) — Install and configure @cocoar/vue-localization: register the createCoarLocalization() plugin, set locale and translation URLs, and switch languages at runtime.
- [Formatting](references/foundations/localization/formatting.md) — Locale-aware number, currency, percent, and date formatting via the useL10n() composable from @cocoar/vue-localization, reacting to language changes.
- [Translations](references/foundations/localization/translations.md) — Translation lookup with the useI18n() composable: t() and tRef() with parameter interpolation, HTTP-loaded or code-registered translations, and fallbacks.
- [Timezones](references/foundations/localization/timezones.md) — The useTimezone() composable exposes the detected IANA timezone as a reactive ref, with support for custom timezone providers.

### Form controls

- [Button](references/components/button.md) — CoarButton — action button with five variants, four sizes, icons, loading and disabled states, full width and router-aware link rendering.
- [Form Field](references/components/form-field.md) — CoarFormField — label, hint and validation wrapper for form controls with a severity-aware status icon, pinnable popover and live-evaluated rules
- [Text Input](references/components/text-input.md) — CoarTextInput — text field with validation states, prefix/suffix decorations, clearable option, four sizes and multiline textarea mode
- [Number Input](references/components/number-input.md) — CoarNumberInput — numeric input with min/max clamping, configurable step, optional stepper buttons, four sizes and standard form states
- [Password Input](references/components/password-input.md) — CoarPasswordInput — masked text input with show/hide visibility toggle, clearable option, four sizes, validation states and CoarFormField integration
- [OTP Input (New in 2.0)](references/components/otp-input.md) — CoarOtpInput — N-cell one-time-code input with auto-advance, paste spreading, numeric/alphanumeric/text modes, masking, transform/accept hooks and a complete event
- [Select](references/components/select.md) — CoarSelect, CoarMultiSelect and CoarTagSelect — dropdown selection with inline search, clearable state, option groups, sorting and form-field integration
- [Listbox](references/components/listbox.md) — CoarListbox — single-column selectable list with grouping, search, multi-select highlighting, keyboard navigation, custom item renderers and display-only mode
- [Dual Listbox](references/components/dual-listbox.md) — CoarDualListbox — two-column transfer list with move buttons, per-column search, grouping, custom item renderers and drag & drop between columns
- [Checkbox](references/components/checkbox.md) — CoarCheckbox — boolean checkbox with v-model, indeterminate state, four sizes, label positioning, validation states and CoarFormField integration.
- [Checkbox Group](references/components/checkbox-group.md) — CoarCheckboxGroup — coordinate multiple checkboxes through one array or boolean-record model, with FormField integration.
- [Radio Group](references/components/radio-group.md) — CoarRadioGroup and CoarRadioButton — single-choice selection with horizontal or vertical layout, four sizes, label positioning, keyboard navigation and form-field integration
- [Switch](references/components/switch.md) — CoarSwitch — toggle for boolean settings that apply immediately, with four sizes, label positioning, validation states and keyboard and screen-reader support
- [Segmented Control](references/components/segmented-control.md) — CoarSegmentedControl — toolbar button-bar for switching between mutually-exclusive view options, with icons, four sizes, disabled segments and full-width mode
- [Date Picker](references/components/date-picker.md) — CoarPlainDatePicker — calendar date picker returning Temporal.PlainDate, with min/max limits, validation states, four sizes and form-field integration.
- [DateTime Picker](references/components/date-time-picker.md) — CoarPlainDateTimePicker — combined calendar and time input returning a timezone-less Temporal.PlainDateTime, with validation states, four sizes and localized labels.
- [Zoned DateTime Picker](references/components/zoned-date-time-picker.md) — CoarZonedDateTimePicker — timezone-aware datetime picker capturing date, time and IANA timezone as one Temporal.ZonedDateTime, with form states and four sizes
- [Date · optional time](references/components/date-or-time-picker.md) — CoarZonedDateTimeOrDatePicker and CoarPlainDateTimeOrDatePicker — date pickers with a clock toggle switching between plain date and date-with-time values.
- [Date Views (New in 2.0)](references/components/date-views.md) — CoarPlainDateView, CoarPlainDateTimeView and CoarZonedDateTimeView — read-only, locale-aware displays for Temporal date values with cross-zone projection.

### Display

- [Avatar](references/components/avatar.md) — CoarAvatar — user avatar with image and generated-initials fallback, six sizes, circle or square shape, clickable mode and group stacking.
- [Badge](references/components/badge.md) — CoarBadge — count and status badge with six semantic variants, five sizes, max-value capping, dot mode, pulse animation and border ring.
- [Card](references/components/card.md) — CoarCard — content container with elevated and outlined styles, semantic color variants, padding sizes and header, footer and inset slots.
- [Code Block](references/components/code-block.md) — CoarCodeBlock — syntax-highlighted code display with copy-to-clipboard button, collapsible behavior, line numbers, title label and color variants.
- [Data List](references/components/data-list.md) — CoarDataList — virtualized, searchable, sortable record list with a free multi-line item template, key-based selection, grouping and a headless useDataListModel composable
- [Divider](references/components/divider.md) — CoarDivider — horizontal separator with optional slotted label, left/center/right alignment, subtle or strong weight and spacing controls.
- [Link](references/components/link.md) — CoarLink — styled anchor for router and external navigation with accent/subtle variants, three sizes, safe new-tab defaults and disabled handling
- [Note](references/components/note.md) — CoarNote — callout for supplementary information with six semantic color variants, three padding sizes and rich HTML slot content
- [Notice](references/components/notice.md) — CoarNotice — compact inline notices and application banners with six semantic variants
- [Progress Bar](references/components/progress-bar.md) — CoarProgressBar — determinate and indeterminate progress indicator with semantic color variants, three sizes, optional value display and accessible labels
- [Spinner](references/components/spinner.md) — CoarSpinner — animated loading indicator for operations of unknown duration, with four sizes, accessible labels and full-page overlay patterns
- [Table](references/components/table.md) — CoarTable — lightweight styled table wrapper with striped, plain and bordered variants, compact padding, hover highlighting and rich cell content
- [Tag](references/components/tag.md) — CoarTag — label chip with six semantic color variants, three sizes, closable and selectable modes for metadata, categories and filter bars

### Navigation

- [Menu](references/components/menu.md) — CoarMenu — context menus and action lists with full keyboard support, icons, headings, dividers, nested and flyout submenus and router-aware link items
- [Context Menu](references/components/context-menu.md) — CoarContextMenu with useContextMenu — right-click menu at the pointer position with viewport clamping, submenus, flyouts and auto-close behavior.
- [Sidebar](references/components/sidebar.md) — CoarSidebar — navigation sidebar with header/content/footer sections, collapsible icon-only mode, expand and flyout groups, four-side orientation and router-aware items
- [Navbar](references/components/navbar.md) — CoarNavbar — top-level navigation bar with start, center and end content slots, elevated shadow by default or a flat bordered variant
- [Tabs](references/components/tabs.md) — CoarTabGroup and CoarTab — v-model tab navigation with disabled tabs, tab-bar actions slot, fill-height mode and full keyboard support
- [Tree](references/components/tree.md) — CoarTree — generic tree primitive with keyboard navigation, drag-and-drop reorder, single/multiple/checkbox selection, context menus, lazy loading and a fluent useTree builder
- [Breadcrumb](references/components/breadcrumb.md) — CoarBreadcrumb — hierarchical navigation trail with router-aware links, non-interactive active item, icons and automatic render-mode selection per crumb.
- [Pagination](references/components/pagination.md) — CoarPagination — page navigation computed from totalItems and pageSize with ellipsis truncation, first/last buttons and localized aria-labels

### Layout

- [Panel Layout (Preview)](references/components/panel-layout.md) — CoarSplitPane and CoarPanelLayout — resizable split panes and a VS-Code-style workbench shell with top/left/content/right/bottom/status regions
- [Wizard (Preview)](references/components/wizard.md) — CoarWizard — multi-step flow shell for modals with animated body resize, scrollable auto-centering step indicator, edge-placeable progress strip and step gating

### Overlay

- [Dialog](references/components/dialog.md) — useDialog — promise-based modal dialogs for confirm, alert and custom components, with configurable buttons, sizes and localized labels.
- [Popover](references/components/popover.md) — CoarPopover — anchored panel for rich interactive content with hover, click or combined trigger modes and automatic viewport-aware positioning
- [Popconfirm](references/components/popconfirm.md) — CoarPopconfirm — inline confirmation bubble anchored to a trigger element, with confirm/cancel actions, danger variant, custom labels and placement control
- [Toast](references/components/toast.md) — useToast and CoarToastContainer — non-blocking notification service with semantic variants, duration and position control, action buttons and progress indicator
- [Tooltip](references/components/tooltip.md) — v-tooltip directive — text-only hover and focus hints for any element, with placement options and accessible labels for icon buttons

### Utilities

- [Transitions](references/components/transitions.md) — CoarFade, CoarSlide, CoarScale, CoarCollapse — pre-built Vue transition wrappers on design-system motion tokens with duration presets and prefers-reduced-motion support
- [Virtual List](references/components/virtual-list.md) — useVirtualList — composable that virtualizes large scrollable lists, rendering only visible rows with overscan, variable item heights and scrollToIndex
- [Drag & Drop](references/components/drag-drop.md) — useDragDrop — HTML5 drag-and-drop composable with group, accept and canDrop matching rules for building custom drag surfaces like Kanban boards.
- [Fragment Parser & Modal Routing](references/components/fragment-parser.md) — @cocoar/vue-fragment-parser — parses URL hash fragments into typed routes with parameters; composables enable deep-linkable modals with browser-back to close

### Content (@cocoar/vue-markdown, -editor, -form, -mermaid, @cocoar/vue-script-editor)

- [Markdown](references/components/markdown.md) — @cocoar/vue-markdown — markdown rendering split into a framework-agnostic parser (markdown-core) and the CoarMarkdown Vue component with GFM support
- [Markdown Editor (Preview)](references/components/markdown-editor.md) — CoarMarkdownEditor — Milkdown-based WYSIWYG markdown editor with lossless round-trip, floating or fixed toolbar and a render registry shared with CoarMarkdown
- [Markdown Form](references/components/markdown-form.md) — CoarMarkdownForm renders a fixed Markdown template with registered fill controls, separate typed values, validation and readonly output.
- [Custom Embeds (Preview)](references/components/markdown-embeds.md) — Markdown custom embeds — register Vue components rendered from :::key{props} directives in both viewer and editor, with lossless round-trip to plain text
- [Diagrams (Preview)](references/components/markdown-diagrams.md) — @cocoar/vue-markdown-mermaid — renders mermaid code fences in CoarMarkdown as Cocoar-themed diagrams; lazy-loaded, strict security, degrades to plain code blocks
- [Mermaid Diagram (Preview)](references/components/mermaid.md) — CoarMermaidDiagram — standalone Mermaid diagram component for Vue 3 rendering from a source string; Cocoar-themed, lazily loaded, with opt-in zoom/pan
- [Script Editor](references/components/script-editor.md) — @cocoar/vue-script-editor — Monaco-based TypeScript/JavaScript/JSON editor with v-model, custom type definitions, constrained mode with protected lines and automatic theming

### Data Grid (@cocoar/vue-data-grid)

- [Data Grid](references/components/data-grid.md) — CoarDataGrid — AG Grid-based data grid with fluent builder API, locale-aware column types, wrapper-column decorations and Cocoar theming with dark mode.
- [Editing](references/components/data-grid/editing.md) — CoarDataGrid in-cell editing — editable() with per-row predicates, custom Vue editors via cellEditorConfig, and onCellValueChanged for committed edits.
- [Text Column](references/components/data-grid/text.md) — CoarDataGrid text column — col.text() edits cells with CoarTextInput via CoarTextCellEditor, with placeholder, maxLength, and per-row editable gating.
- [Number Column](references/components/data-grid/number.md) — CoarDataGrid number column — col.number() formats locale-aware and edits with CoarNumberCellEditor supporting min/max, decimals, step, and stepper buttons.
- [Select Column](references/components/data-grid/select.md) — CoarDataGrid select column — col.select() renders the matched option label and edits via CoarSelect with auto-commit on pick, clearable, searchable, and row-aware options.
- [Multi-Select & Tag-Select Columns (New in 2.0)](references/components/data-grid/multi-select.md) — CoarDataGrid multi-value columns — col.multiSelect() and col.tagSelect() edit array cells via CoarMultiSelect or CoarTagSelect, with chips display, search, and allowCreate.
- [Date Columns (New in 2.0)](references/components/data-grid/date-columns.md) — CoarDataGrid date columns — col.plainDate/plainDateTime/zonedDateTime render Temporal values locale-aware and edit via the matching Cocoar date-time picker.
- [Checkbox Column](references/components/data-grid/checkbox.md) — CoarDataGrid checkbox column — col.checkbox() renders a read-only CoarCheckbox per cell, with opt-in edit-mode toggling, per-row gating, and indeterminate tri-state.

### Page Builder (@cocoar/vue-page-builder)

- [Page Builder (Preview)](references/components/page-builder/index.md) — Overview of @cocoar/vue-page-builder, a headless visual page composition framework: consumer-defined element registry, portable JSON schemas, shared PageConfig for builder and renderer.
- [`<CoarPageBuilder>` (Preview)](references/components/page-builder/coar-page-builder.md) — CoarPageBuilder visual editor: outline and properties inspector, drag-and-drop canvas, searchable element library and reusable compositions, emitting a PageNode JSON schema via v-model.
- [`<CoarPageRenderer>` (Preview)](references/components/page-builder/coar-page-renderer.md) — CoarPageRenderer turns a PageNode schema into live Cocoar components at runtime, enforcing the allowedElements security boundary with actions, validation and initialValues.
- [Authoring contract](references/components/page-builder/authoring-contract.md) — Page Builder authoring contract — the inventory of every renderer capability, the authoring surface that writes it, and which gaps are named exceptions versus open.
- [Custom elements](references/components/page-builder/custom-elements.md) — Registering consumer element types via PageElementDefinition: props-bag wire format, runtime renderer with usePageElement, plus palette, preview and inspector integration.
- [IDP integration](references/components/page-builder/idp-integration.md) — Integrate Page Builder 2.20 into an identity provider with isolated SES Worker sessions, host-owned capabilities, versioned documents and server-authoritative publication.

### Document Viewer (@cocoar/vue-document-viewer)

- [Document Viewer (Preview)](references/components/document-viewer/index.md) — Source-agnostic document viewer for Vue 3 — CoarDocumentViewer renders PDFs, images, and image galleries with shared toolbar chrome, side panels, and an annotation layer.
- [CoarDocumentViewer](references/components/document-viewer/coar-document-viewer.md) — CoarDocumentViewer component reference — the source prop, toolbar and side-panel chrome toggles, annotation surface props, and v-model panel open state.
- [Toolbar customization](references/components/document-viewer/toolbar.md) — CoarDocumentViewer toolbar customization — the order-driven tools array of tool identifiers, separator trimming rules, and the full CoarDocumentViewerTool reference.
- [Annotations](references/components/document-viewer/annotations.md) — CoarDocumentViewer annotation layer — controlled marker, comment, ink, and freetext annotations; the consumer owns the data and applies create/update/delete events.

### Map (@cocoar/vue-map)

- [Map (Preview)](references/components/map/index.md) — CoarMap, a standalone data-driven Leaflet map for Vue 3 that renders pins, routes, popups and a legend from MapData plus MapConfig.
- [Map Editor (Preview)](references/components/map/editor.md) — CoarMapEditor, the write counterpart of CoarMap: place, move, edit, reorder and delete points visually, emitting fresh MapData via v-model.

### File Explorer (@cocoar/vue-file-explorer-core)

- [File Explorer (Preview)](references/components/file-explorer/index.md) — Headless VSCode-style file explorer engine for Vue 3 — useFileExplorer drives a pluggable AssetStore backend; you compose the layout from @cocoar/vue-ui primitives.
- [useFileExplorer](references/components/file-explorer/use-file-explorer.md) — useFileExplorer composable reference — options, reactive tree and tab state, imperative ops, and navigation returned by the file-explorer engine.
- [AssetStore&lt;T&gt; contract](references/components/file-explorer/asset-store.md) — AssetStore contract for the file-explorer engine — the backend-agnostic read/write interface (loadTree, uploadFile, rename, move) with optional lazy and browse-only modes.
- [In-memory store](references/components/file-explorer/in-memory-store.md) — createInMemoryAssetStore — the reference AssetStore implementation with reactive latency, failure, lazy, and conflict knobs for demos, tests, and prototyping.

### Calendar (@cocoar/vue-calendar)

- [Calendar (Preview)](references/components/calendar/index.md) — @cocoar/vue-calendar — Temporal-based Vue 3 calendar with Year, Month, Week, Day and Agenda views, iOS-style display variations, recurrence and standalone sub-views
- [`<CoarCalendar>` — Composer (Preview)](references/components/calendar/coar-calendar.md) — CoarCalendar — top-level calendar shell wiring the iOS-style Year, Month, Day and Agenda hierarchy plus Week and Work Week, driven by the chainable useCalendar builder
- [`<CoarYearView>` — Year View (Preview)](references/components/calendar/year-view.md) — CoarYearView — responsive twelve-month calendar overview with today marker and drill-in to the continuous Month view
- [Month Views (Preview)](references/components/calendar/month-view.md) — Month views — continuously scrolling Compact, Stacked and Details months, responsive Month List, and the lower-level CoarMonthView section
- [`<CoarDayView>` — Day View (Preview)](references/components/calendar/day-view.md) — CoarDayView — one-day or width-aware multi-day time grid with hour axis, all-day band, configurable columns, time range and slot duration
- [`<CoarWeekView>` — Week View (Preview)](references/components/calendar/week-view.md) — CoarWeekView — 7-day time-grid calendar view with hour axis, all-day band, locale-aware first day of week and a customizable day-header slot
- [`<CoarWorkWeekView>` — Work Week View (Preview)](references/components/calendar/work-week-view.md) — CoarWorkWeekView — week view filtered to a configurable working-day set (default Mon-Fri), supporting 6-day, 4-day and Sun-Thu weeks on the same time grid
- [`<CoarAgendaView>` — Agenda View (Preview)](references/components/calendar/agenda-view.md) — CoarAgendaView — virtualized chronological agenda list grouped by day, with floating day headers, multi-day event continuation and imperative scroll-to-date
- [`<CoarTimelineView>` — Timeline View (Preview)](references/components/calendar/timeline-view.md) — CoarTimelineView — Gantt-lite timeline with one row per event, horizontal time-axis bars, automatic recurring-series row collapsing and drag-to-pan window
- [Performance baseline (Preview)](references/components/calendar/performance.md) — Performance baseline for @cocoar/vue-calendar — Long Animation Frame measurements and targets for virtualization, 2D scrolling and drag-and-drop with auto-scroll

The same content is online at https://docs.cocoar.dev/cocoar-ui-vue/ (index for LLMs: https://docs.cocoar.dev/cocoar-ui-vue/llms.txt).
