import type { SelectNode } from '../../schema';
import { definePageElement } from '../registry';
import SelectRenderer from './SelectRenderer.vue';
import SelectPreview from './SelectPreview.vue';
import SelectInspector from './SelectInspector.vue';
import SelectDefaultInput from './SelectDefaultInput.vue';

export const selectElement = definePageElement<SelectNode['props']>({
  renderer: SelectRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits.
  value: { types: ['string'] },
  builder: {
    label: { key: 'coar.pageBuilder.type.select', fallback: 'Select' },
    icon: 'list',
    group: 'element',
    defaults: () => ({
      label: 'Select',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    }),
    preview: SelectPreview,
    inspector: SelectInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.select', fallback: 'Select' },
    defaultValueInput: SelectDefaultInput,
  },
});
