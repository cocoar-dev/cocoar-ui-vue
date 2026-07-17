import type { CheckboxNode } from '../../schema';
import { definePageElement } from '../registry';
import CheckboxRenderer from './CheckboxRenderer.vue';
import CheckboxPreview from './CheckboxPreview.vue';
import CheckboxInspector from './CheckboxInspector.vue';
import CheckboxDefaultInput from './CheckboxDefaultInput.vue';

export const checkboxElement = definePageElement<CheckboxNode['props']>({
  renderer: CheckboxRenderer,
  // Default emptiness fits: `false` counts as empty, so `required` means
  // the box must be checked (consent-style).
  value: { types: ['boolean'], defaultValue: () => false },
  builder: {
    label: { key: 'coar.pageBuilder.type.checkbox', fallback: 'Checkbox' },
    icon: 'check-circle-2',
    group: 'element',
    defaults: () => ({ label: 'Checkbox' }),
    preview: CheckboxPreview,
    inspector: CheckboxInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.checkbox', fallback: 'Checkbox' },
    defaultValueInput: CheckboxDefaultInput,
  },
});
