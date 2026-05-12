import type { Temporal } from '@js-temporal/polyfill';
import type { CoarPlainDateTimePickerSize } from '@cocoar/vue-ui';
import type { CoarDateMarker } from '../cell-renderers/plain-date-cell-editor.models';
import type { PlainDateTimeCellEditorConfig } from '../cell-renderers/plain-date-time-cell-editor.models';

/**
 * Fluent configurator for `col.plainDateTime()`.
 *
 * Cell value is `Temporal.PlainDateTime | null` (floating wallclock). The
 * renderer formats with date-style: medium + time-style: short; the editor
 * wraps `<CoarPlainDateTimePicker>`.
 */
export class PlainDateTimeColumnConfigurator<TData = unknown> {
  readonly #config: PlainDateTimeCellEditorConfig<TData> = {};

  /** Trigger size — defaults to `'s'`. */
  size(value: CoarPlainDateTimePickerSize): this {
    this.#config.size = value;
    return this;
  }

  /** Show a clear button inside the picker. Default `true`. */
  clearable(value = true): this {
    this.#config.clearable = value;
    return this;
  }

  /** Minimum selectable date+time. */
  min(value: Temporal.PlainDateTime | null): this {
    this.#config.min = value;
    return this;
  }

  /** Maximum selectable date+time. */
  max(value: Temporal.PlainDateTime | null): this {
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
  build(): PlainDateTimeCellEditorConfig<TData> {
    return { ...this.#config };
  }
}
