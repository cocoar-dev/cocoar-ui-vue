# Coar Design System — Vue

> **Documentation:** [docs.cocoar.dev/cocoar-ui-vue](https://docs.cocoar.dev/cocoar-ui-vue/) — live demos, API reference, and design foundations.

## Tech Stack

| Concern | Tool |
|---------|------|
| Package manager | pnpm (workspaces) |
| Task orchestration | Turborepo |
| Framework | Vue 3 |
| Language | TypeScript |
| Build | Vite (library mode) |
| Testing | Vitest + @vue/test-utils |
| Documentation | VitePress |
| Linting | ESLint (flat config) + Prettier |

## Repository Structure

```
cocoar-ui-vue/
├── packages/
│   ├── ui/                  @cocoar/vue-ui                  Main component library
│   ├── localization/        @cocoar/vue-localization        i18n, L10n, and timezone support
│   ├── data-grid/           @cocoar/vue-data-grid           Data grid component
│   ├── calendar/            @cocoar/vue-calendar            Calendar & timeline views
│   ├── page-builder/        @cocoar/vue-page-builder        Visual page builder + renderer
│   ├── document-viewer/     @cocoar/vue-document-viewer     PDF / image document viewer
│   ├── script-editor/       @cocoar/vue-script-editor       Monaco-based TS/JS editor
│   ├── markdown/            @cocoar/vue-markdown            Markdown viewer component
│   ├── markdown-core/       @cocoar/vue-markdown-core       Markdown parser
│   ├── markdown-editor/     @cocoar/vue-markdown-editor     Milkdown-based markdown editor
│   ├── markdown-mermaid/    @cocoar/vue-markdown-mermaid    Mermaid fence-renderer adapter
│   ├── mermaid/             @cocoar/vue-mermaid             Standalone Mermaid diagrams
│   ├── map/                 @cocoar/vue-map                 Interactive Leaflet map
│   ├── file-explorer-core/  @cocoar/vue-file-explorer-core  Headless file-explorer engine
│   ├── fragment-parser/     @cocoar/vue-fragment-parser     URL fragment routing utilities
│   └── icons/               @cocoar/icons-cli               Icon generation CLI
├── apps/
│   ├── docs/              VitePress documentation      Component docs & demos
│   └── playground/        Vue Router playground        Component debugging app
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

## Agent skill

`@cocoar/vue-ui` ships an [Agent Skill](https://agentskills.io/): the documentation, page by
page, with every demo inlined and an index that says which page answers what. Install it into a
project and Claude Code, Cursor, Codex or Copilot know the library:

```bash
npx @cocoar/vue-ui skill
```

That is the version you have installed, handed to the [skills CLI](https://github.com/vercel-labs/skills)
(options such as `-g` or `-a claude-code` pass through). Alternatives: `npx skills add cocoar-dev/cocoar-ui-vue`
for the latest docs straight from GitHub, or `agentskills-cli add @cocoar/vue-ui` with
[agentskills-cli](https://mysticmind.github.io/agentskills-cli/).

The skill is generated from `apps/docs` by `pnpm skill:sync` into `skills/cocoar-vue-ui/`
(the only hand-written part is `apps/docs/skill/SKILL.header.md`); CI fails when the docs and
the skill drift. The docs site also serves [llms.txt](https://docs.cocoar.dev/cocoar-ui-vue/llms.txt)
for assistants that read documentation by URL.

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
| `pnpm docs` | Start VitePress docs dev server |
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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[Apache License 2.0](LICENSE) — Copyright (c) 2026 COCOAR e.U.
