import type { StackNode } from '../../schema';
import {
  definePageElement,
  QUICK_PROPERTY_PRESETS as quick,
  QUICK_COMPOUND_PRESETS as box,
} from '../registry';
import StackRenderer from './StackRenderer.vue';

export const stackElement = definePageElement<StackNode['props']>({
  renderer: StackRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.stack', fallback: 'Stack' },
    icon: 'layers',
    group: 'container',
    defaults: () => ({}),
    quickProperties: [
      quick.direction, quick.align, quick.gap, box.paddingBox,
      quick.size, box.widthBox, box.heightBox, quick.overflow, quick.hidden,
    ],
  },
});
