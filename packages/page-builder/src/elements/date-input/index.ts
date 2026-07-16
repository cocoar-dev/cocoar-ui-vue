import type { DateInputNode } from '../../schema';
import { definePageElement } from '../registry';
import DateInputRenderer from './DateInputRenderer.vue';

export const dateInputElement = definePageElement<DateInputNode['props']>({
  renderer: DateInputRenderer,
  value: {},
});
