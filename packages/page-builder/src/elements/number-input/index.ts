import type { NumberInputNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import NumberInputRenderer from './NumberInputRenderer.vue';
import NumberInputPreview from './NumberInputPreview.vue';
import NumberInputInspector from './NumberInputInspector.vue';
import NumberInputDefaultInput from './NumberInputDefaultInput.vue';

export const numberInputElement = definePageElement<NumberInputNode['props']>({
  renderer: NumberInputRenderer,
  // null = "no number entered" — present in the payload, still empty for `required`.
  value: { types: ['number'], submitOnEnter: true, defaultValue: () => null },
  builder: {
    label: { key: 'coar.pageBuilder.type.numberInput', fallback: 'Number Input' },
    icon: 'hash',
    group: 'element',
    defaults: () => ({ label: 'Number' }),
    quickProperties: [quick.label, quick.placeholder, quick.disabled, quick.required, quick.width],
    preview: NumberInputPreview,
    inspector: NumberInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.numberInput', fallback: 'Number input' },
    defaultValueInput: NumberInputDefaultInput,
  },
});
