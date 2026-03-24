# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

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
