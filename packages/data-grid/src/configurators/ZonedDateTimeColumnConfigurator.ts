import type { Temporal } from '@js-temporal/polyfill';
import type { CoarZonedDateTimePickerSize } from '@cocoar/vue-ui';
import type { CoarDateMarker } from '../cell-renderers/plain-date-cell-editor.models';
import type { ZonedDateTimeCellEditorConfig } from '../cell-renderers/zoned-date-time-cell-editor.models';

/**
 * Fluent configurator for `col.zonedDateTime()`.
 *
 * Cell value is `Temporal.ZonedDateTime | null`. Renderer formats with
 * date-style: medium + time-style: short + a short zone-name suffix; editor
 * wraps `<CoarZonedDateTimePicker>`, which surfaces its own zone selector.
 *
 * @example
 * ```ts
 * col.zonedDateTime('eventAt', d => d
 *   .timeZone('Europe/Vienna')
 *   .timezoneFilter(['Europe/*', 'America/*'])
 * ).editable(true)
 * ```
 */
export class ZonedDateTimeColumnConfigurator<TData = unknown> {
  readonly #config: ZonedDateTimeCellEditorConfig<TData> = {};

  /** Trigger size — defaults to `'s'`. */
  size(value: CoarZonedDateTimePickerSize): this {
    this.#config.size = value;
    return this;
  }

  /** Show a clear button inside the picker. Default `true`. */
  clearable(value = true): this {
    this.#config.clearable = value;
    return this;
  }

  /** Minimum selectable instant. */
  min(value: Temporal.ZonedDateTime | null): this {
    this.#config.min = value;
    return this;
  }

  /** Maximum selectable instant. */
  max(value: Temporal.ZonedDateTime | null): this {
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

  /**
   * Default IANA timezone used when creating a new value (cell was empty
   * before the edit). Existing `ZonedDateTime` values keep their own zone.
   */
  timeZone(value: string): this {
    this.#config.timeZone = value;
    return this;
  }

  /** Wildcard filter patterns for the timezone selector (e.g. `['Europe/*']`). */
  timezoneFilter(value: string[]): this {
    this.#config.timezoneFilter = value;
    return this;
  }

  /** @internal */
  build(): ZonedDateTimeCellEditorConfig<TData> {
    return { ...this.#config };
  }
}
