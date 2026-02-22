# Naming Conventions

Consistent naming across the Coar Design System.

## Packages

| Pattern | Example |
|---------|---------|
| Vue component libraries | `@cocoar/vue-*` |
| Framework-agnostic utilities | `@cocoar/ts-utils` |

## Vue Components

| Concern | Convention | Example |
|---------|-----------|---------|
| Component name | `Coar` prefix, PascalCase | `CoarButton`, `CoarSelect` |
| File name | PascalCase `.vue` | `CoarButton.vue` |
| Props | camelCase | `isDisabled`, `variant` |
| Emits | camelCase, past tense | `clicked`, `changed` |
| Slots | kebab-case | `default`, `header-actions` |

## Composables

| Concern | Convention | Example |
|---------|-----------|---------|
| Name | `use` prefix, camelCase | `useLocalization`, `useBreakpoints` |
| File name | camelCase `.ts` | `useLocalization.ts` |
| Return value | Plain refs/computed/functions | `{ locale, t, setLocale }` |

## CSS

| Concern | Convention | Example |
|---------|-----------|---------|
| CSS custom properties | `--coar-` prefix | `--coar-color-primary` |
| Component class | `coar-` prefix, kebab-case | `.coar-button`, `.coar-select` |
| BEM modifier | Double dash | `.coar-button--primary` |
| BEM element | Double underscore | `.coar-button__label` |

## Files & Directories

| Concern | Convention | Example |
|---------|-----------|---------|
| Package directory | kebab-case | `packages/button/` |
| Source entry | `index.ts` | `src/index.ts` |
| Test file | `.test.ts` suffix | `CoarButton.test.ts` |
| Story file | `.stories.ts` suffix | `CoarButton.stories.ts` |
| Utility file | camelCase `.ts` | `clamp.ts` |
