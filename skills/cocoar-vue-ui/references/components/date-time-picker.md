<!-- Generated from apps/docs/components/date-time-picker.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# DateTime Picker

Combines a calendar date picker with a time input and returns a `Temporal.PlainDateTime` -- a date and time without any timezone attached. Use this when the timezone is implicit (the user's local time) or irrelevant (an alarm, a reminder). If you need timezone awareness, reach for the [Zoned DateTime Picker](./zoned-date-time-picker.md) instead.

```ts
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
```

## Basic Usage

Select a date from the calendar, then adjust the time. The bound value is a `Temporal.PlainDateTime` you can format, compare, or serialize as needed.

**Demo — `date-time-picker/demos/BasicDateTimePicker.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Appointment">
      <CoarPlainDateTimePicker
        v-model="dateTime"
        placeholder="DD.MM.YYYY HH:mm"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ dateTime?.toString() ?? 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const dateTime = ref<Temporal.PlainDateTime | null>(null);
</script>
```

## States

Supports `required`, `error`, `disabled`, and `readonly` -- the same set of states you will find on every Cocoar form control.

**Demo — `date-time-picker/demos/DateTimePickerStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Required" required>
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :required="true" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Invalid date/time">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Disabled">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four sizes to match surrounding inputs and keep your forms visually balanced.

**Demo — `date-time-picker/demos/DateTimePickerSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPlainDateTimePicker size="xs" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPlainDateTimePicker size="s" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPlainDateTimePicker size="m" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPlainDateTimePicker size="l" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

> **Info**
>
> **PlainDateTime vs ZonedDateTime:** Choose `PlainDateTime` when the timezone is always the user's local time or when it simply does not matter (alarm clocks, recurring events). Choose `ZonedDateTime` when you need to pin a specific instant in time and derive UTC for storage or sharing across timezones.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between date and time inputs |
| `Enter` | Open calendar / confirm selection |
| `Escape` | Close calendar dropdown |
| `Arrow Keys` | Navigate within the calendar |

### Screen Reader Support

- Label text announces on focus
- Date and time portions are independently accessible
- Required and error states announced
- Calendar navigation is keyboard accessible

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.dateTimePicker.dialog` | `'Date time picker'` | Overlay dialog `aria-label` |
| `coar.ui.dateTimePicker.clearDate` | `'Clear date'` | Clear button `aria-label` |
| `coar.ui.dateTimePicker.openPicker` | `'Open picker'` | Calendar button `aria-label` |
| `coar.ui.datePicker.jumpToToday` | `'Jump to today\'s month'` | Scroll-to-today button `aria-label` |
| `coar.ui.datePicker.previousYear` | `'Previous year'` | Previous year button `aria-label` |
| `coar.ui.datePicker.nextYear` | `'Next year'` | Next year button `aria-label` |
| `coar.ui.datePicker.months` | `'Months'` | Month grid `aria-label` |
| `coar.ui.timePicker.increaseHours` | `'Increase hours'` | Hours increment button `aria-label` |
| `coar.ui.timePicker.decreaseHours` | `'Decrease hours'` | Hours decrement button `aria-label` |
| `coar.ui.timePicker.hours` | `'Hours'` | Hours spinbutton `aria-label` |
| `coar.ui.timePicker.increaseMinutes` | `'Increase minutes'` | Minutes increment button `aria-label` |
| `coar.ui.timePicker.decreaseMinutes` | `'Decrease minutes'` | Minutes decrement button `aria-label` |
| `coar.ui.timePicker.minutes` | `'Minutes'` | Minutes spinbutton `aria-label` |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `Temporal.PlainDateTime \| null` | `null` | Selected date+time |
| `placeholder` | `string` | `''` | Placeholder text |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](./form-field.md). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](./form-field.md)** — not on the picker. Wrap the picker in a `CoarFormField` for a label, the required asterisk, validation messages and the inline status indicator; the picker auto-adopts the field's id, error state and `aria-describedby` via injection.
