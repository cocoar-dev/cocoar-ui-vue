<!-- Generated from apps/docs/components/number-input.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Number Input

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
| `decimals` | `number` | `0` | Number of decimal places |
| `prefix` | `string` | `''` | Prefix text |
| `suffix` | `string` | `''` | Suffix text (e.g. '%', 'EUR') |
| `stepperButtons` | `'none' \| 'increment' \| 'decrement' \| 'both'` | `'none'` | Stepper button mode |
| `clearable` | `boolean` | `false` | Show clear button when input has value |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
