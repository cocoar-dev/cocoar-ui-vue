<!-- Generated from apps/docs/components/number-input.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Number Input

**Devices:** desktop ready · tablet ready · phone partial — Mobile sizes under .coar-mobile; the mobile presentation is still Preview.

A purpose-built input for numeric values. It enforces min/max bounds, supports configurable step increments, and offers optional stepper buttons so users can nudge values up or down without typing.

```ts
import { CoarNumberInput } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a number with `v-model`. The component handles parsing and formatting automatically -- users can only enter valid numeric characters.

**Demo — `number-input/demos/BasicNumberInput.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Count" hint="Whole numbers only">
      <CoarNumberInput
        v-model="value"
        placeholder="Enter a number"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ value ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref<number | null>(null);
</script>
```

## Min / Max / Step

Set boundaries with `min` and `max`, and control the increment size with `step`. Values are clamped on blur and via stepper controls.

**Demo — `number-input/demos/NumberInputMinMaxStep.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Percentage" hint="0-100 in steps of 5">
      <CoarNumberInput
        v-model="percentage"
        :min="0"
        :max="100"
        :step="5"
        suffix="%"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ percentage ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const percentage = ref<number | null>(75);
</script>
```

## Stepper Buttons

Show `'increment'`, `'decrement'`, or `'both'` stepper buttons, or hide them with `'none'` (the default). Useful for quantity selectors, rating inputs, and anywhere precision matters.

**Demo — `number-input/demos/NumberInputStepper.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Quantity (both)">
      <CoarNumberInput
        v-model="quantity"
        stepper-buttons="both"
        :min="1"
        :max="99"
      />
    </CoarFormField>
    <CoarFormField label="Price (increment only)">
      <CoarNumberInput
        v-model="price"
        stepper-buttons="increment"
        :min="0"
        :step="0.01"
        suffix="€"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const quantity = ref<number | null>(1);
const price = ref<number | null>(null);
</script>
```

## States

All the standard form states are supported: `disabled`, `readonly`, `required`, and `error`.

**Demo — `number-input/demos/NumberInputStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarNumberInput :model-value="42" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarNumberInput :model-value="42" :readonly="true" />
    </CoarFormField>
    <CoarFormField label="Required" required>
      <CoarNumberInput :required="true" placeholder="Required" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Value must be between 1 and 100">
      <CoarNumberInput />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four size variants that align with every other Cocoar form control, so your layouts stay consistent.

**Demo — `number-input/demos/NumberInputSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarNumberInput size="xs" placeholder="xs" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarNumberInput size="s" placeholder="s" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarNumberInput size="m" placeholder="m" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarNumberInput size="l" placeholder="l" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Inline (Preview) {#inline}

`appearance="inline"` shows only the value until the field is hovered or edited, and `width="content"` fits the
field to its value with its prefix, suffix and steppers. How both behave and how to change the fills:
[Text Input](./text-input.md#inline).

**Demo — `number-input/demos/NumberInputInline.vue`**

```vue
<template>
  <p style="margin: 0; line-height: 2.4;">
    Order
    <CoarNumberInput v-model="quantity" appearance="inline" width="content" :min="1" stepper-buttons="both" />
    units at
    <CoarNumberInput v-model="price" appearance="inline" width="content" :decimals="2" suffix="EUR" />
    each.
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';

const quantity = ref<number | null>(3);
const price = ref<number | null>(49.9);
</script>
```

## Prefix & Suffix Actions (Preview) {#actions}

`#prefixAction` and `#suffixAction` hold interactive content at the outer edges of the field, such as an inline
select for the currency of an amount. Unlike `prefix` and `suffix`, which show muted text, an action keeps the text
style of the field, and an inline select there runs to the edge, its fill following the field's corner. Both slots
get `{ disabled, readonly }` of the field.

**Demo — `number-input/demos/NumberInputCurrency.vue`**

```vue
<template>
  <CoarFormField label="Price" style="max-width: 260px;">
    <CoarNumberInput v-model="amount" :decimals="2" placeholder="0.00">
      <template #suffixAction="{ disabled, readonly }">
        <CoarSelect
          v-model="currency"
          :options="currencies"
          aria-label="Currency"
          appearance="inline"
          width="content"
          :disabled="disabled"
          :readonly="readonly"
        />
      </template>
    </CoarNumberInput>
  </CoarFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarNumberInput, CoarSelect } from '@cocoar/vue-ui';

const amount = ref<number | null>(129.9);
const currency = ref<string | null>('EUR');
const currencies = ['EUR', 'USD', 'CHF'].map((value) => ({ value, label: value }));
</script>
```

An action is a field of its own: a select in it does not take the label, hint or error of the surrounding
`CoarFormField`, so give it its own name with `aria-label`. The same slots exist on
[Text Input](./text-input.md#actions).

## Exact entry (Preview) {#exact}

Leaving the field without changing its text never changes the value, also when the value has more digits than
`decimals` shows or lies outside `min` and `max`. Text that was edited is rounded and clamped: while typing, or
with `clampOnBlur` only when the field is left.

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

> **Info**
>
> Stepper buttons are keyboard accessible. Min/max bounds are enforced on blur and via stepper controls.

### Screen Reader Support

- Label text announces on focus
- Required state properly communicated
- Error messages linked via `aria-describedby`
- Value constraints announced through `aria-valuemin`, `aria-valuemax`

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

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
| `decimals` | `number \| null` | `0` | Number of decimal places. `null` (Preview): as many as the value has |
| `clampOnBlur` (Preview) | `boolean` | `false` | `min` and `max` apply when the field is left, not already while typing |
| `exact` (Preview) | `boolean` | `false` | Stores the value as typed or not at all, see [Exact entry](#exact) |
| `prefix` | `string` | `''` | Prefix text |
| `suffix` | `string` | `''` | Suffix text (e.g. '%', 'EUR') |
| `stepperButtons` | `'none' \| 'increment' \| 'decrement' \| 'both'` | `'none'` | Stepper button mode |
| `clearable` | `boolean` | `false` | Show clear button when input has value |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `appearance` (Preview) | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` (Preview) | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the shown value or placeholder |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `prefix` | — | Muted content before the value |
| `suffix` | — | Muted content after the value |
| `prefixAction` (Preview) | `{ disabled: boolean, readonly: boolean }` | Interactive content at the start edge, see [Actions](#actions) |
| `suffixAction` (Preview) | `{ disabled: boolean, readonly: boolean }` | Interactive content at the end edge, see [Actions](#actions) |
