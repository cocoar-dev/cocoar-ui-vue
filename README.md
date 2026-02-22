# Coar Design System — Vue

Vue 3 component libraries for the [Coar Design System](https://github.com/cocoar-dev/cocoar-ui), built as a pnpm monorepo with Turborepo.

> **Status:** Early development — monorepo infrastructure is in place, library migration from Angular is in progress.

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
│   ├── core/           @cocoar/vue-core            Shared utilities and composables
│   └── button/         @cocoar/vue-button           Button component (demo)
├── apps/
│   └── storybook/      Centralized Storybook 10    Component showcase & docs
├── turbo.json          Turborepo pipeline config
├── tsconfig.base.json  Shared TypeScript config
├── eslint.config.js    ESLint flat config
└── vitest.workspace.ts Vitest multi-package config
```

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
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |

### Adding a New Library

1. Copy an existing package directory (e.g. `packages/button/`)
2. Rename and update `package.json` (name, dependencies)
3. Update `tsconfig.json` if needed
4. Run `pnpm install` to link the new package
5. Add stories in `src/*.stories.ts` — Storybook picks them up automatically

### Cross-Package Dependencies

Use the workspace protocol for inter-library dependencies:

```json
{
  "dependencies": {
    "@cocoar/vue-core": "workspace:*"
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
