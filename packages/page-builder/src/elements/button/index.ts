import type { ButtonNode } from '../../schema';
import { definePageElement } from '../registry';
import ButtonRenderer from './ButtonRenderer.vue';

export const buttonElement = definePageElement<ButtonNode['props']>({
  renderer: ButtonRenderer,
});
