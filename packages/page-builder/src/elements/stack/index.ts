import type { StackNode } from '../../schema';
import { definePageElement } from '../registry';
import StackRenderer from './StackRenderer.vue';

export const stackElement = definePageElement<StackNode['props']>({
  renderer: StackRenderer,
  container: true,
});
