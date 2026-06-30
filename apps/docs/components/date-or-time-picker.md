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

<preview path="./date-or-time-picker/demos/BasicOptionalTime.vue" />

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

<preview path="./date-or-time-picker/demos/PlainOptionalTime.vue" />

## Toggle position & sizes

The clock sits to the **left** by default; set `toggle-position="end"` for the
right. Sizes match the rest of the form-control family (`xs` · `s` · `m` · `l`),
and the toggle scales with the field.

<preview path="./date-or-time-picker/demos/OptionalTimeSizes.vue" />

::: info Composition, not reinvention
These are thin wrappers over [`CoarPlainDatePicker`](/components/date-picker),
[`CoarPlainDateTimePicker`](/components/date-time-picker) and
[`CoarZonedDateTimePicker`](/components/zoned-date-time-picker) — they render the
existing picker for the active mode and add the toggle beside it. All the
common props pass straight through.
:::

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

> Wrap the picker in a [`CoarFormField`](/components/form-field) for a label, the
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
