import type { ImageNode } from '../../schema';
import { definePageElement } from '../registry';
import ImageRenderer from './ImageRenderer.vue';

export const imageElement = definePageElement<ImageNode['props']>({
  renderer: ImageRenderer,
});
