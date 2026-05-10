import type { CoarTextInputSize } from '@cocoar/vue-ui';

/**
 * Configuration for the text cell editor.
 *
 * Set via `col.text(field, t => t.placeholder('…').maxLength(80))`.
 */
export interface TextCellEditorConfig {
  /** Placeholder shown when input is empty */
  placeholder?: string;
  /** Max input length */
  maxLength?: number;
  /** Input size — defaults to `'s'` to fit cell height */
  size?: CoarTextInputSize;
  /** Text shown before the input value */
  prefix?: string;
  /** Text shown after the input value */
  suffix?: string;
}
