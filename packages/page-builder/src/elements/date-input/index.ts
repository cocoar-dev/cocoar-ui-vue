import type { DateInputNode } from '../../schema';
import { definePageElement } from '../registry';
import DateInputRenderer from './DateInputRenderer.vue';
import DateInputPreview from './DateInputPreview.vue';
import DateInputInspector from './DateInputInspector.vue';
import DateInputDefaultInput from './DateInputDefaultInput.vue';

export const dateInputElement = definePageElement<DateInputNode['props']>({
  renderer: DateInputRenderer,
  // NOT submitOnEnter: the picker panel is not teleported and does not
  // consume Enter — an Enter meant to pick a date would submit the form.
  value: { types: ['date'], defaultValue: () => null },
  builder: {
    label: { key: 'coar.pageBuilder.type.dateInput', fallback: 'Date' },
    icon: 'calendar',
    group: 'element',
    defaults: () => ({ label: 'Date' }),
    preview: DateInputPreview,
    inspector: DateInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.dateInput', fallback: 'Date' },
    defaultValueInput: DateInputDefaultInput,
  },
});
