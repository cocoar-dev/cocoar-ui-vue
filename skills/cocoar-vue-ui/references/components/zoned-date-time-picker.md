<!-- Generated from apps/docs/components/zoned-date-time-picker.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Zoned DateTime Picker

**Devices:** desktop ready · tablet ready · phone partial — Mobile field sizes under .coar-mobile (Preview); the panel keeps its desktop layout, a phone sheet is planned.

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

## Inline (Preview) {#inline}

`appearance="inline"` shows only the date, time and zone until the field is hovered, edited or its panel is open;
the calendar button stays and loses its segment background. `width="content"` fits the field to the shown value
and its zone caption: the box is at least as wide as the caption needs, so a long zone name does not stick out.
How the fills behave and how to change them: [Text Input](./text-input.md#inline).

**Demo — `zoned-date-time-picker/demos/ZonedDateTimePickerInline.vue`**

```vue
<template>
  <div style="display: grid; gap: 12px; max-width: 520px;">
    <p style="margin: 0; line-height: 2.4;">
      The call starts
      <CoarZonedDateTimePicker v-model="call" appearance="inline" width="content" />
      for everyone.
    </p>
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Starts</span>
      <CoarZonedDateTimePicker v-model="starts" appearance="inline" />
    </div>
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Ends</span>
      <CoarZonedDateTimePicker v-model="ends" appearance="inline" placeholder="not set" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';

const starts = ref<Temporal.ZonedDateTime | null>(Temporal.ZonedDateTime.from('2026-12-01T09:30[Europe/Vienna]'));
const call = ref<Temporal.ZonedDateTime | null>(Temporal.ZonedDateTime.from('2026-12-01T16:00[America/Argentina/Buenos_Aires]'));
const ends = ref<Temporal.ZonedDateTime | null>(null);
</script>
```

## Precision (Preview) {#precision}

The field shows hours and minutes. `precision="second"` or `"millisecond"` adds seconds or milliseconds to it.
A value keeps what the field does not show: choosing another date or zone, or leaving the field without editing
it, does not change its seconds; changing the hour or minute sets what is not shown to zero. Text with more than
the field shows, such as a pasted `15:46:56` in a minute field, is refused instead of cut down.

Typed text is read in the zone the field shows, and the value keeps its own zone.

**Demo — `zoned-date-time-picker/demos/ZonedDateTimePickerPrecision.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarSegmentedControl v-model="precision" :options="options" size="s" aria-label="Precision" />
    <CoarFormField label="Measured at">
      <CoarZonedDateTimePicker v-model="value" :precision="precision" />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      ZonedDateTime: {{ value?.toString() ?? 'none' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarSegmentedControl, CoarZonedDateTimePicker, type CoarTimePrecision } from '@cocoar/vue-ui';
import { Temporal } from '@js-temporal/polyfill';

const precision = ref<CoarTimePrecision>('minute');
const options = [
  { value: 'minute', label: 'minute' },
  { value: 'second', label: 'second' },
  { value: 'millisecond', label: 'millisecond' },
];
const value = ref<Temporal.ZonedDateTime | null>(
  Temporal.ZonedDateTime.from('2026-07-01T15:46:56.123+02:00[Europe/Berlin]'),
);
</script>
```

## Typed and pasted input

Text typed, pasted or filled in becomes the value only when it is one: a calendar day and a time. Anything else, such as `30.02.2026 10:30`
or an incomplete entry, stays in the field when it is left: the field shows its error state (`aria-invalid`), the
model keeps its value, and `entry-refused` reports `true`. `Escape` brings back the text of the value, and a valid
entry ends the refusal. A pasted value keeps its AM/PM, and a time in the other clock (`15:46` in a 12-hour field, `3:46 PM` in a
24-hour one) is converted.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between date, time, and timezone inputs |
| `Enter` | Open calendar / confirm selection |
| `Escape` | Close calendar dropdown; with it closed, bring back the value's text after an edit or a refused entry |
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
| `appearance` (Preview) | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` (Preview) | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the shown value and its zone caption |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](./form-field.md). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |
| `precision` (Preview) | `'minute' \| 'second' \| 'millisecond'` | `'minute'` | How exactly the field shows and takes the time, see [Precision](#precision) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `entry-refused` | `boolean` | `true` when the field is left with text that is no value (see [Typed and pasted input](#typed-and-pasted-input)), `false` once that ends |
| `opened` / `closed` | — | The calendar opened or closed |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](./form-field.md)** — not on the picker. Wrap the picker in a `CoarFormField` for a label, the required asterisk, validation messages and the inline status indicator; the picker auto-adopts the field's id, error state and `aria-describedby` via injection.
