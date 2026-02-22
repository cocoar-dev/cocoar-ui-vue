# Contributing to Coar Design System — Vue

Thank you for your interest in contributing! This guide covers the conventions and workflow for this repository.

## Getting Started

1. Fork and clone the repo
2. Run `pnpm install`
3. Create a feature branch from `develop`: `git checkout -b feature/my-feature`
4. Make your changes
5. Run `pnpm build && pnpm test && pnpm lint` to verify
6. Submit a PR against `develop`

## Branch Naming

| Branch | Purpose |
|--------|---------|
| `develop` | Main development branch |
| `feature/*` | New features |
| `bugfix/*`, `fix/*` | Bug fixes |
| `release/*` | Release preparation |
| `hotfix/*` | Production hotfixes |

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

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
- Co-locate stories: `CoarButton.stories.ts` next to `CoarButton.vue`
- Co-locate tests: `CoarButton.test.ts` next to `CoarButton.vue`

### Composables

- Use for stateful/reactive logic (replaces Angular services)
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

## Storybook

- Stories live next to components: `src/CoarButton.stories.ts`
- The centralized Storybook (`apps/storybook/`) discovers them automatically
- Run: `pnpm storybook`

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
