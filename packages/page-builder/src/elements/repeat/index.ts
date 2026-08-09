import type { RepeatNode } from '../../schema'
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry'
import RepeatRenderer from './RepeatRenderer.vue'
import RepeatInspector from './RepeatInspector.vue'

export const repeatElement = definePageElement<RepeatNode['props']>({
  renderer: RepeatRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.repeat', fallback: 'Repeat' },
    icon: 'list',
    group: 'container',
    defaults: () => ({ source: '', keyPath: 'id', itemAlias: 'item', maxItems: 100 }),
    inspector: RepeatInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.repeat', fallback: 'Repeat data' },
    quickProperties: [
      quick.gap, quick.padding, quick.width, quick.height,
      quick.minHeight, quick.maxHeight, quick.overflow, quick.hidden,
    ],
  },
})
