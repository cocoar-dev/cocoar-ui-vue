import type { NumberInputNode } from '../../schema';
import { definePageElement } from '../registry';
import NumberInputRenderer from './NumberInputRenderer.vue';
import NumberInputPreview from './NumberInputPreview.vue';
import NumberInputInspector from './NumberInputInspector.vue';
import NumberInputDefaultInput from './NumberInputDefaultInput.vue';

export const numberInputElement = definePageElement<NumberInputNode['props']>({
  renderer: NumberInputRenderer,
  value: {},
  builder: {
    label: { key: 'coar.pageBuilder.type.numberInput', fallback: 'Number Input' },
    icon: 'hash',
    group: 'element',
    defaults: () => ({ label: 'Number' }),
    preview: NumberInputPreview,
    inspector: NumberInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.numberInput', fallback: 'Number input' },
    defaultValueInput: NumberInputDefaultInput,
  },
});
