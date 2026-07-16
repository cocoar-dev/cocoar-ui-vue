import type { ParagraphNode } from '../../schema';
import { definePageElement } from '../registry';
import ParagraphRenderer from './ParagraphRenderer.vue';

export const paragraphElement = definePageElement<ParagraphNode['props']>({
  renderer: ParagraphRenderer,
});
