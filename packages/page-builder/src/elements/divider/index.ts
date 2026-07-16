import type { DividerNode } from '../../schema';
import { definePageElement } from '../registry';
import DividerRenderer from './DividerRenderer.vue';

export const dividerElement = definePageElement<DividerNode['props']>({
  renderer: DividerRenderer,
});
