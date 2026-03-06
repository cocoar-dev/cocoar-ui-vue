# Coar Design System — Vue

Vue 3 component libraries for the [Coar Design System](https://github.com/cocoar-dev/cocoar-ui), built as a pnpm monorepo with Turborepo.

> **Status:** Active development — core component library and design tokens are in place, new components are being added continuously.

## Tech Stack

| Concern | Tool |
|---------|------|
| Package manager | pnpm (workspaces) |
| Task orchestration | Turborepo |
| Framework | Vue 3 |
| Language | TypeScript |
| Build | Vite (library mode) |
| Testing | Vitest + @vue/test-utils |
| Component showcase | Storybook 10 |
| Linting | ESLint (flat config) + Prettier |

## Repository Structure

```
cocoar-ui-vue/
├── packages/
│   ├── ui/                @cocoar/vue-ui              Main component library
│   ├── localization/      @cocoar/vue-localization     i18n, L10n, and timezone support
│   ├── data-grid/         @cocoar/vue-data-grid        Data grid component
│   ├── markdown/          @cocoar/vue-markdown         Markdown viewer component (optional)
│   ├── markdown-core/     @cocoar/vue-markdown-core    Markdown parser
│   └── fragment-parser/   @cocoar/vue-fragment-parser  HTML fragment parsing utilities
├── apps/
│   └── storybook/         Centralized Storybook 10    Component showcase & docs
├── assets/
│   └── icons/             Source SVG icon set
├── scripts/
│   └── icons/             Icon build tooling
├── turbo.json             Turborepo pipeline config
├── tsconfig.base.json     Shared TypeScript config
├── eslint.config.js       ESLint flat config
└── vitest.config.ts       Vitest multi-package config
```

## Components (`@cocoar/vue-ui`)

| Category | Components |
|----------|-----------|
| Inputs | `CoarButton`, `CoarCheckbox`, `CoarNumberInput`, `CoarPasswordInput`, `CoarRadioGroup`, `CoarSelect`, `CoarMultiSelect`, `CoarTagSelect`, `CoarSwitch`, `CoarTextInput` |
| Date & Time | `CoarPlainDatePicker`, `CoarPlainDateTimePicker`, `CoarZonedDateTimePicker`, `CoarTimePicker`, `CoarScrollableCalendar` |
| Navigation | `CoarMenu`, `CoarNavbar`, `CoarSidebar`, `CoarBreadcrumb`, `CoarTabs`, `CoarPagination` |
| Overlays | `CoarDialog`, `CoarPopover`, `CoarPopconfirm`, `CoarToast`, `CoarTooltip` |
| Display | `CoarAvatar`, `CoarBadge`, `CoarCard`, `CoarCodeBlock`, `CoarDivider`, `CoarLabel`, `CoarLink`, `CoarNote`, `CoarProgressBar`, `CoarSpinner`, `CoarTable`, `CoarTag` |
| Utilities | `CoarIcon`, `CoarScrollbar` |

`CoarMarkdown` is in the optional `@cocoar/vue-markdown` package.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.x (managed via [Volta](https://volta.sh/))
- [pnpm](https://pnpm.io/) 10.x

### Install

```bash
pnpm install
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages (topological order) |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm storybook` | Start Storybook dev server |
| `pnpm build:icons` | Rebuild icon components from SVG sources |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |

### Adding a New Package

1. Copy an existing package directory (e.g. `packages/localization/`)
2. Rename and update `package.json` (name, dependencies)
3. Update `tsconfig.json` if needed
4. Run `pnpm install` to link the new package

### Cross-Package Dependencies

Use the workspace protocol for inter-library dependencies:

```json
{
  "dependencies": {
    "@cocoar/vue-localization": "workspace:*"
  }
}
```

Turborepo ensures packages build in the correct topological order.

## Related

- [cocoar-ui](https://github.com/cocoar-dev/cocoar-ui) — Angular version of the Coar Design System

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[Apache License 2.0](LICENSE) — Copyright (c) 2026 COCOAR e.U.
