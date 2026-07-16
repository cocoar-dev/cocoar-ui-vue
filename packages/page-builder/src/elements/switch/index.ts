import type { SwitchNode } from '../../schema';
import { definePageElement } from '../registry';
import SwitchRenderer from './SwitchRenderer.vue';

export const switchElement = definePageElement<SwitchNode['props']>({
  renderer: SwitchRenderer,
  // Default emptiness fits: `false` counts as empty, so `required` means
  // the switch must be ON (consent-style, like checkbox).
  value: {},
});
