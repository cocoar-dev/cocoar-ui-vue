# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

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

### Architecture

- Monorepo: pnpm workspaces + Turborepo
- 8 packages: `vue-ui`, `vue-data-grid`, `vue-markdown`, `vue-markdown-core`, `vue-localization`, `vue-fragment-parser`, docs, icons
- Self-hosted fonts via `@fontsource` (Poppins + Inter) — `import '@cocoar/vue-ui/fonts'`
- Overlay service with plugin architecture (`CoarOverlayPlugin` + `CoarOverlayHost`)
- Temporal API for date/time components — native in Chrome/Firefox/Edge, optional polyfill for Safari

### Accessibility

- ARIA attributes across all interactive components
- Keyboard navigation: roving tabindex in menus/tabs, arrow keys, Escape to close
- Focus management: focus trap in dialogs, focus restoration on close
- `prefers-reduced-motion` respected — all motion tokens collapse to 0ms
- Screen reader support: live regions for toasts, semantic roles, `aria-describedby` chains

### Documentation

- VitePress docs with 45+ pages
- Interactive demos with source code preview
- Design principles, typography, colors, spacing, motion foundations
- Form validation examples with vee-validate + Zod

### Bundle

- `@cocoar/vue-ui`: 378 KB JS (86 KB gzip), 167 KB CSS (17 KB gzip)
- Tree-shakeable: all dependencies externalized
- `@js-temporal/polyfill` optional peer dependency
