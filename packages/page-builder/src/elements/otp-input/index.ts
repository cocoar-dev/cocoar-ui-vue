import type { OtpInputNode } from '../../schema';
import { definePageElement } from '../registry';
import OtpInputRenderer from './OtpInputRenderer.vue';

export const otpInputElement = definePageElement<OtpInputNode['props']>({
  renderer: OtpInputRenderer,
  value: {
    // `required` means the code is COMPLETE — a partially filled code counts as empty.
    isEmpty: (v, props) => typeof v !== 'string' || v.length < (props.length ?? 6),
  },
});
