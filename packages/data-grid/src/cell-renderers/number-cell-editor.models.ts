import type { CoarNumberInputSize, CoarNumberInputStepperButtons } from '@cocoar/vue-ui';

/**
 * Configuration for the number cell editor.
 *
 * Set via `col.number(field, n => n.min(0).max(100).step(1))`.
 */
export interface NumberCellEditorConfig {
  /** Placeholder shown when input is empty */
  placeholder?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment for arrow keys / stepper buttons */
  step?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Stepper button mode */
  stepperButtons?: CoarNumberInputStepperButtons;
  /** Input size — defaults to `'s'` to fit cell height */
  size?: CoarNumberInputSize;
}
