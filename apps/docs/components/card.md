# Card

Cards group related content into a visually distinct container, making it easy for users to scan and interact with discrete chunks of information. Use them for dashboards, content feeds, settings panels, or anywhere you need clear visual boundaries.

```ts
import { CoarCard } from '@cocoar/vue-ui';
```

## Basic Usage

A straightforward card with a title and body text. Cards provide structure without imposing rigid layout rules -- just slot in whatever content you need.

<preview path="./card/demos/CardBasic.vue" />

## Elevated vs Outlined

Choose `elevated` for cards that need to stand out from the page (primary content), or `outlined` for a subtler border-based style that sits flatter in the layout.

<preview path="./card/demos/CardElevatedOutlined.vue" />

## Color Variants

Semantic color variants add a tinted background to convey meaning at a glance -- info for tips, success for confirmations, warning and error for alerts.

<preview path="./card/demos/CardVariants.vue" />

## Padding Sizes

Adjust internal spacing to suit your content density. Use `s` for compact data cards, `m` for general use, and `l` when the card is the primary focus of the page.

<preview path="./card/demos/CardPadding.vue" />

## Rich Content Example

Cards shine when combining multiple elements. Here a header, tags, body text, and action buttons work together inside a single card.

<preview path="./card/demos/CardRichContent.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'neutral' \| 'outlined' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Card color/style variant |
| `padding` | `'none' \| 's' \| 'm' \| 'l'` | `'m'` | Internal padding size |
| `elevated` | `boolean` | `false` | Add box shadow for elevation |
| `borderless` | `boolean` | `false` | Hide the border |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Card content |
| `#header` | Fixed header area |
| `#footer` | Fixed footer area |
| `#inset` | Full-width inset area (negative margins) |
