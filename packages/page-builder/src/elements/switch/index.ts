import type { SwitchNode } from '../../schema';
import { definePageElement } from '../registry';
import SwitchRenderer from './SwitchRenderer.vue';
import SwitchPreview from './SwitchPreview.vue';
import SwitchInspector from './SwitchInspector.vue';
import SwitchDefaultInput from './SwitchDefaultInput.vue';

export const switchElement = definePageElement<SwitchNode['props']>({
  renderer: SwitchRenderer,
  // Default emptiness fits: `false` counts as empty, so `required` means
  // the switch must be ON (consent-style, like checkbox).
  value: { types: ['boolean'] },
  builder: {
    label: { key: 'coar.pageBuilder.type.switch', fallback: 'Switch' },
    icon: 'check',
    group: 'element',
    defaults: () => ({ label: 'Switch' }),
    preview: SwitchPreview,
    inspector: SwitchInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.switch', fallback: 'Switch' },
    defaultValueInput: SwitchDefaultInput,
  },
});
