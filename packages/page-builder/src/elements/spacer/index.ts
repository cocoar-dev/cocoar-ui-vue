import type { SpacerNode } from '../../schema';
import { definePageElement } from '../registry';
import SpacerRenderer from './SpacerRenderer.vue';

export const spacerElement = definePageElement<SpacerNode['props']>({
  renderer: SpacerRenderer,
});
