<!-- Generated from apps/docs/components/date-picker.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Date Picker

A calendar-backed date picker that returns a `Temporal.PlainDate` -- a date without time or timezone. Perfect for birthdays, deadlines, due dates, and any scenario where "which day" is all that matters.

```ts
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
```

## Basic Usage

Click the input to open a calendar dropdown. The selected value is a proper `Temporal.PlainDate`, so date math and formatting are straightforward.

**Demo — `date-picker/demos/BasicDatePicker.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Select date">
      <CoarPlainDatePicker
        v-model="date"
        placeholder="DD.MM.YYYY"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ date?.toString() ?? 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const date = ref<Temporal.PlainDate | null>(null);
</script>
```

## Required & Error States

Combine `required` and `error` props for form validation. The required asterisk and error message integrate with the same patterns as every other Cocoar input.

**Demo — `date-picker/demos/DatePickerValidation.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Birth date" hint="Enter your date of birth" required>
      <CoarPlainDatePicker
        placeholder="DD.MM.YYYY"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField label="Expiry date" error="Date is in the past">
      <CoarPlainDatePicker
        placeholder="DD.MM.YYYY"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Disabled & Readonly

`disabled` greys out the entire picker; `readonly` lets users see the selected date but prevents changes.

**Demo — `date-picker/demos/DatePickerDisabledReadonly.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarPlainDatePicker placeholder="DD.MM.YYYY" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPlainDatePicker placeholder="DD.MM.YYYY" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Date Range (Manual)

For start/end date pairs, use two pickers and pass the start date as `:min` on the end picker. This prevents users from selecting an end date before the start.

**Demo — `date-picker/demos/DatePickerRange.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Start date">
      <CoarPlainDatePicker v-model="start" placeholder="From" />
    </CoarFormField>
    <CoarFormField label="End date">
      <CoarPlainDatePicker v-model="end" placeholder="To" :min="start ?? undefined" />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      Range: {{ start?.toString() ?? '?' }} &rarr; {{ end?.toString() ?? '?' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const start = ref<Temporal.PlainDate | null>(null);
const end = ref<Temporal.PlainDate | null>(null);
</script>
```

## Sizes

Four sizes to stay consistent with other form controls across your layout.

**Demo — `date-picker/demos/DatePickerSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPlainDatePicker size="xs" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPlainDatePicker size="s" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPlainDatePicker size="m" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPlainDatePicker size="l" placeholder="DD.MM.YYYY" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

> **Info**
>
> **Temporal.PlainDate:** This component uses the TC39 Temporal API (`@js-temporal/polyfill`). PlainDate represents a calendar date without time or timezone -- no more wrestling with midnight UTC offsets.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to input / calendar |
| `Enter` | Open calendar / select date |
| `Escape` | Close calendar dropdown |
| `Arrow Keys` | Navigate within the calendar |

### Screen Reader Support

- Label text announces on focus
- Selected date is read aloud
- Calendar navigation is keyboard accessible
- Required and error states announced

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `Temporal.PlainDate \| null` | `null` | Selected date |
| `placeholder` | `string` | `''` | Placeholder text |
| `min` | `Temporal.PlainDate` | `undefined` | Minimum selectable date |
| `max` | `Temporal.PlainDate` | `undefined` | Maximum selectable date |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](./form-field.md). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](./form-field.md)** — not on the picker. Wrap the picker in a `CoarFormField` to get a label, the required asterisk, validation messages and the inline status indicator. The picker auto-adopts the field's id, error state and `aria-describedby` via injection.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.datePicker.previousYear` | `'Previous year'` | Previous year button `aria-label` |
| `coar.ui.datePicker.nextYear` | `'Next year'` | Next year button `aria-label` |
| `coar.ui.datePicker.jumpToToday` | `'Jump to today\'s month'` | Scroll-to-today button `aria-label` |
| `coar.ui.datePicker.months` | `'Months'` | Month grid `aria-label` |
| `coar.ui.datePicker.dialog` | `'Date picker'` | Overlay dialog `aria-label` |
| `coar.ui.datePicker.clearDate` | `'Clear date'` | Clear button `aria-label` |
| `coar.ui.datePicker.openPicker` | `'Open picker'` | Calendar button `aria-label` |
