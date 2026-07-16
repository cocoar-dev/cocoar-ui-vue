import type { LinkNode } from '../../schema';
import { definePageElement } from '../registry';
import LinkRenderer from './LinkRenderer.vue';

export const linkElement = definePageElement<LinkNode['props']>({
  renderer: LinkRenderer,
});
