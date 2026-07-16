import type { SelectNode } from '../../schema';
import { definePageElement } from '../registry';
import SelectRenderer from './SelectRenderer.vue';

export const selectElement = definePageElement<SelectNode['props']>({
  renderer: SelectRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits.
  value: {},
});
