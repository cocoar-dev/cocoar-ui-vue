import type { RadioGroupNode } from '../../schema';
import { definePageElement } from '../registry';
import RadioGroupRenderer from './RadioGroupRenderer.vue';

export const radioGroupElement = definePageElement<RadioGroupNode['props']>({
  renderer: RadioGroupRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits.
  value: {},
});
