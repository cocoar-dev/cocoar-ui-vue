---
description: "CoarPlainDateTimePicker — combined calendar and time input returning a timezone-less Temporal.PlainDateTime, with validation states, four sizes and localized labels."
devices: { desktop: ready, tablet: ready, phone: partial }
devicesNote: "Mobile field sizes under .coar-mobile (Preview); the panel keeps its desktop layout, a phone sheet is planned."
---

# DateTime Picker

Combines a calendar date picker with a time input and returns a `Temporal.PlainDateTime` -- a date and time without any timezone attached. Use this when the timezone is implicit (the user's local time) or irrelevant (an alarm, a reminder). If you need timezone awareness, reach for the [Zoned DateTime Picker](/components/zoned-date-time-picker) instead.

```ts
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
```

## Basic Usage

Select a date from the calendar, then adjust the time. The bound value is a `Temporal.PlainDateTime` you can format, compare, or serialize as needed.

<preview path="./date-time-picker/demos/BasicDateTimePicker.vue" />

## States

Supports `required`, `error`, `disabled`, and `readonly` -- the same set of states you will find on every Cocoar form control.

<preview path="./date-time-picker/demos/DateTimePickerStates.vue" />

## Sizes

Four sizes to match surrounding inputs and keep your forms visually balanced.

<preview path="./date-time-picker/demos/DateTimePickerSizes.vue" />

::: info
**PlainDateTime vs ZonedDateTime:** Choose `PlainDateTime` when the timezone is always the user's local time or when it simply does not matter (alarm clocks, recurring events). Choose `ZonedDateTime` when you need to pin a specific instant in time and derive UTC for storage or sharing across timezones.
:::

## Inline <Badge type="warning" text="Preview" /> {#inline}

`appearance` and `width` work as on the [Date Picker](/components/date-picker#inline): only the date and time show
until the field is hovered, edited or its panel is open, and `width="content"` fits the field to them.

<preview path="./date-time-picker/demos/DateTimePickerInline.vue" />

## Precision <Badge type="warning" text="Preview" /> {#precision}

The field shows hours and minutes. `precision="second"` or `"millisecond"` adds seconds or milliseconds to it.
A value keeps what the field does not show: editing only its date (typed or chosen), or leaving the field without
editing it, keeps its seconds and every fractional digit, also those the field does not show; changing the time sets
what is not shown to zero. Text with more than the field
shows, such as a pasted `15:46:56` in a minute field, is refused instead of cut down.

## Typed and pasted input

Text typed, pasted or filled in becomes the value only when it is one: a calendar day and a time, the day within the dates of `min` and `max`. Anything else, such as `30.02.2026 10:30`
or an incomplete entry, stays in the field when it is left: the field shows its error state (`aria-invalid`), the
model keeps its value, and `entry-refused` reports `true`. `Escape` brings back the text of the value, and a valid
entry ends the refusal. A pasted value keeps its AM/PM, and a time in the other clock (`15:46` in a 12-hour field, `3:46 PM` in a
24-hour one) is converted. Pasted text the field cannot take whole, such as an ISO timestamp or more fractional
digits than it shows, is refused as it is: no part of it reaches the value.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between date and time inputs |
| `Enter` | Open calendar / confirm selection |
| `Escape` | Close calendar dropdown; with it closed, bring back the value's text after an edit or a refused entry |
| `Arrow Keys` | Navigate within the calendar |

### Screen Reader Support

- Label text announces on focus
- Date and time portions are independently accessible
- Required and error states announced
- Calendar navigation is keyboard accessible

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

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
| `appearance` <Badge type="warning" text="Preview" /> | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` <Badge type="warning" text="Preview" /> | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the shown value or placeholder |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](/components/form-field). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |
| `precision` <Badge type="warning" text="Preview" /> | `'minute' \| 'second' \| 'millisecond'` | `'minute'` | How exactly the field shows and takes the time, see [Precision](#precision) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `entry-refused` | `boolean` | `true` when the field is left with text that is no value (see [Typed and pasted input](#typed-and-pasted-input)), `false` once that ends |
| `opened` / `closed` | — | The calendar opened or closed |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](/components/form-field)** — not on the picker. Wrap the picker in a `CoarFormField` for a label, the required asterisk, validation messages and the inline status indicator; the picker auto-adopts the field's id, error state and `aria-describedby` via injection.
