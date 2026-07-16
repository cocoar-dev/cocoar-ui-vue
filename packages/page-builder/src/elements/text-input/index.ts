import type { TextInputNode } from '../../schema';
import { definePageElement } from '../registry';
import TextInputRenderer from './TextInputRenderer.vue';

export const textInputElement = definePageElement<TextInputNode['props']>({
  renderer: TextInputRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits; the extra
  // text rules (minLength/maxLength/pattern) stay host-enforced — they need
  // the localized message pipeline and the cached pattern compiler.
  value: {},
});
