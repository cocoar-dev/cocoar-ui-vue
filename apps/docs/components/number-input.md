---
description: "CoarNumberInput — numeric input with min/max clamping, configurable step, optional stepper buttons, four sizes and standard form states"
devices: { desktop: ready, tablet: ready, phone: partial }
devicesNote: "Mobile sizes under .coar-mobile; the mobile presentation is still Preview."
---

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

Show `'increment'`, `'decrement'`, or `'both'` stepper buttons, or hide them with `'none'` (the default). Useful for quantity selectors, rating inputs, and anywhere precision matters.

<preview path="./number-input/demos/NumberInputStepper.vue" />

## States

All the standard form states are supported: `disabled`, `readonly`, `required`, and `error`.

<preview path="./number-input/demos/NumberInputStates.vue" />

## Sizes

Four size variants that align with every other Cocoar form control, so your layouts stay consistent.

<preview path="./number-input/demos/NumberInputSizes.vue" />

## Inline <Badge type="warning" text="Preview" /> {#inline}

`appearance="inline"` shows only the value until the field is hovered or edited, and `width="content"` fits the
field to its value with its prefix, suffix and steppers. How both behave and how to change the fills:
[Text Input](/components/text-input#inline).

<preview path="./number-input/demos/NumberInputInline.vue" />

## Prefix & Suffix Actions <Badge type="warning" text="Preview" /> {#actions}

`#prefixAction` and `#suffixAction` hold interactive content at the outer edges of the field, such as an inline
select for the currency of an amount. Unlike `prefix` and `suffix`, which show muted text, an action keeps the text
style of the field, and an inline select there runs to the edge, its fill following the field's corner. Both slots
get `{ disabled, readonly }` of the field.

<preview path="./number-input/demos/NumberInputCurrency.vue" />

An action is a field of its own: a select in it does not take the label, hint or error of the surrounding
`CoarFormField`, so give it its own name with `aria-label`. The same slots exist on
[Text Input](/components/text-input#actions).

## Exact entry <Badge type="warning" text="Preview" /> {#exact}

Leaving the field without changing its text never changes the value, also when the value has more digits than
`decimals` shows or lies outside `min` and `max`. Text that was edited is rounded and clamped.

For data that must not be altered, such as configuration values, `exact` turns off the mask, rounding and clamping.
It accepts the decimal separator of the locale or a point, and no thousands separators. Other text, or more digits
than `decimals` allows, stays in the field as an error, the value does not change, and `entry-refused` reports it.
Use `:decimals="null"` to allow any number of decimals.

```vue
<CoarNumberInput v-model="timeout" exact :decimals="null" locale="de-AT" @entry-refused="refused = $event" />
```

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

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.numberInput.clear` | `'Clear'` | Clear button `aria-label` |
| `coar.ui.numberInput.decrease` | `'Decrease value'` | Decrement button `aria-label` |
| `coar.ui.numberInput.increase` | `'Increase value'` | Increment button `aria-label` |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `number \| null` | `null` | Current numeric value |
| `placeholder` | `string` | `''` | Placeholder text |
| `min` | `number` | `undefined` | Minimum allowed value |
| `max` | `number` | `undefined` | Maximum allowed value |
| `step` | `number` | `1` | Step increment |
| `decimals` | `number \| null` | `0` | Number of decimal places. `null` <Badge type="warning" text="Preview" />: as many as the value has |
| `exact` <Badge type="warning" text="Preview" /> | `boolean` | `false` | Stores the value as typed or not at all, see [Exact entry](#exact) |
| `prefix` | `string` | `''` | Prefix text |
| `suffix` | `string` | `''` | Suffix text (e.g. '%', 'EUR') |
| `stepperButtons` | `'none' \| 'increment' \| 'decrement' \| 'both'` | `'none'` | Stepper button mode |
| `clearable` | `boolean` | `false` | Show clear button when input has value |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `appearance` <Badge type="warning" text="Preview" /> | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` <Badge type="warning" text="Preview" /> | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the shown value or placeholder |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `prefix` | — | Muted content before the value |
| `suffix` | — | Muted content after the value |
| `prefixAction` <Badge type="warning" text="Preview" /> | `{ disabled: boolean, readonly: boolean }` | Interactive content at the start edge, see [Actions](#actions) |
| `suffixAction` <Badge type="warning" text="Preview" /> | `{ disabled: boolean, readonly: boolean }` | Interactive content at the end edge, see [Actions](#actions) |
