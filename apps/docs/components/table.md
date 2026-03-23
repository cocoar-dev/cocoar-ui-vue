# Table

A lightweight table wrapper that provides consistent styling, alternating row colors, and proper alignment out of the box. Use it whenever you need to present structured data -- user lists, order histories, configuration settings, or comparison grids.

```ts
import { CoarTable } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap standard `thead`, `tbody`, `tr`, `th`, and `td` elements. Alternating row colors are applied automatically to improve readability in longer datasets.

<preview path="./table/demos/TableBasic.vue" />

## Rich Cells

Table cells aren't limited to plain text. Embed avatars, tags, badges, and other components directly in cells to create information-dense but scannable rows.

<preview path="./table/demos/TableRichCells.vue" />

## Variants

The default striped style works well for most tables. Switch to `plain` for a minimal look, or `bordered` when you need explicit cell boundaries -- useful for dense data or comparison tables.

<preview path="./table/demos/TableVariants.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'plain' \| 'bordered'` | `'default'` | Table style variant |
| `compact` | `boolean` | `false` | Use compact cell padding |
| `hover` | `boolean` | `true` | Highlight rows on hover |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Native thead/tbody/tr/th/td elements |
