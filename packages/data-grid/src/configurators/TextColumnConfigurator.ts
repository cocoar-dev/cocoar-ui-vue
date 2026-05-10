import type { CoarTextInputSize } from '@cocoar/vue-ui';
import type { TextCellEditorConfig } from '../cell-renderers/text-cell-editor.models';

/**
 * Fluent configurator for the `col.text()` shortcut.
 *
 * Configures the text cell editor's behavior. Whether the column is editable
 * is gated by the column-level `editable()` chain.
 *
 * @example
 * ```ts
 * col.text('email', t => t
 *   .placeholder('user@example.com')
 *   .maxLength(120)
 * ).editable(true)
 * ```
 */
export class TextColumnConfigurator {
  readonly #config: TextCellEditorConfig = {};

  /** Placeholder text shown when input is empty */
  placeholder(value: string): this {
    this.#config.placeholder = value;
    return this;
  }

  /** Max input length */
  maxLength(value: number): this {
    this.#config.maxLength = value;
    return this;
  }

  /** Input size — defaults to `'s'` */
  size(value: CoarTextInputSize): this {
    this.#config.size = value;
    return this;
  }

  /** Text shown before the input value */
  prefix(value: string): this {
    this.#config.prefix = value;
    return this;
  }

  /** Text shown after the input value */
  suffix(value: string): this {
    this.#config.suffix = value;
    return this;
  }

  /** @internal */
  build(): TextCellEditorConfig {
    return { ...this.#config };
  }
}
