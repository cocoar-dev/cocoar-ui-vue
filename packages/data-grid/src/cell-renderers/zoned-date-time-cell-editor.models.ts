import type { Temporal } from '@js-temporal/polyfill';
import type { CoarZonedDateTimePickerSize } from '@cocoar/vue-ui';
import type { CoarDateMarker } from './plain-date-cell-editor.models';

/**
 * Configuration for the `col.zonedDateTime()` cell renderer + editor.
 *
 * Cell value type is `Temporal.ZonedDateTime | null`. The picker exposes its
 * own timezone selector; when the user clears + re-picks, the resulting
 * `ZonedDateTime`'s `timeZoneId` may differ from the original.
 */
export interface ZonedDateTimeCellEditorConfig<TData = unknown> {
  /** Trigger size — defaults to `'s'` to fit cell height. */
  size?: CoarZonedDateTimePickerSize;
  /** Show a clear button inside the picker. Default `true`. */
  clearable?: boolean;
  /** Minimum selectable instant. */
  min?: Temporal.ZonedDateTime | null;
  /** Maximum selectable instant. */
  max?: Temporal.ZonedDateTime | null;
  /** Show ISO week numbers in the calendar panel. */
  showWeekNumbers?: boolean;
  /** Visually highlight Saturday + Sunday. */
  highlightWeekends?: boolean;
  /** Date markers drawn on specific dates. */
  markers?: CoarDateMarker[] | ((row: TData) => CoarDateMarker[]);
  /** Locale override. Defaults to the consumer-app locale via `useL10n()`. */
  locale?: string;
  /**
   * Default IANA timezone used when creating a new value (cell was empty
   * before the edit). When the cell already holds a `ZonedDateTime`, its zone
   * is preserved through editing unless the user explicitly changes it via
   * the picker's zone selector.
   *
   * Passes through to `CoarZonedDateTimePicker`'s `timeZone` prop.
   */
  timeZone?: string;
  /**
   * Wildcard filter patterns for the timezone selector (e.g. `['Europe/*']`)
   * — passes through to `CoarZonedDateTimePicker`'s `timezoneFilter` prop.
   */
  timezoneFilter?: string[];
}
