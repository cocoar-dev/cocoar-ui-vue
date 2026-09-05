<!-- Generated from apps/docs/components/zoned-date-time-picker.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Zoned DateTime Picker

The full-featured datetime picker for timezone-aware values. It captures a date, time, and IANA timezone as a single `Temporal.ZonedDateTime`, making it easy to derive UTC instants for storage while preserving the user's original intent.

```ts
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
```

> **Info**
>
> **Store intent, derive math.** Persist the user's chosen local time and timezone. You can always recalculate the UTC instant later -- and if DST rules change in the future, the recalculation will still be correct.

## Basic Usage

The picker defaults to the user's system timezone. Select a date, adjust the time, and optionally change the timezone. The bound value carries all three pieces of information.

**Demo — `zoned-date-time-picker/demos/BasicZonedDateTimePicker.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarFormField label="Meeting Time">
      <CoarZonedDateTimePicker
        v-model="value"
        placeholder="DD.MM.YYYY HH:mm"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      ZonedDateTime: {{ value?.toString() ?? 'none' }}
    </span>
    <span v-if="value" style="font-size: 13px; color: #64748b;">
      UTC Instant: {{ value.toInstant().toString() }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const value = ref<Temporal.ZonedDateTime | null>(null);
</script>
```

## Working with UTC

Converting to a UTC instant for API calls or database storage is a one-liner:

```ts
// Get UTC instant from ZonedDateTime
const utcInstant = value.value?.toInstant().toString();
// → "2024-03-15T14:30:00Z"

// Get ISO string with offset
const isoString = value.value?.toString();
// → "2024-03-15T15:30:00+01:00[Europe/Berlin]"
```

## States

All standard form states are supported: `required`, `error`, `disabled`, and `readonly`.

**Demo — `zoned-date-time-picker/demos/ZonedDateTimePickerStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarFormField label="Required" required>
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :required="true" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Invalid date/time">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Disabled">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four sizes that stay visually aligned with every other Cocoar input component.

**Demo — `zoned-date-time-picker/demos/ZonedDateTimePickerSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarZonedDateTimePicker size="xs" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarZonedDateTimePicker size="s" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarZonedDateTimePicker size="m" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarZonedDateTimePicker size="l" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between date, time, and timezone inputs |
| `Enter` | Open calendar / confirm selection |
| `Escape` | Close calendar dropdown |
| `Arrow Keys` | Navigate within the calendar |

### Screen Reader Support

- Label text announces on focus
- Date, time, and timezone portions are independently accessible
- Selected timezone is announced
- Required and error states announced

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.zonedDateTimePicker.dialog` | `'Date, time and timezone picker'` | Overlay dialog `aria-label` |
| `coar.ui.zonedDateTimePicker.clearValue` | `'Clear value'` | Clear button `aria-label` |
| `coar.ui.zonedDateTimePicker.openPicker` | `'Open date and time picker'` | Calendar button `aria-label` |
| `coar.ui.zonedDateTimePicker.timezoneIndicator` | `'Timezone: {tz}'` | Timezone indicator `aria-label` |
| `coar.ui.zonedDateTimePicker.clickToToggle` | `'Click to toggle.'` | Timezone indicator `aria-label` suffix |
| `coar.ui.zonedDateTimePicker.searchTimezone` | `'Search timezone...'` | Timezone search placeholder |
| `coar.ui.zonedDateTimePicker.closeTimezoneSearch` | `'Close timezone search'` | Close search button `aria-label` |
| `coar.ui.zonedDateTimePicker.displayTimezone` | `'Display Timezone'` | Display timezone section label |
| `coar.ui.zonedDateTimePicker.eventTimezone` | `'Event timezone'` | Footer placeholder text |
| `coar.ui.zonedDateTimePicker.cancelTimezoneEdit` | `'Cancel timezone edit'` | Cancel button `aria-label` |
| `coar.ui.zonedDateTimePicker.changeEventTimezone` | `'Change event timezone'` | Settings button `aria-label` |
| `coar.ui.datePicker.jumpToToday` | `'Jump to today\'s month'` | Scroll-to-today button `aria-label` |
| `coar.ui.datePicker.previousYear` | `'Previous year'` | Previous year button `aria-label` |
| `coar.ui.datePicker.nextYear` | `'Next year'` | Next year button `aria-label` |
| `coar.ui.datePicker.months` | `'Months'` | Month grid `aria-label` |
| `coar.ui.timePicker.*` | *(see DateTime Picker)* | Time picker spinbutton labels |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `Temporal.ZonedDateTime \| null` | `null` | Selected zoned datetime |
| `timezone` | `string` | user's timezone | IANA timezone ID (e.g. `'Europe/Berlin'`) |
| `placeholder` | `string` | `''` | Placeholder text |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](./form-field.md). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](./form-field.md)** — not on the picker. Wrap the picker in a `CoarFormField` for a label, the required asterisk, validation messages and the inline status indicator; the picker auto-adopts the field's id, error state and `aria-describedby` via injection.
