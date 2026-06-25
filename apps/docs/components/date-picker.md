# Date Picker

A calendar-backed date picker that returns a `Temporal.PlainDate` -- a date without time or timezone. Perfect for birthdays, deadlines, due dates, and any scenario where "which day" is all that matters.

```ts
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
```

## Basic Usage

Click the input to open a calendar dropdown. The selected value is a proper `Temporal.PlainDate`, so date math and formatting are straightforward.

<preview path="./date-picker/demos/BasicDatePicker.vue" />

## Required & Error States

Combine `required` and `error` props for form validation. The required asterisk and error message integrate with the same patterns as every other Cocoar input.

<preview path="./date-picker/demos/DatePickerValidation.vue" />

## Disabled & Readonly

`disabled` greys out the entire picker; `readonly` lets users see the selected date but prevents changes.

<preview path="./date-picker/demos/DatePickerDisabledReadonly.vue" />

## Date Range (Manual)

For start/end date pairs, use two pickers and pass the start date as `:min` on the end picker. This prevents users from selecting an end date before the start.

<preview path="./date-picker/demos/DatePickerRange.vue" />

## Sizes

Four sizes to stay consistent with other form controls across your layout.

<preview path="./date-picker/demos/DatePickerSizes.vue" />

::: info
**Temporal.PlainDate:** This component uses the TC39 Temporal API (`@js-temporal/polyfill`). PlainDate represents a calendar date without time or timezone -- no more wrestling with midnight UTC offsets.
:::

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
| `error` | `boolean` | `false` | Error state (red border + `aria-invalid`). Auto-injected from a wrapping [`CoarFormField`](/components/form-field). |
| `id` | `string` | `''` | Explicit input id (else taken from `CoarFormField`, else auto). |

> **Label, hint, error message and the status icon live on the wrapping [`CoarFormField`](/components/form-field)** — not on the picker. Wrap the picker in a `CoarFormField` to get a label, the required asterisk, validation messages and the inline status indicator. The picker auto-adopts the field's id, error state and `aria-describedby` via injection.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.datePicker.previousYear` | `'Previous year'` | Previous year button `aria-label` |
| `coar.ui.datePicker.nextYear` | `'Next year'` | Next year button `aria-label` |
| `coar.ui.datePicker.jumpToToday` | `'Jump to today\'s month'` | Scroll-to-today button `aria-label` |
| `coar.ui.datePicker.months` | `'Months'` | Month grid `aria-label` |
| `coar.ui.datePicker.dialog` | `'Date picker'` | Overlay dialog `aria-label` |
| `coar.ui.datePicker.clearDate` | `'Clear date'` | Clear button `aria-label` |
| `coar.ui.datePicker.openPicker` | `'Open picker'` | Calendar button `aria-label` |
