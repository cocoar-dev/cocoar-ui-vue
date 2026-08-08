import type { RadioGroupNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import RadioGroupRenderer from './RadioGroupRenderer.vue';
import RadioGroupPreview from './RadioGroupPreview.vue';
import RadioGroupInspector from './RadioGroupInspector.vue';
import RadioGroupDefaultInput from './RadioGroupDefaultInput.vue';

export const radioGroupElement = definePageElement<RadioGroupNode['props']>({
  renderer: RadioGroupRenderer,
  // Default emptiness (undefined | null | '' | false | []) fits.
  value: { types: ['string'], defaultValue: () => null },
  builder: {
    label: { key: 'coar.pageBuilder.type.radioGroup', fallback: 'Radio Group' },
    icon: 'rows',
    group: 'element',
    defaults: () => ({
      label: 'Choose one',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    }),
    quickProperties: [quick.label, quick.disabled, quick.required, quick.width],
    preview: RadioGroupPreview,
    inspector: RadioGroupInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.radioGroup', fallback: 'Radio group' },
    defaultValueInput: RadioGroupDefaultInput,
  },
});
