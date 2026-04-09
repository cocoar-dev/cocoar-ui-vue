# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

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
