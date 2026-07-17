import type { MultiSelectNode } from '../../schema';
import { definePageElement } from '../registry';
import MultiSelectRenderer from './MultiSelectRenderer.vue';
import MultiSelectPreview from './MultiSelectPreview.vue';
import MultiSelectInspector from './MultiSelectInspector.vue';
import MultiSelectDefaultInput from './MultiSelectDefaultInput.vue';

export const multiSelectElement = definePageElement<MultiSelectNode['props']>({
  renderer: MultiSelectRenderer,
  // Default emptiness fits: `[]` counts as empty, so `required` means at
  // least one option must be selected.
  value: { types: ['string[]'], defaultValue: () => [] },
  builder: {
    label: { key: 'coar.pageBuilder.type.multiSelect', fallback: 'Multi Select' },
    icon: 'list-ordered',
    group: 'element',
    defaults: () => ({
      label: 'Multi select',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    }),
    preview: MultiSelectPreview,
    inspector: MultiSelectInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.multiSelect', fallback: 'Multi select' },
    defaultValueInput: MultiSelectDefaultInput,
  },
});
