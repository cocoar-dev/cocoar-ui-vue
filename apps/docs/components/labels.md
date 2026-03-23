# Labels

Standalone form labels with an optional required asterisk and hint text. Most Cocoar inputs manage their own label via `CoarFormField`, but `CoarLabel` is available when you need to pair a label with a native `<input>`, a third-party control, or a custom layout.

```ts
import { CoarLabel } from '@cocoar/vue-ui';
```

## Basic Label

At its simplest, just pass a `text` prop.

<preview path="./labels/demos/BasicLabel.vue" />

## Required

Set `required` to append a red asterisk, visually signaling that the field must be filled in.

<preview path="./labels/demos/LabelRequired.vue" />

## Sizes

Four sizes so labels scale with whatever form density you are designing for.

<preview path="./labels/demos/LabelSizes.vue" />

## Associated with Input

Pass a `for` value matching the target element's `id` to create a proper `<label>`/`<input>` association. Clicking the label will focus the input, and assistive technology will announce the relationship.

<preview path="./labels/demos/LabelAssociated.vue" />

## Accessibility

::: info
Labels use the native `<label>` element with the `for` attribute when provided, ensuring proper association with form controls for assistive technology.
:::

### Screen Reader Support

- Label text announces when the associated input receives focus
- Required asterisk is properly announced

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `undefined` | Label text (alternative to default slot) |
| `for` | `string` | `undefined` | Associated input's `id` |
| `required` | `boolean` | `false` | Show required asterisk |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Label size |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Label content (used when `text` prop is not set) |
