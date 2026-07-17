import type { StackNode } from '../../schema';
import { definePageElement } from '../registry';
import StackRenderer from './StackRenderer.vue';
import StackInspector from './StackInspector.vue';

export const stackElement = definePageElement<StackNode['props']>({
  renderer: StackRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.stack', fallback: 'Stack' },
    icon: 'layers',
    group: 'container',
    defaults: () => ({}),
    inspector: StackInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.layout', fallback: 'Layout' },
  },
});
