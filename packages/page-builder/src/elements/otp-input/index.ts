import type { OtpInputNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import OtpInputRenderer from './OtpInputRenderer.vue';
import OtpInputPreview from './OtpInputPreview.vue';
import OtpInputInspector from './OtpInputInspector.vue';

export const otpInputElement = definePageElement<OtpInputNode['props']>({
  renderer: OtpInputRenderer,
  value: {
    types: ['string'],
    // `required` means the code is COMPLETE — a partially filled code counts as empty.
    isEmpty: (v, props) => typeof v !== 'string' || v.length < (props.length ?? 6),
    defaultValue: () => '',
  },
  builder: {
    label: { key: 'coar.pageBuilder.type.otpInput', fallback: 'OTP Input' },
    icon: 'key-round',
    group: 'element',
    defaults: () => ({ label: 'Code' }),
    quickProperties: [quick.label, quick.disabled, quick.required, quick.width],
    preview: OtpInputPreview,
    inspector: OtpInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.otpInput', fallback: 'OTP input' },
  },
});
