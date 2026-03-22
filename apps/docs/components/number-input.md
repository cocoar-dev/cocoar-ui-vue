# Number Input

A purpose-built input for numeric values. It enforces min/max bounds, supports configurable step increments, and offers optional stepper buttons so users can nudge values up or down without typing.

```ts
import { CoarNumberInput } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a number with `v-model`. The component handles parsing and formatting automatically -- users can only enter valid numeric characters.

<preview path="./number-input/demos/BasicNumberInput.vue" />

## Min / Max / Step

Set boundaries with `min` and `max`, and control the increment size with `step`. Values are clamped on blur and via stepper controls.

<preview path="./number-input/demos/NumberInputMinMaxStep.vue" />

## Stepper Buttons

Place increment/decrement buttons at the `'start'`, `'end'`, `'both'` sides, or hide them with `'none'`. Useful for quantity selectors, rating inputs, and anywhere precision matters.

<preview path="./number-input/demos/NumberInputStepper.vue" />

## States

All the standard form states are supported: `disabled`, `readonly`, `required`, and `error`.

<preview path="./number-input/demos/NumberInputStates.vue" />

## Sizes

Four size variants that align with every other Cocoar form control, so your layouts stay consistent.

<preview path="./number-input/demos/NumberInputSizes.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to input |
| `Arrow Up` | Increment value by step |
| `Arrow Down` | Decrement value by step |

::: info
Stepper buttons are keyboard accessible. Min/max bounds are enforced on blur and via stepper controls.
:::

### Screen Reader Support

- Label text announces on focus
- Required state properly communicated
- Error messages linked via `aria-describedby`
- Value constraints announced through `aria-valuemin`, `aria-valuemax`

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `number \| null` | `null` | Current numeric value |
| `label` | `string` | `''` | Label text |
| `placeholder` | `string` | `''` | Placeholder text |
| `min` | `number` | `-Infinity` | Minimum allowed value |
| `max` | `number` | `Infinity` | Maximum allowed value |
| `step` | `number` | `1` | Step increment |
| `suffix` | `string` | `''` | Suffix text (e.g. '%', 'EUR') |
| `stepperButtons` | `'start' \| 'end' \| 'both' \| 'none'` | `'none'` | Show stepper buttons |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `string` | `''` | Error message |
