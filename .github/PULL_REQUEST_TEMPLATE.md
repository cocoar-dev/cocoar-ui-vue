<!--
Title: a Conventional Commit, e.g. `feat(calendar): selected day in the month grid` — see AGENTS.md.
The release notes are generated from it.
-->

## Summary

<!-- What does this PR do? Why is it needed? -->

## Changes

-

## Checklist

- [ ] Title is a Conventional Commit (`type(scope): subject`, `!` for a breaking change)
- [ ] Code follows [NAMING.md](../NAMING.md) conventions (`coar-` selectors, `Coar` classes, `--coar-*` CSS vars)
- [ ] CSS uses only design tokens (`var(--coar-*)`) — no hardcoded colors/spacing
- [ ] Tests cover changes and pass (`pnpm test`)
- [ ] Visual baselines pass (`node apps/playground/scripts/visual.mjs`); no `--default-` image changed, or the maintainer agreed
- [ ] VitePress docs demos updated/added if user-facing; `pnpm skill:sync` run and `skills/` committed
- [ ] No `console.log` — use logging packages from [`cocoar-logging`](https://github.com/cocoar-dev/cocoar-logging)
- [ ] Breaking changes documented with migration guide (if applicable)
- [ ] Accessibility tested (keyboard navigation, ARIA attributes)
