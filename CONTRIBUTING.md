# Contributing to Coar Design System — Vue

Thank you for your interest in contributing! This guide covers the conventions and workflow for this repository.

## Getting Started

1. Fork and clone the repo
2. Run `pnpm install`
3. Create a branch from `develop` named for the type of the change: `git checkout -b feat/my-feature`
4. Make your changes
5. Run `pnpm build && pnpm test && pnpm lint` to verify
6. Submit a PR against `develop`

## Branch Naming

| Branch | Purpose |
|--------|---------|
| `develop` | Main development branch — changes arrive only through pull requests |
| `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `perf/*`, `test/*`, `ci/*`, `build/*`, `chore/*` | A change, named for its Conventional Commit type |
| `release/X.Y` | Only when a fix must reach an older minor while `develop` has moved on |
| `support/X.x` | Fixes of an older major |

How changes are checked and released: [AGENTS.md](AGENTS.md).

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit subjects **and pull request titles**. Pull requests are squash-merged with their title as the commit; CI checks the title, and the release notes are generated from the titles (types and scopes: [`scripts/commit-types.mjs`](scripts/commit-types.mjs)):

```
feat(button): add loading state
fix(core): handle edge case in clamp
chore: update dependencies
docs: improve README
```

## Code Conventions

### Vue Components

- Use `<script setup lang="ts">` for all components
- Define props with `defineProps<T>()` (TypeScript-first)
- Define emits with `defineEmits<T>()`
- Prefix component names with `Coar` (e.g. `CoarButton`, `CoarSelect`)
- Co-locate tests: `CoarButton.test.ts` next to `CoarButton.vue`

### Composables

- Use for stateful/reactive logic (shared state, side effects)
- Prefix with `use` (e.g. `useLocalization`, `useBreakpoints`)
- Return plain refs/computed/functions — no classes

### CSS

- Use CSS variables from the design system: `var(--coar-*)`
- No hardcoded colors, spacing, or font sizes
- Scope styles with `<style scoped>` in components

### Naming

See [NAMING.md](NAMING.md) for the full naming convention.

## Testing

- Write unit tests with **Vitest** and **@vue/test-utils**
- Component tests use `happy-dom` environment
- Run tests: `pnpm test`

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
