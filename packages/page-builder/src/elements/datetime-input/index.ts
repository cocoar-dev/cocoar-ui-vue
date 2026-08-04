import type { DateTimeInputNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import DateTimeInputRenderer from './DateTimeInputRenderer.vue';
import DateTimeInputPreview from './DateTimeInputPreview.vue';
import DateTimeInputInspector from './DateTimeInputInspector.vue';
import DateTimeInputDefaultInput from './DateTimeInputDefaultInput.vue';

export const dateTimeInputElement = definePageElement<DateTimeInputNode['props']>({
  renderer: DateTimeInputRenderer,
  // NOT submitOnEnter — same picker-panel reasoning as date-input.
  value: { types: ['datetime'], defaultValue: () => null },
  builder: {
    label: { key: 'coar.pageBuilder.type.dateTimeInput', fallback: 'Date & Time' },
    icon: 'calendar-days',
    group: 'element',
    defaults: () => ({ label: 'Date & time' }),
    quickProperties: [quick.label, quick.placeholder, quick.disabled, quick.required, quick.width],
    preview: DateTimeInputPreview,
    inspector: DateTimeInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.dateTimeInput', fallback: 'Date & time' },
    defaultValueInput: DateTimeInputDefaultInput,
  },
});
