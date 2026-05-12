<script setup lang="ts">
/**
 * `CoarPlainDateView` — read-only display for `Temporal.PlainDate` values.
 *
 * Mirrors the formatting logic of `<CoarPlainDatePicker>`'s trigger so a
 * read-only display and the editor's resting state look identical. Use this
 * anywhere you'd show a date without an editor — cards, dialogs, list rows,
 * grid cells.
 *
 * Locale + date-format resolution chain matches the picker (`useDatePickerBase`):
 *   explicit `locale` / `dateFormat` prop → consumer-app localization service
 *   → navigator.language → fallback default. Reactive — display updates on
 *   language change.
 *
 * Cross-realm safe: type-checks the value via `Symbol.toStringTag` so a
 * `Temporal.PlainDate` from a different polyfill copy (pnpm isolated tree)
 * still renders correctly. Non-PlainDate values render as the empty
 * placeholder.
 */
import { computed, toRef } from 'vue';
import type { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import { coarFormatPlainDate } from '../_shared/date-helpers';
import type { DateFormatConfig } from '../_shared/types';

export type CoarPlainDateViewSize = 'xs' | 's' | 'm' | 'l';

export interface CoarPlainDateViewProps {
  /** The PlainDate value to display. `null` renders the placeholder. */
  value?: Temporal.PlainDate | null;
  /** Locale override (BCP-47 tag). Defaults to consumer-app locale. */
  locale?: string;
  /** Date format override. Defaults to the resolved consumer-app format. */
  dateFormat?: DateFormatConfig;
  /** Text shown when `value` is `null` or not a `Temporal.PlainDate`. */
  placeholder?: string;
  /** Font-size token — matches the form-input family. */
  size?: CoarPlainDateViewSize;
}

const props = withDefaults(defineProps<CoarPlainDateViewProps>(), {
  value: null,
  locale: undefined,
  dateFormat: undefined,
  placeholder: '',
  size: 'm',
});

const pickerBase = useDatePickerBase({
  locale: toRef(props, 'locale'),
  dateFormat: toRef(props, 'dateFormat'),
});

function isPlainDate(v: unknown): v is Temporal.PlainDate {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.PlainDate]';
}

const formatted = computed(() => {
  if (!isPlainDate(props.value)) return '';
  return coarFormatPlainDate(props.value, pickerBase.effectiveDateFormat.value.pattern);
});

const displayText = computed(() => formatted.value || props.placeholder);
const isEmpty = computed(() => !formatted.value);
</script>

<template>
  <span
    class="coar-plain-date-view"
    :class="[
      `coar-plain-date-view--${size}`,
      { 'coar-plain-date-view--empty': isEmpty },
    ]"
  >{{ displayText }}</span>
</template>

<style scoped>
.coar-plain-date-view {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

.coar-plain-date-view--xs { font-size: var(--coar-component-xs-font-size); }
.coar-plain-date-view--s  { font-size: var(--coar-component-s-font-size); }
.coar-plain-date-view--m  { font-size: var(--coar-component-m-font-size); }
.coar-plain-date-view--l  { font-size: var(--coar-component-l-font-size); }

.coar-plain-date-view--empty {
  color: var(--coar-text-neutral-tertiary, #999);
}
</style>
