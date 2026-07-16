import type { DividerNode } from '../../schema';
import { definePageElement } from '../registry';
import DividerRenderer from './DividerRenderer.vue';
import DividerPreview from './DividerPreview.vue';

export const dividerElement = definePageElement<DividerNode['props']>({
  renderer: DividerRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.divider', fallback: 'Divider' },
    icon: 'minus',
    group: 'element',
    defaults: () => ({}),
    preview: DividerPreview,
  },
});
