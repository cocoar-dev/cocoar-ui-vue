import type { SectionNode } from '../../schema';
import { definePageElement } from '../registry';
import SectionRenderer from './SectionRenderer.vue';

export const sectionElement = definePageElement<SectionNode['props']>({
  renderer: SectionRenderer,
  container: true,
});
