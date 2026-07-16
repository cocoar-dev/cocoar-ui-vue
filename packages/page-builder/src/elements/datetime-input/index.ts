import type { DateTimeInputNode } from '../../schema';
import { definePageElement } from '../registry';
import DateTimeInputRenderer from './DateTimeInputRenderer.vue';
import DateTimeInputPreview from './DateTimeInputPreview.vue';
import DateTimeInputInspector from './DateTimeInputInspector.vue';
import DateTimeInputDefaultInput from './DateTimeInputDefaultInput.vue';

export const dateTimeInputElement = definePageElement<DateTimeInputNode['props']>({
  renderer: DateTimeInputRenderer,
  value: {},
  builder: {
    label: { key: 'coar.pageBuilder.type.dateTimeInput', fallback: 'Date & Time' },
    icon: 'calendar-days',
    group: 'element',
    defaults: () => ({ label: 'Date & time' }),
    preview: DateTimeInputPreview,
    inspector: DateTimeInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.dateTimeInput', fallback: 'Date & time' },
    defaultValueInput: DateTimeInputDefaultInput,
  },
});
