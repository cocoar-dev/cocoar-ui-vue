import type { CheckboxNode } from '../../schema';
import { definePageElement } from '../registry';
import CheckboxRenderer from './CheckboxRenderer.vue';

export const checkboxElement = definePageElement<CheckboxNode['props']>({
  renderer: CheckboxRenderer,
  // Default emptiness fits: `false` counts as empty, so `required` means
  // the box must be checked (consent-style).
  value: {},
});
