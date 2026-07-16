import type { MultiSelectNode } from '../../schema';
import { definePageElement } from '../registry';
import MultiSelectRenderer from './MultiSelectRenderer.vue';

export const multiSelectElement = definePageElement<MultiSelectNode['props']>({
  renderer: MultiSelectRenderer,
  // Default emptiness fits: `[]` counts as empty, so `required` means at
  // least one option must be selected.
  value: {},
});
