import type { DateTimeInputNode } from '../../schema';
import { definePageElement } from '../registry';
import DateTimeInputRenderer from './DateTimeInputRenderer.vue';

export const dateTimeInputElement = definePageElement<DateTimeInputNode['props']>({
  renderer: DateTimeInputRenderer,
  value: {},
});
