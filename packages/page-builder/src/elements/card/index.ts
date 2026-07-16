import type { CardNode } from '../../schema';
import { definePageElement } from '../registry';
import CardRenderer from './CardRenderer.vue';

export const cardElement = definePageElement<CardNode['props']>({
  renderer: CardRenderer,
  container: true,
});
