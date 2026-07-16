import type { ButtonNode } from '../../schema';
import { definePageElement } from '../registry';
import ButtonRenderer from './ButtonRenderer.vue';
import ButtonPreview from './ButtonPreview.vue';
import ButtonInspector from './ButtonInspector.vue';

export const buttonElement = definePageElement<ButtonNode['props']>({
  renderer: ButtonRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.button', fallback: 'Button' },
    icon: 'zap',
    defaults: () => ({ label: 'Button' }),
    preview: ButtonPreview,
    inspector: ButtonInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.button', fallback: 'Button' },
  },
});
