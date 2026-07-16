import type { NumberInputNode } from '../../schema';
import { definePageElement } from '../registry';
import NumberInputRenderer from './NumberInputRenderer.vue';

export const numberInputElement = definePageElement<NumberInputNode['props']>({
  renderer: NumberInputRenderer,
  value: {},
});
