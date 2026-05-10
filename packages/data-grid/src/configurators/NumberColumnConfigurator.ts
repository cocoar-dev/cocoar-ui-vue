import type { CoarNumberInputSize, CoarNumberInputStepperButtons } from '@cocoar/vue-ui';
import type { NumberCellRendererConfig } from '../cell-renderers/number-cell-renderer.models';
import type { NumberCellEditorConfig } from '../cell-renderers/number-cell-editor.models';

/**
 * Combined renderer + editor config for `col.number()` callback form.
 * @internal
 */
export interface NumberColumnConfig extends NumberCellRendererConfig, NumberCellEditorConfig {}

/**
 * Fluent configurator for the `col.number()` shortcut callback form.
 *
 * Configures both the locale-aware renderer and the cell editor. Whether the
 * column is editable is gated by the column-level `editable()` chain.
 *
 * @example
 * ```ts
 * col.number('amount', n => n
 *   .decimals(2)
 *   .min(0).max(10000)
 *   .step(0.01)
 *   .suffix('€')
 * ).editable(true)
 * ```
 */
export class NumberColumnConfigurator {
  readonly #config: NumberColumnConfig = {};

  /** Number of decimal places — applied to both renderer formatting and editor */
  decimals(value: number): this {
    this.#config.decimals = value;
    return this;
  }

  /** Minimum allowed value (editor only) */
  min(value: number): this {
    this.#config.min = value;
    return this;
  }

  /** Maximum allowed value (editor only) */
  max(value: number): this {
    this.#config.max = value;
    return this;
  }

  /** Step increment for arrows / stepper buttons (editor only) */
  step(value: number): this {
    this.#config.step = value;
    return this;
  }

  /** Stepper button mode (editor only) */
  stepperButtons(value: CoarNumberInputStepperButtons): this {
    this.#config.stepperButtons = value;
    return this;
  }

  /** Placeholder text shown when input is empty (editor only) */
  placeholder(value: string): this {
    this.#config.placeholder = value;
    return this;
  }

  /** Input size — defaults to `'s'` */
  size(value: CoarNumberInputSize): this {
    this.#config.size = value;
    return this;
  }

  /** @internal */
  build(): NumberColumnConfig {
    return { ...this.#config };
  }
}
