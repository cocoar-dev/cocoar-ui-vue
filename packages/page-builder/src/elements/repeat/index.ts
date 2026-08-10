import type { RepeatNode } from '../../schema'
import { definePageElement, QUICK_PROPERTY_PRESETS as quick, QUICK_COMPOUND_PRESETS as box } from '../registry'
import RepeatRenderer from './RepeatRenderer.vue'
import RepeatInspector from './RepeatInspector.vue'

export const repeatElement = definePageElement<RepeatNode['props']>({
  renderer: RepeatRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.repeat', fallback: 'Repeat' },
    icon: 'list',
    group: 'container',
    defaults: () => ({ contextPath: '', keyPath: 'id', itemAlias: 'item', maxItems: 100 }),
    inspector: RepeatInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.repeat', fallback: 'Repeat data' },
    quickProperties: [
      quick.direction, quick.gap, box.paddingBox,
      quick.size, box.widthBox, box.heightBox, quick.overflow, quick.hidden,
    ],
  },
})
