# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

---

## 1.9.0

### Added

- **`@cocoar/vue-script-editor` — new package**: Monaco-based code editor for Vue 3 with TypeScript, JavaScript, and JSON support. Peer-deps on `monaco-editor`. `v-model` is the persistence format, `extraLibs` for TypeScript type injection (IntelliSense on domain types), Cocoar light/dark Monaco themes with reactive `auto` detection that tracks `.dark-mode` class on `<html>`/`<body>` (Cocoar convention), `data-theme` attribute, or OS `prefers-color-scheme`. `getEditor()` / `getModel()` escape hatches for Monaco APIs not covered by props.
- **Constrained mode (`// @locked` line protection)**: any line of the source containing `// @locked` is protected against edits, deletion, and line-merging. Users can't touch the marker or its line; everything else is freely editable — including the file top, so TypeScript's Auto-Import quickfix works naturally. Markers stay in `v-model`, so the editor value round-trips through persistence with no extra schema. Powered by `ChangeGuard` (inclusive overlap check + multi-cursor atomic rollback via `editor.trigger('undo')`), `CursorGuard` (snap away from locked interiors), `DiagnosticsFilter` (hides TS error markers that fall on locked lines caused by in-progress bodies), and per-mount auto-feature policy (`formatOnType`, `formatOnPaste`, `linkedEditing` disabled to prevent cross-boundary reformats).
- **Authoring mode (`authoring` prop)**: suspends enforcement so template authors can edit locked lines and markers themselves. Markers render at full size with a warm accent colour to signal enforcement is off. Toggle back to resume enforcement with the current marker state.
- **`@reject` event**: emits `{ reason, range? }` when a guard rolls back an illegal edit — hookable for toast / shake / line-highlight feedback.
- **Pure helpers** (no editor mount required): `scanLockedLines`, `computeProtectedRanges`, `hasLockedMarkers`, `getEditableSegments`, `getSlots`, `getSlot`, `editIsProtected`, `snapOffsetAwayFromLocked`, `countLockedLines`, `isEverySegmentNonEmpty`, `validateSource`. Use for submit-gating, server-side validation, or tests. `SLOT_MARKER_PATTERN` is exported as a regex source string so server-side parsers (e.g. a C# Jint host) can mirror the same matching.
- **Named slots (`@slot:NAME`)**: attribute placed on a `// @locked` line that names the editable segment which follows. `getSlots(source)` returns a `{ slotName: bodyContent }` dictionary, `getSlot(source, name)` returns a single body (or `undefined` when the template does not declare it). Lets a consumer identify per-region fill state without knowing segment positions — ideal for templates where the user may fill in 0..N of several named function bodies and the runtime needs to decide which ones to invoke. Slot markers survive line shifts (e.g. auto-import at file top) because they're anchored to their locked line, not a fixed line number. First-wins on duplicate names; `LockedLine.slotName` exposes the parsed name for custom tooling.
- **Form integration (`CoarFormField`)**: `CoarScriptEditor` now auto-inherits `id`, `error`, `describedBy`, and `disabled` from `CoarFormField` the same way `CoarTextInput` does. New props: `disabled`, `error`, `placeholder`, `required`, `autofocus`, `id`, `name`, `height` (CSS string or number). New events: `focused`, `blurred`. New exposed method: `focus()`.
- **`variant: 'editor' \| 'inline'`**: compact form-field preset that turns off line numbers, gutter, folding, glyph margin, and context menu, and switches to tight padding + word-wrap + hover/focus ring matching `CoarTextInput`. `'editor'` (default) keeps the existing full-chrome IDE look.
- **`lineNumbers: boolean`**: explicit toggle that overrides the variant default (`'editor'` → on, `'inline'` → off). When line numbers are off a small decoration column stays visible so the text is not flush with the border.
- **`scriptMode: boolean`**: suppresses the diagnostic codes Monaco emits for "script body" code — top-level `return`/`await`/`export`, implicit any on injected globals, and unreachable-code warnings. Global side-effect on `typescriptDefaults`/`javascriptDefaults`; documented in the form-integration section of the Script Editor docs.
- **`preamble: string`**: hidden + auto-locked prefix providing per-editor type context (e.g. `"declare const query: TodoQuery;"`). Rendered invisibly above the user script via `setHiddenAreas`, protected from cursor/paste/edit by an internal preamble guard, and stripped from the emitted `modelValue` so it never round-trips through persistence.
- **Bundled `Cascadia Code` font**: `@cocoar/vue-ui/fonts` now also loads Cascadia Code (weights 400, 600, 700). Both `CoarCodeBlock` and `CoarScriptEditor` now prefer it over the previous Consolas/Monaco stack, with the same stack as fallback. Monaco gets `fontLigatures: true` so `!=`, `=>`, `===`, and friends render as combined glyphs. Consumers who import `@cocoar/vue-ui/fonts` get the upgrade for free; consumers who do not (or who ship their own font stylesheet) fall back to Consolas/Monaco as before.

### Docs

- **New "Script Editor" component page**: full guide with 6 live demos (basic TS, extraLibs, JSON, read-only + minimap, constrained mode with authoring toggle, and a form-integration demo with `CoarFormField` + preamble + extraLibs). Covers worker setup for SPA and SSR (VitePress / Nuxt / Astro), `theme="auto"` signal priority, JSON-schema configuration via Monaco escape hatch, security notes on untrusted `extraLibs.content`, and the full API reference with events and exposed methods.
- **Form-integration section** in the Script Editor page: explains `preamble` vs `extraLibs` with a decision table, documents the diagnostic codes `scriptMode` suppresses, and walks through the `variant="inline"` form-field look.

### Fixed

- **Overlay system — fixed-positioned descendants inside modals**: the `.coar-overlay-host` positioned itself via `transform: translate3d(...)`, which CSS spec-wise creates a containing block for every `position: fixed` descendant. Any component inside a dialog/menu/popover that relies on `position: fixed` for its own popups (Monaco's IntelliSense, floating tooltips, portal-style widgets) rendered at the overlay's offset instead of the viewport. Switched overlay positioning to plain `top`/`left` — stacking isolation is still provided by `position: fixed` + numeric `z-index`, and fixed descendants now resolve against the viewport as expected. Transparent to all existing Cocoar components.

### Internal

- **Playwright E2E infrastructure**: first end-to-end test suite in the repo, wired into `apps/playground`. Covers constrained-mode guards (`executeEdits` + keyboard flows), undo/redo granularity, paste-across-boundary, multi-cursor mixed-zone edits, authoring toggle, diagnostics filter, language switching, and editor-in-modal IntelliSense positioning. 54 unit tests + 31 E2E tests total for the new package.

---

## 1.8.0

### Added

- **Select sorting** (`sortGroups`, `sortOptions`): Two new props on `CoarSelect`, `CoarMultiSelect`, and `CoarTagSelect` to control the display order of groups and options. Both accept presets (`'asc'`, `'desc'`, `'none'`) or a custom comparator function. `sortOptions` works with and without groups — it sorts all options when ungrouped, or within each group when grouped. Defaults are backwards-compatible: `sortGroups='asc'` (alphabetical, as before), `sortOptions='none'` (input order, as before). New types: `CoarSelectSortGroups`, `CoarSelectSortOptions<T>`.

### Fixed

- **SubFlyout menu close chain**: Clicking a `CoarMenuItem` inside a `CoarSubFlyout` now closes the entire menu hierarchy (submenu + parent context menu). Previously, only the immediate submenu panel closed — the root `CoarContextMenu` stayed open, requiring consumers to manually call `menu.close()` in every handler.

### Docs

- **Select sorting section**: New "Sorting" section on the Select docs page with interactive `SortingDemo` (side-by-side grouped vs. ungrouped). All three playground demos (Select, MultiSelect, TagSelect) now include `sortGroups` and `sortOptions` controls. Props table updated with the new props.

---

## 1.7.0

### Added

- **CoarSelect / CoarMultiSelect — inline search**: When `searchable` is set, the trigger becomes an inline text input while the dropdown is open. Type to filter options in real-time. Space, Home, and End keys work correctly inside the search field.
- **CoarMultiSelect — selection tooltip**: When 2+ values are selected, hovering the trigger shows a tooltip listing all selected labels.
- **Select option grouping**: Options with a `group` property are now rendered under sticky group headers. Groups are sorted alphabetically; ungrouped options appear first. Works in all three variants (CoarSelect, CoarMultiSelect, CoarTagSelect).
- **CoarMenu — `#header` / `#footer` slots**: Fixed header and footer areas that stay in place while the menu content scrolls. Render only when the slot is provided.
- **CoarMenuHeading — `sticky` prop**: Opt-in sticky positioning so section headings stay visible while scrolling through long menus.

### Fixed

- **Tooltip not closing in collapsed sidebar**: Pointer-initiated focus (click/tap) no longer pins tooltips open via the `focus` reason. Only keyboard focus (Tab) keeps tooltips open until focus moves away. This fixes tooltips staying visible in the collapsed sidebar until clicking elsewhere.
- **CoarTagSelect — Space key in search**: Space now types a space character in the tag input instead of triggering option selection.

### Changed

- **Select search UX**: Replaced the dropdown search box with an inline search input in the trigger for CoarSelect and CoarMultiSelect, matching the pattern already used by CoarTagSelect. All three variants now use a consistent search approach.

### Docs

- **Select playground demos**: Interactive playgrounds for CoarSelect, CoarMultiSelect, and CoarTagSelect with toggleable props (searchable, clearable, grouped, disabled, readonly, error, size, appearance).
- **Select API table**: Documented missing props (searchable, clearable, readonly, appearance, compareWith, dropdownPosition).
- **Menu scrollable demo**: Updated with header (filter input), footer ("New project" action), and sticky headings toggle.

---

## 1.6.6

### Changed

- **`resetPersistedState(bucket?)`**: Now accepts an optional bucket parameter to reset only a specific width bucket (defaults to the current bucket). Previously reset all buckets.
- **`resetPersistedStates()`**: New method that resets all persisted column states across all buckets for a grid (the previous `resetPersistedState()` behavior).

---

## 1.6.5

### Added

- **Column state persistence** (`persistColumnState`): New builder method to persist column widths, order, visibility, and sort in IndexedDB. Grid width is rounded to configurable buckets (default: 100px) so different container sizes (monitor switch, sidebar collapse) each keep their own column layout. When no exact bucket exists, the nearest saved state is applied.
- **Live column sync**: Multiple grids sharing the same persistence key synchronize column changes instantly — resize, reorder, or hide a column in one grid and all others update immediately. Useful for comparison views with different filters on the same data structure.
- **`cleanupColumnStates(maxAgeDays)`**: Removes stale column state entries from IndexedDB that haven't been read or written within the specified number of days. Call once at application startup to prevent unbounded growth of persisted data.

### Changed

- **Dependency upgrades**: Vite 7→8, vue 3.5.32, vue-router 4→5, vitest 4.1, lucide-static 0.x→1.x, @vitejs/plugin-vue 6.0.5, eslint 10.2, typescript-eslint 8.58, maskito 5.2, turbo 2.9, overlayscrollbars 2.15, happy-dom 20.8, prettier 3.8.2, vitepress 1.6.4, mermaid 11.14, @js-temporal/polyfill 0.5.1, path-to-regexp 8.4.

---

## 1.6.4

### Changed

- **Form field label styling**: Labels now use `body-caption` tokens (`family`, `size`, `weight`) instead of `body-small-bold` / `component-m-label-font-size` for a more compact, consistent appearance across all form controls.
- **Tab padding**: Reduced tab button padding from `spacing-m / spacing-l` to `spacing-s / spacing-m` for tighter layout.

### Fixed

- **Date picker height mismatch**: `CoarPlainDatePicker`, `CoarPlainDateTimePicker`, and `CoarZonedDateTimePicker` reserved space for the hint/error message even when none was set, making them taller than other form controls (e.g. `CoarTextInput`). The message element is now conditionally rendered via `v-if`, and the fixed `height` / `min-height` + `visibility: hidden` workaround has been removed.

### Removed

- **`CoarLabel` component**: Removed the standalone `CoarLabel` component, its tests, exports, and documentation page. The component was unused by any input control or consumer app — labels are rendered directly by `CoarFormField` and the individual picker components.

---

## 1.6.3

### Added

- **Tag custom colors** (`variantFn`): New `variantFn` option on `TagCellRendererConfig` for dynamic tag styling. The function receives the raw cell value and can return:
  - A `TagVariant` string (`'success'`, `'error'`, …) for predefined variants
  - A CSS color string (`'#dc2626'`) — used as text+border color, background auto-calculated via `color-mix(in oklch)` for consistent light/dark mode appearance
  - A `TagColor` object (`{ bg, border?, text? }`) for full control
  - `undefined` to fall back to `variantMap`

### Fixed

- **Empty tag rendering**: `TagCellRenderer` no longer renders empty tags when a label is `""`, `undefined`, or `null`.

---

## 1.6.2

### Added

- **Locale-aware column renderers**: `date()`, `number()`, and `currency()` column factory methods now use cell renderer components with the localization system (`useL10n()`), updating reactively on locale change. Replaces the previous `valueFormatter`-based approach.
  - `date(field, config?)` — formats via `fmtDate()`, supports `{ includeTime: true }`
  - `number(field, config?)` — formats via `fmtNumber()`, supports `{ decimals: number }`
  - `currency(field, config?)` — formats via `fmtCurrency()`, supports `{ currencyCode: string }`
- **Locale switcher in docs**: VitePress nav bar now includes a `CoarSelect`-based locale switcher (`en-US`, `en-GB`, `de-DE`, `de-AT`, `fr-FR`, `ja-JP`) for live-testing locale-dependent rendering.

### Changed

- **`date()` replaces `localDate()`**: The `date()` factory method now uses the `DateCellRenderer` component (previously only available via `localDate()`). `localDate()` has been removed.
- **`number()` signature**: Changed from `number(field, decimals)` to `number(field, config?)` with `NumberCellRendererConfig`.
- **`currency()` signature**: Changed from `currency(field, currencyCode)` to `currency(field, config?)` with `CurrencyCellRendererConfig`.

### Fixed

- **TagCellRenderer variant matching**: `variantMap` now matches against the raw cell value instead of the formatted value, so `valueFormatter` no longer breaks variant resolution.
- **IconCellRenderer valueFormatter support**: Icon name now uses `valueFormatted` when available, keeping the raw value for sorting/filtering.
- **Currency symbol resolution**: `formatCurrency()` now resolves unknown currency symbols via `Intl.NumberFormat` instead of falling back to the raw currency code (e.g. `€` instead of `EUR`).
- **ja-JP date format**: Added `yyyy/mm/dd` date pattern and `zeroPad` flag to `CoarDateFormatData`. Japanese dates now correctly render as `2022/3/15` instead of `2022-03-15`.
- **Localization plugin init**: `setLanguage()` is now called on plugin install, so locale data is available immediately without requiring a manual language switch.

---

## 1.6.1

### Fixed

- **Data Grid dark mode**: Custom grid header (`CoarGridHeader`) now inherits `--ag-header-foreground-color` so text and sort icons render correctly in dark mode instead of staying black.

---

## 1.6.0

### Added

- **Sidebar navigation components**: New dedicated components for sidebar navigation, replacing the pattern of using `CoarMenu`/`CoarMenuItem` inside `CoarSidebar`:
  - **`CoarSidebarItem`**: Navigation item with `icon`, `label`, `active` state, and automatic tooltip in collapsed mode. No menu cascade/close logic — designed purely for persistent navigation.
  - **`CoarSidebarGroup`**: Expandable/flyout section with two modes:
    - `mode="expand"` (default): Animated inline panel (grid-based 0fr→1fr). Plus/minus icon indicator.
    - `mode="flyout"`: Floating panel positioned next to the sidebar via `Teleport`. Chevron icon indicator. Supports nested flyouts with parent-child cascade (hovering child keeps parent open).
  - **`CoarSidebarHeading`**: Section title that becomes a small spacer when collapsed (visual separation preserved without text).
  - **`CoarSidebarDivider`**: Simple visual separator line.
  - **`CoarSidebarSpacer`**: Vertical spacing component with `height` and `grow` props.
- **Flyout mode** (`mode="flyout"`) on `CoarSidebarGroup`: Opens a floating panel next to the sidebar instead of expanding inline. Flyout panels are teleported to `<body>` and positioned via `computeOverlayCoordinates`. Click-to-open by default, with optional `open-on-hover` prop for hover-triggered opening (200ms delay). Close-on-leave has a 300ms grace period so users can move to the panel without it closing.
- **Icon-only flyout** (`icon-only` prop on `CoarSidebarGroup`): Flyout items show as a vertical column of icons without labels, with tooltips on hover. Useful for compact action palettes. Nested flyout and expand groups inside icon-only flyouts automatically inherit the icon-only display.
- **Open on hover** (`open-on-hover` prop on `CoarSidebarGroup`): Opt-in hover-to-open behavior for flyout groups. Opens after 200ms hover delay, closes after 300ms leave delay. Touch-friendly default remains click-to-open.
- **Nested flyouts**: Flyout groups can be nested inside other flyouts. Parent-child cascade via `provide`/`inject` keeps parent panels open while interacting with children. Click-outside detection checks all flyout panels to prevent premature closing.
- **Expand in flyout**: Expand groups work inside flyout panels, including icon-only flyouts where children render as centered icons without labels or indentation.
- **Sidebar `size` prop**: Controls icon size — `'s'` (16px), `'m'` (20px, default), `'l'` (24px). Propagated to children via injection.
- **Sidebar collapsed UX**: `CoarSidebar` now provides its collapsed state to children via `inject`. Sidebar items automatically show right-aligned tooltips when collapsed. Smooth width transition on collapse/expand. Group triggers show icon badge (plus for expand, chevron for flyout) in collapsed mode.
- **Sidebar scoped slots**: `#header`, `#footer`, and the default slot now receive `{ collapsed }` so parent components can adapt their content (e.g. full logo vs. icon-only).
- **Sidebar CSS tokens**: New design tokens for sidebar items — `--coar-sidebar-item-padding`, `--coar-sidebar-item-hover`, `--coar-sidebar-item-active-color`, `--coar-sidebar-item-active-bg`, `--coar-sidebar-group-indent`, etc.
- **Force expand tree** (Data Grid): New `builder.forceExpanded(ref)` method. When the ref is `true`, all tree parents are expanded and chevron toggle is disabled. When it switches back to `false`, the previous open-state is restored.

### Changed

- **`CoarSidebar` collapsed prop**: Now emits `update:collapsed` for optional `v-model:collapsed` two-way binding. One-way `collapsed` prop still works as before.
- **Sidebar footer padding**: `--coar-sidebar-footer-padding` changed from `var(--coar-spacing-m)` to `0` so footer items stretch to full width like content items.

### Fixed

- **Tooltip empty rectangle**: `vTooltip` directive's `updated` hook now handles falsy values (`false`, `''`). Previously, switching tooltip config from an object to `false` left a visible empty rectangle.
- **Tooltip z-index**: Tooltip z-index increased to `calc(var(--coar-z-overlay,1000) + 1)` so tooltips render above flyout panels.

---

## 1.5.5

### Added

- **Custom data filter**: New `builder.customFilter((data, searchText) => filteredData | null)` method on `CoarGridBuilder`. Filters the **entire data array** before passing it to AG Grid, replacing the per-row quick filter. This enables filter logic that depends on related rows — e.g. keeping all siblings in a tree when any one matches the search. Returning `null` from the callback falls back to the default quick filter for that evaluation, allowing dynamic switching between custom and standard filtering.
- **Pipeline update triggers**: New `builder.updateOn(...sources)` method. Re-runs the data pipeline (filtering, tree flattening) when the given reactive sources change. Works with all pipeline modes (tree, flat+search, flat reactive) — useful when `customFilter` or `quickFilterFn` depends on external state like toggle flags.

---

## 1.5.4

### Fixed

- **Modal/Dialog centering**: Overlays now stay centered when their content grows after initial render (e.g. async data loading). Previously, `modalPreset` and `dialogPreset` skipped installing a `ResizeObserver` because their scroll strategy is `noop` — the overlay kept its initial position even as content changed size, resulting in more space above than below.

---

## 1.5.3

### Added

- **Scrollable Menu**: `CoarMenu` now uses overlay scrollbars (`v-scrollbar`) and scrolls automatically when content exceeds available height
- **`CoarSubFlyout`**: Renamed from `CoarSubmenuItem` for consistency with `CoarSubExpand`. Old name remains as deprecated alias for backwards compatibility.
- **Context Menu flyout demo**: New docs example showing flyout submenus inside context menus (status, priority selectors)

### Fixed

- **Context Menu flyout click**: Clicking a menu item inside a flyout submenu now correctly triggers the click handler. Previously the context menu closed before the handler fired because the teleported flyout panel was treated as "outside" the menu.
- **Cell text overflow**: Removed `display: flex` from `.ag-cell` — flex containers don't clip plain text children with `overflow: hidden`, causing text to bleed into adjacent cells. AG Grid handles vertical centering internally.
- **Scroll position reset**: Grid no longer jumps to top when data updates. Column definitions are now re-applied only once (on first data set) instead of on every update.
- **Toolbar padding**: Toolbar only has padding when `bordered` or `elevated` is set. Without those, only a gap between toolbar and grid is shown.
- **Empty toolbar visibility**: Toolbar is hidden when no slots have content and search is disabled (CSS `:has()` selector).

---

## 1.5.2

### Added

- **Unified toolbar**: `CoarDataGrid` now has built-in toolbar with `#toolbar-left`, `#toolbar-right` slots and `show-search` prop — replaces the need for `CoarDataGridPanel`. Toolbar appears automatically when search is enabled or any slot is used. Search input fills available space (`flex: 1`), actions are pushed to the right.
- **Appearance props**: `bordered` and `elevated` props on `CoarDataGrid` for border and elevation shadow. When toolbar is active, it gets padding while the grid sits flush.
- **Data Grid styles export**: `@cocoar/vue-data-grid/styles` now works without a Vite alias — added `./styles` to the package exports map.

### Changed

- **`CoarDataGridPanel` deprecated**: Use `CoarDataGrid` with `show-search` and `#toolbar-right` slot instead. `CoarDataGridPanel` remains as a thin wrapper for backwards compatibility.
- **Event handler composition**: `onRowClicked`, `onRowDoubleClicked`, `onCellClicked`, `onCellDoubleClicked` now use `#composeHandler` (multiple handlers are chained, not overwritten).
- **`onGridReady` isolation**: User's `builder.onGridReady()` handler no longer conflicts with internal grid initialization. `_bind()` always runs first, then the user handler.

### Fixed

- **Grid render flicker**: Fixed visible Layout Shift where columns animated from left to right on initial render. Root cause: AG Grid animates the `left` CSS property. Fix: `suppressColumnMoveAnimation` and `transition: none` on cells.
- **Flex columns with `rowDataRef`**: Fixed `flex()` and `autoSize('fitGridWidth')` not filling available width when using `rowDataRef()`. Column definitions are re-applied after data arrives to force a fresh flex layout pass.
- **Empty toolbar-right gap**: Fixed gap visible on the right side when no `#toolbar-right` slot content is provided.

---

## 1.5.1

### Fixed

- **Fragment parser bundle**: `vue`, `vue-router`, and `@cocoar/vue-ui` were embedded in the bundle instead of externalized, causing `injection "Symbol(route location)" not found` at runtime. Now correctly listed as rollup externals (bundle: 245 KB → 3.5 KB)

---

## 1.5.0

### Added

- **Quick Filter (Search)**: New `CoarDataGridSearch` and `CoarDataGridPanel` components for adding a search bar above the grid. `CoarDataGridPanel` combines search + grid in one component with a `#actions` slot for buttons. Search text filters row data before AG Grid using per-column configuration via `.quickFilter()`
- **Search highlighting**: `.searchHighlight()` on the builder enables the CSS Custom Highlight API to underline matching text in grid cells — no DOM manipulation, works with AG Grid virtualization
- **Tree Data**: `.treeData({ children, rowId })` enables hierarchical data with expand/collapse. New `col.tree()` column type renders indentation, animated chevron toggle, and child count. Search automatically expands matching branches
- **Row Drag & Drop**: `.rowDragManaged()` for flat list reordering with `.getDisplayedRowData()` to read the new order. `.onRowDragEnd()` callback for persisting changes
- **Tree Drag & Drop**: Drag rows between parents for reparenting. `.rowDragHighlight({ canDrop })` provides visual feedback — blue outline on valid targets, red dashed outline on invalid targets. Drop on empty area moves to root level
- **Tree meta access**: `builder.getTreeMeta(rowId)` exposes depth, hasChildren, isExpanded, and childCount — useful for custom `canDrop` validation (e.g., limiting nesting depth)
- **I18n column headers**: `.header('Name', 'i18n.key')` supports runtime language switching via `@cocoar/vue-localization` with automatic fallback when the package is not installed
- **Auto size**: `.autoSize('fitGridWidth')` and `.autoSize('fitCellContents')` for convenient column sizing
- **Fragment modal routing**: `@cocoar/vue-fragment-parser` now includes Vue composables for deep-linkable modals via URL fragments — `useFragmentNavigation()` (open/close modals by changing URL hash, `append` option for multi-modal), `useRoutedFragments()` (reactive fragment parsing), and `useRoutedModals()` (auto-open/close from URL). Two fragment types: `type: 'dialog'` (CoarDialog shell with header/title) and `type: 'modal'` (raw overlay, full control). Supports browser back/forward and deep-linking. `vue-router` and `@cocoar/vue-ui` are optional peer dependencies

### Fixed

- **Grid render flicker**: Fixed visible Layout Shift where columns animated from left to right on initial render. Root cause: AG Grid animates the `left` CSS property when positioning cells. Fix: `suppressColumnMoveAnimation` and `transition: none` on cells
- **Flex columns with `rowDataRef`**: Fixed `flex()` and `autoSize('fitGridWidth')` not filling available width when using `rowDataRef()`. Column definitions are re-applied after data arrives to force a fresh flex layout pass
- **Cell renderer scoped CSS**: Removed `scoped` from all AG Grid cell renderers (Tag, Icon, Date, Tree) — AG Grid doesn't apply Vue's `data-v-*` attributes, so scoped styles never matched
- **Cyclic dependency**: Removed unused `@cocoar/vue-fragment-parser` dependency from `@cocoar/vue-ui`
- **Turbo telemetry**: Disabled Turborepo telemetry in all CI workflows

### Docs

- **Data Grid**: Added interactive demos for Search, Tree Data, Row Drag & Drop, and Tree Drag & Drop with full API documentation including search highlighting, i18n headers, and auto size
- **Icons**: Added documentation for custom icon sources (SVG Map, HTTP Source, built-in overrides)
- **Fragment Parser & Modal Routing**: New documentation page with parser API, modal routing guide (composables, deep-linking, browser back), and step-by-step integration example
- **Playground app**: New `apps/playground/` for testing features that require Vue Router (fragment routing, etc.)
- **Markdown**: New documentation page for markdown parsing (`@cocoar/vue-markdown-core`) and rendering (`@cocoar/vue-markdown`)

---

## 1.3.0

### Added

- **Label position**: `CoarCheckbox` and `CoarRadioGroup` now support `labelPosition="before" | "after"` — place the label text before or after the control, matching the existing `CoarSwitch` API
- **Placeholder token**: New `--coar-text-placeholder` design token for consistent, clearly distinguishable placeholder styling across all input components

### Fixed

- **Placeholder color**: Placeholder text in all input components (TextInput, PasswordInput, NumberInput, Select, MultiSelect, TagSelect, PlainDatePicker, PlainDateTimePicker) was too dark and looked like actual input — now uses `--coar-text-placeholder` (`gray-400`) instead of `--coar-text-neutral-tertiary` (`gray-700`)

### Docs

- **Label Position demos**: New interactive examples for Checkbox, RadioGroup, and Switch showing `labelPosition="before"` vs `"after"`
- **API tables**: Updated props documentation for Checkbox and RadioGroup with the new `labelPosition` prop

---

## 1.2.0

### Added

- **Context Menu**: New `useContextMenu()` composable and `<CoarContextMenu>` component for right-click menus — handles positioning at cursor, viewport clamping, click-outside / Escape / scroll dismissal, and auto-close on item click
- **Data Grid context menu**: Works with `onCellContextMenu` and `onViewportContextMenu` — use separate `useContextMenu()` instances for cell vs. viewport right-clicks
- **Docs**: Context Menu documentation page with interactive demos (standalone, submenus, data grid integration)

---

## 1.1.0

### Added

- **Theming**: oklch-based color system — set `--coar-accent`, `--coar-success`, `--coar-error`, `--coar-warning`, `--coar-info` and all 10-step shade scales (50–900) auto-calculate for both light and dark mode
- **CoarSidebar**: New `variant` (`'primary' | 'secondary'`), `elevated`, and `borderless` props for visual customization
- **Kitchen Sink**: Full-page component showcase at `/foundations/kitchen-sink` for evaluating visual coherence
- **Theming guide**: New docs page at `/guide/theming` explaining color customization

### Fixed

- **Packaging**: `import '@cocoar/vue-ui/styles'` no longer crashes in consumer apps — moved OverlayScrollbars CSS import from `styles/all.css` (bare-specifier, unresolvable by PostCSS in consumer context) into `vScrollbar.ts` (bundled by Vite into `dist/index.css`)
- **Fonts export**: `@cocoar/vue-ui/fonts` now correctly points to compiled `dist/fonts.js` instead of unpublished `src/fonts.ts`
- **sideEffects**: Fixed `./src/fonts.ts` reference to `./dist/fonts.js` for correct tree-shaking

### Changed

- **Color primitives**: Replaced hand-picked hex values with oklch-based calculations — colors are now perceptually uniform across lightness levels, eliminating washed-out shades in dark mode and "baby blue" tints in light mode
- **Primary button**: Now uses `accent-500` (= exact brand color) instead of `accent-700` (darker shade) — `--coar-accent: #1183CD` means the primary button IS `#1183CD`
- **Build**: Added `fonts.ts` as second entry point, externalized `@fontsource/*` packages, removed `vite-plugin-css-injected-by-js` (not needed — hash mismatch was a misdiagnosis)
- **Sidebar variants**: `primary` = visually distinct from content (secondary background), `secondary` = same as content background

---

## 1.0.1

### Fixed

- **Temporal polyfill**: Moved `@js-temporal/polyfill` from optional peer dependency to regular dependency — fixes `Could not resolve "@js-temporal/polyfill"` errors in consuming apps using Vite

---

## 1.0.0

Initial release of the Cocoar Design System for Vue 3.

### Components

- **Form Controls**: Button, TextInput, PasswordInput, NumberInput, Select, MultiSelect, TagSelect, Checkbox, RadioGroup, Switch
- **Date & Time**: PlainDatePicker, PlainDateTimePicker, ZonedDateTimePicker, TimePicker, ScrollableCalendar
- **Navigation**: Menu, Sidebar, Navbar, Breadcrumb, Tabs, Pagination
- **Overlays**: Dialog, Popover, Popconfirm, Toast, Tooltip
- **Display**: Avatar, Badge, Card, CodeBlock, Divider, Label, Link, Note, ProgressBar, Spinner, Table, Tag
- **Utilities**: Icon, Scrollbar
- **Layout**: FormField — wrapper for label, hint, and validation around any form control
- **Transitions**: Fade, Slide, Scale, Collapse — pre-built Vue `<Transition>` wrappers using motion tokens
- **Data Grid**: AG Grid wrapper (`@cocoar/vue-data-grid`, separate package)
- **Markdown**: Markdown viewer (`@cocoar/vue-markdown`, separate package)

### Design System

- Two-layer token system: primitives referenced by semantic tokens
- 6 token categories: Color, Typography, Spacing, Radius, Shadow, Motion
- Light and dark mode via `.dark-mode` class (no JS at render time)
- CSS `@layer` cascade for predictable specificity
- Tablet-first design: touch interaction with desktop information density

### Localization

- All 57 built-in component strings (aria-labels, button text, placeholders) translatable via `useI18n()` from `@cocoar/vue-localization`
- English defaults — works without any configuration
- Locale-aware `firstDayOfWeek` detection via `Intl.Locale.getWeekInfo()`
- Date format pattern auto-detection from browser `Intl` API

### Responsive

- Date picker panels: viewport-clamped widths via CSS `min()`, stacked layout below 540px
- Overlay system: `shift` + `flip` positioning, `maxWidth: 'viewport'` constraint
- Typography scales across 3 breakpoints (1024px+, 768–1023px, <768px)

### Architecture

- Monorepo: pnpm workspaces + Turborepo
- 8 packages: `vue-ui`, `vue-data-grid`, `vue-markdown`, `vue-markdown-core`, `vue-localization`, `vue-fragment-parser`, docs, icons
- Self-hosted fonts via `@fontsource` (Poppins + Inter) — `import '@cocoar/vue-ui/fonts'`
- Overlay service with plugin architecture (`CoarOverlayPlugin` + `CoarOverlayHost`)
- Overlay companion detection for teleported dropdowns (Select inside overlays)
- Temporal API for date/time components — native in Chrome/Firefox/Edge, optional polyfill for Safari

### Accessibility

- ARIA attributes across all interactive components
- Keyboard navigation: roving tabindex in menus/tabs, arrow keys, Escape to close
- Focus management: focus trap in dialogs, focus restoration on close
- `prefers-reduced-motion` respected — all motion tokens collapse to 0ms
- Screen reader support: live regions for toasts, semantic roles, `aria-describedby` chains

### Documentation

- VitePress docs with 47 pages, deployed to docs.cocoar.dev via Shelf
- Interactive demos with source code preview
- i18n keys documented on each component page
- Design principles, typography, colors, spacing, motion foundations
- Localization guide: l10n formatting, i18n translations, timezone providers
- Form validation examples with vee-validate + Zod
- Error handling guide

### Bundle

- `@cocoar/vue-ui`: 378 KB JS (86 KB gzip), 167 KB CSS (17 KB gzip)
- Tree-shakeable: all dependencies externalized
- `@js-temporal/polyfill` included as dependency (Temporal API for date/time components)
