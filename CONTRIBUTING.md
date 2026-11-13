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

## Mobile Contributions

What runs without `.coar-mobile` must keep its look and behaviour ([stability promise](apps/docs/foundations/design-principles.md#stability-promise-for-web-apps)):

- **The default presentation does not change.** The playground's visual baselines compare it pixel for pixel on every pull request; see [apps/playground/visual/README.md](apps/playground/visual/README.md).
- **Mobile sizes only under `.coar-mobile`**, through `--coar-*` tokens whose fallback is today's value.
- **Behaviour follows the input, never the class.** Hover, drag and gestures depend on the input device (`(hover: hover)`, the pointer type of the event), not on `.coar-mobile`.
- **A new or changed state gets a story and baselines** in the same pull request.
- **Update the page's `devices` line** (`apps/docs/components/…`), and its `devicesNote` when a limit changes; the values are explained in the [mobile guide](apps/docs/guide/mobile.md#device-support).
- **New API carries the Preview badge.**

## Testing

- Write unit tests with **Vitest** and **@vue/test-utils**
- Component tests use `happy-dom` environment
- Run tests: `pnpm test`
- `pnpm test` also runs the Playwright tests of the playground (`apps/playground/e2e`). Install
  their browsers once: `pnpm --filter @cocoar/playground exec playwright install chromium webkit`
- Playwright has two projects: `chromium` (desktop Chrome) runs every spec; `webkit-tablet` (WebKit
  with the iPad (gen 7) profile: touch, tablet viewport) runs only the tests tagged `@touch`. Tag a
  test `{ tag: '@touch' }` when it operates components by touch (`locator.tap()`,
  `page.touchscreen`) and uses no Chromium-only API such as CDP's `Input.dispatchTouchEvent`. The
  tag alone does not enable touch in `chromium` (desktop Chrome has it off): the file or its
  `describe` also needs `test.use({ hasTouch: true })`, or `tap()` fails there. Only the tagged
  tests: `pnpm --filter @cocoar/playground exec playwright test --grep @touch`
- Playwright's WebKit is the engine of every iPad and iPhone browser, not iOS Safari itself: it
  proves the engine and its touch events, not iOS gestures, the soft keyboard or Safari's hover
  heuristics

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
