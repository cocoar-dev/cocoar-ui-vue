import type { Temporal } from '@js-temporal/polyfill';
import type { CoarPlainDatePickerSize, CoarDateMarker } from '@cocoar/vue-ui';

/** Re-exported from `@cocoar/vue-ui` for grid-side ergonomics. */
export type { CoarDateMarker };

/**
 * Configuration for the `col.plainDate()` cell renderer + editor.
 *
 * Cell value type is `Temporal.PlainDate | null`. Consumers convert from ISO
 * strings / native `Date` at the data layer — the editor and renderer are
 * Temporal-only, matching the calendar package's contract.
 */
export interface PlainDateCellEditorConfig<TData = unknown> {
  /** Trigger size — defaults to `'s'` to fit cell height. */
  size?: CoarPlainDatePickerSize;
  /** Show a clear button inside the picker. Default `true`. */
  clearable?: boolean;
  /** Minimum selectable date. */
  min?: Temporal.PlainDate | null;
  /** Maximum selectable date. */
  max?: Temporal.PlainDate | null;
  /** Show ISO week numbers in the calendar panel. */
  showWeekNumbers?: boolean;
  /** Visually highlight Saturday + Sunday. */
  highlightWeekends?: boolean;
  /** Date markers (dot / ring / underline) drawn on specific dates. */
  markers?: CoarDateMarker[] | ((row: TData) => CoarDateMarker[]);
  /** Locale override. Defaults to the consumer-app locale via `useL10n()`. */
  locale?: string;
}
