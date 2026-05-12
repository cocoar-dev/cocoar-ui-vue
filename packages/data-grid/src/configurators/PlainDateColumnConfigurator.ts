import type { Temporal } from '@js-temporal/polyfill';
import type { CoarPlainDatePickerSize } from '@cocoar/vue-ui';
import type {
  CoarDateMarker,
  PlainDateCellEditorConfig,
} from '../cell-renderers/plain-date-cell-editor.models';

/**
 * Fluent configurator for `col.plainDate()`.
 *
 * Cell value is `Temporal.PlainDate | null`. The renderer formats via
 * `toLocaleString` (date-style: medium); the editor wraps
 * `<CoarPlainDatePicker>`. Whether the column is editable is gated by the
 * column-level `.editable()` chain.
 *
 * @example
 * ```ts
 * col.plainDate('startsOn', d => d
 *   .size('s')
 *   .min(Temporal.PlainDate.from('2026-01-01'))
 *   .highlightWeekends()
 * ).editable(true)
 * ```
 */
export class PlainDateColumnConfigurator<TData = unknown> {
  readonly #config: PlainDateCellEditorConfig<TData> = {};

  /** Trigger size — defaults to `'s'`. */
  size(value: CoarPlainDatePickerSize): this {
    this.#config.size = value;
    return this;
  }

  /** Show a clear button inside the picker. Default `true`. */
  clearable(value = true): this {
    this.#config.clearable = value;
    return this;
  }

  /** Minimum selectable date. */
  min(value: Temporal.PlainDate | null): this {
    this.#config.min = value;
    return this;
  }

  /** Maximum selectable date. */
  max(value: Temporal.PlainDate | null): this {
    this.#config.max = value;
    return this;
  }

  /** Show ISO week numbers in the calendar panel. */
  showWeekNumbers(value = true): this {
    this.#config.showWeekNumbers = value;
    return this;
  }

  /** Visually highlight Saturday + Sunday. */
  highlightWeekends(value = true): this {
    this.#config.highlightWeekends = value;
    return this;
  }

  /** Date markers (static array or per-row function). */
  markers(value: CoarDateMarker[] | ((row: TData) => CoarDateMarker[])): this {
    this.#config.markers = value;
    return this;
  }

  /** Locale override. Defaults to the consumer-app locale. */
  locale(value: string): this {
    this.#config.locale = value;
    return this;
  }

  /** @internal */
  build(): PlainDateCellEditorConfig<TData> {
    return { ...this.#config };
  }
}
