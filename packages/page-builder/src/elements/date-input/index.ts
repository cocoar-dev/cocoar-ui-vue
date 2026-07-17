import type { DateInputNode } from '../../schema';
import { definePageElement } from '../registry';
import DateInputRenderer from './DateInputRenderer.vue';
import DateInputPreview from './DateInputPreview.vue';
import DateInputInspector from './DateInputInspector.vue';
import DateInputDefaultInput from './DateInputDefaultInput.vue';

export const dateInputElement = definePageElement<DateInputNode['props']>({
  renderer: DateInputRenderer,
  value: { types: ['date'] },
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
