import type { TextInputNode } from '../../schema';
import { definePageElement } from '../registry';
import TextInputRenderer from './TextInputRenderer.vue';
import TextInputPreview from './TextInputPreview.vue';
import TextInputInspector from './TextInputInspector.vue';

export const textInputElement = definePageElement<TextInputNode['props']>({
  renderer: TextInputRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits; the extra
  // text rules (minLength/maxLength/pattern) stay host-enforced — they need
  // the localized message pipeline and the cached pattern compiler.
  value: {},
  builder: {
    label: { key: 'coar.pageBuilder.type.textInput', fallback: 'Text Input' },
    icon: 'file-text',
    group: 'element',
    defaults: () => ({ label: 'Label' }),
    preview: TextInputPreview,
    inspector: TextInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.textInput', fallback: 'Text input' },
  },
});
