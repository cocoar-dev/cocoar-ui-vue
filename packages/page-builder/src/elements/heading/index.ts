import type { HeadingNode } from '../../schema';
import { definePageElement } from '../registry';
import HeadingRenderer from './HeadingRenderer.vue';

export const headingElement = definePageElement<HeadingNode['props']>({
  renderer: HeadingRenderer,
});
