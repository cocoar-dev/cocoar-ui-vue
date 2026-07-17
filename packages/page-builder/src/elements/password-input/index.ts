import type { PasswordInputNode } from '../../schema';
import { definePageElement } from '../registry';
import PasswordInputRenderer from './PasswordInputRenderer.vue';
import PasswordInputPreview from './PasswordInputPreview.vue';
import PasswordInputInspector from './PasswordInputInspector.vue';

export const passwordInputElement = definePageElement<PasswordInputNode['props']>({
  renderer: PasswordInputRenderer,
  // Passwords are the classic minLength/pattern case — host-enforced rules on.
  value: { textRules: true, types: ['string'], submitOnEnter: true, defaultValue: () => '' },
  builder: {
    label: { key: 'coar.pageBuilder.type.passwordInput', fallback: 'Password' },
    icon: 'lock',
    group: 'element',
    defaults: () => ({ label: 'Password' }),
    preview: PasswordInputPreview,
    inspector: PasswordInputInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.passwordInput', fallback: 'Password input' },
  },
});
