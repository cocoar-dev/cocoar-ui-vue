import type { Temporal } from '@js-temporal/polyfill';
import type { CoarPlainDateTimePickerSize } from '@cocoar/vue-ui';
import type { CoarDateMarker } from './plain-date-cell-editor.models';

/**
 * Configuration for the `col.plainDateTime()` cell renderer + editor.
 *
 * Cell value type is `Temporal.PlainDateTime | null` — a floating wallclock
 * (no zone). Use `col.zonedDateTime()` when the event lives in a specific
 * IANA zone.
 */
export interface PlainDateTimeCellEditorConfig<TData = unknown> {
  /** Trigger size — defaults to `'s'` to fit cell height. */
  size?: CoarPlainDateTimePickerSize;
  /** Show a clear button inside the picker. Default `true`. */
  clearable?: boolean;
  /** Minimum selectable date+time. */
  min?: Temporal.PlainDateTime | null;
  /** Maximum selectable date+time. */
  max?: Temporal.PlainDateTime | null;
  /** Show ISO week numbers in the calendar panel. */
  showWeekNumbers?: boolean;
  /** Visually highlight Saturday + Sunday. */
  highlightWeekends?: boolean;
  /** Date markers drawn on specific dates. */
  markers?: CoarDateMarker[] | ((row: TData) => CoarDateMarker[]);
  /** Locale override. Defaults to the consumer-app locale via `useL10n()`. */
  locale?: string;
}
