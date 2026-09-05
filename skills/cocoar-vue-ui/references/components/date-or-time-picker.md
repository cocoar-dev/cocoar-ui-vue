<!-- Generated from apps/docs/components/date-or-time-picker.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Date · optional time

Sometimes a field is "a date, and *maybe* a time" — a due date that's usually
just a day but occasionally needs an hour, a reminder that can be all-day or
timed. Instead of a separate checkbox, these pickers put a small **clock toggle
beside the field**: off means a plain date, on means a date with time.

Two variants, by whether the time carries a timezone:

```ts
import {
  CoarZonedDateTimeOrDatePicker, // PlainDate  ⇄  ZonedDateTime (with IANA zone)
  CoarPlainDateTimeOrDatePicker, // PlainDate  ⇄  PlainDateTime (zone-less)
} from '@cocoar/vue-ui';
```

## Basic usage

Click the clock to switch modes. The value is one of two `Temporal` types — read
it directly to know what you got.

**Demo — `date-or-time-picker/demos/BasicOptionalTime.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px;">
    <CoarFormField label="Due">
      <CoarZonedDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" clearable />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      {{ withTime ? 'with time' : 'date only' }} →
      <code>{{ value ? `${value.constructor.name}: ${value.toString()}` : 'null' }}</code>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimeOrDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

// One value, two shapes: a PlainDate while the clock is off, a ZonedDateTime when on.
const value = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(null);
const withTime = ref(false);
</script>
```

## The value model

A single `v-model` carries the **union** value, and `v-model:withTime` is the
toggle. They stay in sync: a non-null value's own type *is* the mode, and while
empty the toggle decides.

```vue
<CoarZonedDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" />
```

```ts
// value is Temporal.ZonedDateTime | Temporal.PlainDate | null
if (value instanceof Temporal.ZonedDateTime) {
  // time was on — persist a timestamp
} else if (value instanceof Temporal.PlainDate) {
  // date only — persist a calendar date
}
```

Toggling **on** keeps the date and adds a time (the current time, rounded to
`minuteStep`) — and, for the zoned variant, the `timeZone` (or the user's zone).
Toggling **off** drops the time (and zone) back to the date. So flipping the
clock never loses the day.

## Zone-less variant

`CoarPlainDateTimeOrDatePicker` is the same idea without timezones — the with-time
value is a `Temporal.PlainDateTime`.

**Demo — `date-or-time-picker/demos/PlainOptionalTime.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px;">
    <CoarFormField label="Reminder">
      <CoarPlainDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" clearable />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      {{ withTime ? 'with time' : 'date only' }} →
      <code>{{ value ? `${value.constructor.name}: ${value.toString()}` : 'null' }}</code>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDateTimeOrDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

// The zone-less variant: PlainDate while off, PlainDateTime when on.
const value = ref<Temporal.PlainDateTime | Temporal.PlainDate | null>(null);
const withTime = ref(false);
</script>
```

## Toggle position & sizes

The clock sits to the **left** by default; set `toggle-position="end"` for the
right. Sizes match the rest of the form-control family (`xs` · `s` · `m` · `l`),
and the toggle scales with the field.

**Demo — `date-or-time-picker/demos/OptionalTimeSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px;">
    <div v-for="s in sizes" :key="s" style="display: flex; align-items: center; gap: 12px;">
      <code style="width: 24px; font-size: 12px; color: #64748b;">{{ s }}</code>
      <CoarZonedDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" :size="s" />
    </div>
    <span style="font-size: 13px; color: #64748b;">Toggle position: <code>start</code> (default) — use <code>toggle-position="end"</code> to put the clock on the right.</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimeOrDatePicker, type CoarZonedDateTimeOrDatePickerSize } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const sizes: CoarZonedDateTimeOrDatePickerSize[] = ['xs', 's', 'm', 'l'];
const value = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(null);
const withTime = ref(false);
</script>
```

> **Info: Composition, not reinvention**
>
> These are thin wrappers over [`CoarPlainDatePicker`](./date-picker.md),
> [`CoarPlainDateTimePicker`](./date-time-picker.md) and
> [`CoarZonedDateTimePicker`](./zoned-date-time-picker.md) — they render the
> existing picker for the active mode and add the toggle beside it. All the
> common props pass straight through.

## Theming

There's no new chrome to theme: the field is a `CoarInputFrame` and the toggle a
`CoarButton`, both driven by the usual tokens. The toggle's roundness **tracks
`--coar-input-radius`**, so it always matches the adjacent field (a pill theme
gives a round toggle), and the gap uses `--coar-spacing-xs`. Nothing to register
in the theme editor — tuning the existing input / button / spacing / accent
tokens restyles these too.

## Accessibility

The clock is a toggle button: it exposes `aria-pressed` for its state and a
state-aware tooltip + `aria-label` (**Add time** when off, **Remove time** when
on, both overridable). The active field itself is the underlying picker, so its
keyboard and screen-reader behaviour is identical to the standalone pickers.

> Wrap the picker in a [`CoarFormField`](./form-field.md) for a label, the
> required asterisk, validation message and status icon — exactly like the other
> date pickers. The field auto-adopts the form field's id and error state.

## API

Both components share this surface (the zoned variant adds the timezone props).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `PlainDate \| ZonedDateTime \| null` (zoned)<br>`PlainDate \| PlainDateTime \| null` (plain) | `null` | The union value. |
| `v-model:withTime` | `boolean` | `false` | The clock toggle / mode. |
| `placeholder` | `string` | `''` | Placeholder text. |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Field + toggle size. |
| `disabled` | `boolean` | `false` | Disable the field and toggle. |
| `readonly` | `boolean` | `false` | Read-only (toggle disabled too). |
| `required` | `boolean` | `false` | Mark as required. |
| `error` | `boolean` | `false` | Error state. Auto-injected from a wrapping `CoarFormField`. |
| `clearable` | `boolean` | `false` | Show the inline clear button. |
| `locale` | `string` | — | Locale override. |
| `min` / `max` | with-time type | `null` | Bounds; the date mode uses their date part. |
| `minuteStep` | `1 \| 5 \| 10 \| 15` | `5` | Time-of-day step (also the default-time rounding). |
| `togglePosition` | `'start' \| 'end'` | `'start'` | Clock side, relative to the field. |
| `addTimeLabel` | `string` | `'Add time'` | Tooltip + label while time is off. |
| `removeTimeLabel` | `string` | `'Remove time'` | Tooltip + label while time is on. |

**Zoned variant only:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `timeZone` | `string \| null` | `null` | Default IANA zone for a value gaining a time (else the user's zone). |
| `timezoneFilter` | `string[]` | `[]` | Wildcard filters for the timezone list (e.g. `['Europe/*']`). |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | union value | The value changed. |
| `update:withTime` | `boolean` | The mode changed. |
| `opened` / `closed` | — | The calendar panel opened / closed. |
